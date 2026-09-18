# Simple standalone test — checks if your GROQ_API_KEY works.
# Run with: python test_groq.py

import os
from dotenv import load_dotenv
import httpx

load_dotenv()

key = os.environ.get("GROQ_API_KEY", "").strip()

print("=" * 50)
if not key:
    print("PROBLEM: GROQ_API_KEY is empty or not found in .env")
    print("Make sure your .env file (in the project's main folder) has a line like:")
    print("GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx")
else:
    print(f"Found key starting with: {key[:8]}... (length: {len(key)})")

print("Sending a test request to Groq...")
print("=" * 50)

model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant").strip()
print(f"Using model: {model}")

print("Fetching list of models available to this key...")
try:
    list_resp = httpx.get(
        "https://api.groq.com/openai/v1/models",
        headers={"Authorization": f"Bearer {key}"},
        timeout=15,
    )
    print(f"MODELS LIST STATUS: {list_resp.status_code}")
    print(list_resp.text[:2000])
except Exception as e:
    print(f"MODELS LIST REQUEST FAILED: {e!r}")

print("=" * 50)
print("Sending a test chat request to Groq...")
print("=" * 50)

try:
    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": "Say hi in one word"}],
        },
        timeout=15,
    )
    print(f"STATUS CODE: {resp.status_code}")
    print("RESPONSE BODY:")
    print(resp.text)
except Exception as e:
    print(f"REQUEST FAILED: {e!r}")

print("=" * 50)
print("Copy everything above (from the first '=' line) and send it back.")
