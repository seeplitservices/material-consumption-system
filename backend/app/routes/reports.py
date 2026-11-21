"""
Reports API: Director Executive Reports (Daily, Monthly, Inventory, and Rare Material Analytics)
"""

from collections import defaultdict
from flask import Blueprint, jsonify, request
from app.auth_helper import director_required, token_required
from app.calculator import calculate_period_wastage, round_display
from app.sheets_client import sheets_client

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/daily", methods=["GET"])
@director_required
def get_daily_consumption_report(current_user):
    """Daily material consumption report with date or date-range filter."""
    target_date = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    entries = sheets_client.read_rows("Daily_Entries")
    if target_date:
        entries = [e for e in entries if e.get("entry_date") == target_date]
    if start_date:
        entries = [e for e in entries if e.get("entry_date", "") >= start_date]
    if end_date:
        entries = [e for e in entries if e.get("entry_date", "") <= end_date]

    total_sheets = sum(float(e.get("used_quantity", 0)) for e in entries)
    total_input = sum(float(e.get("total_input_weight", 0)) for e in entries)
    total_scrap = sum(float(e.get("scrap_weight", 0)) for e in entries)
    total_net = sum(float(e.get("net_consumption", 0)) for e in entries)
    wastage = calculate_period_wastage(total_scrap, total_input)

    return jsonify({
        "success": True,
        "date": target_date or (f"{start_date} to {end_date}" if start_date or end_date else "All Dates"),
        "summary": {
            "total_sheets": round_display(total_sheets),
            "total_input_kg": round_display(total_input),
            "total_scrap_kg": round_display(total_scrap),
            "total_net_consumption_kg": round_display(total_net),
            "wastage_percentage": round_display(wastage)
        },
        "records": entries
    })

@reports_bp.route("/custom-range", methods=["GET"])
@director_required
def get_custom_range_report(current_user):
    """
    Material consumption report for a custom date range (start_date to end_date).
    Includes summary metrics, detailed material transactions, and material-wise aggregations.
    """
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    material_id = request.args.get("material_id")

    entries = sheets_client.read_rows("Daily_Entries")

    if start_date:
        entries = [e for e in entries if e.get("entry_date", "") >= start_date]
    if end_date:
        entries = [e for e in entries if e.get("entry_date", "") <= end_date]
    if material_id:
        entries = [e for e in entries if e.get("material_id") == material_id]

    entries.sort(key=lambda x: (x.get("entry_date", ""), x.get("created_at", "")))

    total_sheets = sum(float(e.get("used_quantity", 0)) for e in entries)
    total_input = sum(float(e.get("total_input_weight", 0)) for e in entries)
    total_scrap = sum(float(e.get("scrap_weight", 0)) for e in entries)
    total_net = sum(float(e.get("net_consumption", 0)) for e in entries)
    wastage = calculate_period_wastage(total_scrap, total_input)

    mat_groups = defaultdict(lambda: {
        "material_name": "",
        "used_sheets": 0.0,
        "input_weight": 0.0,
        "scrap_weight": 0.0,
        "net_consumption": 0.0
    })

    for e in entries:
        mid = e.get("material_id")
        mat_groups[mid]["material_name"] = e.get("material_name", mid)
        mat_groups[mid]["used_sheets"] += float(e.get("used_quantity", 0))
        mat_groups[mid]["input_weight"] += float(e.get("total_input_weight", 0))
        mat_groups[mid]["scrap_weight"] += float(e.get("scrap_weight", 0))
        mat_groups[mid]["net_consumption"] += float(e.get("net_consumption", 0))

    material_summaries = []
    for mid, val in mat_groups.items():
        inp = val["input_weight"]
        scr = val["scrap_weight"]
        w_pct = (scr / inp * 100.0) if inp > 0 else 0.0
        material_summaries.append({
            "material_id": mid,
            "material_name": val["material_name"],
            "used_sheets": round_display(val["used_sheets"]),
            "input_weight": round_display(inp),
            "scrap_weight": round_display(scr),
            "net_consumption": round_display(val["net_consumption"]),
            "wastage_percentage": round_display(w_pct)
        })

    return jsonify({
        "success": True,
        "start_date": start_date or "Earliest",
        "end_date": end_date or "Latest",
        "range_label": f"{start_date or 'Earliest'} to {end_date or 'Latest'}",
        "summary": {
            "total_records": len(entries),
            "total_sheets": round_display(total_sheets),
            "total_input_kg": round_display(total_input),
            "total_scrap_kg": round_display(total_scrap),
            "total_net_consumption_kg": round_display(total_net),
            "wastage_percentage": round_display(wastage)
        },
        "materials": material_summaries,
        "records": entries
    })

@reports_bp.route("/monthly", methods=["GET"])
@director_required
def get_monthly_consumption_report(current_user):
    """Monthly material consumption report grouped by month and material."""
    month_filter = request.args.get("month")
    entries = sheets_client.read_rows("Daily_Entries")

    if month_filter:
        entries = [e for e in entries if e.get("entry_date", "").startswith(month_filter)]

    mat_groups = defaultdict(lambda: {
        "material_name": "",
        "used_sheets": 0.0,
        "input_weight": 0.0,
        "scrap_weight": 0.0,
        "net_consumption": 0.0
    })

    for e in entries:
        mid = e.get("material_id")
        mat_groups[mid]["material_name"] = e.get("material_name", mid)
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

@reports_bp.route("/rare-materials", methods=["GET"])
@director_required
def get_rare_materials_report(current_user):
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
