"""
Data Alchemy — Subprocess Workers  (workers.py)
================================================
This module is executed as a standalone subprocess by app.py using
subprocess.Popen([sys.executable, 'workers.py', TASK, ...args]).

Keeping it separate from app.py means:
  • No FastAPI / Starlette / uvicorn is imported in the worker.
  • The process can be killed with proc.terminate() / proc.kill() at any time.
  • No shared-memory or multiprocessing-fork safety concerns.

Exit codes:
  0 — success (result written to result_path)
  1 — failure (error written to result_path)
"""

import sys
import os
import json
import math
import traceback


LEGACY_PRESET_MAP = {
    "very_light": "optimize_for_deployment",
    "light": "optimize_for_deployment",
    "high_v150": "high_quality_v150",
    "best_v150": "best_quality_v150",
    "extreme": "extreme_quality",
    # AutoGluon's interpretable preset is currently brittle in this environment.
    "interpretable": "optimize_for_deployment",
}

def _cuda_available():
    try:
        import torch
    except Exception:
        return False
    try:
        return bool(torch.cuda.is_available())
    except Exception:
        return False

def _normalize_preset(preset):
    preset = preset or "medium_quality"
    normalized = LEGACY_PRESET_MAP.get(preset, preset)
    # AutoGluon v1.5's extreme preset is GPU-first. On CPU it can yield a very
    # small heavyweight portfolio, which feels broken to users expecting the
    # broadest search. Fall back to best_quality on CPU.
    if normalized == "extreme_quality" and not _cuda_available():
        return "best_quality"
    return normalized


# ─────────────────────────────────────────────────────────────────
#  TASK: autofeat
#  argv: workers.py autofeat csv_path target_col problem_type
#               result_path afm_path xnew_path
# ─────────────────────────────────────────────────────────────────
def run_autofeat_task(csv_path, target_col, problem_type, result_path, afm_path, xnew_path):
    try:
        import pandas as pd
        import numpy as np
        import pickle
        from sklearn.preprocessing import LabelEncoder

        try:
            from autofeat import AutoFeatModel
        except ImportError as e:
            _write_result(result_path, {"status": "error", "error": f"autofeat not installed: {e}"})
            return 1

        df = pd.read_csv(csv_path)

        if target_col not in df.columns:
            _write_result(result_path, {"status": "error", "error": f"Target '{target_col}' not in CSV."})
            return 1

        # Only use numeric columns for AutoFeat (excluding target)
        X = df.select_dtypes(include=["number"]).copy()
        if target_col in X.columns:
            X = X.drop(columns=[target_col])

        if X.shape[1] < 2:
            _write_result(result_path, {
                "status": "error",
                "error": "AutoFeat needs at least 2 numeric feature columns (excluding target)."
            })
            return 1

        X = X.fillna(0)
        X.columns = [str(c) for c in X.columns]

        y_series = df[target_col].copy()
        if not pd.api.types.is_numeric_dtype(y_series):
            le = LabelEncoder()
            y = le.fit_transform(y_series.astype(str))
        else:
            y = y_series.fillna(0).values

        valid_pt = problem_type if problem_type in ("regression", "classification") else "regression"
        afm = AutoFeatModel(problem_type=valid_pt)

        # This is the blocking call — the process can be killed here
        X_new = afm.fit_transform(X, y)

        new_feats = [c for c in X_new.columns if c not in X.columns]

        # Save X_new to CSV (for the main process to load)
        X_new.to_csv(xnew_path, index=False)

        # Save fitted AutoFeat model
        with open(afm_path, "wb") as f:
            pickle.dump(afm, f)

        _write_result(result_path, {
            "status": "done",
            "new_feats": new_feats[:10],   # up to 10 suggestions
        })
        return 0

    except Exception as e:
        _write_result(result_path, {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
        })
        return 1


