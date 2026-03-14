"""
Data Alchemy — FastAPI REST API v4.1
=====================================
Key fixes vs v4.0
-----------------
1. TRUE CANCELLATION — AutoFeat and AutoGluon each run in a real subprocess
   (subprocess.Popen).  /cancel kills the OS process immediately.
2. TIME-LIMIT WATCHDOG — a daemon thread kills the training process if it
   hasn't finished within time_limit + 180 s.  AutoGluon's own time_limit
   flag is also passed, so it self-stops first.
3. DEPLOY-ALCHEMY ZIP — feature_engineering.json now contains every field
   Deploy Alchemy needs: actual_problem_type, eval_metric, best_model,
   best_score, columns_used, col_dtypes, num_classes, full leaderboard.
4. processed_data.csv is ALWAYS the exact training-time snapshot.
5. AutoFeat X_new is persisted to disk so large frames don't blow RAM.
6. Operations.jsx getPageSettings dependency array fixed (frontend).
7. Preset selection fix: passing presets to AutoGluon actually improves
   performance as quality increases (correct AutoGluon API usage).
"""

import os, re, shutil, uuid, pickle, json, threading, traceback, tempfile
import time, logging, math, subprocess, sys
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

import pandas as pd
import numpy as np
from fastapi import FastAPI, Request, UploadFile, File, Form, Query, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from werkzeug.utils import secure_filename
from sklearn.preprocessing import LabelEncoder


# ── Optional heavy imports ────────────────────────────────────────────
_import_warnings: list = []

try:
    import dtale
    DTALE_AVAILABLE = True
except Exception as _e:
    DTALE_AVAILABLE = False
    _import_warnings.append(f"dtale not available: {_e}")

try:
    import ydata_profiling
    PROFILING_AVAILABLE = True
except Exception as _e:
    PROFILING_AVAILABLE = False
    _import_warnings.append(f"ydata_profiling not available: {_e}")

try:
    from autogluon.tabular import TabularPredictor
    AUTOGLUON_AVAILABLE = True
except Exception as _e:
    AUTOGLUON_AVAILABLE = False
    _import_warnings.append(f"autogluon not available: {_e}")

try:
    from autofeat import AutoFeatModel
    AUTOFEAT_AVAILABLE = True
except Exception as _e:
    AUTOFEAT_AVAILABLE = False
    _import_warnings.append(f"autofeat not available: {_e}")


# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("data_alchemy")
for _w in _import_warnings:
    logger.warning(f"Optional package: {_w}")
del _import_warnings

import importlib as _importlib

def _dtale_mod():
    if DTALE_AVAILABLE: return dtale
    try: return _importlib.import_module("dtale")
    except Exception: return None

def _ydata_mod():
    if PROFILING_AVAILABLE: return ydata_profiling
    try: return _importlib.import_module("ydata_profiling")
    except Exception: return None

def _autofeat_available() -> bool:
    try: _importlib.import_module("autofeat"); return True
    except Exception: return False

def _autogluon_available() -> bool:
    try: _importlib.import_module("autogluon.tabular"); return True
    except Exception: return False

def _env_truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}

def _dtale_capabilities() -> dict:
    installed = _dtale_mod() is not None
    if _env_truthy("DATA_ALCHEMY_FORCE_DTALE_ENABLE"):
        return {
            "installed": installed,
            "supported": True,
            "available": installed,
            "reason": None if installed else "D-Tale package is not installed in this environment.",
        }
    if _env_truthy("DATA_ALCHEMY_DISABLE_DTALE") or _env_truthy("DISABLE_DTALE"):
        return {
            "installed": installed,
            "supported": False,
            "available": False,
            "reason": "D-Tale has been disabled by environment configuration.",
        }
    if os.environ.get("HF_SPACE_ID") or os.environ.get("SPACE_ID"):
        return {
            "installed": installed,
            "supported": False,
            "available": False,
            "reason": "This hosting platform exposes only one public port, so D-Tale cannot be opened here.",
        }
    return {
        "installed": installed,
        "supported": True,
        "available": installed,
        "reason": None if installed else "D-Tale package is not installed in this environment.",
    }

def _service_capabilities() -> dict:
    return {
        "autogluon": _autogluon_available(),
        "autofeat": _autofeat_available(),
        "profiling": _ydata_mod() is not None,
        "dtale": _dtale_capabilities(),
    }


# ── workers.py path ───────────────────────────────────────────────────
_WORKERS_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workers.py")

# ── Secret Key ────────────────────────────────────────────────────────
_secret = os.environ.get("SECRET_KEY", "")
_is_production = os.environ.get("HTTPS", "0") == "1"
if not _secret:
    if _is_production:
        raise RuntimeError("FATAL: SECRET_KEY env var not set.")
    logger.warning("⚠️  SECRET_KEY not set — using insecure default (dev only).")
    _secret = "data-alchemy-CHANGE-ME-in-production-2026"

# ── CORS ──────────────────────────────────────────────────────────────
_cors_env = os.environ.get("ALLOWED_ORIGINS", "")
_allowed_origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else [
        "http://localhost:5173", "http://localhost:5000",
        "http://127.0.0.1:5173", "http://127.0.0.1:5000",
    ]
)

# ── FastAPI ───────────────────────────────────────────────────────────
app = FastAPI(
    title="Data Alchemy API", version="4.1",
    docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json",
)
app.add_middleware(
    SessionMiddleware, secret_key=_secret,
    session_cookie="session", https_only=_is_production, same_site="lax",
)
app.add_middleware(
    CORSMiddleware, allow_origins=_allowed_origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────────────
PROJECTS_DIR        = os.environ.get("PROJECTS_DIR", "static/projects")
MAX_FILE_SIZE_MB    = 200
ALLOWED_EXTENSIONS  = {".csv", ".xlsx", ".xls"}
PROJECT_TTL_HOURS   = int(os.environ.get("PROJECT_TTL_HOURS", "2"))
MIN_FREE_DISK_BYTES = 2 * 1024 * 1024 * 1024   # 2 GB
WATCHDOG_BUFFER_SEC = 180   # extra seconds before hard-kill after time_limit
os.makedirs(PROJECTS_DIR, exist_ok=True)

# ── State ─────────────────────────────────────────────────────────────
_projects: dict = {}
_projects_lock   = threading.Lock()
_autofeat_procs: dict  = {}   # pid → Popen
_training_procs: dict  = {}   # pid → Popen
_autofeat_cancel: dict = {}   # pid → threading.Event
_training_cancel: dict = {}   # pid → threading.Event
PROJECTS_META_FILE = os.path.join(PROJECTS_DIR, "_meta.json")
SESSION_OWNER_KEY  = "browser_session_id"

# ── Pydantic Models ───────────────────────────────────────────────────
class SwitchProjectRequest(BaseModel):
    project_id: str

class DropColumnsRequest(BaseModel):
    columns: List[str]

class AnalyzeFeaturesRequest(BaseModel):
    target_column: Optional[str] = None
    problem_type: Optional[str] = "regression"

class AddFeatureRequest(BaseModel):
    feature_name: str

class TrainRequest(BaseModel):
    target_column: str
    problem_type:  Optional[str]  = "auto"
    eval_metric:   Optional[str]  = "auto"
    presets:       Optional[str]  = "medium_quality"
    time_limit:    Optional[float]= 300
    holdout_frac:  Optional[float]= 0.2
    run_label:     Optional[str]  = None


class SelectiveDownloadRequest(BaseModel):
    selected_models: List[str]
# ── Exceptions ────────────────────────────────────────────────────────

class ValidationError(Exception):
    def __init__(self, message, details=None):
        super().__init__(message); self.message = message; self.details = details

class AppError(Exception):
    def __init__(self, error_type, message, status_code, details=None):
        self.error_type = error_type; self.message = message
        self.status_code = status_code; self.details = details

# ── Response helpers ──────────────────────────────────────────────────
def success_response(data=None, message="OK", status_code=200) -> JSONResponse:
    payload = {"status": "success", "message": message,
               "timestamp": datetime.now(timezone.utc).isoformat()}
    if data is not None: payload["data"] = data
    return JSONResponse(content=payload, status_code=status_code)

def error_response(error_type, message, status_code, details=None) -> JSONResponse:
    payload = {"status": "error",
               "error": {"type": error_type, "code": status_code, "message": message},
               "timestamp": datetime.now(timezone.utc).isoformat()}
    if details: payload["error"]["details"] = details
    return JSONResponse(content=payload, status_code=status_code)

@app.exception_handler(AppError)
async def _app_err(request, exc): return error_response(exc.error_type, exc.message, exc.status_code, exc.details)

@app.exception_handler(500)
async def _srv_err(request, exc):
    logger.error(traceback.format_exc())
    return error_response("ServerError", "Unexpected server error.", 500)

# ── Meta Persistence ──────────────────────────────────────────────────
_SKIP_KEYS = {
    "_autofeat_X_new", "_autofeat_model",
    "_training_thread", "_autofeat_thread", "_profiling_thread",
    "_training_stderr_file", "_autofeat_stderr_file",
    "_export_artifacts",
}

def _save_meta():
    meta = {}
    with _projects_lock:
        for pid, p in _projects.items():
            meta[pid] = {k: v for k, v in p.items() if k not in _SKIP_KEYS}
    try:
        with open(PROJECTS_META_FILE, "w") as f:
            json.dump(meta, f, default=str, indent=2)
    except Exception as e:
        logger.error(f"Save meta failed: {e}")

def _load_meta():
    if not os.path.exists(PROJECTS_META_FILE): return
    try:
        with open(PROJECTS_META_FILE) as f: meta = json.load(f)
        loaded = {}
        for pid, p in meta.items():
            if not (p.get("filepath") and os.path.exists(p["filepath"])): continue
            p.setdefault("_autofeat_X_new", None); p.setdefault("_autofeat_model", None)
            p.setdefault("_training_thread", None); p.setdefault("_autofeat_thread", None)
            p.setdefault("training_status","idle"); p.setdefault("autofeat_status","idle")
            p.setdefault("autofeat_error", None); p.setdefault("autofeat_suggestions",[])
            p.setdefault("leaderboards",[]); p.setdefault("last_accessed", p.get("created_at",""))
            p.setdefault("profiling_status","idle"); p.setdefault("profiling_error",None)
            p.setdefault("_profiling_thread",None)
            p.setdefault("_training_stderr_file", None); p.setdefault("_autofeat_stderr_file", None)
            p.setdefault("_export_artifacts", [])
            p.setdefault("owner_session_id", None)
            # Reset running states — processes don't survive restarts
            for key, idle in [("autofeat_status","idle"),("training_status","idle"),("profiling_status","idle")]:
                if p.get(key) in ("running","training"): p[key] = idle
            # Reload autofeat model from disk
            afm_path = os.path.join(p.get("base_folder",""), "autofeat_model.pkl")
            if os.path.exists(afm_path):
                try:
                    with open(afm_path,"rb") as f2: p["_autofeat_model"] = pickle.load(f2)
                except Exception: pass
            loaded[pid] = p
        with _projects_lock: _projects.update(loaded)
        logger.info(f"Loaded {len(loaded)} project(s) from disk.")
    except Exception as e:
        logger.error(f"Load meta failed: {e}")

_load_meta()

# ── TTL cleanup thread ────────────────────────────────────────────────
def _cleanup_loop():
    while True:
        time.sleep(30*60)
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=PROJECT_TTL_HOURS)
            to_del = []
            with _projects_lock:
                for pid, p in _projects.items():
                    if p.get("training_status") == "training": continue
                    last = p.get("last_accessed","")
                    try:
                        ts = datetime.fromisoformat(last.replace("Z","+00:00"))
                        if ts.tzinfo is None: ts = ts.replace(tzinfo=timezone.utc)
                        if ts < cutoff: to_del.append(pid)
                    except Exception: pass
            for pid in to_del:
                with _projects_lock: p = _projects.pop(pid, None)
                if p:
                    _cleanup_project_files(p)
            if to_del: _save_meta()
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

