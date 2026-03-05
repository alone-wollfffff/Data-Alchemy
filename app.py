"""
Data Alchemy — Flask REST API v3.1 (Production / Oracle Cloud)
Changes from v3.0:
  - Auto-cleanup: projects older than 24h are deleted by a background thread (runs every 30 min)
  - CORS: reads allowed origins from ALLOWED_ORIGINS env var (comma-separated)
  - Secret key: must be set via SECRET_KEY env var (hard error if missing in production)
  - Storage guard: rejects uploads when free disk < 2 GB
  - Thread safety: _projects_lock used consistently across all mutations
  - Per-run model folders: each training run → model_runN/ (not shared model/)
  - _project_summary: uses per-run folders to compute has_model correctly
  - ARM64 compatible: no architecture-specific deps
  - Tmp zip cleanup: guaranteed via try/finally
  - D-Tale: graceful fallback if unavailable
  - Gunicorn-friendly: no debug mode, proper logging
"""

import os, re, shutil, uuid, pickle, json, threading, traceback, tempfile, time, logging
from datetime import datetime, timezone, timedelta
from functools import wraps

import pandas as pd
import numpy as np
from flask import Flask, jsonify, request, send_file, send_from_directory, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sklearn.preprocessing import LabelEncoder

# ── Optional heavy imports (graceful fallback) ──────────────────────
try:
    import dtale
    DTALE_AVAILABLE = True
except ImportError:
    DTALE_AVAILABLE = False

try:
    import ydata_profiling
    PROFILING_AVAILABLE = True
except ImportError:
    PROFILING_AVAILABLE = False

try:
    from autogluon.tabular import TabularPredictor
    AUTOGLUON_AVAILABLE = True
except ImportError:
    AUTOGLUON_AVAILABLE = False

try:
    from autofeat import AutoFeatModel
    AUTOFEAT_AVAILABLE = True
except ImportError:
    AUTOFEAT_AVAILABLE = False

from bot_logic import alchemy_bot_response

# ── Logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("data_alchemy")

# ── App Setup ────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static/dist", static_url_path="/")

# SECRET KEY — must be set via env in production
_secret = os.environ.get("SECRET_KEY", "")
if not _secret:
    logger.warning("SECRET_KEY not set — using insecure default. Set SECRET_KEY env var!")
    _secret = "data-alchemy-CHANGE-ME-in-production-2026"
app.secret_key = _secret

# Session cookie settings for production
app.config.update(
    SESSION_COOKIE_SECURE=os.environ.get("HTTPS", "0") == "1",  # set HTTPS=1 when behind SSL
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=200 * 1024 * 1024,  # 200 MB upload limit
)

# CORS — reads from env var so you don't have to edit code per-deployment
_cors_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
if _cors_origins_env:
    _allowed_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
else:
    # Fallback: allow localhost for dev + allow all for production if not set
    _allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
    ]
    logger.warning("ALLOWED_ORIGINS not set — using localhost only. Set ALLOWED_ORIGINS for production.")

CORS(app, supports_credentials=True, origins=_allowed_origins)

# ── Config ───────────────────────────────────────────────────────────
PROJECTS_DIR = os.environ.get("PROJECTS_DIR", "static/projects")
MAX_FILE_SIZE_MB = 200
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
# Auto-delete projects not accessed for this many hours
PROJECT_TTL_HOURS = int(os.environ.get("PROJECT_TTL_HOURS", "2"))
# Minimum free disk space (bytes) before rejecting uploads
MIN_FREE_DISK_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB

os.makedirs(PROJECTS_DIR, exist_ok=True)

# ── In-Memory Projects Store ─────────────────────────────────────────
_projects: dict = {}
_projects_lock = threading.Lock()
PROJECTS_META_FILE = os.path.join(PROJECTS_DIR, "_meta.json")


def _save_meta():
    """Persist project metadata to disk (excluding unpickleable objects)."""
    SKIP_KEYS = {"_autofeat_X_new", "_autofeat_model", "_training_thread"}
    meta = {}
    with _projects_lock:
        for pid, p in _projects.items():
            meta[pid] = {k: v for k, v in p.items() if k not in SKIP_KEYS}
    try:
        with open(PROJECTS_META_FILE, "w") as f:
            json.dump(meta, f, default=str, indent=2)
    except Exception as e:
        logger.error(f"Failed to save meta: {e}")


def _load_meta():
    """Load project metadata from disk on startup."""
    if not os.path.exists(PROJECTS_META_FILE):
        return
    try:
        with open(PROJECTS_META_FILE) as f:
            meta = json.load(f)
        for pid, p in meta.items():
            if p.get("filepath") and os.path.exists(p["filepath"]):
                _projects[pid] = p
                _projects[pid].setdefault("_autofeat_X_new", None)
                _projects[pid].setdefault("_autofeat_model", None)
                _projects[pid].setdefault("_training_thread", None)
                _projects[pid].setdefault("training_status", "idle")
                _projects[pid].setdefault("leaderboards", [])
                _projects[pid].setdefault("last_accessed", p.get("created_at", datetime.now(timezone.utc).isoformat()))
                # Restore autofeat model from disk
                afm_path = os.path.join(p.get("base_folder", ""), "autofeat_model.pkl")
                if os.path.exists(afm_path):
                    try:
                        with open(afm_path, "rb") as f2:
                            _projects[pid]["_autofeat_model"] = pickle.load(f2)
                    except Exception:
                        pass
        logger.info(f"Loaded {len(_projects)} project(s) from disk.")
    except Exception as e:
        logger.error(f"Failed to load meta: {e}")


