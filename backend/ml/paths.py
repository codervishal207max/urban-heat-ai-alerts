# Urban Heat AI v2 — ML model file paths
# Deliberately has NO sklearn/pandas/joblib imports. train_lst_model.py (which
# needs sklearn to TRAIN) and ml_service.py (which only needs to know WHERE the
# trained file lives, and loads it lazily/defensively) both import from here so
# that importing ml_service.py never drags in scikit-learn as a side effect.
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "lst_model.joblib"
META_PATH = MODEL_DIR / "lst_model_meta.json"