threading.Thread(target=_cleanup_loop, daemon=True, name="cleanup").start()

# ── Helpers ───────────────────────────────────────────────────────────
def _check_disk():
    try: return shutil.disk_usage(PROJECTS_DIR).free >= MIN_FREE_DISK_BYTES
    except Exception: return True

def _get_session_owner_id(request: Request, create: bool = True) -> Optional[str]:
    sid = request.session.get(SESSION_OWNER_KEY)
    if not sid and create:
        sid = uuid.uuid4().hex
        request.session[SESSION_OWNER_KEY] = sid
    return sid

def _new_project(name, orig_filename, owner_session_id: Optional[str]):
    pid = uuid.uuid4().hex
    folder = os.path.join(PROJECTS_DIR, pid)
    os.makedirs(folder, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": pid, "name": name, "created_at": now, "last_accessed": now,
        "original_filename": orig_filename,
        "owner_session_id": owner_session_id,
        "base_folder": folder,
        "filepath": os.path.join(folder,"active.csv"),
        "backup_path": os.path.join(folder,"backup.csv"),
        "added_features": {}, "training_status":"idle", "training_error":None,
        "leaderboards":[], "automl_target":None, "profile_path":None,
        "_autofeat_X_new":None,"_autofeat_model":None,"_training_thread":None,
        "autofeat_status":"idle","autofeat_error":None,"autofeat_suggestions":[],
        "_autofeat_thread":None,"_training_stderr_file":None,"_autofeat_stderr_file":None,
        "profiling_status":"idle","profiling_error":None,
        "_profiling_thread":None,
        "_export_artifacts": [],
    }

def _touch(p): p["last_accessed"] = datetime.now(timezone.utc).isoformat()

def _register_export_artifact(project: dict, path: str):
    if not path:
        return
    project.setdefault("_export_artifacts", [])
    if path not in project["_export_artifacts"]:
        project["_export_artifacts"].append(path)

def _cleanup_project_files(project: Optional[dict]):
    if not project:
        return
    for artifact in project.get("_export_artifacts", []):
        _safe_rm(artifact)
    project["_export_artifacts"] = []
    folder = project.get("base_folder", "")
    if folder and os.path.exists(folder):
        shutil.rmtree(folder, ignore_errors=True)

def _get_active(request: Request):
    pid = request.session.get("active_project_id")
    if not pid: return None
    session_id = _get_session_owner_id(request)
    save_meta = False
    with _projects_lock:
        p = _projects.get(pid)
        if not p:
            request.session.pop("active_project_id", None)
            return None
        owner = p.get("owner_session_id")
        if not owner and session_id:
            p["owner_session_id"] = session_id
            save_meta = True
        elif owner and session_id and owner != session_id:
            request.session.pop("active_project_id", None)
            return None
        p["last_accessed"] = datetime.now(timezone.utc).isoformat()
    if save_meta:
        _save_meta()
    return p

def _has_model(p):
    return any(
        (e.get("model_folder","") and os.path.exists(e["model_folder"]) and os.listdir(e["model_folder"]))
        for e in p.get("leaderboards",[])
    )

def _summary(p):
    return {
        "id": p["id"], "name": p["name"], "created_at": p["created_at"],
        "last_accessed": p.get("last_accessed",""), "original_filename": p["original_filename"],
        "training_status": p.get("training_status","idle"), "training_error": p.get("training_error"),
        "leaderboard_count": len(p.get("leaderboards",[])), "has_model": _has_model(p),
        "has_profile": bool(p.get("profile_path") and os.path.exists(p.get("profile_path",""))),
        "profiling_status": p.get("profiling_status","idle"),
        "autofeat_status": p.get("autofeat_status","idle"),
        "added_features": p.get("added_features",{}),
        "has_dataset": os.path.exists(p.get("filepath","")),
        "automl_target": p.get("automl_target"),
    }

def get_required_project(request: Request) -> dict:
    p = _get_active(request)
    if not p: raise AppError("NoActiveProject","No active project. Upload a CSV to create one.",422)
    if not os.path.exists(p.get("filepath","")): raise AppError("DatasetNotLoaded","Dataset not found. Please re-upload.",422)
    return p

def validate_upload(filename, size):
    if not filename: raise ValidationError("No file provided.")
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Unsupported format '{ext}'.", {"file": f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"})
    if size > MAX_FILE_SIZE_MB*1024*1024:
        raise ValidationError(f"File too large ({size/1024/1024:.1f} MB). Max {MAX_FILE_SIZE_MB} MB.")
    return ext

def sanitize_cols(df):
    seen = {}; new = []
    for i,c in enumerate(df.columns):
        s = re.sub(r"[^\w]","_",c.strip()).strip("_") or f"col_{i}"
        if s in seen: seen[s]+=1; s=f"{s}_{seen[s]}"
        else: seen[s]=0
        new.append(s)
    df.columns=new; return df

def make_json_safe(data):
    if isinstance(data,dict): return {k:make_json_safe(v) for k,v in data.items()}
    if isinstance(data,list): return [make_json_safe(v) for v in data]
    if isinstance(data,np.ndarray): return [make_json_safe(v) for v in data.tolist()]
    if isinstance(data,np.integer): return int(data)
    if isinstance(data,(np.floating,float)):
        f=float(data); return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(data,np.generic):
        v=data.item()
        if isinstance(v,float) and (math.isnan(v) or math.isinf(v)): return None
        return v
    if hasattr(data,"to_dict"):
        try: return data.to_dict()
        except: return str(data)
    if isinstance(data,(str,int,bool,type(None))): return data
    if hasattr(data,"isoformat"): return data.isoformat()
    return str(data)

def df_preview(df, rows=10):
    return {
        "columns": df.columns.tolist(),
        "rows": df.head(rows).fillna("").astype(str).values.tolist(),
        "dtypes": {c:str(t) for c,t in df.dtypes.items()},
        "shape": {"rows":int(len(df)),"cols":int(len(df.columns))},
        "null_counts": {c:int(n) for c,n in df.isnull().sum().items() if n>0},
    }

def get_df(p): return pd.read_csv(p["filepath"])

def _kill(proc, timeout=5.0):
    if proc is None: return
    try:
        if proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                proc.kill(); proc.wait(timeout=5.0)
    except Exception: pass

def _read_text_tail(path, max_chars=1200):
    if not path or not os.path.exists(path):
        return ""
    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(size - max_chars * 2, 0))
            return f.read().decode(errors="replace")[-max_chars:]
    except Exception:
        return ""

def _validate_model_export_source(model_folder: str):
    if not model_folder or not os.path.isdir(model_folder):
        raise FileNotFoundError("AutoGluon model folder not found for export.")
    if not os.listdir(model_folder):
        raise FileNotFoundError("AutoGluon model folder is empty.")

def _copy_required_training_csv(project: dict, run_number: Optional[int], dst_path: str):
    base = project.get("base_folder", "")
    candidates = []
    if run_number and base:
        candidates.append(os.path.join(base, f"run{run_number}_data.csv"))
    live = project.get("filepath", "")
    if live:
        candidates.append(live)

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            shutil.copy2(candidate, dst_path)
            return candidate

    raise FileNotFoundError("Training dataset CSV not found for export.")


