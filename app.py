"""
App entrypoint / alias for Chest X-Ray Multi-Disease Detection API.
Re-exports `app` from `main` to support standard ASGI runners (`uvicorn app:app`).
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
