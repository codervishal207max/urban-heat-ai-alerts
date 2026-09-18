# Urban Heat AI v2 — Activity Database API Routes
from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from backend import database as db

router = APIRouter(prefix="/activity", tags=["Activity Database"])


class ActivityIn(BaseModel):
    type: str
    activity: str
    detail: str = ""
    city: str = ""


class ChatLogIn(BaseModel):
    city: str = ""
    user_msg: str
    bot_reply: str
    source: str = "keyword"


@router.post("/log", summary="Log a frontend activity event (city switch, layer toggle, etc.)")
async def log_activity(body: ActivityIn):
    return db.log_activity(body.type, body.activity, body.detail, body.city)


@router.get("/list", summary="List activity events, optionally filtered by type")
async def list_activity(filter: str = Query("all"), limit: int = Query(500, le=2000)):
    return {"events": db.list_activity(filter, limit)}


@router.get("/summary", summary="Summary counts for the Activity Database dashboard cards")
async def summary():
    return db.activity_summary()


@router.get("/export.csv", summary="Download the full activity log as CSV", response_class=PlainTextResponse)
async def export_csv():
    csv_text = db.export_activity_csv()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=urban-heat-activity.csv"},
    )


@router.delete("/clear", summary="Clear all activity and chat history")
async def clear():
    db.clear_activity()
    return {"cleared": True}


@router.post("/chat", summary="Log a chatbot conversation turn")
async def log_chat(body: ChatLogIn):
    return db.log_chat(body.city, body.user_msg, body.bot_reply, body.source)


@router.get("/chats", summary="List recent chatbot conversation turns")
async def list_chats(limit: int = Query(200, le=1000)):
    return {"chats": db.list_chats(limit)}
