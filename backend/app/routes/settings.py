"""
System Settings, Health Check, Audit Trail, and Google Sheets Connectivity Routes
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.auth_helper import admin_required, record_audit_log, token_required
from app.config import Config
from app.sheets_client import sheets_client

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/health", methods=["GET"])
def health_check():
    """System health check for Render hosting and local diagnostics."""
    status = sheets_client.get_connection_status()
    return jsonify({
        "status": "healthy",
        "app": "Material Consumption & Wastage Management System",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "type": "Google Sheets API",
            "is_connected": status["is_connected"],
            "using_mock_fallback": status["using_mock_fallback"],
            "spreadsheet_id": status["spreadsheet_id"],
            "connection_error": status["connection_error"]
        }
    })

@settings_bp.route("", methods=["GET"])
def get_settings():
    """Retrieves system configuration parameters and connection health."""
    rows = sheets_client.read_rows("Settings")
    settings_dict = {r.get("setting_key"): r.get("setting_value") for r in rows}

    connection_status = sheets_client.get_connection_status()

    return jsonify({
        "success": True,
        "settings": {
            "baseline_date": settings_dict.get("baseline_date", Config.BASELINE_DATE),
            "steel_density": float(settings_dict.get("steel_density", Config.STEEL_DENSITY_COEFFICIENT)),
            "shifts": ["Day", "Night"],
            "sides": ["Left", "Right"]
        },
        "google_sheets": connection_status
    })

@settings_bp.route("", methods=["POST"])
@admin_required
def update_settings(current_user):
    """Admin updates configuration parameters."""
    data = request.get_json() or {}
    now = datetime.now(timezone.utc).isoformat()

    updated = {}
    if "baseline_date" in data:
        updated["baseline_date"] = data["baseline_date"]
    if "steel_density" in data:
        updated["steel_density"] = str(data["steel_density"])

    for k, v in updated.items():
        existing = sheets_client.read_rows("Settings")
        match = next((s for s in existing if s.get("setting_key") == k), None)
        if match:
            sheets_client.update_row_by_id(
                "Settings", "setting_key", k,
                {"setting_key": k, "setting_value": v, "updated_at": now}
            )
        else:
            sheets_client.append_row("Settings", {
                "setting_key": k, "setting_value": v, "updated_at": now
            })

    record_audit_log(
        user_id=current_user["user_id"],
        action="UPDATE_SETTINGS",
        record_type="Settings",
        record_id="global",
        new_value=str(updated)
    )

    return jsonify({"success": True, "message": "Settings updated successfully.", "updated": updated})

@settings_bp.route("/test-sheets", methods=["POST"])
@admin_required
def test_sheets_connection(current_user):
    """Tests connection to Google Sheets API."""
    success = sheets_client.init_google_sheets()
    status = sheets_client.get_connection_status()
    return jsonify({
        "success": success,
        "message": "Connected to Google Sheets successfully." if success else "Failed to connect to Google Sheets.",
        "status": status
    })

@settings_bp.route("/audit-logs", methods=["GET"])
@admin_required
def get_audit_logs(current_user):
    """Returns the system audit log (Sheet 9: Audit_Log)."""
    limit = int(request.args.get("limit", 100))
    action_filter = request.args.get("action")

    rows = sheets_client.read_rows("Audit_Log")
    if action_filter:
        rows = [r for r in rows if r.get("action") == action_filter]

    rows.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return jsonify({"success": True, "count": len(rows), "logs": rows[:limit]})
