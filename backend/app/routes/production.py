"""
Cutbit and Daily Punching Production Summary Routes (Unified Factory Operations)
"""

from flask import Blueprint, jsonify, request
from app.auth_helper import director_required, token_required
from app.calculator import round_display
from app.sheets_client import sheets_client

production_bp = Blueprint("production", __name__)

@production_bp.route("", methods=["GET"])
@director_required
def get_production_summary(current_user):
    """Returns factory daily production summary records with date filtering."""
    date_filter = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    rows = sheets_client.read_rows("Production_Summary")
    filtered = []

    for r in rows:
        d = r.get("date", "")
        if date_filter and d != date_filter:
            continue
        if start_date and d < start_date:
            continue
        if end_date and d > end_date:
            continue

        try:
            tp = float(r.get("total_punching", 0))
            tc = float(r.get("total_cutbit", 0))
        except (ValueError, TypeError):
            tp = tc = 0.0

        filtered.append({
            **r,
            "total_punching_display": round_display(tp),
            "total_cutbit_display": round_display(tc)
        })

    filtered.sort(key=lambda x: x.get("date", ""), reverse=True)
    return jsonify({"success": True, "count": len(filtered), "production": filtered})