# ════════════════════════════════════════════════════════════════════
#  MODEL ZIP BUILDER  — enriched feature_engineering.json
# ════════════════════════════════════════════════════════════════════
def _build_zip(project, model_folder, run_number=None):
    """
    Build a self-contained ZIP for Deploy Alchemy.

    feature_engineering.json contains EVERYTHING Deploy Alchemy needs:
      model_name, original_filename, added_features, automl_target,
      actual_problem_type, eval_metric, best_model, best_score,
      columns_used, col_dtypes, num_classes, leaderboard, presets,
      time_limit, holdout_frac, run_label, export_time.
    """
    safe = re.sub(r"[^a-zA-Z0-9_\-]","_",project["name"])
    base = project.get("base_folder","")
    tmp  = tempfile.mkdtemp(prefix="alchemy_zip_")
    try:
        _validate_model_export_source(model_folder)

        # 1. AutoGluon model folder
        shutil.copytree(model_folder, os.path.join(tmp,"autogluon_model"))

        # 2. feature_engineering.json — prefer run-time snapshot
        fe_data = None
        if run_number and base:
            snap = os.path.join(base, f"run{run_number}_fe.json")
            if os.path.exists(snap):
                try:
                    with open(snap) as f: fe_data = json.load(f)
                except Exception: fe_data = None
        if fe_data is None:
            fe_data = {
                "model_name": project["name"],
                "original_filename": project["original_filename"],
                "added_features": project.get("added_features",{}),
                "automl_target": project.get("automl_target"),
                "export_time": datetime.now(timezone.utc).isoformat(),
            }
        with open(os.path.join(tmp,"feature_engineering.json"),"w") as f:
            json.dump(fe_data, f, indent=2)

        # 3. autofeat_model.pkl
        written = False
        if run_number and base:
            s = os.path.join(base, f"run{run_number}_autofeat.pkl")
            if os.path.exists(s):
                shutil.copy(s, os.path.join(tmp,"autofeat_model.pkl")); written=True
        if not written:
            afm = project.get("_autofeat_model")
            if afm is not None:
                with open(os.path.join(tmp,"autofeat_model.pkl"),"wb") as f: pickle.dump(afm,f)
            else:
                d = os.path.join(base,"autofeat_model.pkl")
                if os.path.exists(d): shutil.copy(d, os.path.join(tmp,"autofeat_model.pkl"))

        # 4. processed_data.csv — MUST be present in every model export
        _copy_required_training_csv(project, run_number, os.path.join(tmp, "processed_data.csv"))

        # 5. profile_report.html
        pp = project.get("profile_path","")
        if pp and os.path.exists(pp):
            shutil.copy(pp, os.path.join(tmp,"profile_report.html"))

        # 6. README.md
        target      = fe_data.get("automl_target","target")
        pt          = fe_data.get("actual_problem_type") or fe_data.get("problem_type","")
        best_model  = fe_data.get("best_model","")
        best_score  = fe_data.get("best_score")
        eval_metric = fe_data.get("eval_metric","")
        added       = fe_data.get("added_features",{})

        af_section = ""
        if added:
            lines = "\n".join(f"#   {c} = {formula}" for c,formula in added.items())
            af_section = (
                "\n## AutoFeat Engineered Features\n"
                "```python\n"
                "import pickle\n"
                "with open('autofeat_model.pkl','rb') as f:\n"
                "    af = pickle.load(f)\n"
                f"# Formulas applied:\n{lines}\n"
                "```\n"
            )

        score_str = f"{best_score:.6f}" if isinstance(best_score,float) else str(best_score or "—")
        readme = (
            f"# {project['name']} — Data Alchemy Export\n\n"
            f"**Target:** `{target}`  \n"
            f"**Problem type:** `{pt or 'auto-detected'}`  \n"
            f"**Eval metric:** `{eval_metric}`  \n"
            f"**Best model:** `{best_model}`  \n"
            f"**Best score:** `{score_str}`  \n"
            f"**Original file:** `{project['original_filename']}`  \n"
            f"**Exported:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            "## Quick Start\n"
            "```python\n"
            "from autogluon.tabular import TabularPredictor\n"
            "import pandas as pd\n\n"
            "predictor = TabularPredictor.load('autogluon_model/')\n"
            "new_data  = pd.read_csv('your_data.csv')\n"
            "preds     = predictor.predict(new_data)\n"
            "print(preds)\n"
            "```\n"
            f"{af_section}\n"
            "## ZIP Contents\n"
            "| File | Description |\n|------|-------------|\n"
            "| `autogluon_model/` | AutoGluon TabularPredictor |\n"
            "| `feature_engineering.json` | Full metadata for Deploy Alchemy |\n"
            "| `autofeat_model.pkl` | Fitted AutoFeat transformer (if used) |\n"
            "| `processed_data.csv` | Exact dataset used for training |\n"
            "| `profile_report.html` | EDA report (if generated) |\n"
        )
        with open(os.path.join(tmp,"README.md"),"w") as f: f.write(readme)

        zip_base = os.path.join(tempfile.gettempdir(), f"{safe}_model_{uuid.uuid4().hex[:8]}")
        shutil.make_archive(zip_base,"zip",tmp)
        zip_path = f"{zip_base}.zip"
        _register_export_artifact(project, zip_path)
        return zip_path, safe
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ════════════════════════════════════════════════════════════════════
#  API ROUTES
# ════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    try: disk_gb = round(shutil.disk_usage(PROJECTS_DIR).free/(1024**3),2)
    except: disk_gb = None
    services = _service_capabilities()
    return success_response({
        "healthy": True, "version": "4.1", "framework":"FastAPI",
        "autogluon": services["autogluon"], "autofeat": services["autofeat"],
        "profiling": services["profiling"], "dtale": services["dtale"]["available"],
        "services": services,
        "projects_loaded": len(_projects), "disk_free_gb": disk_gb,
        "project_ttl_hours": PROJECT_TTL_HOURS,
    }, "API operational")

# ── Projects ──────────────────────────────────────────────────────────
@app.get("/api/projects")
def list_projects(request: Request):
    session_id = _get_session_owner_id(request)
    active_id = request.session.get("active_project_id")
    save_meta = False
    with _projects_lock:
        active_project = _projects.get(active_id) if active_id else None
        if active_project and not active_project.get("owner_session_id") and session_id:
            active_project["owner_session_id"] = session_id
            save_meta = True
        items = [
            p for p in _projects.values()
            if p.get("owner_session_id") == session_id
        ]
    if active_id and not any(p["id"] == active_id for p in items):
        request.session.pop("active_project_id", None)
        active_id = None
    if save_meta:
        _save_meta()
    result = []
    for p in items:
        s = _summary(p); s["is_active"] = p["id"]==active_id; result.append(s)
    result.sort(key=lambda x: x.get("created_at",""), reverse=True)
    return success_response({"projects": result, "active_id": active_id})

@app.get("/api/projects/active")
def get_active(request: Request):
    p = _get_active(request)
    if not p: return success_response({"project":None,"active_id":None})
    return success_response({"project":_summary(p),"active_id":p["id"]})

@app.post("/api/projects/switch")
def switch_project(request: Request, body: SwitchProjectRequest):
    session_id = _get_session_owner_id(request)
    save_meta = False
    with _projects_lock:
        p = _projects.get(body.project_id)
        if p and not p.get("owner_session_id") and session_id:
            p["owner_session_id"] = session_id
            save_meta = True
    if not p: return error_response("NotFound",f"Project not found.",404)
    if p.get("owner_session_id") != session_id:
        return error_response("NotFound",f"Project not found.",404)
    request.session["active_project_id"] = body.project_id; _touch(p)
    if save_meta:
        _save_meta()
    return success_response({"project":_summary(p)}, f"Switched to '{p['name']}'")

@app.delete("/api/projects/{project_id}")
def delete_project(request: Request, project_id: str):
    session_id = _get_session_owner_id(request)
    with _projects_lock:
        p = _projects.get(project_id)
        if p and not p.get("owner_session_id") and session_id and request.session.get("active_project_id") == project_id:
            p["owner_session_id"] = session_id
        if not p or p.get("owner_session_id") != session_id:
            p = None
        else:
            _projects.pop(project_id, None)
    if not p: return error_response("NotFound","Project not found.",404)
    _kill(_autofeat_procs.pop(project_id,None))
    _kill(_training_procs.pop(project_id,None))
    _autofeat_cancel.pop(project_id,None)
    _training_cancel.pop(project_id,None)
    _cleanup_project_files(p)
    if request.session.get("active_project_id")==project_id:
        request.session.pop("active_project_id",None)
    _save_meta()
    return success_response({"deleted":project_id}, f"'{p['name']}' deleted.")

# ── Upload ────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload(request: Request, file: UploadFile=File(...), model_name: str=Form("")):
    try:
        if not _check_disk():
            return error_response("ServiceUnavailable","Server storage almost full.",503)
        content = await file.read(); size = len(content)
        orig = secure_filename(file.filename or "upload")
        ext  = validate_upload(orig, size)
        name = re.sub(r"[^\w\s\-]","",((model_name or "").strip() or os.path.splitext(orig)[0])).strip() or "project"
        tmp_path = os.path.join(tempfile.gettempdir(), f"_alchemy_{uuid.uuid4().hex[:8]}{ext}")
        try:
            with open(tmp_path,"wb") as f_tmp: f_tmp.write(content)
            try:
                df = pd.read_csv(tmp_path) if ext==".csv" else (
                    pd.read_excel(tmp_path,engine="openpyxl") if ext==".xlsx" else
                    pd.read_excel(tmp_path,engine="xlrd"))
            except Exception as pe: raise ValidationError(f"Cannot parse file: {pe}")
        finally:
            if os.path.exists(tmp_path): os.remove(tmp_path)
        if df.empty: raise ValidationError("File has no data rows.")
        if len(df.columns)<2: raise ValidationError("Need at least 2 columns.")
        if len(df)>2_000_000: raise ValidationError("Dataset too large (>2M rows).")
        df = sanitize_cols(df)
        session_id = _get_session_owner_id(request)
        project = _new_project(name, orig, session_id)
        df.to_csv(project["filepath"],index=False)
        shutil.copy(project["filepath"],project["backup_path"])
        with _projects_lock: _projects[project["id"]] = project
        request.session["active_project_id"] = project["id"]
        _save_meta()
        return success_response({
            "project_id": project["id"], "model_name": name, "filename": orig,
            "shape": {"rows":int(len(df)),"cols":int(len(df.columns))},
            "preview": df_preview(df), "ttl_hours": PROJECT_TTL_HOURS,
        }, f"'{orig}' → Project '{name}' created.")
    except ValidationError as e: return error_response("ValidationError",e.message,422,e.details)
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",str(e),500)

