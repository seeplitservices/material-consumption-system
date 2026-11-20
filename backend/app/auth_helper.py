"""
Authentication Helpers, JWT Token Handling, and Audit Logging
"""

import functools
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Optional

import jwt
from flask import jsonify, request

from app.config import Config
from app.sheets_client import sheets_client

def generate_jwt_token(user_id: str, email: str, name: str, role: str) -> str:
    """Generates a secure JWT token with configured expiration."""
    payload = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def get_current_user() -> Optional[Dict[str, Any]]:
    """Retrieves authenticated user payload from request Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return decode_jwt_token(token)

def token_required(f: Callable) -> Callable:
    """Decorator ensuring a valid JWT token is provided."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "success": False,
                "error": "Authentication token is missing, expired, or invalid."
            }), 401
        return f(current_user=user, *args, **kwargs)
    return decorated

def admin_required(f: Callable) -> Callable:
    """Decorator ensuring the authenticated user has Admin role."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "success": False,
                "error": "Authentication token is missing, expired, or invalid."
            }), 401
        if user.get("role") != "Admin":
            return jsonify({
                "success": False,
                "error": "Access denied: Administrator privileges required."
            }), 403
        return f(current_user=user, *args, **kwargs)
    return decorated

def record_audit_log(
    user_id: str,
    action: str,
    record_type: str,
    record_id: str,
    old_value: Any = None,
    new_value: Any = None
):
    """Appends an immutable audit log entry into Google Sheets Sheet 9: Audit_Log."""
    log_entry = {
        "log_id": f"LOG-{uuid.uuid4().hex[:10].upper()}",
        "user_id": user_id,
        "action": action,
        "record_type": record_type,
        "record_id": record_id,
        "old_value": str(old_value) if old_value is not None else "",
        "new_value": str(new_value) if new_value is not None else "",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    sheets_client.append_row("Audit_Log", log_entry)
