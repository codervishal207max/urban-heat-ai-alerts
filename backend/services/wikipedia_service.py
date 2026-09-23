# Urban Heat AI v2 — HeatBot Wikipedia Lookup Service
# Lets HeatBot answer general-knowledge / "live info" questions that aren't
# covered by the platform's own heat data, by grounding the LLM in a fresh
# Wikipedia summary. No API key required — Wikipedia's REST API is public.

from typing import Optional
import httpx

SEARCH_URL = "https://en.wikipedia.org/w/api.php"
SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
REQUEST_TIMEOUT_SEC = 8


async def _search_title(query: str) -> Optional[str]:
    """Finds the best-matching Wikipedia page title for a free-text query."""
    params = {
        "action": "query", "list": "search", "srsearch": query,
        "format": "json", "srlimit": 1,
    }
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SEC) as client:
        resp = await client.get(SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    results = data.get("query", {}).get("search", [])
    return results[0]["title"] if results else None


async def get_summary(query: str) -> Optional[dict]:
    """
    Returns {"title": str, "extract": str, "url": str} on success,
    or None if no matching page was found / the lookup failed.
    """
    try:
        title = await _search_title(query)
        if not title:
            return None
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SEC) as client:
            resp = await client.get(SUMMARY_URL.format(title=title.replace(" ", "_")))
            if resp.status_code != 200:
                return None
            data = resp.json()
        extract = data.get("extract", "").strip()
        if not extract:
            return None
        return {
            "title": data.get("title", title),
            "extract": extract,
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
        }
    except Exception as e:
        print(f"[HeatBot/Wikipedia] Lookup failed: {e!r}")
        return None