# Urban Heat AI v2 — ML API Routes
from fastapi import APIRouter
from backend.services.ml_service import get_model_info

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/model-info", summary="Trained LST model metadata (algorithm, R², feature importances)")
def model_info():
    return get_model_info()
