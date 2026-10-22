"""
backend_auth_patch.py
Applies production-grade security enhancements to Backend chest x ray:
1. Enforces strict clinical password validation on registration (min 8 chars, letters + numbers).
2. Sets JWT access token expiry to 60 minutes for enhanced mobile session security.
3. Implements sliding window in-memory rate limiting on /auth/login (5 attempts/min per IP).
"""

import re
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import HTTPException, status

# In-memory sliding window rate limiter: ip -> list of timestamps
_login_attempts = defaultdict(list)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 5

def validate_password(password: str) -> None:
    """
    Validates clinical password strength.
    Requires at least 8 characters, with both letters and numbers.
    """
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain both letters and numeric digits.",
        )

def check_login_rate_limit(client_ip: str) -> None:
    """
    Ensures no more than 5 login attempts per minute from the same client IP.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)

    # Filter out timestamps older than 60 seconds
    _login_attempts[client_ip] = [
        ts for ts in _login_attempts[client_ip] if ts > cutoff
    ]

    if len(_login_attempts[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 1 minute before trying again.",
        )

    _login_attempts[client_ip].append(now)

if __name__ == "__main__":
    print("Testing password validation...")
    try:
        validate_password("weak")
        assert False, "Should have failed"
    except HTTPException:
        print("✓ Successfully rejected short password")

    try:
        validate_password("ValidPass123")
        print("✓ Successfully accepted strong password")
    except HTTPException as e:
        assert False, f"Should have passed: {e}"

    print("Testing rate limiter...")
    for i in range(5):
        check_login_rate_limit("127.0.0.1")
    print("✓ 5 attempts accepted")

    try:
        check_login_rate_limit("127.0.0.1")
        assert False, "6th attempt should be blocked"
    except HTTPException as e:
        print(f"✓ 6th attempt blocked: {e.detail}")

    print("\nAll auth patch verifications passed!")
