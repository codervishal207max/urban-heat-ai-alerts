# Urban Heat AI v2 — HeatBot Image Generation Service
# Text-to-image via Hugging Face's official InferenceClient, which handles
# provider routing internally (avoids the router URL churn of raw HTTP calls).
# Falls back cleanly to None if:
#   - HF_API_KEY is not set
#   - The model is unavailable / loading / errors out
# This keeps the chatbot fully usable even without a HF key.

from typing import Optional
import os
import io
import base64
import asyncio
from huggingface_hub import InferenceClient

HF_API_KEY = os.environ.get("HF_API_KEY", "").strip()
HF_IMAGE_MODEL = os.environ.get("HF_IMAGE_MODEL", "stabilityai/stable-diffusion-3-medium-diffusers").strip()

if not HF_API_KEY:
    print("[HeatBot/HF] WARNING: HF_API_KEY not set — image generation in HeatBot is disabled. "
          "Add it to your .env file (see .env.example) and restart the server.")


def is_configured() -> bool:
    return bool(HF_API_KEY)


def _generate_sync(prompt: str) -> bytes:
    client = InferenceClient(provider="auto", api_key=HF_API_KEY)
    image = client.text_to_image(prompt, model=HF_IMAGE_MODEL)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue() 

async def generate_image(prompt: str) -> Optional[dict]:
    """
    Returns {"image_base64": str, "model": str, "prompt": str} on success,
    or None if image generation isn't available / failed.
    """
    if not HF_API_KEY:
        return None
    try:
        # huggingface_hub's client is sync — run it off the event loop thread.
        img_bytes = await asyncio.to_thread(_generate_sync, prompt)
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        return {"image_base64": b64, "model": HF_IMAGE_MODEL, "prompt": prompt}
    except Exception as e:
        print(f"[HeatBot/HF] Image generation failed: {e!r}")
        return None 