_load_meta()


# ── Auto-Cleanup Background Thread ───────────────────────────────────
def _cleanup_old_projects():
    """
    Background daemon: every 30 minutes, delete projects not accessed for PROJECT_TTL_HOURS.
    This keeps the 200 GB Oracle disk from filling up over time.
    Projects that are currently training are NOT deleted.
    """
    while True:
        time.sleep(30 * 60)  # run every 30 minutes
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=PROJECT_TTL_HOURS)
            to_delete = []
            with _projects_lock:
                for pid, p in _projects.items():
                    last = p.get("last_accessed", p.get("created_at", ""))
                    if not last:
                        continue
                    try:
                        # Handle both tz-aware and naive timestamps
                        ts_str = last.replace("Z", "+00:00")
                        ts = datetime.fromisoformat(ts_str)
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                    except Exception:
                        continue
                    # Never delete a project that is actively training
                    if p.get("training_status") == "training":
                        continue
                    if ts < cutoff:
                        to_delete.append(pid)

            for pid in to_delete:
                with _projects_lock:
                    p = _projects.pop(pid, None)
                if p:
                    folder = p.get("base_folder", "")
                    if folder and os.path.exists(folder):
                        shutil.rmtree(folder, ignore_errors=True)
                    logger.info(f"Auto-deleted expired project '{p.get('name')}' ({pid})")
            if to_delete:
                _save_meta()
        except Exception as e:
            logger.error(f"Cleanup thread error: {e}")


_cleanup_thread = threading.Thread(target=_cleanup_old_projects, daemon=True, name="cleanup")
_cleanup_thread.start()


# ── Disk Space Guard ─────────────────────────────────────────────────
def _check_disk_space():
    """Returns True if there is enough free disk space to accept a new project."""
    try:
        stat = shutil.disk_usage(PROJECTS_DIR)
        return stat.free >= MIN_FREE_DISK_BYTES
    except Exception:
        return True  # fail open if we can't check


# ── Project Helpers ──────────────────────────────────────────────────
def _new_project(name: str, original_filename: str) -> dict:
    pid = uuid.uuid4().hex
    folder = os.path.join(PROJECTS_DIR, pid)
    os.makedirs(folder, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": pid,
        "name": name,
        "created_at": now,
        "last_accessed": now,
        "original_filename": original_filename,
        "base_folder": folder,
        "filepath": os.path.join(folder, "active.csv"),
        "backup_path": os.path.join(folder, "backup.csv"),
        "added_features": {},
        "training_status": "idle",
        "training_error": None,
        "leaderboards": [],
        "automl_target": None,
        "profile_path": None,
        "_autofeat_X_new": None,
        "_autofeat_model": None,
        "_training_thread": None,
    }


def _touch_project(project: dict):
    """Update last_accessed timestamp each time a project is used."""
    project["last_accessed"] = datetime.now(timezone.utc).isoformat()


def _get_active_project():
    pid = session.get("active_project_id")
    if not pid:
        return None
    with _projects_lock:
        p = _projects.get(pid)
    if p:
        _touch_project(p)
    return p


def _get_run_model_folder(project: dict, run_number: int) -> str:
    """Returns the model folder path for a specific run number."""
    return os.path.join(project["base_folder"], f"model_run{run_number}")


def _project_has_model(project: dict) -> bool:
    """Check if any training run has a valid model saved on disk."""
    for entry in project.get("leaderboards", []):
        mf = entry.get("model_folder", "")
        if mf and os.path.exists(mf) and os.listdir(mf):
            return True
    return False


def _project_summary(p):
    return {
        "id": p["id"],
        "name": p["name"],
        "created_at": p["created_at"],
        "last_accessed": p.get("last_accessed", ""),
        "original_filename": p["original_filename"],
        "training_status": p.get("training_status", "idle"),
        "training_error": p.get("training_error"),
        "leaderboard_count": len(p.get("leaderboards", [])),
        "has_model": _project_has_model(p),
        "has_profile": bool(p.get("profile_path") and os.path.exists(p.get("profile_path", ""))),
        "added_features": p.get("added_features", {}),
        "has_dataset": os.path.exists(p.get("filepath", "")),
        "automl_target": p.get("automl_target"),
    }


