# Urban Heat AI v2 — Policy Report Service
#
# Generates a single downloadable PDF "policy brief" for a city — current
# heat/health risk, top priority zones with recommended actions, and a
# projected impact + cost estimate for one cooling intervention — meant to
# be handed to city officials/judges as an actionable artifact rather than
# just a live dashboard.
#
# Reuses the SAME data services the dashboard/API already call
# (heat_service, health_service, recommendation_service) so the PDF numbers
# always match what's on screen — no separate/duplicated calculation path.
#
# NOTE on fonts: reportlab's default Helvetica is a base-14 PDF font and
# does NOT include emoji or the ₹ (Rupee) glyph — those render as blank
# boxes. So this report deliberately uses plain ASCII text (headings
# without emoji, "Rs." instead of ₹) rather than mirroring the dashboard's
# emoji-heavy UI.

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from backend.config import CITY_REGISTRY, DEFAULT_CITY, SIM_SCENARIOS
from backend.services.heat_service import _generate_grid, get_calibration_info
from backend.services.health_service import get_vulnerable_populations
from backend.services.recommendation_service import get_strategies, get_zone_recommendations, simulate

ACCENT = colors.HexColor("#f97316")
DARK = colors.HexColor("#0f172a")
GREY = colors.HexColor("#64748b")
LIGHT = colors.HexColor("#f8fafc")
GREEN = colors.HexColor("#16a34a")
GREEN_LIGHT = colors.HexColor("#f0fdf4")
BORDER = colors.HexColor("#e2e8f0")

TABLE_BASE_STYLE = [
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("BriefTitle", parent=ss["Heading1"], textColor=ACCENT, spaceAfter=4))
    ss.add(ParagraphStyle("Section", parent=ss["Heading2"], textColor=DARK, spaceBefore=16, spaceAfter=6, fontSize=13))
    ss.add(ParagraphStyle("Body", parent=ss["Normal"], textColor=DARK, leading=14))
    ss.add(ParagraphStyle("Small", parent=ss["Normal"], textColor=GREY, fontSize=8, leading=11))
    return ss


