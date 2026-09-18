# Urban Heat AI v2 — Report API Routes
from fastapi import APIRouter, Query
from fastapi.responses import Response

from backend.config import DEFAULT_CITY
from backend.services.report_service import generate_city_report

router = APIRouter(prefix="/report", tags=["Report"])


@router.get("/generate", summary="Download a PDF policy brief for a city")
def generate_report(
    city: str = Query(DEFAULT_CITY, description="City key"),
    scenario: str = Query("green_cover", description="Cooling intervention to project in the brief"),
    coverage: float = Query(20.0, ge=1, le=100, description="Intervention coverage %"),
):
    pdf_bytes = generate_city_report(city, scenario, coverage)
    filename = f"urban-heat-ai-{city}-report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