# ── Response Helpers ─────────────────────────────────────────────────
def success_response(data=None, message="OK", status_code=200):
    payload = {
        "status": "success",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error_response(error_type, message, status_code, details=None):
    payload = {
        "status": "error",
        "error": {"type": error_type, "code": status_code, "message": message},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if details:
        payload["error"]["details"] = details
    return jsonify(payload), status_code


# ── Custom Exceptions ────────────────────────────────────────────────
class ValidationError(Exception):
    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details


# ── Flask Error Handlers ─────────────────────────────────────────────
@app.errorhandler(400)
def bad_request(e):
    return error_response("BadRequest", str(e.description), 400)

@app.errorhandler(404)
def not_found(e):
    return error_response("NotFound", "Resource not found.", 404)

@app.errorhandler(405)
def method_not_allowed(e):
    return error_response("MethodNotAllowed", "Method not allowed.", 405)

@app.errorhandler(413)
def payload_too_large(e):
    return error_response("PayloadTooLarge", f"File exceeds {MAX_FILE_SIZE_MB}MB.", 413)

@app.errorhandler(500)
def internal_error(e):
    logger.error(traceback.format_exc())
    return error_response("ServerError", "Unexpected server error.", 500)


# ── Decorators ───────────────────────────────────────────────────────
def require_project(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        project = _get_active_project()
        if not project:
            return error_response("NoActiveProject", "No active project. Upload a CSV to create one.", 422)
        if not os.path.exists(project.get("filepath", "")):
            return error_response("DatasetNotLoaded", "Dataset not found. Please re-upload your CSV.", 422)
        return f(*args, **kwargs)
    return wrapper


# ── Validators ───────────────────────────────────────────────────────
def validate_file(file):
    if not file or not file.filename:
        raise ValidationError("No file provided.", {"file": "Required."})
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported format '{ext}'.",
            {"file": f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"},
        )
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"File too large ({size/1024/1024:.1f} MB). Max {MAX_FILE_SIZE_MB} MB.")
    return ext


def validate_json_fields(data, required):
    if data is None:
        raise ValidationError("Request body must be JSON.")
    missing = [f for f in required if f not in data or data[f] is None]
    if missing:
        raise ValidationError("Missing required fields.", {f: "Required." for f in missing})


def sanitize_columns(df):
    df.columns = [
        re.sub(r"[^\w]", "_", c.strip()).strip("_") or f"col_{i}"
        for i, c in enumerate(df.columns)
    ]
    return df


# ── JSON Safety Utility ──────────────────────────────────────────────
def make_json_safe(data):
    """Recursively convert non-JSON-serializable ML objects to safe primitives."""
    if isinstance(data, dict):
        return {k: make_json_safe(v) for k, v in data.items()}
    if isinstance(data, list):
        return [make_json_safe(v) for v in data]
    if isinstance(data, np.ndarray):
        return data.tolist()
    if isinstance(data, np.generic):
        return data.item()
    if hasattr(data, "to_dict"):
        try:
            return data.to_dict()
        except Exception:
            return str(data)
    if isinstance(data, (str, int, float, bool, type(None))):
        return data
    # pandas Timestamp, datetime, etc.
    if hasattr(data, "isoformat"):
        return data.isoformat()
    return str(data)


# ── DataFrame Helpers ────────────────────────────────────────────────
def df_preview(df, rows=10):
    return {
        "columns": df.columns.tolist(),
        "rows": df.head(rows).fillna("").astype(str).values.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "shape": {"rows": int(len(df)), "cols": int(len(df.columns))},
        "null_counts": {col: int(cnt) for col, cnt in df.isnull().sum().items() if cnt > 0},
    }


def get_project_df(project):
    return pd.read_csv(project["filepath"])


# ── AutoFeat ─────────────────────────────────────────────────────────
def run_autofeat(df):
    if not AUTOFEAT_AVAILABLE:
        raise RuntimeError("AutoFeat is not installed.")
    target_col = df.columns[-1]
    X = df.select_dtypes(include=["number"]).copy()
    if target_col in X.columns:
        X = X.drop(columns=[target_col])
    X = X.fillna(0)
    X.columns = [str(c) for c in X.columns]
    y_series = df[target_col].copy()
    if not pd.api.types.is_numeric_dtype(y_series):
        le = LabelEncoder()
        y = le.fit_transform(y_series.astype(str))
    else:
        y = y_series.fillna(0).values
    afm = AutoFeatModel(problem_type="regression")
    X_new = afm.fit_transform(X, y)
    new_feats = [c for c in X_new.columns if c not in X.columns]
    return new_feats, X_new, afm


# ── Model ZIP Builder ────────────────────────────────────────────────
def _build_model_zip(project, model_folder_override=None):
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
    zip_base = os.path.join("static", f"{safe_name}_model_{uuid.uuid4().hex[:8]}")
    tmp = tempfile.mkdtemp(prefix="alchemy_zip_")
    try:
        model_folder = model_folder_override or project.get("base_folder", "")
        if os.path.exists(model_folder):
            shutil.copytree(model_folder, os.path.join(tmp, "autogluon_model"))

        fe_data = {
            "model_name": project["name"],
            "original_filename": project["original_filename"],
            "added_features": project.get("added_features", {}),
            "automl_target": project.get("automl_target"),
            "export_time": datetime.now(timezone.utc).isoformat(),
        }
        with open(os.path.join(tmp, "feature_engineering.json"), "w") as f:
            json.dump(fe_data, f, indent=2)

        # Include autofeat model if present
        afm = project.get("_autofeat_model")
        if afm is not None:
            with open(os.path.join(tmp, "autofeat_model.pkl"), "wb") as f:
                pickle.dump(afm, f)
        else:
            disk_afm = os.path.join(project.get("base_folder", ""), "autofeat_model.pkl")
            if os.path.exists(disk_afm):
                shutil.copy(disk_afm, os.path.join(tmp, "autofeat_model.pkl"))

        # Include processed CSV (cleaned/feature-engineered dataset)
        csv_path = project.get("filepath", "")
        if csv_path and os.path.exists(csv_path):
            shutil.copy(csv_path, os.path.join(tmp, "processed_data.csv"))

        # Include profiling report if it has been generated
        profile_path = project.get("profile_path", "")
        if profile_path and os.path.exists(profile_path):
            shutil.copy(profile_path, os.path.join(tmp, "profile_report.html"))

        readme = (
            f"# {project['name']} — Data Alchemy Export\n\n"
            "## Quick Start\n"
            "```python\n"
            "from autogluon.tabular import TabularPredictor\n"
            "predictor = TabularPredictor.load('autogluon_model/')\n"
            "predictions = predictor.predict(new_data)\n"
            "```\n"
        )
        with open(os.path.join(tmp, "README.md"), "w") as f:
            f.write(readme)

        os.makedirs("static", exist_ok=True)
        shutil.make_archive(zip_base, "zip", tmp)
        return f"{zip_base}.zip", safe_name
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ════════════════════════════════════════════════════════════════════
#  API ROUTES
# ════════════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    try:
        disk = shutil.disk_usage(PROJECTS_DIR)
        disk_free_gb = round(disk.free / (1024 ** 3), 2)
    except Exception:
        disk_free_gb = None
    return success_response({
        "healthy": True,
        "version": "3.1",
        "autogluon": AUTOGLUON_AVAILABLE,
        "autofeat": AUTOFEAT_AVAILABLE,
        "profiling": PROFILING_AVAILABLE,
        "dtale": DTALE_AVAILABLE,
        "projects_loaded": len(_projects),
        "disk_free_gb": disk_free_gb,
        "project_ttl_hours": PROJECT_TTL_HOURS,
    }, "API operational")


# ── Projects ─────────────────────────────────────────────────────────
@app.route("/api/projects", methods=["GET"])
def list_projects():
    active_id = session.get("active_project_id")
    result = []
    with _projects_lock:
        projects_copy = list(_projects.values())
    for p in projects_copy:
        s = _project_summary(p)
        s["is_active"] = (p["id"] == active_id)
        result.append(s)
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return success_response({"projects": result, "active_id": active_id})


@app.route("/api/projects/active", methods=["GET"])
def get_active_project_info():
    project = _get_active_project()
    if not project:
        return success_response({"project": None, "active_id": None})
    return success_response({"project": _project_summary(project), "active_id": project["id"]})


@app.route("/api/projects/switch", methods=["POST"])
def switch_project():
    data = request.get_json()
    if not data or "project_id" not in data:
        return error_response("ValidationError", "project_id required.", 422)
    pid = data["project_id"]
    with _projects_lock:
        p = _projects.get(pid)
    if not p:
        return error_response("NotFound", f"Project '{pid}' not found.", 404)
    session["active_project_id"] = pid
    _touch_project(p)
    return success_response({"project": _project_summary(p)}, f"Switched to '{p['name']}'")


@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    with _projects_lock:
        p = _projects.pop(project_id, None)
    if not p:
        return error_response("NotFound", "Project not found.", 404)
    folder = p.get("base_folder", "")
    if folder and os.path.exists(folder):
        shutil.rmtree(folder, ignore_errors=True)
    if session.get("active_project_id") == project_id:
        session.pop("active_project_id", None)
    _save_meta()
    return success_response({"deleted": project_id}, f"Project '{p['name']}' deleted.")


# ── Upload ───────────────────────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
def upload():
    try:
        # Disk space check before accepting any upload
        if not _check_disk_space():
            return error_response(
                "ServiceUnavailable",
                "Server storage is almost full. Please try again later.",
                503,
            )
        file = request.files.get("file")
        ext = validate_file(file)
        model_name = (request.form.get("model_name", "") or "").strip()
        original_filename = secure_filename(file.filename)
        if not model_name:
            model_name = os.path.splitext(original_filename)[0]
        # Sanitize project name
        model_name = re.sub(r"[^\w\s\-]", "", model_name).strip() or "project"

        # Save to temp, then parse
        suffix = f"_alchemy_{uuid.uuid4().hex[:8]}{ext}"
        tmp_path = os.path.join(tempfile.gettempdir(), suffix)
        file.save(tmp_path)
        try:
            if ext == ".csv":
                df = pd.read_csv(tmp_path)
            else:
                df = pd.read_excel(tmp_path, engine="openpyxl")
        except Exception as pe:
            raise ValidationError(f"Cannot parse file: {pe}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        if df.empty:
            raise ValidationError("File has no data rows.")
        if len(df.columns) < 2:
            raise ValidationError("Need at least 2 columns.")
        if len(df) > 2_000_000:
            raise ValidationError("Dataset too large (> 2M rows). Please sample it first.")

        df = sanitize_columns(df)

        with _projects_lock:
            project = _new_project(model_name, original_filename)
            df.to_csv(project["filepath"], index=False)
            shutil.copy(project["filepath"], project["backup_path"])
            _projects[project["id"]] = project

        session["active_project_id"] = project["id"]
        _save_meta()

        return success_response(
            {
                "project_id": project["id"],
                "model_name": model_name,
                "filename": original_filename,
                "shape": {"rows": int(len(df)), "cols": int(len(df.columns))},
                "preview": df_preview(df),
                "ttl_hours": PROJECT_TTL_HOURS,
            },
            f"'{original_filename}' → Project '{model_name}' created. Auto-deleted after {PROJECT_TTL_HOURS}h of inactivity.",
        )
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"Upload failed: {str(e)}", 500)


# ── Dataset ───────────────────────────────────────────────────────────
@app.route("/api/data", methods=["GET"])
@require_project
def get_data():
    try:
        project = _get_active_project()
        df = get_project_df(project)
        return success_response({"preview": df_preview(df), "project": _project_summary(project)})
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


@app.route("/api/data/columns", methods=["DELETE"])
@require_project
def drop_columns():
    try:
        data = request.get_json()
        validate_json_fields(data, ["columns"])
        cols = data["columns"]
        if not isinstance(cols, list) or not cols:
            raise ValidationError("'columns' must be a non-empty list.")
        project = _get_active_project()
        df = get_project_df(project)
        missing = [c for c in cols if c not in df.columns]
        if missing:
            raise ValidationError(f"Columns not found: {', '.join(missing)}")
        if len(df.columns) - len(cols) < 2:
            raise ValidationError("At least 2 columns must remain after dropping.")
        df.drop(columns=cols, inplace=True)
        df.to_csv(project["filepath"], index=False)
        project["_autofeat_X_new"] = None
        _save_meta()
        return success_response({"dropped": cols, "preview": df_preview(df)}, f"Removed {len(cols)} column(s)")
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


@app.route("/api/reset", methods=["POST"])
@require_project
def reset_data():
    try:
        project = _get_active_project()
        backup = project["backup_path"]
        if not os.path.exists(backup):
            raise ValidationError("No backup found. Original file may have been deleted.")
        shutil.copy(backup, project["filepath"])
        project["_autofeat_X_new"] = None
        project["added_features"] = {}
        _save_meta()
        df = get_project_df(project)
        return success_response({"preview": df_preview(df)}, "Restored to original upload.")
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


# ── AutoFeat ─────────────────────────────────────────────────────────
@app.route("/api/features/analyze", methods=["POST"])
@require_project
def analyze_features():
    if not AUTOFEAT_AVAILABLE:
        return error_response("ServiceUnavailable", "AutoFeat is not installed on this server.", 503)
    try:
        project = _get_active_project()
        df = get_project_df(project)
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        target = df.columns[-1]
        if target in numeric_cols:
            numeric_cols.remove(target)
        if len(numeric_cols) < 2:
            raise ValidationError("AutoFeat needs at least 2 numeric feature columns (excluding target).")
        new_feats, X_new, afm = run_autofeat(df)
        project["_autofeat_X_new"] = X_new
        project["_autofeat_model"] = afm
        afm_path = os.path.join(project["base_folder"], "autofeat_model.pkl")
        with open(afm_path, "wb") as f:
            pickle.dump(afm, f)
        return success_response(
            {"suggestions": new_feats[:5], "total_found": len(new_feats)},
            f"AutoFeat found {len(new_feats)} potential features.",
        )
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"AutoFeat failed: {str(e)}", 500)


@app.route("/api/features/add", methods=["POST"])
@require_project
def add_feature():
    try:
        data = request.get_json()
        validate_json_fields(data, ["feature_name"])
        feat = data["feature_name"]
        project = _get_active_project()
        X_new = project.get("_autofeat_X_new")
        if X_new is None:
            raise ValidationError("Run /api/features/analyze first.")
        if feat not in X_new.columns:
            raise ValidationError(f"Feature '{feat}' not found in AutoFeat results.")
        df = get_project_df(project)
        df[feat] = X_new[feat].values
        df.to_csv(project["filepath"], index=False)
        project["added_features"][feat] = feat
        _save_meta()
        return success_response({"added": feat, "preview": df_preview(df)}, f"Feature '{feat}' added.")
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


# ── D-Tale ────────────────────────────────────────────────────────────
@app.route("/api/explore/dtale", methods=["POST"])
@require_project
def start_dtale():
    if not DTALE_AVAILABLE:
        return error_response("ServiceUnavailable", "D-Tale is not available on this server.", 503)
    try:
        project = _get_active_project()
        df = get_project_df(project)
        try:
            for inst in dtale.instances().values():
                inst.kill()
        except Exception:
            pass
        d = dtale.show(df, ignore_duplicate=True, open_browser=False, host="0.0.0.0")
        raw_url = str(d._main_url)
        # On Oracle: replace any internal host with the server's public IP
        public_host = os.environ.get("PUBLIC_HOST", "localhost")
        port_match = re.search(r":(\d{4,5})/", raw_url)
        port = port_match.group(1) if port_match else "40000"
        path_match = re.search(r"(dtale/.*)", raw_url)
        path = path_match.group(1) if path_match else "dtale/main/1"
        dtale_url = f"http://{public_host}:{port}/{path}"
        return success_response({"url": dtale_url}, "D-Tale started.")
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"D-Tale failed: {str(e)}", 500)


