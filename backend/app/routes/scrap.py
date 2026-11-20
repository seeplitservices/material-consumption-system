"""
Scrap and Wastage Management Routes (Unified Factory Operations)
"""

from flask import Blueprint, jsonify, request
from app.auth_helper import director_required, token_required
from app.calculator import calculate_period_wastage, round_display
from app.sheets_client import sheets_client

scrap_bp = Blueprint("scrap", __name__)

@scrap_bp.route("", methods=["GET"])
@director_required
def get_scrap_records(current_user):
    """Returns factory scrap records with optional date and material filters."""
    date_filter = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    mat_filter = request.args.get("material_id")

    rows = sheets_client.read_rows("Scrap_Records")
    filtered = []

    for r in rows:
        d = r.get("date", "")
        if date_filter and d != date_filter:
            continue
        if start_date and d < start_date:
            continue
        if end_date and d > end_date:
            continue
        if mat_filter and r.get("material_id") != mat_filter:
            continue

        try:
            in_wt = float(r.get("total_input_weight", 0))
            sc_wt = float(r.get("scrap_weight", 0))
            net_c = float(r.get("net_consumption", 0))
            w_pct = float(r.get("wastage_percentage", 0))
        except (ValueError, TypeError):
            in_wt = sc_wt = net_c = w_pct = 0.0

        filtered.append({
            **r,
            "total_input_weight_display": round_display(in_wt),
            "scrap_weight_display": round_display(sc_wt),
            "net_consumption_display": round_display(net_c),
            "wastage_percentage_display": round_display(w_pct)
        })

    filtered.sort(key=lambda x: (x.get("date", ""), x.get("created_at", "")), reverse=True)
    return jsonify({"success": True, "count": len(filtered), "records": filtered})

@scrap_bp.route("/summary", methods=["GET"])
@director_required
def get_scrap_summary(current_user):
    """
    Returns factory scrap weights and overall wastage percentage.
    Calculates overall wastage from sum(scrap) / sum(input) * 100.
    """
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    rows = sheets_client.read_rows("Scrap_Records")
    if start_date:
        rows = [r for r in rows if r.get("date", "") >= start_date]
    if end_date:
        rows = [r for r in rows if r.get("date", "") <= end_date]

    total_scrap = sum(float(r.get("scrap_weight", 0)) for r in rows)
    total_input = sum(float(r.get("total_input_weight", 0)) for r in rows)
    overall_wastage = calculate_period_wastage(total_scrap, total_input)

    return jsonify({
        "success": True,
        "total_scrap_weight": round_display(total_scrap),
        "total_input_weight": round_display(total_input),
        "net_material_consumption": round_display(total_input - total_scrap),
        "overall_wastage_percentage": round_display(overall_wastage)
    })