# ── Dataset ───────────────────────────────────────────────────────────
@app.get("/api/data")
def get_data(request: Request, project=Depends(get_required_project)):
    try: return success_response({"preview":df_preview(get_df(project)),"project":_summary(project),"services":_service_capabilities()})
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",str(e),500)

@app.delete("/api/data/columns")
def drop_columns(request: Request, body: DropColumnsRequest, project=Depends(get_required_project)):
    try:
        if not body.columns: raise ValidationError("'columns' must be non-empty.")
        if project.get("training_status")=="training":
            return error_response("Conflict","Training in progress — dataset locked.",409)
        df = get_df(project)
        missing = [c for c in body.columns if c not in df.columns]
        if missing: raise ValidationError(f"Columns not found: {', '.join(missing)}")
        if len(df.columns)-len(body.columns)<2: raise ValidationError("At least 2 columns must remain.")
        df.drop(columns=body.columns,inplace=True); df.to_csv(project["filepath"],index=False)
        project["_autofeat_X_new"]=None; _save_meta()
        return success_response({"dropped":body.columns,"preview":df_preview(df)},f"Removed {len(body.columns)} column(s)")
    except ValidationError as e: return error_response("ValidationError",e.message,422,e.details)
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",str(e),500)

@app.post("/api/reset")
def reset_data(request: Request, project=Depends(get_required_project)):
    try:
        if not os.path.exists(project["backup_path"]): raise ValidationError("No backup found.")
        if project.get("training_status")=="training":
            return error_response("Conflict","Training in progress — cannot reset.",409)
        shutil.copy(project["backup_path"],project["filepath"])
        project["_autofeat_X_new"]=None; project["added_features"]={}; _save_meta()
        return success_response({"preview":df_preview(get_df(project))},"Restored to original upload.")
    except ValidationError as e: return error_response("ValidationError",e.message,422)
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",str(e),500)


# ════════════════════════════════════════════════════════════════════
#  AutoFeat  (subprocess — truly cancellable)
# ════════════════════════════════════════════════════════════════════
@app.post("/api/features/analyze")
def analyze_features(request: Request, body: AnalyzeFeaturesRequest, project=Depends(get_required_project)):
    if not _autofeat_available():
        return error_response("ServiceUnavailable","AutoFeat not installed. Run: pip install autofeat",503)
    if project.get("autofeat_status")=="running":
        return error_response("Conflict","AutoFeat already running. Cancel it first.",409)
    try:
        df = get_df(project)
        target = body.target_column or df.columns[-1]
        if target not in df.columns: raise ValidationError(f"Target '{target}' not found.")
        pt = body.problem_type or "regression"
        if pt not in ("regression","classification"): pt="regression"
        nums = [c for c in df.select_dtypes(include=["number"]).columns if c!=target]
        if len(nums)<2: raise ValidationError("Need at least 2 numeric feature columns (excluding target).")

        pid  = project["id"]
        base = project["base_folder"]
        result_path = os.path.join(base,"autofeat_result.json")
        afm_path    = os.path.join(base,"autofeat_model.pkl")
        xnew_path   = os.path.join(base,"autofeat_X_new.csv")
        stderr_path = os.path.join(base,"autofeat_worker.stderr.log")
        for p_ in (result_path,):
            if os.path.exists(p_): os.remove(p_)
        if os.path.exists(stderr_path): os.remove(stderr_path)

        project["autofeat_status"]="running"; project["autofeat_error"]=None
        project["autofeat_suggestions"]=[]

        ev = threading.Event(); _autofeat_cancel[pid]=ev

        stderr_file = open(stderr_path, "wb")
        project["_autofeat_stderr_file"] = stderr_file
        proc = subprocess.Popen(
            [sys.executable, _WORKERS_SCRIPT, "autofeat",
             project["filepath"], target, pt, result_path, afm_path, xnew_path],
            stdout=subprocess.DEVNULL, stderr=stderr_file,
        )
        _autofeat_procs[pid] = proc

        def _monitor():
            proc.wait()
            try:
                stderr_file.close()
            except Exception:
                pass
            with _projects_lock: p = _projects.get(pid)
            if not p: _autofeat_cancel.pop(pid,None); _autofeat_procs.pop(pid,None); return
            p["_autofeat_stderr_file"] = None

            if ev.is_set():
                with _projects_lock:
                    if _projects.get(pid):
                        _projects[pid]["autofeat_status"]="idle"
                        _projects[pid]["autofeat_error"]="Cancelled by user."
                _autofeat_cancel.pop(pid,None); _autofeat_procs.pop(pid,None)
                logger.info(f"AutoFeat cancelled: pid={pid}"); return

            if not os.path.exists(result_path):
                err = f"Worker exited (code {proc.returncode}) without result file."
                s = _read_text_tail(stderr_path, 800)
                if s: err += f"\nstderr: {s}"
                with _projects_lock:
                    if _projects.get(pid): _projects[pid]["autofeat_status"]="error"; _projects[pid]["autofeat_error"]=err
                _autofeat_cancel.pop(pid,None); _autofeat_procs.pop(pid,None); return

            try:
                with open(result_path) as f: result = json.load(f)
            except Exception as ex:
                result={"status":"error","error":f"Cannot read result: {ex}"}

            if result.get("status")=="done":
                new_feats = result.get("new_feats",[])
                X_new=None
                if os.path.exists(xnew_path):
                    try: X_new=pd.read_csv(xnew_path)
                    except: pass
                afm_obj=None
                if os.path.exists(afm_path):
                    try:
                        with open(afm_path,"rb") as f: afm_obj=pickle.load(f)
                    except: pass
                with _projects_lock:
                    if _projects.get(pid):
                        _projects[pid]["_autofeat_X_new"]=X_new
                        _projects[pid]["_autofeat_model"]=afm_obj
                        _projects[pid]["autofeat_status"]="done"
                        _projects[pid]["autofeat_suggestions"]=new_feats
                        _projects[pid]["autofeat_error"]=None
                _save_meta()
                logger.info(f"AutoFeat done: pid={pid}, found={len(new_feats)} features")
            else:
                err=result.get("error","Unknown AutoFeat error")
                with _projects_lock:
                    if _projects.get(pid): _projects[pid]["autofeat_status"]="error"; _projects[pid]["autofeat_error"]=err
                logger.error(f"AutoFeat error pid={pid}: {err}")

            _autofeat_cancel.pop(pid,None); _autofeat_procs.pop(pid,None)

        t=threading.Thread(target=_monitor,daemon=True,name=f"af-mon-{pid}")
        project["_autofeat_thread"]=t; t.start()
        return success_response({"status":"started","project_id":pid},
                                "AutoFeat started. Poll /api/features/status.")
    except ValidationError as e:
        project["autofeat_status"]="idle"
        return error_response("ValidationError",e.message,422,e.details)
    except Exception as e:
        project["autofeat_status"]="idle"
        logger.error(traceback.format_exc())
        return error_response("ServerError",f"AutoFeat failed to start: {e}",500)


@app.post("/api/features/add")
def add_feature(request: Request, body: AddFeatureRequest, project=Depends(get_required_project)):
    try:
        feat  = body.feature_name
        X_new = project.get("_autofeat_X_new")
        if X_new is None: raise ValidationError("Run /api/features/analyze first.")
        if project.get("training_status")=="training":
            return error_response("Conflict","Training in progress — cannot add features.",409)
        if feat not in X_new.columns: raise ValidationError(f"Feature '{feat}' not in AutoFeat results.")
        df = get_df(project)
        if len(X_new)!=len(df):
            raise ValidationError("Dataset changed since AutoFeat ran. Re-run the analysis.")
        formula   = feat
        safe_name = re.sub(r"[^\w]","_",feat.strip()).strip("_") or f"feat_{len(df.columns)}"
        base=safe_name; ctr=1
        while safe_name in df.columns: safe_name=f"{base}_{ctr}"; ctr+=1
        df[safe_name]=X_new[feat].values; df.to_csv(project["filepath"],index=False)
        project["added_features"][safe_name]=formula; _save_meta()
        return success_response({"added":safe_name,"original_name":feat,"preview":df_preview(df)},
                                f"Feature '{safe_name}' added.")
    except ValidationError as e: return error_response("ValidationError",e.message,422,e.details)
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",str(e),500)

@app.get("/api/features/status")
def features_status(request: Request):
    p = _get_active(request)
    if not p: return success_response({"autofeat_status":"idle","suggestions":[],"error":None})
    return success_response({"autofeat_status":p.get("autofeat_status","idle"),
                             "suggestions":p.get("autofeat_suggestions",[]),
                             "error":p.get("autofeat_error")})

@app.post("/api/features/cancel")
def cancel_autofeat(request: Request):
    """Kill AutoFeat subprocess immediately."""
    p = _get_active(request); pid = p.get("id") if p else None
    if pid:
        ev=_autofeat_cancel.get(pid)
        if ev: ev.set()
        _kill(_autofeat_procs.get(pid)); _autofeat_procs.pop(pid,None)
    with _projects_lock:
        if p and p.get("autofeat_status")=="running":
            p["autofeat_status"]="idle"; p["autofeat_error"]="Cancelled by user."
    return success_response({"status":"cancelled"},"AutoFeat cancelled.")


