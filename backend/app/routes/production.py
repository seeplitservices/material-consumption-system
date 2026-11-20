"""
Cutbit and Daily Punching Production Summary Routes
"""

from flask import Blueprint, jsonify, request
from app.calculator import round_display
from app.sheets_client import sheets_client

production_bp = Blueprint("production", __name__)

@production_bp.route("", methods=["GET"])
def get_production_summary():
    """Returns daily production summary records with date filtering."""
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
            lp = float(r.get("left_total_punching", 0))
            rp = float(r.get("right_total_punching", 0))
            op = float(r.get("overall_total_punching", 0))
            lc = float(r.get("left_cutbit", 0))
            rc = float(r.get("right_cutbit", 0))
            oc = float(r.get("overall_cutbit", 0))
        except (ValueError, TypeError):
            lp = rp = op = lc = rc = oc = 0.0

        filtered.append({
            **r,
            "left_total_punching_display": round_display(lp),
            "right_total_punching_display": round_display(rp),
            "overall_total_punching_display": round_display(op),
            "left_cutbit_display": round_display(lc),
            "right_cutbit_display": round_display(rc),
            "overall_cutbit_display": round_display(oc)
        })

    filtered.sort(key=lambda x: x.get("date", ""), reverse=True)
    return jsonify({"success": True, "count": len(filtered), "production": filtered})