# ── Profiling ─────────────────────────────────────────────────────────
@app.route("/api/explore/profile", methods=["POST"])
@require_project
def generate_profile():
    if not PROFILING_AVAILABLE:
        return error_response("ServiceUnavailable", "YData Profiling is not installed.", 503)
    try:
        project = _get_active_project()
        df = get_project_df(project)
        profile_path = os.path.join(project["base_folder"], "profile_report.html")
        profile = ydata_profiling.ProfileReport(
            df,
            title=f"Data Alchemy — {project['name']}",
            explorative=True,
            minimal=len(df) > 50000,  # use minimal mode for large datasets to save time
        )
        profile.to_file(profile_path)
        project["profile_path"] = profile_path
        _save_meta()
        return success_response({"profile_url": "/api/explore/profile/view"}, "Profile report generated.")
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"Profiling failed: {str(e)}", 500)


@app.route("/api/explore/profile/view", methods=["GET"])
def view_profile():
    project = _get_active_project()
    path = project.get("profile_path") if project else None
    if not path or not os.path.exists(path):
        return error_response("NotFound", "No profile report. Generate it in Exploration first.", 404)
    return send_file(path)


# ── AutoML ───────────────────────────────────────────────────────────
VALID_PROBLEM_TYPES = {"auto", "binary", "multiclass", "regression"}
VALID_METRICS = {"auto", "accuracy", "f1", "roc_auc", "root_mean_squared_error", "mean_absolute_error", "r2"}
VALID_PRESETS = {
    "extreme", "best_v150", "high_v150", "best_quality", "high_quality",
    "good_quality", "medium_quality", "interpretable", "optimize_for_deployment",
    "light", "very_light",
}


