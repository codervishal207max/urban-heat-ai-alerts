# Urban Heat AI v2 — LST Prediction Model Trainer
#
# Trains a RandomForestRegressor to predict Land Surface Temperature (LST) from
# vegetation index (NDVI), population density, built-up/urban intensity, and the
# day's ambient weather baseline — the same feature family used in real
# remote-sensing LST regression studies (Landsat/MODIS-derived NDVI + built-up
# index -> LST).
#
# NOTE ON DATA: a freely-licensed, zone-level Landsat/Sentinel LST+NDVI dataset
# for all 10 cities wasn't available within hackathon time, so this model is
# trained on our physically-motivated synthetic city grids (which are themselves
# calibrated to live Open-Meteo weather — see weather_service.py). The pipeline
# itself (feature engineering, train/test split, model, evaluation) is real and
# reusable: swap `_build_dataset()` for an actual Landsat/Sentinel extract and
# nothing else in this file or in ml_service.py needs to change.
#
# Run: python -m backend.ml.train_lst_model

import json
import time

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from backend.config import CITY_REGISTRY
from backend.ml.paths import META_PATH, MODEL_DIR, MODEL_PATH
from backend.services.heat_service import _CITY_HEAT, _base_lst_for_city, _generate_grid

FEATURES = ["ndvi", "population_density", "urban_index", "ambient_temp_c", "heat_factor"]
TARGET = "lst"


def _build_dataset() -> pd.DataFrame:
    """Pools zone-level rows across all 10 cities into one training set."""
    rows = []
    for city_key in CITY_REGISTRY:
        heat = _CITY_HEAT.get(city_key, {"base": 32, "hf": 8})
        base_lst, _calib = _base_lst_for_city(city_key, heat)
        for z in _generate_grid(city_key):
            rows.append({
                "city": city_key,
                "ndvi": z["ndvi"],
                "population_density": z["population_density"],
                "urban_index": z["urban_index"],
                "ambient_temp_c": base_lst,
                "heat_factor": heat["hf"],
                "lst": z["lst"],
            })
    return pd.DataFrame(rows)


def train() -> dict:
    df = _build_dataset()
    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=60, max_depth=8, min_samples_leaf=3, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    r2 = round(r2_score(y_test, pred), 4)
    mae = round(mean_absolute_error(y_test, pred), 3)
    importances = dict(zip(FEATURES, (round(v, 4) for v in model.feature_importances_)))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    meta = {
        "algorithm": "RandomForestRegressor (scikit-learn)",
        "features": FEATURES,
        "target": TARGET,
        "n_samples": int(len(df)),
        "n_cities": int(df["city"].nunique()),
        "test_r2": r2,
        "test_mae_c": mae,
        "feature_importances": importances,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "notes": (
            "Trained on physically-motivated synthetic multi-city grids "
            "(calibrated to live Open-Meteo weather where available). "
            "Swap _build_dataset() for a real Landsat/Sentinel LST extract "
            "to retrain on satellite data without changing the rest of the pipeline."
        ),
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    return meta


if __name__ == "__main__":
    info = train()
    print(json.dumps(info, indent=2))
