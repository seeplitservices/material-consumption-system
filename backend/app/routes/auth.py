"""
Authentication and User Management Routes
Protected for Director administration.
"""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from app.auth_helper import (
    director_required,
    generate_jwt_token,
    record_audit_log,
    token_required
)
from app.sheets_client import sheets_client

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    users = sheets_client.read_rows("Users")
    target_user = None
    for u in users:
        if u.get("email", "").strip().lower() == email:
            target_user = u
            break

    # Emergency auto-restore master Director account if deleted
    if not target_user and email == "director@factory.com" and password == "Director@123":
        now = datetime.now(timezone.utc).isoformat()
        target_user = {
            "user_id": "USR-DIR",
            "name": "Managing Director",
            "email": "director@factory.com",
            "password_hash": generate_password_hash("Director@123"),
            "role": "Director",
            "is_active": "TRUE",
            "created_at": now
        }
        sheets_client.append_row("Users", target_user)

    if not target_user:
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    if target_user.get("is_active") not in ("TRUE", "True", True, "1"):
        return jsonify({"success": False, "error": "This account has been deactivated."}), 403

    pwd_hash = target_user.get("password_hash", "")
    if not (check_password_hash(pwd_hash, password) or pwd_hash == password):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    token = generate_jwt_token(
        user_id=target_user["user_id"],
        email=target_user["email"],
        name=target_user["name"],
        role=target_user.get("role", "Employee")
    )

    record_audit_log(
        user_id=target_user["user_id"],
        action="USER_LOGIN",
        record_type="Users",
        record_id=target_user["user_id"],
        new_value=f"Login successful for {email}"
    )

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "user_id": target_user["user_id"],
            "name": target_user["name"],
            "email": target_user["email"],
            "role": target_user.get("role", "Employee")
        }
    })

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile(current_user):
    return jsonify({
        "success": True,
        "user": current_user
    })

@auth_bp.route("/restore-director", methods=["POST"])
def restore_director():
    users = sheets_client.read_rows("Users")
    existing = None
    for u in users:
        if u.get("email", "").strip().lower() == "director@factory.com":
            existing = u
            break

    now = datetime.now(timezone.utc).isoformat()
    if existing:
        updated = dict(existing)
        updated["role"] = "Director"
        updated["password_hash"] = generate_password_hash("Director@123")
        updated["is_active"] = "TRUE"
        sheets_client.update_row_by_id("Users", "user_id", existing["user_id"], updated)
    else:
        new_dir = {
            "user_id": "USR-DIR",
            "name": "Managing Director",
            "email": "director@factory.com",
            "password_hash": generate_password_hash("Director@123"),
            "role": "Director",
            "is_active": "TRUE",
            "created_at": now
        }
        sheets_client.append_row("Users", new_dir)

    return jsonify({"success": True, "message": "Master Director account restored (director@factory.com / Director@123)."})

@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout(current_user):
    record_audit_log(
        user_id=current_user["user_id"],
        action="USER_LOGOUT",
        record_type="Users",
        record_id=current_user["user_id"]
    )
    return jsonify({"success": True, "message": "Logged out successfully."})

@auth_bp.route("/users", methods=["GET"])
@director_required
def list_users(current_user):
    users = sheets_client.read_rows("Users")
    safe_users = [
        {
            "user_id": u.get("user_id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role", "Employee"),
            "is_active": u.get("is_active") in ("TRUE", "True", True, "1"),
            "created_at": u.get("created_at")
        }
        for u in users
    ]
    return jsonify({"success": True, "users": safe_users})

@auth_bp.route("/users", methods=["POST"])
@director_required
def create_user(current_user):
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()
    password = data.get("password", "")
    role = data.get("role", "Employee")

    if not email or not name or not password:
        return jsonify({"success": False, "error": "Name, email, and password are required."}), 400

    users = sheets_client.read_rows("Users")
    if any(u.get("email", "").strip().lower() == email for u in users):
        return jsonify({"success": False, "error": "A user with this email already exists."}), 400

    user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
    new_user = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": role if role in ["Director", "Admin", "Employee"] else "Employee",
        "is_active": "TRUE",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    sheets_client.append_row("Users", new_user)
    record_audit_log(
        user_id=current_user["user_id"],
        action="CREATE_USER",
        record_type="Users",
        record_id=user_id,
        new_value=f"Created {email} as {role}"
    )

    return jsonify({
        "success": True,
        "user": {
            "user_id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "is_active": True
        }
    }), 201

@auth_bp.route("/users/<user_id>", methods=["PUT"])
@director_required
def update_user(current_user, user_id):
    data = request.get_json() or {}
    users = sheets_client.read_rows("Users")
    target = None
    for u in users:
        if u.get("user_id") == user_id:
            target = u
            break

    if not target:
        return jsonify({"success": False, "error": "User not found."}), 404

    updated = dict(target)
    if "name" in data:
        updated["name"] = data["name"].strip()
    if "role" in data and data["role"] in ["Director", "Admin", "Employee"]:
        updated["role"] = data["role"]
    if "is_active" in data:
        updated["is_active"] = "TRUE" if data["is_active"] else "FALSE"
    if "password" in data and data["password"].strip():
        updated["password_hash"] = generate_password_hash(data["password"].strip())

    sheets_client.update_row_by_id("Users", "user_id", user_id, updated)
    record_audit_log(
        user_id=current_user["user_id"],
        action="UPDATE_USER",
        record_type="Users",
        record_id=user_id,
        old_value=target.get("email"),
        new_value=f"Updated role={updated.get('role')} active={updated.get('is_active')}"
    )

    return jsonify({"success": True, "message": "User updated successfully."})

@auth_bp.route("/users/<user_id>", methods=["DELETE"])
@director_required
def delete_user(current_user, user_id):
    if user_id == current_user["user_id"]:
        return jsonify({"success": False, "error": "Cannot delete your own account."}), 400

    deleted = sheets_client.delete_row_by_id("Users", "user_id", user_id)
    if not deleted:
        return jsonify({"success": False, "error": "User not found."}), 404

    record_audit_log(
        user_id=current_user["user_id"],
        action="DELETE_USER",
        record_type="Users",
        record_id=user_id,
        new_value=f"User {user_id} deleted by Director"
    )
    return jsonify({"success": True, "message": "User deleted successfully."})