# ── Exploration ───────────────────────────────────────────────────────
@app.post("/api/explore/dtale")
def start_dtale(request: Request, project=Depends(get_required_project)):
    dtale_caps = _dtale_capabilities()
    if not dtale_caps["supported"]:
        return error_response("DtalePortBlocked", dtale_caps["reason"], 503, {"dtale": dtale_caps})
    if _dtale_mod() is None:
        return error_response("ServiceUnavailable","D-Tale not installed. Run: pip install dtale",503,{"install_cmd":"pip install dtale","dtale":dtale_caps})
    try:
        df=get_df(project)
        try:
            for inst in dtale.instances().values(): inst.kill()
        except: pass
        d=dtale.show(df,ignore_duplicate=True,open_browser=False,host="0.0.0.0")
        raw=str(d._main_url)
        host=os.environ.get("PUBLIC_HOST","localhost")
        pm=re.search(r":(\d{4,5})/",raw); port=pm.group(1) if pm else "40000"
        pm2=re.search(r"(dtale/.*)",raw); path=pm2.group(1) if pm2 else "dtale/main/1"
        return success_response({"url":f"http://{host}:{port}/{path}"},"D-Tale started.")
    except Exception as e:
        s=str(e).lower()
        if any(k in s for k in ("port","bind","address","connection","refused","errno","socket")):
            return error_response("DtalePortBlocked","Platform doesn't support the dtale port.",503)
        logger.error(traceback.format_exc())
        return error_response("ServerError",f"D-Tale failed: {e}",500)

@app.post("/api/explore/profile")
def generate_profile(request: Request, project=Depends(get_required_project)):
    ydata=_ydata_mod()
    if ydata is None:
        return error_response("ServiceUnavailable","ydata-profiling not installed.",503,{"install_cmd":"pip install ydata-profiling"})
    if project.get("profiling_status")=="running":
        return error_response("Conflict","Profile already running.",409)
    pid=project["id"]
    with _projects_lock:
        if _projects.get(pid): _projects[pid]["profiling_status"]="running"; _projects[pid]["profiling_error"]=None
    project["profiling_status"]="running"; project["profiling_error"]=None

    def _do():
        with _projects_lock: p=_projects.get(pid)
        if not p: return
        try:
            df=get_df(p); pp=os.path.join(p["base_folder"],"profile_report.html")
            yd=_ydata_mod()
            pr=yd.ProfileReport(df,title=f"Data Alchemy — {p['name']}",explorative=True,minimal=len(df)>50000)
            pr.to_file(pp)
            with _projects_lock:
                if _projects.get(pid): _projects[pid]["profile_path"]=pp; _projects[pid]["profiling_status"]="done"
            _save_meta(); logger.info(f"Profile done: pid={pid}")
        except Exception as ex:
            with _projects_lock:
                if _projects.get(pid): _projects[pid]["profiling_status"]="error"; _projects[pid]["profiling_error"]=str(ex)
            logger.error(f"Profile error pid={pid}: {traceback.format_exc()}")

    t=threading.Thread(target=_do,daemon=True,name=f"profile-{pid}")
    project["_profiling_thread"]=t; t.start()
    return success_response({"status":"started","project_id":pid},"Profile started. Poll /api/explore/profile/status.")

@app.get("/api/explore/profile/status")
def profile_status(request: Request):
    p=_get_active(request)
    if not p: return success_response({"profiling_status":"idle","error":None,"profile_ready":False})
    return success_response({"profiling_status":p.get("profiling_status","idle"),"error":p.get("profiling_error"),
                             "profile_ready":bool(p.get("profile_path") and os.path.exists(p.get("profile_path","")))})

@app.get("/api/explore/profile/view")
def view_profile(request: Request):
    p=_get_active(request); path=p.get("profile_path") if p else None
    if not path or not os.path.exists(path):
        return error_response("NotFound","No profile report — generate it first.",404)
    return FileResponse(path,media_type="text/html")


# ════════════════════════════════════════════════════════════════════
#  AutoML  (subprocess — truly cancellable + hard time-limit watchdog)
# ════════════════════════════════════════════════════════════════════
VALID_PROBLEM_TYPES={"auto","binary","multiclass","regression"}
VALID_METRICS={"auto","accuracy","f1","roc_auc","root_mean_squared_error","mean_absolute_error","r2"}
VALID_PRESETS={
    "extreme","extreme_quality",
    "best_v150","best_quality_v150",
    "high_v150","high_quality_v150",
    "best_quality","high_quality","good_quality","medium_quality",
    "interpretable","optimize_for_deployment","light","very_light",
}

@app.post("/api/automl/train")
def train_automl(request: Request, body: TrainRequest, project=Depends(get_required_project)):
    if not _autogluon_available():
        return error_response("ServiceUnavailable","AutoGluon not installed. Run: pip install autogluon.tabular",503)
    try:
        if project.get("training_status")=="training":
            return error_response("Conflict","Training already in progress. Cancel it first.",409)

        df=get_df(project)
        target=body.target_column
        if target not in df.columns:
            raise ValidationError(f"Target '{target}' not found.",{"target_column":f"Available: {df.columns.tolist()}"})

        prob_type = body.problem_type or "auto"
        if prob_type not in VALID_PROBLEM_TYPES: raise ValidationError(f"Invalid problem_type '{prob_type}'.")

        metric = body.eval_metric or "auto"
        if metric not in VALID_METRICS: raise ValidationError(f"Invalid eval_metric '{metric}'.")

        time_limit = int(body.time_limit or 300)
        if time_limit<30: raise ValidationError("time_limit must be >= 30 seconds.")

        holdout = float(body.holdout_frac if body.holdout_frac is not None else 0.2)
        if not (0.05<=holdout<=0.5): raise ValidationError("holdout_frac must be 0.05–0.5.")

        presets = body.presets or "medium_quality"
        if presets not in VALID_PRESETS: raise ValidationError(f"Invalid presets '{presets}'.")

        if len(df)<20: raise ValidationError(f"Dataset too small ({len(df)} rows). Need at least 20.")

        run_n  = len(project.get("leaderboards",[]))+1
        run_lbl= (body.run_label or f"Run {run_n}").strip()[:80] or f"Run {run_n}"
        pid    = project["id"]
        base   = project["base_folder"]

        with _projects_lock:
            if _projects.get(pid):
                _projects[pid]["training_status"]="training"
                _projects[pid]["training_error"]=None
                _projects[pid]["automl_target"]=target
        project["training_status"]="training"; project["training_error"]=None; project["automl_target"]=target

        mf           = os.path.join(base,f"model_run{run_n}")
        result_path  = os.path.join(base,f"run{run_n}_result.json")
        snap_csv     = os.path.join(base,f"run{run_n}_data.csv")
        snap_fe      = os.path.join(base,f"run{run_n}_fe.json")
        snap_afm     = os.path.join(base,f"run{run_n}_autofeat.pkl")
        stderr_path  = os.path.join(base,f"run{run_n}_worker.stderr.log")

        if os.path.exists(mf): shutil.rmtree(mf)
        os.makedirs(mf,exist_ok=True)
        if os.path.exists(result_path): os.remove(result_path)
        if os.path.exists(stderr_path): os.remove(stderr_path)

        # Snapshot the exact CSV that will be trained on
        shutil.copy(project["filepath"],snap_csv)

        # Initial feature_engineering.json snapshot (will be enriched after training)
        snap_added = dict(project.get("added_features",{}))
        fe_snap = {
            "model_name":          project["name"],
            "original_filename":   project["original_filename"],
            "added_features":      snap_added,
            "automl_target":       target,
            "run_label":           run_lbl,
            "run_number":          run_n,
            "problem_type":        prob_type,
            "actual_problem_type": "",
            "eval_metric":         metric,
            "presets":             presets,
            "time_limit":          time_limit,
            "holdout_frac":        holdout,
            "best_model":          "",
            "best_score":          None,
            "columns_used":        [],
            "col_dtypes":          {},
            "num_classes":         None,
            "leaderboard":         [],
            "export_time":         datetime.now(timezone.utc).isoformat(),
        }
        with open(snap_fe,"w") as f: json.dump(fe_snap,f,indent=2)

        # Snapshot autofeat model if present
        src_afm=os.path.join(base,"autofeat_model.pkl")
        if os.path.exists(src_afm): shutil.copy(src_afm,snap_afm)

        config_json = json.dumps({
            "target": target, "problem_type": prob_type, "metric": metric,
            "presets": presets, "time_limit": time_limit, "holdout_frac": holdout,
        })

        ev=threading.Event(); _training_cancel[pid]=ev

        stderr_file = open(stderr_path, "wb")
        project["_training_stderr_file"] = stderr_file
        proc=subprocess.Popen(
            [sys.executable,_WORKERS_SCRIPT,"train",snap_csv,mf,config_json,result_path],
            stdout=subprocess.DEVNULL, stderr=stderr_file,
        )
        _training_procs[pid]=proc

        # ── Watchdog: hard-kill if AutoGluon overshoots time_limit ──────
        def _watchdog():
            deadline=time.monotonic()+time_limit+WATCHDOG_BUFFER_SEC
            while proc.poll() is None:
                if time.monotonic()>deadline:
                    if not ev.is_set():
                        logger.warning(f"Watchdog killing training proc pid={pid} after {time_limit}+{WATCHDOG_BUFFER_SEC}s")
                    _kill(proc); break
                time.sleep(5)
        threading.Thread(target=_watchdog,daemon=True,name=f"watchdog-{pid}").start()

        # ── Monitor: reads result JSON after subprocess finishes ──────────
        cfg={"run_number":run_n,"run_label":run_lbl,"target":target,
             "problem_type":prob_type,"metric":metric,"presets":presets,
             "time_limit":time_limit,"holdout_frac":holdout}

        def _monitor():
            proc.wait(); exit_code=proc.returncode
            try:
                stderr_file.close()
            except Exception:
                pass
            with _projects_lock: p2=_projects.get(pid)
            if not p2:
                _training_cancel.pop(pid,None); _training_procs.pop(pid,None); return
            p2["_training_stderr_file"] = None

            if ev.is_set():
                if os.path.exists(mf): shutil.rmtree(mf,ignore_errors=True)
                with _projects_lock:
                    if _projects.get(pid):
                        _projects[pid]["training_status"]="idle"
                        _projects[pid]["training_error"]="Cancelled by user."
                _training_cancel.pop(pid,None); _training_procs.pop(pid,None)
                logger.info(f"Training cancelled: pid={pid}"); return

            if not os.path.exists(result_path):
                err=f"Worker exited (code {exit_code}) without result file."
                s = _read_text_tail(stderr_path, 1200)
                if s: err+=f"\nstderr: {s}"
                with _projects_lock:
                    if _projects.get(pid): _projects[pid]["training_status"]="error"; _projects[pid]["training_error"]=err
                _training_cancel.pop(pid,None); _training_procs.pop(pid,None); return

            try:
                with open(result_path) as f: result=json.load(f)
            except Exception as ex:
                result={"status":"error","error":f"Cannot read result: {ex}"}

            if result.get("status")=="done":
                leaderboard     = result.get("leaderboard",[])
                best_model      = result.get("best_model","Unknown")
                best_score      = result.get("best_score")
                eval_metric_n   = result.get("eval_metric",cfg["metric"])
                normalized_preset = result.get("normalized_preset", cfg["presets"])
                feat_imp        = result.get("feat_importance",[])
                model_info      = result.get("model_info",{})
                actual_pt       = result.get("actual_problem_type",cfg["problem_type"])
                cols_used       = result.get("columns_used",[])
                num_classes     = result.get("num_classes")
                col_dtypes      = result.get("col_dtypes",{})

                # ── Enrich feature_engineering.json with post-training data ──
                try:
                    if os.path.exists(snap_fe):
                        with open(snap_fe) as f: fe_ex=json.load(f)
                        fe_ex.update({
                            "actual_problem_type": actual_pt,
                            "best_model":          best_model,
                            "best_score":          best_score,
                            "eval_metric":         eval_metric_n,
                            "requested_preset":    cfg["presets"],
                            "normalized_preset":   normalized_preset,
                            "presets":             normalized_preset,
                            "columns_used":        cols_used,
                            "col_dtypes":          col_dtypes,
                            "num_classes":         num_classes,
                            "leaderboard":         leaderboard,
                        })
                        with open(snap_fe,"w") as f: json.dump(fe_ex,f,indent=2)
                except Exception: pass

                entry={
                    "run": cfg["run_number"], "label": cfg["run_label"],
                    "model_folder": mf,
                    "config": {
                        **{k:v for k,v in cfg.items() if k not in ("run_label","run_number")},
                        "requested_preset": cfg["presets"],
                        "presets": normalized_preset,
                    },
                    "leaderboard": leaderboard,
                    "best_model":  str(best_model),
                    "best_score":  best_score,
                    "metric":      eval_metric_n,
                    "feat_importance": feat_imp,
                    "model_info":  model_info,
                    "trained_at":  datetime.now(timezone.utc).isoformat(),
                }
                with _projects_lock:
                    if _projects.get(pid):
                        _projects[pid].setdefault("leaderboards",[]).append(entry)
                        _projects[pid]["training_status"]="done"
                _save_meta()
                logger.info(f"Training done: pid={pid}, run={cfg['run_number']}, best={best_model}, score={best_score}")
            else:
                err=result.get("error","Unknown training error")
                with _projects_lock:
                    if _projects.get(pid): _projects[pid]["training_status"]="error"; _projects[pid]["training_error"]=err
                logger.error(f"Training error pid={pid}: {err}")

            _training_cancel.pop(pid,None); _training_procs.pop(pid,None)

        t=threading.Thread(target=_monitor,daemon=True,name=f"train-mon-{pid}")
        project["_training_thread"]=t; t.start()

        return success_response({
            "status":"started","project_id":pid,"run_label":run_lbl,
            "run_number":run_n,"time_limit":time_limit,
        },f"Training started (time limit: {time_limit}s). Poll /api/automl/status.")

    except ValidationError as e: return error_response("ValidationError",e.message,422,e.details)
    except Exception as e: logger.error(traceback.format_exc()); return error_response("ServerError",f"Failed to start training: {e}",500)