# ─────────────────────────────────────────────────────────────────
#  TASK: train
#  argv: workers.py train csv_path model_folder config_json result_path
# ─────────────────────────────────────────────────────────────────
def run_training_task(csv_path, model_folder, config_json, result_path):
    try:
        import pandas as pd
        import logging

        # Only silence extremely verbose DEBUG output; keep WARNING/ERROR visible
        for noisy in ("autogluon", "gluonts", "mxnet"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

        try:
            from autogluon.tabular import TabularPredictor
        except ImportError as e:
            _write_result(result_path, {"status": "error", "error": f"autogluon not installed: {e}"})
            return 1

        config       = json.loads(config_json)
        target       = config["target"]
        problem_type = config.get("problem_type", "auto")
        metric       = config.get("metric", "auto")
        requested_preset = config.get("presets", "medium_quality")
        presets = _normalize_preset(requested_preset)
        time_limit   = int(config.get("time_limit", 300))
        holdout_frac = float(config.get("holdout_frac", 0.2))

        df = pd.read_csv(csv_path)

        if target not in df.columns:
            _write_result(result_path, {"status": "error", "error": f"Target '{target}' not found in data."})
            return 1

        # ── AutoGluon fit — blocking call; process killed here on cancel ──
        fit_kwargs = {
            "train_data": df,
            "presets": presets,
            "time_limit": time_limit,
            "holdout_frac": float(holdout_frac),
        }

        predictor = TabularPredictor(
            label=target,
            problem_type=None if problem_type == "auto" else problem_type,
            eval_metric=None if metric == "auto" else metric,
            path=model_folder,
        ).fit(**fit_kwargs)

        # ── Leaderboard ────────────────────────────────────────────────
        lb = predictor.leaderboard(silent=True)
        leaderboard = []
        for row in lb.to_dict(orient="records"):
            leaderboard.append({k: _safe_val(v) for k, v in row.items()})

        # ── Best model name ────────────────────────────────────────────
        try:
            best_model = str(predictor.model_best)
        except AttributeError:
            try:
                best_model = str(predictor.get_model_best())
            except Exception:
                best_model = leaderboard[0]["model"] if leaderboard else "Unknown"

        # ── Eval metric name ───────────────────────────────────────────
        try:
            em = predictor.eval_metric
            # AutoGluon returns a Scorer object; prefer .name, fall back to str
            eval_metric_name = getattr(em, "name", None) or str(em)
        except Exception:
            eval_metric_name = metric if metric != "auto" else "unknown"

        # ── Feature importance (REQUIRES data= in AutoGluon ≥1.0) ─────
        feat_importance = []
        try:
            fi = predictor.feature_importance(
                data=df,                        # must pass data for original-stage features
                silent=True,
                subsample_size=min(len(df), 500),
                num_shuffle_sets=5,
            )
            fi_reset = fi.reset_index()
            fi_reset.columns = ["feature"] + list(fi_reset.columns[1:])
            for row in fi_reset.to_dict(orient="records")[:20]:
                feat_importance.append({k: _safe_val(v) for k, v in row.items()})
        except Exception:
            # Non-fatal: feature importance is optional
            pass

        # ── Model info via predictor.info() ───────────────────────────
        actual_problem_type = problem_type
        columns_used        = []
        num_classes         = None
        model_info          = {}
        try:
            info                = predictor.info()
            actual_problem_type = info.get("problem_type", problem_type) or problem_type
            columns_used        = info.get("features", [])
            num_classes         = info.get("num_classes")
            model_info = {
                "num_models_trained": len(info.get("model_info", {})),
                "best_model":         info.get("best_model", best_model),
                "problem_type":       actual_problem_type,
                "eval_metric":        eval_metric_name,
                "num_classes":        num_classes,
                "features_used":      len(columns_used),
                "columns":            columns_used,
            }
        except Exception:
            # Fallback: derive from leaderboard + df
            actual_problem_type = problem_type
            columns_used        = [c for c in df.columns if c != target]
            model_info = {
                "num_models_trained": len(leaderboard),
                "best_model":         best_model,
                "problem_type":       problem_type,
                "eval_metric":        eval_metric_name,
                "num_classes":        None,
                "features_used":      len(columns_used),
                "columns":            columns_used,
            }

        # ── Best score from leaderboard row 0 ─────────────────────────
        # AutoGluon stores score_val; for error metrics it is NEGATIVE
        # (higher is always better in AutoGluon internal representation).
        # We store the raw value so Deploy Alchemy can interpret it correctly.
        best_score = None
        if leaderboard:
            sv = leaderboard[0].get("score_val")
            if sv is not None:
                best_score = _safe_val(sv)

        # ── Column dtypes (excluding target) for Deploy Alchemy schema ─
        col_dtypes = {col: str(df[col].dtype) for col in df.columns if col != target}

        _write_result(result_path, {
            "status":              "done",
            "leaderboard":         leaderboard,
            "best_model":          best_model,
            "best_score":          best_score,
            "eval_metric":         eval_metric_name,
            "requested_preset":    requested_preset,
            "normalized_preset":   presets,
            "feat_importance":     feat_importance,
            "model_info":          model_info,
            "actual_problem_type": actual_problem_type,
            "columns_used":        columns_used,
            "num_classes":         num_classes,
            "col_dtypes":          col_dtypes,
        })
        return 0

    except Exception as e:
        _write_result(result_path, {
            "status":    "error",
            "error":     str(e),
            "requested_preset": config.get("presets", "medium_quality") if "config" in locals() else None,
            "traceback": traceback.format_exc(),
        })
        return 1


# ─────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────
def _safe_val(v):
    """Convert a value to JSON-safe Python type."""
    if v is None:
        return None
    try:
        import numpy as np
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating, float)):
            f = float(v)
            return None if (math.isnan(f) or math.isinf(f)) else f
        if isinstance(v, np.bool_):
            return bool(v)
        if isinstance(v, np.ndarray):
            return v.tolist()
    except ImportError:
        pass
    if isinstance(v, float):
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(v, (int, bool, str)):
        return v
    return str(v)


def _write_result(path, data):
    """Write JSON result atomically via a temp file."""
    import tempfile
    dir_ = os.path.dirname(path) or "."
    try:
        fd, tmp = tempfile.mkstemp(dir=dir_, suffix=".tmp")
        with os.fdopen(fd, "w") as f:
            json.dump(data, f)
        os.replace(tmp, path)
    except Exception as e:
        # Fallback: direct write
        try:
            with open(path, "w") as f:
                json.dump(data, f)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: workers.py <autofeat|train> [args...]", file=sys.stderr)
        sys.exit(2)

    task = sys.argv[1]

    if task == "autofeat":
        # argv: autofeat csv_path target_col problem_type result_path afm_path xnew_path
        if len(sys.argv) != 8:
            print("autofeat: expected 6 args after task", file=sys.stderr)
            sys.exit(2)
        _, _, csv_path, target_col, problem_type, result_path, afm_path, xnew_path = sys.argv
        sys.exit(run_autofeat_task(csv_path, target_col, problem_type, result_path, afm_path, xnew_path))

    elif task == "train":
        # argv: train csv_path model_folder config_json result_path
        if len(sys.argv) != 6:
            print("train: expected 4 args after task", file=sys.stderr)
            sys.exit(2)
        _, _, csv_path, model_folder, config_json, result_path = sys.argv
        sys.exit(run_training_task(csv_path, model_folder, config_json, result_path))

    else:
        print(f"Unknown task: {task}", file=sys.stderr)
        sys.exit(2)