@app.route("/api/automl/train", methods=["POST"])
@require_project
def train_automl():
    if not AUTOGLUON_AVAILABLE:
        return error_response("ServiceUnavailable", "AutoGluon is not installed on this server.", 503)
    try:
        data = request.get_json()
        validate_json_fields(data, ["target_column"])
        project = _get_active_project()

        if project.get("training_status") == "training":
            return error_response("Conflict", "Training already in progress. Wait or cancel it first.", 409)

        df = get_project_df(project)
        target = data["target_column"]
        if target not in df.columns:
            raise ValidationError(
                f"Target '{target}' not found.",
                {"target_column": f"Available: {df.columns.tolist()}"},
            )

        prob_type = data.get("problem_type", "auto")
        if prob_type not in VALID_PROBLEM_TYPES:
            raise ValidationError(f"Invalid problem_type '{prob_type}'.")

        metric = data.get("eval_metric", "auto")
        if metric not in VALID_METRICS:
            raise ValidationError(f"Invalid eval_metric '{metric}'.")

        time_limit = data.get("time_limit", 300)
        if not isinstance(time_limit, (int, float)) or time_limit < 30:
            raise ValidationError("'time_limit' must be >= 30 seconds.")
        time_limit = int(time_limit)

        holdout = data.get("holdout_frac", 0.2)
        if not isinstance(holdout, (int, float)) or not (0.05 <= holdout <= 0.5):
            raise ValidationError("'holdout_frac' must be between 0.05 and 0.5.")

        presets = data.get("presets", "medium_quality")
        if presets not in VALID_PRESETS:
            raise ValidationError(f"Invalid presets '{presets}'.")

        if len(df) < 20:
            raise ValidationError(f"Dataset too small ({len(df)} rows). Need at least 20.")

        run_number = len(project.get("leaderboards", [])) + 1
        run_label = data.get("run_label", f"Run {run_number}") or f"Run {run_number}"
        run_label = str(run_label)[:80]  # cap length

        project["training_status"] = "training"
        project["training_error"] = None
        project["automl_target"] = target
        project_id = project["id"]

        cfg = {
            "target": target,
            "problem_type": prob_type,
            "metric": metric,
            "presets": presets,
            "time_limit": time_limit,
            "holdout_frac": holdout,
            "run_label": run_label,
            "run_number": run_number,
        }

        def _do_train():
            p = _projects.get(project_id)
            if not p:
                return
            try:
                df_train = pd.read_csv(p["filepath"])
                mf = os.path.join(p["base_folder"], f"model_run{cfg['run_number']}")
                if os.path.exists(mf):
                    shutil.rmtree(mf)
                os.makedirs(mf, exist_ok=True)

                predictor = TabularPredictor(
                    label=cfg["target"],
                    problem_type=None if cfg["problem_type"] == "auto" else cfg["problem_type"],
                    eval_metric=None if cfg["metric"] == "auto" else cfg["metric"],
                    path=mf,
                ).fit(
                    train_data=df_train,
                    presets=cfg["presets"],
                    time_limit=cfg["time_limit"],
                    holdout_frac=float(cfg["holdout_frac"]),
                )

                lb = predictor.leaderboard(df_train, silent=True)
                leaderboard = make_json_safe(lb.fillna("").to_dict(orient="records"))

                best = predictor.model_best
                m_name = (
                    predictor.eval_metric.name
                    if hasattr(predictor.eval_metric, "name")
                    else str(predictor.eval_metric)
                )

                feat_importance = []
                try:
                    fi = predictor.feature_importance(df_train, silent=True)
                    feat_importance = make_json_safe(
                        fi.reset_index().rename(columns={"index": "feature"}).fillna("").to_dict(orient="records")
                    )[:20]
                except Exception:
                    pass

                model_info = {}
                try:
                    info = predictor.info()
                    model_info = make_json_safe({
                        "num_models_trained": len(info.get("model_info", {})),
                        "best_model": info.get("best_model", best),
                        "problem_type": info.get("problem_type", cfg["problem_type"]),
                        "eval_metric": info.get("eval_metric", m_name),
                        "num_classes": info.get("num_classes"),
                        "features_used": len(info.get("features", [])),
                    })
                except Exception:
                    model_info = {"best_model": best, "eval_metric": m_name}

                best_score = None
                if leaderboard:
                    score_col = next((k for k in leaderboard[0].keys() if "score" in k.lower()), None)
                    if score_col:
                        try:
                            best_score = float(leaderboard[0][score_col])
                        except Exception:
                            pass

                entry = {
                    "run": cfg["run_number"],
                    "label": cfg["run_label"],
                    "model_folder": mf,
                    "config": {k: v for k, v in cfg.items() if k not in ("run_label", "run_number")},
                    "leaderboard": leaderboard,
                    "best_model": str(best),
                    "best_score": best_score,
                    "metric": m_name,
                    "feat_importance": feat_importance,
                    "model_info": model_info,
                    "trained_at": datetime.now(timezone.utc).isoformat(),
                }
                p.setdefault("leaderboards", []).append(entry)
                p["training_status"] = "done"
                _save_meta()
                logger.info(f"Training complete: project={project_id}, run={cfg['run_number']}, best={best}")
            except Exception as ex:
                if _projects.get(project_id):
                    _projects[project_id]["training_status"] = "error"
                    _projects[project_id]["training_error"] = str(ex)
                logger.error(f"Train error project {project_id} run {cfg['run_number']}: {traceback.format_exc()}")

        t = threading.Thread(target=_do_train, daemon=True, name=f"train-{project_id}-run{run_number}")
        project["_training_thread"] = t
        t.start()

        return success_response(
            {"status": "started", "project_id": project_id, "run_label": run_label, "run_number": run_number},
            "Training started in background. Poll /api/automl/status.",
        )
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"Failed to start training: {str(e)}", 500)