@app.get("/api/automl/status")
def automl_status(request: Request):
    p=_get_active(request)
    if not p:
        return success_response({"training_status":"idle","training_error":None,"leaderboards":[],"automl_target":None,"project_name":None})
    return success_response(make_json_safe({
        "training_status": p.get("training_status","idle"),
        "training_error":  p.get("training_error"),
        "leaderboards":    p.get("leaderboards",[]),
        "automl_target":   p.get("automl_target"),
        "project_name":    p.get("name"),
    }))

@app.post("/api/automl/cancel")
def cancel_training(request: Request):
    """Kill AutoGluon subprocess immediately."""
    p=_get_active(request); pid=p.get("id") if p else None
    if pid:
        ev=_training_cancel.get(pid)
        if ev: ev.set()
        _kill(_training_procs.get(pid)); _training_procs.pop(pid,None)
    with _projects_lock:
        if p and p.get("training_status")=="training":
            p["training_status"]="idle"; p["training_error"]="Cancelled by user."
    return success_response({"status":"cancelled"},"Training cancelled.")

# ── Combined Status ───────────────────────────────────────────────────
@app.get("/api/status/all")
def all_status(request: Request):
    p=_get_active(request)
    if not p:
        return success_response({"autofeat_status":"idle","autofeat_suggestions":[],"autofeat_error":None,
                                  "training_status":"idle","training_error":None,"leaderboards":[],
                                  "profiling_status":"idle","profiling_error":None,"profile_ready":False,"automl_target":None})
    return success_response(make_json_safe({
        "autofeat_status":      p.get("autofeat_status","idle"),
        "autofeat_suggestions": p.get("autofeat_suggestions",[]),
        "autofeat_error":       p.get("autofeat_error"),
        "training_status":      p.get("training_status","idle"),
        "training_error":       p.get("training_error"),
        "leaderboards":         p.get("leaderboards",[]),
        "profiling_status":     p.get("profiling_status","idle"),
        "profiling_error":      p.get("profiling_error"),
        "profile_ready": bool(p.get("profile_path") and os.path.exists(p.get("profile_path",""))),
        "automl_target": p.get("automl_target"),
    }))

# ── Downloads ─────────────────────────────────────────────────────────
@app.get("/api/downloads/status")
def download_status(request: Request):
    p=_get_active(request)
    if not p:
        return success_response({"has_data":False,"has_model":False,"has_profile":False,"model_name":"","runs":[],"ttl_hours":PROJECT_TTL_HOURS})
    runs=[]
    for e in p.get("leaderboards",[]):
        mf=e.get("model_folder","")
        runs.append({"run":e.get("run"),"label":e.get("label",f"Run {e.get('run')}"),
                     "available":bool(mf and os.path.exists(mf) and os.listdir(mf)),
                     "best_model":e.get("best_model",""),"best_score":e.get("best_score"),
                     "metric":e.get("metric",""),"model_folder":mf})
    return success_response({
        "has_data":    os.path.exists(p.get("filepath","")),
        "has_model":   any(r["available"] for r in runs),
        "has_profile": bool(p.get("profile_path") and os.path.exists(p.get("profile_path",""))),
        "model_name":  p.get("name","model"),
        "added_features": p.get("added_features",{}),
        "runs": runs, "ttl_hours": PROJECT_TTL_HOURS, "last_accessed": p.get("last_accessed",""),
    })

@app.get("/api/download/csv")
def download_csv(request: Request, filename: Optional[str]=Query(None)):
    p=_get_active(request)
    if not p or not os.path.exists(p.get("filepath","")): return error_response("NotFound","No dataset.",404)
    safe=re.sub(r"[^a-zA-Z0-9_\-]","_",p["name"])
    name=re.sub(r"[^\w\-]","_",filename or f"{safe}_data")
    return FileResponse(path=p["filepath"],filename=f"{name}.csv",media_type="text/csv")

@app.get("/api/download/model/{run_number}")
def download_model_run(request: Request, run_number: int, background_tasks: BackgroundTasks, filename: Optional[str]=Query(None)):
    p=_get_active(request)
    if not p: return error_response("NotFound","No active project.",404)
    entry=next((e for e in p.get("leaderboards",[]) if e.get("run")==run_number),None)
    if not entry: return error_response("NotFound",f"Run {run_number} not found.",404)
    mf=entry.get("model_folder","")
    if not mf or not os.path.exists(mf) or not os.listdir(mf):
        return error_response("NotFound",f"Model files for run {run_number} not found.",404)
    safe=re.sub(r"[^a-zA-Z0-9_\-]","_",p["name"])
    rl=re.sub(r"[^\w\-]","_",entry.get("label",f"Run_{run_number}"))
    name=re.sub(r"[^\w\-]","_",filename or f"{safe}_{rl}")
    try:
        zip_path,_=_build_zip(p,mf,run_number)
        background_tasks.add_task(_safe_rm,zip_path)
        return FileResponse(path=zip_path,filename=f"{name}.zip",media_type="application/zip")
    except Exception as e:
        logger.error(traceback.format_exc()); return error_response("ServerError",f"ZIP failed: {e}",500)

