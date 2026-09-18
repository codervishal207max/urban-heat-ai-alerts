# Urban Heat AI v2 — ML Inference Service
# Loads the trained RandomForest LST model (backend/ml/train_lst_model.py) once
# and exposes prediction helpers for the recommendation/simulation engine.
#
# IMPORTANT: joblib/scikit-learn are imported LAZILY, inside the try/except in
# _load() — never at module top-level. Unpickling a saved RandomForestRegressor
# requires scikit-learn (and transitively scipy) to import successfully, and in
# some locked-down environments (e.g. Windows "Application Control" / Smart App
# Control policies blocking unsigned native DLLs like scipy's _superlu.pyd) that
# import itself can fail. If this module imported sklearn at the top level, that
# failure would crash the ENTIRE backend on startup (recommendation_service.py
# imports this module). Keeping the import inside the guarded try/except means a
# broken scikit-learn install only disables the ML feature — the app falls back
# to the formula-based simulation and keeps running.

import json

from backend.ml.paths import META_PATH, MODEL_PATH

_model = None
_meta = None
_load_attempted = False
_load_error = None


def _load():
    global _model, _meta, _load_attempted, _load_error
    if _load_attempted:
        return
    _load_attempted = True
    try:
        import joblib  # noqa: local import — see module docstring
        _model = joblib.load(MODEL_PATH)
        _meta = json.loads(META_PATH.read_text())
    except Exception as e:
        _model = None
        _meta = None
        _load_error = str(e)


def is_ready() -> bool:
    _load()
    return _model is not None


def get_model_info() -> dict:
    _load()
    if _meta is None:
        msg = "Model not trained yet. Run: python -m backend.ml.train_lst_model"
        if _load_error:
            msg = (
                "ML model could not be loaded in this environment "
                f"({_load_error}). Falling back to the formula-based simulation. "
                "This usually means scikit-learn/scipy failed to import — often "
                "a Windows Application Control / Smart App Control policy "
                "blocking native DLLs, or a broken install. The rest of the app "
                "is unaffected."
            )
        return {"model_loaded": False, "message": msg}
    return {"model_loaded": True, **_meta}


def predict_lst(ndvi: float, population_density: float, urban_index: float,
                 ambient_temp_c: float, heat_factor: float):
    """Returns predicted LST (°C) as float, or None if the model isn't loaded."""
    _load()
    if _model is None:
        return None
    row = [[ndvi, population_density, urban_index, ambient_temp_c, heat_factor]]
    return round(float(_model.predict(row)[0]), 2)
