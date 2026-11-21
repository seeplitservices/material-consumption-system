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
    if not rows:
        entries = sheets_client.read_rows("Daily_Entries")
        date_map = {}
        for e in entries:
            d = str(e.get("entry_date", "")).split("T")[0]
            if not d:
                continue
            used = float(e.get("used_quantity", 0) or 0)
            cutbit = float(e.get("cutbit_used", 0) or 0)
            if d not in date_map:
                date_map[d] = {"date": d, "total_punching": 0.0, "total_cutbit": 0.0, "count": 0, "updated_at": e.get("created_at", "")}
            date_map[d]["total_punching"] += used
            date_map[d]["total_cutbit"] += cutbit
            date_map[d]["count"] += 1

        rows = [{
            "production_id": f"PROD-{i+1}",
            "date": d_data["date"],
            "total_punching": d_data["total_punching"],
            "total_cutbit": d_data["total_cutbit"],
            "remarks": f"Aggregated from {d_data['count']} transaction(s)",
            "updated_at": d_data["updated_at"]
        } for i, d_data in enumerate(date_map.values())]

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