def _safe_rm(path):
    try:
        if os.path.exists(path): os.remove(path)
    except: pass
    try:
        with _projects_lock:
            for project in _projects.values():
                artifacts = project.get("_export_artifacts", [])
                if path in artifacts:
                    project["_export_artifacts"] = [p for p in artifacts if p != path]
    except:
        pass

@app.get("/api/download/model")
def download_model_legacy(request: Request, background_tasks: BackgroundTasks, filename: Optional[str]=Query(None)):
    p=_get_active(request)
    if not p: return error_response("NotFound","No active project.",404)
    lbs=p.get("leaderboards",[])
    if not lbs: return error_response("NotFound","No trained model.",404)
    return download_model_run(request,lbs[-1]["run"],background_tasks,filename)

@app.get("/api/download/profile")
def download_profile(request: Request, filename: Optional[str]=Query(None)):
    p=_get_active(request)
    if not p or not p.get("profile_path") or not os.path.exists(p["profile_path"]):
        return error_response("NotFound","No profile report.",404)
    safe=re.sub(r"[^a-zA-Z0-9_\-]","_",p["name"])
    name=re.sub(r"[^\w\-]","_",filename or f"{safe}_profile")
    return FileResponse(path=p["profile_path"],filename=f"{name}.html",media_type="text/html")


# ════════════════════════════════════════════════════════════════════
#  SELECTIVE MODEL DOWNLOAD
#  User picks ≤5 models from the leaderboard; we build a pruned ZIP
#  containing only those model directories + their required base-model
#  dependencies (resolved via AutoGluon trainer.get_minimum_models_set).
#  _FULL refit counterparts are included automatically (required by
#  trainer.pkl for the predictor to load without errors).
# ════════════════════════════════════════════════════════════════════

def _resolve_model_dirs(model_folder: str, selected: list) -> tuple:
    """
    Load the predictor from model_folder and compute the minimum set of
    model *directory names* needed to serve all selected models.

    Returns (needed_dirs: set[str], per_model_deps: dict[str, list[str]])
      - needed_dirs includes FULL counterparts where they exist on disk
      - per_model_deps maps each selected model to its direct base deps
    """
    try:
        from autogluon.tabular import TabularPredictor
        predictor  = TabularPredictor.load(model_folder)
        trainer    = predictor._trainer
        models_dir = os.path.join(model_folder, "models")

        # Combined minimum set for ALL selected models
        needed_base: set = trainer.get_minimum_models_set(selected)

        # Add _FULL counterparts (needed for trainer.pkl to load cleanly)
        needed_all = set(needed_base)
        for m in list(needed_base):
            full = m + "_FULL"
            if os.path.exists(os.path.join(models_dir, full)):
                needed_all.add(full)

        # Per-model direct deps (excluding FULL and self)
        per_model: dict = {}
        for m in selected:
            try:
                m_min = trainer.get_minimum_model_set(m)
                direct_deps = sorted(x for x in m_min if x != m and "_FULL" not in x)
            except Exception:
                direct_deps = []
            per_model[m] = direct_deps

        return needed_all, per_model
    except Exception:
        logger.error(traceback.format_exc())
        return set(selected), {}


def _compute_per_model_sizes(model_folder: str, model_names: list) -> dict:
    """
    For each model in model_names, compute the total disk size (bytes) of
    the directories needed to serve it (including deps + FULL counterparts).
    Loads the predictor once and iterates over all models.
    Returns dict[model_name -> size_bytes].
    """
    try:
        from autogluon.tabular import TabularPredictor
        predictor  = TabularPredictor.load(model_folder)
        trainer    = predictor._trainer
        models_dir = os.path.join(model_folder, "models")

        result: dict = {}
        for m in model_names:
            try:
                min_set = trainer.get_minimum_model_set(m)
                # Include FULL counterparts
                dirs_needed = set(min_set)
                for base in list(min_set):
                    full = base + "_FULL"
                    if os.path.exists(os.path.join(models_dir, full)):
                        dirs_needed.add(full)
                # Sum sizes
                total = 0
                for d in dirs_needed:
                    dpath = os.path.join(models_dir, d)
                    if os.path.exists(dpath):
                        total += sum(
                            os.path.getsize(os.path.join(root, fname))
                            for root, _, files in os.walk(dpath)
                            for fname in files
                        )
                result[m] = total
            except Exception:
                result[m] = 0
        return result
    except Exception:
        return {}


def _build_selective_zip(project: dict, model_folder: str,
                         needed_dirs: set, run_number: int) -> tuple:
    """
    Build a ZIP with a pruned autogluon_model/ directory (only needed_dirs
    inside models/) plus all standard Data-Alchemy metadata files.

    Returns (zip_path: str, safe_name: str) — caller must delete zip_path.
    """
    import pickle as _pickle
    base     = project.get("base_folder", "")
    safe     = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
    tmp      = tempfile.mkdtemp(prefix="alchemy_sel_")
    src_root = model_folder

    try:
        _validate_model_export_source(src_root)
        # ── 1. Pruned autogluon_model/ ─────────────────────────────────
        dst_ag = os.path.join(tmp, "autogluon_model")
        os.makedirs(dst_ag)

        # Copy root-level files (predictor.pkl, learner.pkl, metadata.json,
        # version.txt) and non-model directories (utils/)
        for item in os.listdir(src_root):
            if item == "models":
                continue
            src_item = os.path.join(src_root, item)
            dst_item = os.path.join(dst_ag, item)
            if os.path.isfile(src_item):
                shutil.copy2(src_item, dst_item)
            elif os.path.isdir(src_item):
                shutil.copytree(src_item, dst_item)

        # models/ subdirectory
        dst_models = os.path.join(dst_ag, "models")
        os.makedirs(dst_models)

        # trainer.pkl is mandatory — AutoGluon cannot load without it
        src_trainer = os.path.join(src_root, "models", "trainer.pkl")
        if os.path.exists(src_trainer):
            shutil.copy2(src_trainer, os.path.join(dst_models, "trainer.pkl"))

        # Copy only the needed model directories
        src_models = os.path.join(src_root, "models")
        copied_model_dirs = []
        missing_dirs = []
        for dir_name in needed_dirs:
            src_d = os.path.join(src_models, dir_name)
            if os.path.exists(src_d):
                shutil.copytree(src_d, os.path.join(dst_models, dir_name))
                copied_model_dirs.append(dir_name)
            else:
                missing_dirs.append(dir_name)

        if missing_dirs:
            raise FileNotFoundError(
                f"Missing model directories for export: {', '.join(sorted(missing_dirs))}"
            )
        if not copied_model_dirs:
            raise FileNotFoundError("No model directories were copied into the selective export.")

        # ── 2. feature_engineering.json ───────────────────────────────
        fe_snap = None
        if base and run_number:
            snap_fe = os.path.join(base, f"run{run_number}_fe.json")
            if os.path.exists(snap_fe):
                try:
                    with open(snap_fe) as f:
                        fe_snap = json.load(f)
                except Exception:
                    pass
        if fe_snap is None:
            fe_snap = {
                "model_name":        project["name"],
                "original_filename": project["original_filename"],
                "added_features":    project.get("added_features", {}),
                "automl_target":     project.get("automl_target"),
            }
        with open(os.path.join(tmp, "feature_engineering.json"), "w") as f:
            json.dump(fe_snap, f, indent=2)

        # ── 3. autofeat_model.pkl ─────────────────────────────────────
        af_written = False
        for candidate in [
            (base and os.path.join(base, f"run{run_number}_autofeat.pkl")),
            (base and os.path.join(base, "autofeat_model.pkl")),
        ]:
            if candidate and os.path.exists(candidate):
                shutil.copy2(candidate, os.path.join(tmp, "autofeat_model.pkl"))
                af_written = True
                break
        if not af_written:
            afm = project.get("_autofeat_model")
            if afm is not None:
                with open(os.path.join(tmp, "autofeat_model.pkl"), "wb") as f:
                    _pickle.dump(afm, f)

        # ── 4. processed_data.csv ─────────────────────────────────────
        _copy_required_training_csv(project, run_number, os.path.join(tmp, "processed_data.csv"))

        # ── 5. profile_report.html ────────────────────────────────────
        pp = project.get("profile_path", "")
        if pp and os.path.exists(pp):
            shutil.copy2(pp, os.path.join(tmp, "profile_report.html"))

        # ── 6. README.md ──────────────────────────────────────────────
        target      = fe_snap.get("automl_target", "target")
        pt          = fe_snap.get("actual_problem_type") or fe_snap.get("problem_type", "")
        best_model  = fe_snap.get("best_model", "")
        best_score  = fe_snap.get("best_score")
        eval_metric = fe_snap.get("eval_metric", "")
        score_str   = f"{best_score:.6f}" if isinstance(best_score, float) else str(best_score or "—")
        added       = fe_snap.get("added_features", {})

        included_models = sorted(d for d in needed_dirs if "_FULL" not in d)
        model_list_str  = "\n".join(f"#   • {m}" for m in included_models)

        af_section = ""
        if added:
            lines = "\n".join(f"#   {c} = {formula}" for c, formula in added.items())
            af_section = (
                "\n## AutoFeat Engineered Features\n```python\n"
                "import pickle\nwith open('autofeat_model.pkl','rb') as f:\n"
                "    af = pickle.load(f)\n"
                f"# Formulas applied:\n{lines}\n```\n"
            )

        readme = (
            f"# {project['name']} — Data Alchemy Export (Selective)\n\n"
            f"**Target:** `{target}`  \n"
            f"**Problem type:** `{pt or 'auto-detected'}`  \n"
            f"**Eval metric:** `{eval_metric}`  \n"
            f"**Best model (run-wide):** `{best_model}`  \n"
            f"**Best score:** `{score_str}`  \n"
            f"**Exported:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            "## Included Models\n"
            f"```\n{model_list_str}\n```\n\n"
            "## Quick Start\n```python\n"
            "from autogluon.tabular import TabularPredictor\nimport pandas as pd\n\n"
            "# Load predictor (uses the best available model in this ZIP)\n"
            "predictor = TabularPredictor.load('autogluon_model/')\n"
            "new_data  = pd.read_csv('your_data.csv')\n"
            "preds     = predictor.predict(new_data)\n\n"
            f"# Predict with a specific model:\n"
            f"preds     = predictor.predict(new_data, model='{best_model or included_models[0] if included_models else 'ModelName'}')\n"
            f"```\n{af_section}\n"
            "## ZIP Contents\n"
            "| File | Description |\n|------|-------------|\n"
            "| `autogluon_model/` | Pruned AutoGluon predictor (selected models only) |\n"
            "| `feature_engineering.json` | Full metadata for Deploy Alchemy |\n"
            "| `autofeat_model.pkl` | AutoFeat transformer (if used) |\n"
            "| `processed_data.csv` | Exact dataset used for training |\n"
            "| `profile_report.html` | EDA report (if generated) |\n"
        )
        with open(os.path.join(tmp, "README.md"), "w") as f:
            f.write(readme)

        # ── 7. Create archive ─────────────────────────────────────────
        zip_base = os.path.join(
            tempfile.gettempdir(),
            f"{safe}_selective_{uuid.uuid4().hex[:8]}"
        )
        shutil.make_archive(zip_base, "zip", tmp)
        zip_path = f"{zip_base}.zip"
        _register_export_artifact(project, zip_path)
        return zip_path, safe

    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@app.get("/api/automl/run/{run_number}/models")
