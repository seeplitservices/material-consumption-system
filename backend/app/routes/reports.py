"""
Reports API: Daily, Monthly, Side Comparison, Stock History, and Rare Material Analytics
"""

from collections import defaultdict
from flask import Blueprint, jsonify, request
from app.calculator import calculate_period_wastage, round_display
from app.sheets_client import sheets_client

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/daily", methods=["GET"])
def get_daily_consumption_report():
    """Daily material consumption report with date and side filters."""
    target_date = request.args.get("date")
    side = request.args.get("side")

    entries = sheets_client.read_rows("Daily_Entries")
    if target_date:
        entries = [e for e in entries if e.get("entry_date") == target_date]
    if side and side != "All":
        entries = [e for e in entries if e.get("side") == side]

    total_sheets = sum(float(e.get("used_quantity", 0)) for e in entries)
    total_input = sum(float(e.get("total_input_weight", 0)) for e in entries)
    total_scrap = sum(float(e.get("scrap_weight", 0)) for e in entries)
    total_net = sum(float(e.get("net_consumption", 0)) for e in entries)
    wastage = calculate_period_wastage(total_scrap, total_input)

    return jsonify({
        "success": True,
        "date": target_date or "All Dates",
        "summary": {
            "total_sheets": round_display(total_sheets),
            "total_input_kg": round_display(total_input),
            "total_scrap_kg": round_display(total_scrap),
            "total_net_consumption_kg": round_display(total_net),
            "wastage_percentage": round_display(wastage)
        },
        "records": entries
    })

@reports_bp.route("/monthly", methods=["GET"])
def get_monthly_consumption_report():
    """Monthly material consumption report grouped by month and material."""
    month_filter = request.args.get("month")  # YYYY-MM
    entries = sheets_client.read_rows("Daily_Entries")

    if month_filter:
        entries = [e for e in entries if e.get("entry_date", "").startswith(month_filter)]

    mat_groups = defaultdict(lambda: {
        "material_name": "",
        "side": "",
        "used_sheets": 0.0,
        "input_weight": 0.0,
        "scrap_weight": 0.0,
        "net_consumption": 0.0
    })

    for e in entries:
        mid = e.get("material_id")
        mat_groups[mid]["material_name"] = e.get("material_name", mid)
        mat_groups[mid]["side"] = e.get("side", "")
        mat_groups[mid]["used_sheets"] += float(e.get("used_quantity", 0))
        mat_groups[mid]["input_weight"] += float(e.get("total_input_weight", 0))
        mat_groups[mid]["scrap_weight"] += float(e.get("scrap_weight", 0))
        mat_groups[mid]["net_consumption"] += float(e.get("net_consumption", 0))

    report_list = []
    total_in = 0.0
    total_sc = 0.0
    total_sh = 0.0
    total_net = 0.0

    for mid, val in mat_groups.items():
        inp = val["input_weight"]
        scr = val["scrap_weight"]
        w_pct = (scr / inp * 100.0) if inp > 0 else 0.0
        report_list.append({
            "material_id": mid,
            "material_name": val["material_name"],
            "side": val["side"],
            "used_sheets": round_display(val["used_sheets"]),
            "input_weight": round_display(inp),
            "scrap_weight": round_display(scr),
            "net_consumption": round_display(val["net_consumption"]),
            "wastage_percentage": round_display(w_pct)
        })
        total_in += inp
        total_sc += scr
        total_sh += val["used_sheets"]
        total_net += val["net_consumption"]

    overall_wastage = calculate_period_wastage(total_sc, total_in)

    return jsonify({
        "success": True,
        "month": month_filter or "All Time",
        "summary": {
            "total_sheets": round_display(total_sh),
            "total_input_kg": round_display(total_in),
            "total_scrap_kg": round_display(total_sc),
            "total_net_consumption_kg": round_display(total_net),
            "overall_wastage_percentage": round_display(overall_wastage)
        },
        "materials": report_list
    })

@reports_bp.route("/side-comparison", methods=["GET"])
def get_side_comparison_report():
    """Detailed Left Side vs Right Side operational performance comparison."""
    entries = sheets_client.read_rows("Daily_Entries")

    def calc_side_metrics(side_name):
        side_entries = [e for e in entries if e.get("side") == side_name]
        sheets = sum(float(e.get("used_quantity", 0)) for e in side_entries)
        inp = sum(float(e.get("total_input_weight", 0)) for e in side_entries)
        scr = sum(float(e.get("scrap_weight", 0)) for e in side_entries)
        net = sum(float(e.get("net_consumption", 0)) for e in side_entries)
        cutbit = sum(float(e.get("cutbit_used", 0)) for e in side_entries)
        w_pct = calculate_period_wastage(scr, inp)
        return {
            "side": side_name,
            "transactions_count": len(side_entries),
            "sheets_punched": round_display(sheets),
            "input_weight_kg": round_display(inp),
            "scrap_weight_kg": round_display(scr),
            "net_consumption_kg": round_display(net),
            "cutbit_used": round_display(cutbit),
            "wastage_percentage": round_display(w_pct)
        }

    left_metrics = calc_side_metrics("Left")
    right_metrics = calc_side_metrics("Right")

    return jsonify({
        "success": True,
        "left_side": left_metrics,
        "right_side": right_metrics
    })

@reports_bp.route("/rare-materials", methods=["GET"])
def get_rare_materials_report():
    """Historical usage report for rare materials added on the fly."""
    materials = sheets_client.read_rows("Material_Master")
    rare_mat_ids = {
        m["material_id"]: m
        for m in materials
        if m.get("material_type") == "Rare"
    }

    entries = sheets_client.read_rows("Daily_Entries")
    rare_entries = [e for e in entries if e.get("material_id") in rare_mat_ids]

    summary_by_rare = []
    for mid, meta in rare_mat_ids.items():
        m_entries = [e for e in rare_entries if e.get("material_id") == mid]
        sheets_used = sum(float(e.get("used_quantity", 0)) for e in m_entries)
        scrap_wt = sum(float(e.get("scrap_weight", 0)) for e in m_entries)
        input_wt = sum(float(e.get("total_input_weight", 0)) for e in m_entries)
        summary_by_rare.append({
            "material_id": mid,
            "material_name": meta.get("material_name"),
            "side": meta.get("side"),
            "category": meta.get("category"),
            "weight_per_sheet": round_display(meta.get("weight_per_sheet", 0)),
            "unit": meta.get("unit"),
            "total_transactions": len(m_entries),
            "total_sheets_used": round_display(sheets_used),
            "total_input_weight": round_display(input_wt),
            "total_scrap_weight": round_display(scrap_wt),
            "created_at": meta.get("created_at")
        })

    return jsonify({
        "success": True,
        "rare_materials_count": len(rare_mat_ids),
        "total_usage_entries": len(rare_entries),
        "materials": summary_by_rare,
        "transactions": rare_entries
    })