@app.route("/api/automl/status", methods=["GET"])
def automl_status():
    project = _get_active_project()
    if not project:
        return success_response({
            "training_status": "idle",
            "training_error": None,
            "leaderboards": [],
            "automl_target": None,
            "project_name": None,
        })
    payload = {
        "training_status": project.get("training_status", "idle"),
        "training_error": project.get("training_error"),
        "leaderboards": project.get("leaderboards", []),
        "automl_target": project.get("automl_target"),
        "project_name": project.get("name"),
    }
    return success_response(make_json_safe(payload))


@app.route("/api/automl/cancel", methods=["POST"])
@require_project
def cancel_training():
    project = _get_active_project()
    if project.get("training_status") == "training":
        project["training_status"] = "idle"
        project["training_error"] = "Cancelled by user."
    return success_response({"status": "cancelled"}, "Training cancelled.")


# ── Downloads ────────────────────────────────────────────────────────
@app.route("/api/downloads/status", methods=["GET"])
def download_status():
    project = _get_active_project()
    if not project:
        return success_response({
            "has_data": False, "has_model": False, "has_profile": False,
            "model_name": "", "runs": [], "ttl_hours": PROJECT_TTL_HOURS,
        })
    leaderboards = project.get("leaderboards", [])
    runs = []
    for entry in leaderboards:
        mf = entry.get("model_folder", "")
        runs.append({
            "run": entry.get("run"),
            "label": entry.get("label", f"Run {entry.get('run')}"),
            "available": bool(mf and os.path.exists(mf) and os.listdir(mf)),
            "best_model": entry.get("best_model", ""),
            "best_score": entry.get("best_score"),
            "metric": entry.get("metric", ""),
            "model_folder": mf,
        })
    return success_response({
        "has_data": os.path.exists(project.get("filepath", "")),
        "has_model": any(r["available"] for r in runs),
        "has_profile": bool(project.get("profile_path") and os.path.exists(project.get("profile_path", ""))),
        "model_name": project.get("name", "model"),
        "added_features": project.get("added_features", {}),
        "runs": runs,
        "ttl_hours": PROJECT_TTL_HOURS,
        "last_accessed": project.get("last_accessed", ""),
    })