def get_run_model_list(request: Request, run_number: int,
                       project=Depends(get_required_project)):
    """
    Return the full leaderboard for a run, enriched with:
      size_bytes — disk space needed to serve this model (incl. deps + FULL)
      deps       — base models this model depends on (ensemble inputs)
      is_best    — whether this is the overall best model of the run
      is_ensemble — whether this is an ensemble/stacked model
    """
    entry = next(
        (e for e in project.get("leaderboards", []) if e.get("run") == run_number),
        None,
    )
    if not entry:
        return error_response("NotFound", f"Run {run_number} not found.", 404)

    model_folder = entry.get("model_folder", "")
    if not model_folder or not os.path.exists(model_folder):
        return error_response("NotFound", "Model files not found on disk.", 404)

    if not _autogluon_available():
        return error_response("ServiceUnavailable", "AutoGluon not available.", 503)

    try:
        leaderboard  = entry.get("leaderboard", [])
        model_names  = [row.get("model", "") for row in leaderboard if row.get("model")]

        sizes        = _compute_per_model_sizes(model_folder, model_names)
        _, per_deps  = _resolve_model_dirs(model_folder, model_names)

        best = entry.get("best_model", "")
        rows = []
        for lb_row in leaderboard:
            m = lb_row.get("model", "")
            if not m:
                continue
            rows.append({
                "model":         m,
                "score_val":     make_json_safe(lb_row.get("score_val")),
                "pred_time_val": make_json_safe(lb_row.get("pred_time_val")),
                "fit_time":      make_json_safe(lb_row.get("fit_time")),
                "stack_level":   make_json_safe(lb_row.get("stack_level")),
                "is_ensemble":   "Ensemble" in m or "Weighted" in m or (lb_row.get("stack_level") or 1) > 1,
                "is_best":       m == best,
                "deps":          per_deps.get(m, []),
                "size_bytes":    sizes.get(m, 0),
            })

        return success_response({
            "models":       rows,
            "run_number":   run_number,
            "run_label":    entry.get("label", f"Run {run_number}"),
            "best_model":   best,
            "metric":       entry.get("metric", ""),
            "total_models": len(rows),
        })
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", str(e), 500)


def _normalize_selected_models(raw_selected) -> list:
    selected = []
    for item in raw_selected or []:
        if item is None:
            continue
        if isinstance(item, str):
            parts = [p.strip() for p in item.split(",")]
            selected.extend([p for p in parts if p])
        else:
            selected.append(str(item).strip())
    return selected

def _build_selective_download_response(
    project: dict,
    run_number: int,
    selected: list,
    filename: Optional[str],
    background_tasks: BackgroundTasks,
):
    if not selected:
        return error_response("ValidationError", "Select at least 1 model.", 422)
    if len(selected) > 5:
        return error_response("ValidationError",
            "Maximum 5 models allowed per ZIP. Reduce your selection.", 422)

    entry = next(
        (e for e in project.get("leaderboards", []) if e.get("run") == run_number),
        None,
    )
    if not entry:
        return error_response("NotFound", f"Run {run_number} not found.", 404)

    model_folder = entry.get("model_folder", "")
    if not model_folder or not os.path.exists(model_folder):
        return error_response("NotFound", "Model files not found on disk.", 404)

    if not _autogluon_available():
        return error_response("ServiceUnavailable", "AutoGluon not available.", 503)

    try:
        from autogluon.tabular import TabularPredictor
        predictor = TabularPredictor.load(model_folder)

        # Validate model names
        available = set(predictor.model_names())
        invalid   = [m for m in selected if m not in available]
        if invalid:
            return error_response("ValidationError",
                f"Unknown model(s): {', '.join(invalid)}", 422,
                {"available": sorted(available)})

        # Resolve full set of directories needed
        needed_dirs, _ = _resolve_model_dirs(model_folder, selected)
        if not needed_dirs:
            needed_dirs = set(selected)   # last-resort fallback

        safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", project["name"])
        rl   = re.sub(r"[^\w\-]", "_", entry.get("label", f"Run_{run_number}"))
        fn   = re.sub(r"[^\w\-]", "_", filename or f"{safe}_{rl}_selective")

        zip_path, _ = _build_selective_zip(project, model_folder, needed_dirs, run_number)
        background_tasks.add_task(_safe_rm, zip_path)
        return FileResponse(path=zip_path, filename=f"{fn}.zip",
                            media_type="application/zip")
    except Exception as e:
        logger.error(traceback.format_exc())
        return error_response("ServerError", f"Selective ZIP failed: {e}", 500)

@app.get("/api/download/model/{run_number}/selective")
def download_model_selective_get(
    request: Request,
    run_number: int,
    background_tasks: BackgroundTasks,
    selected_models: List[str] = Query([]),
    filename: Optional[str] = Query(None),
    project=Depends(get_required_project),
):
    """
    Browser-native selective ZIP download using query params.
    Accepts repeated selected_models params and comma-separated values.
    """
    selected = _normalize_selected_models(selected_models)
    return _build_selective_download_response(project, run_number, selected, filename, background_tasks)

@app.post("/api/download/model/{run_number}/selective")
def download_model_selective(
    request:          Request,
    run_number:       int,
    body:             SelectiveDownloadRequest,
    background_tasks: BackgroundTasks,
    filename:         Optional[str] = Query(None),
    project=Depends(get_required_project),
):
    """
    Download a pruned ZIP containing only the selected models (max 5)
    plus any base models required for their ensemble predictions.
    """
    selected = _normalize_selected_models(body.selected_models)
    return _build_selective_download_response(project, run_number, selected, filename, background_tasks)

# ── Session Cleanup ───────────────────────────────────────────────────
@app.post("/api/session/cleanup")
def session_cleanup(request: Request):
    session_id = request.session.get(SESSION_OWNER_KEY)
    active_pid = request.session.get("active_project_id")
    delete_ids = []

    with _projects_lock:
        for pid, project in _projects.items():
            if session_id and project.get("owner_session_id") == session_id:
                delete_ids.append(pid)
        if active_pid and active_pid not in delete_ids and active_pid in _projects:
            delete_ids.append(active_pid)
        projects_to_delete = {pid: _projects.pop(pid, None) for pid in delete_ids}

    deleted_names = []
    for pid, project in projects_to_delete.items():
        if not project:
            continue
        _kill(_autofeat_procs.pop(pid,None)); _kill(_training_procs.pop(pid,None))
        _autofeat_cancel.pop(pid,None)
        _training_cancel.pop(pid,None)
        _cleanup_project_files(project)
        deleted_names.append(project.get("name") or pid)

    request.session.pop("active_project_id", None)
    request.session.pop(SESSION_OWNER_KEY, None)
    _save_meta()

    if not deleted_names:
        return success_response({"deleted_projects": 0}, "No active session.")

    logger.info(f"Cleanup: deleted {len(deleted_names)} project(s) for session {session_id}")
    return success_response({
        "deleted_projects": len(deleted_names),
        "deleted_names": deleted_names,
    }, f"Session cleaned up. Removed {len(deleted_names)} project(s).")

# ── SPA ───────────────────────────────────────────────────────────────
STATIC_DIST="static/dist"

@app.get("/{full_path:path}")
def serve_react(full_path: str):
    if not os.path.isdir(STATIC_DIST):
        return JSONResponse({"error":"Frontend not built. Run: cd frontend && npm run build"},status_code=404)
    fp=os.path.join(STATIC_DIST,full_path)
    if full_path and os.path.isfile(fp): return FileResponse(fp)
    idx=os.path.join(STATIC_DIST,"index.html")
    if os.path.isfile(idx): return FileResponse(idx,media_type="text/html")
    return JSONResponse({"error":"Frontend not built."},status_code=404)

if __name__=="__main__":
    import uvicorn
    uvicorn.run("app:app",host="0.0.0.0",port=5000,reload=False,log_level="info")