def _table(rows, col_widths, header_bg, zebra_bg):
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    style = list(TABLE_BASE_STYLE)
    style.append(("BACKGROUND", (0, 0), (-1, 0), header_bg))
    style.append(("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, zebra_bg]))
    t.setStyle(TableStyle(style))
    return t


def generate_city_report(city: str, scenario: str = "green_cover", coverage: float = 20.0) -> bytes:
    """
    Builds a policy-brief PDF for the given city and returns raw PDF bytes.
    Every number in it comes from the same services that power the live
    dashboard/API, so the report never drifts from what's on screen.
    """
    cfg = CITY_REGISTRY.get(city, CITY_REGISTRY[DEFAULT_CITY])
    ss = _styles()

    zones = _generate_grid(city)
    n = len(zones)
    lsts = [z["lst"] for z in zones]
    dist = {"Very Low": 0, "Low": 0, "Moderate": 0, "High": 0, "Very High": 0}
    for z in zones:
        dist[z["risk_level"]] = dist.get(z["risk_level"], 0) + 1

    pop_data = get_vulnerable_populations(city)
    calib = get_calibration_info(city)
    priority_zones = get_zone_recommendations(city, top=5)
    sim = simulate(city, scenario, coverage)
    sc_label = SIM_SCENARIOS.get(scenario, {}).get("label", scenario)
    strategy = next((s for s in get_strategies() if s["id"] == scenario), None)

    if calib.get("is_satellite"):
        data_note = f"Real satellite data — NASA POWER, observed {calib.get('obs_date', '')}"
    elif calib.get("calibrated"):
        data_note = "Live weather-calibrated (Open-Meteo)"
    else:
        data_note = "Offline baseline estimate"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        title=f"Urban Heat AI - {cfg['name']} Policy Brief",
    )
    story = []

    # --- Header ---
    story.append(Paragraph("Urban Heat AI - City Policy Brief", ss["BriefTitle"]))
    story.append(Paragraph(
        f"<b>{cfg['name']}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Generated {datetime.now().strftime('%d %b %Y, %H:%M')}",
        ss["Body"]))
    story.append(Paragraph(f"Data source: {data_note}", ss["Small"]))
    story.append(HRFlowable(width="100%", color=ACCENT, thickness=1, spaceBefore=8, spaceAfter=10))

    # --- Current heat & health risk ---
    story.append(Paragraph("Current Heat &amp; Health Risk", ss["Section"]))
    stat_rows = [
        ["Metric", "Value"],
        ["Average Land Surface Temperature", f"{round(sum(lsts) / n, 1)} C"],
        ["Maximum Land Surface Temperature", f"{round(max(lsts), 1)} C"],
        ["High / Very-High risk zones", f"{dist['High'] + dist['Very High']} of {n}"],
        ["Population at high risk", f"{pop_data['population_at_high_risk']:,}"],
        ["Estimated heat-related deaths / summer", f"{pop_data['estimated_deaths_per_summer']}"],
        ["Estimated hospitalizations / summer", f"{pop_data['estimated_hospitalizations']}"],
    ]
    story.append(_table(stat_rows, [9.5 * cm, 6.5 * cm], DARK, LIGHT))

    # --- Vulnerable populations ---
    story.append(Paragraph("Vulnerable Populations at High Risk", ss["Section"]))
    demo = pop_data["demographics"]
    demo_rows = [
        ["Group", "Estimated People"],
        ["Elderly (65+)", f"{demo['elderly_65_plus']:,}"],
        ["Children under 5", f"{demo['children_under_5']:,}"],
        ["Outdoor workers", f"{demo['outdoor_workers']:,}"],
        ["Low-income households", f"{demo['low_income_households']:,}"],
    ]
    story.append(_table(demo_rows, [9.5 * cm, 6.5 * cm], ACCENT, colors.HexColor("#fff7ed")))

    # --- Priority zones ---
    story.append(Paragraph("Top Priority Zones (Highest Heat Vulnerability Index)", ss["Section"]))
    action_style = ParagraphStyle("ActionCell", parent=ss["Body"], fontSize=8.5, leading=11)
    pz_rows = [["Zone ID", "Risk", "LST (C)", "HVI", "Recommended Actions"]]
    for z in priority_zones:
        pz_rows.append([
            str(z["cell_id"]), z["risk_level"], f"{z['lst']}", f"{z['hvi']}",
            Paragraph(", ".join(z["actions"]), action_style),
        ])
    story.append(_table(pz_rows, [1.8 * cm, 2.3 * cm, 1.8 * cm, 1.6 * cm, 8.5 * cm], DARK, LIGHT))

    # --- Recommended intervention ---
    intervention_block = [Paragraph(f"Recommended Intervention: {sc_label} ({coverage:.0f}% coverage)", ss["Section"])]
    if strategy:
        intervention_block.append(Paragraph(
            f"<b>{strategy['name']}</b> &mdash; {strategy['description']} "
            f"Effectiveness: {strategy['effectiveness']}. Estimated cost: "
            f"Rs. {strategy['cost_crore_per_km2']} crore/sq.km. Implementation timeline: "
            f"~{strategy['implementation_months']} months.",
            ss["Body"]))
        intervention_block.append(Spacer(1, 6))

    impact_rows = [
        ["Projected Metric", "Value"],
        ["Temperature reduction", f"{sim['projected_state']['temp_reduction']} C"],
        ["Hotspot zones after intervention",
         f"{sim['projected_state']['hotspots_after']} (from {sim['current_state']['hotspots']})"],
        ["People benefited", f"{sim['health_impact']['people_benefited']:,}"],
        ["Deaths prevented (projected)", f"{sim['health_impact']['projected_deaths_prevented']}"],
        ["Hospitalizations prevented (projected)", f"{sim['health_impact']['projected_hospitalizations_prevented']}"],
        ["Estimated economic saving", f"Rs. {sim['economic_saving_crore']} crore"],
    ]
    intervention_block.append(_table(impact_rows, [9.5 * cm, 6.5 * cm], GREEN, GREEN_LIGHT))
    story.append(KeepTogether(intervention_block))

    # --- Footer ---
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", color=BORDER, thickness=1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Generated by Urban Heat AI, an AI-powered Urban Heat Island analytics platform for "
        "Indian cities. HVI = 0.40 x LST_norm + 0.25 x UHI_norm + 0.20 x (1 - NDVI) + "
        "0.15 x PopDensity_norm. Figures beyond directly measured LST are model-based "
        "estimates intended for planning purposes, not guarantees.",
        ss["Small"]))

    doc.build(story)
    return buf.getvalue()