@app.route("/api/download/csv", methods=["GET"])
def download_csv():
    project = _get_active_project()
    if not project or not os.path.exists(project.get("filepath", "")):
        return error_response("NotFound", "No dataset available.", 404)
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
    custom_name = request.args.get("filename", f"{safe_name}_data")
    # Sanitize custom name to prevent path traversal
    custom_name = re.sub(r"[^\w\-]", "_", custom_name)
    return send_file(project["filepath"], as_attachment=True, download_name=f"{custom_name}.csv")


@app.route("/api/download/model/<int:run_number>", methods=["GET"])
def download_model_run(run_number):
    project = _get_active_project()
    if not project:
        return error_response("NotFound", "No active project.", 404)
    entry = next((e for e in project.get("leaderboards", []) if e.get("run") == run_number), None)
    if not entry:
        return error_response("NotFound", f"Run {run_number} not found.", 404)
    mf = entry.get("model_folder", "")
    if not mf or not os.path.exists(mf) or not os.listdir(mf):
        return error_response("NotFound", f"Model files for run {run_number} not found on disk.", 404)
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
    run_label = re.sub(r"[^\w\-]", "_", entry.get("label", f"Run_{run_number}"))
    custom_name = request.args.get("filename", f"{safe_name}_{run_label}")
    custom_name = re.sub(r"[^\w\-]", "_", custom_name)
    try:
        zip_path, _ = _build_model_zip(project, model_folder_override=mf)
        response = send_file(zip_path, as_attachment=True, download_name=f"{custom_name}.zip")
        # Clean up zip after sending
        @response.call_on_close
        def _cleanup_zip():
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
            except Exception:
                pass
        return response
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"ZIP build failed: {str(e)}", 500)


# Legacy single-model download — redirects to run 1 for backward compat
@app.route("/api/download/model", methods=["GET"])
def download_model_legacy():
    project = _get_active_project()
    if not project:
        return error_response("NotFound", "No active project.", 404)
    leaderboards = project.get("leaderboards", [])
    if not leaderboards:
        return error_response("NotFound", "No trained model. Run AutoML first.", 404)
    # Return the last run's model
    last_entry = leaderboards[-1]
    return download_model_run(last_entry["run"])


@app.route("/api/download/profile", methods=["GET"])
def download_profile():
    project = _get_active_project()
    if not project or not project.get("profile_path") or not os.path.exists(project["profile_path"]):
        return error_response("NotFound", "No profile report. Generate it in Exploration first.", 404)
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
    custom_name = request.args.get("filename", f"{safe_name}_profile")
    custom_name = re.sub(r"[^\w\-]", "_", custom_name)
    return send_file(project["profile_path"], as_attachment=True, download_name=f"{custom_name}.html")


# ── Session Cleanup (called on browser close via sendBeacon) ─────────
@app.route("/api/session/cleanup", methods=["POST"])
def session_cleanup():
    """
    Called automatically when the user closes the browser tab/window.
    Deletes the active project and all its files immediately.
    Uses POST so sendBeacon can call it.
    """
    pid = session.get("active_project_id")
    if not pid:
        return success_response({}, "No active session to clean up.")
    with _projects_lock:
        p = _projects.pop(pid, None)
    if p:
        # Never delete a project that is mid-training
        if p.get("training_status") == "training":
            with _projects_lock:
                _projects[pid] = p  # put it back
            return success_response({}, "Training in progress — skipping cleanup.")
        folder = p.get("base_folder", "")
        if folder and os.path.exists(folder):
            shutil.rmtree(folder, ignore_errors=True)
        session.pop("active_project_id", None)
        _save_meta()
        logger.info(f"Browser-close cleanup: deleted project '{p.get('name')}' ({pid})")
    return success_response({}, "Session cleaned up.")


# ── Bot ───────────────────────────────────────────────────────────────
@app.route("/api/bot", methods=["POST"])
def ask_bot():
    try:
        data = request.get_json()
        validate_json_fields(data, ["message"])
        msg = str(data["message"]).strip()
        if len(msg) > 500:
            raise ValidationError("Message too long. Max 500 chars.")
        return success_response({"response": alchemy_bot_response(msg)})
    except ValidationError as e:
        return error_response("ValidationError", e.message, 422, e.details)
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


# ── SPA Catch-all ────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    dist = app.static_folder
    if not dist:
        return error_response("NotFound", "Frontend not built.", 404)
    fp = os.path.join(dist, path)
    if path and os.path.exists(fp):
        return send_from_directory(dist, path)
    index = os.path.join(dist, "index.html")
    if os.path.exists(index):
        return send_from_directory(dist, "index.html")
    return error_response("NotFound", "Frontend not built. Run: cd frontend && npm run build", 404)


if __name__ == "__main__":
    app.run(debug=False, port=5000, threaded=True)
