"""
Dashboard Analytics API: Executive Director KPIs, Chart Datasets, and Date Filtering
Unified factory overview without Left / Right split. Protected for Director access.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request

from app.auth_helper import director_required, token_required
from app.calculator import calculate_period_wastage, round_display
from app.sheets_client import sheets_client

dashboard_bp = Blueprint("dashboard", __name__)

def _resolve_date_range(filter_type: str, custom_start: str = None, custom_end: str = None):
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    if filter_type == "today":
        return today_str, today_str
    elif filter_type == "yesterday":
        yest_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        return yest_str, yest_str
    elif filter_type == "7days":
        start_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        return start_str, today_str
    elif filter_type == "this_month":
        start_str = now.strftime("%Y-%m-01")
        return start_str, today_str
    elif filter_type == "custom" and custom_start and custom_end:
        return custom_start, custom_end
    else:
        start_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        return start_str, today_str

@dashboard_bp.route("/summary", methods=["GET"])
@director_required
def get_dashboard_summary(current_user):
    """
    Returns management KPI cards and recent transactions for the Director.
    """
    filter_type = request.args.get("filter", "today")
    custom_start = request.args.get("start_date")
    custom_end = request.args.get("end_date")

    start_date, end_date = _resolve_date_range(filter_type, custom_start, custom_end)

    all_entries = sheets_client.read_rows("Daily_Entries")
    stock_rows = sheets_client.read_rows("Material_Stock")

    filtered_entries = [
        e for e in all_entries
        if (not start_date or e.get("entry_date", "") >= start_date)
        and (not end_date or e.get("entry_date", "") <= end_date)
    ]

    total_sheets_punched = sum(float(e.get("used_quantity", 0)) for e in filtered_entries)
    total_material_consumed = sum(float(e.get("net_consumption", 0)) for e in filtered_entries)
    total_input_weight = sum(float(e.get("total_input_weight", 0)) for e in filtered_entries)
    total_scrap_generated = sum(float(e.get("scrap_weight", 0)) for e in filtered_entries)
    total_cutbit = sum(float(e.get("cutbit_used", 0)) for e in filtered_entries)

    overall_wastage = calculate_period_wastage(total_scrap_generated, total_input_weight)

    # Current available stock calculation (latest closing stocks from Material_Stock)
    by_mat = {}
    for r in stock_rows:
        mid = r.get("material_id")
        if mid and r.get("closing_stock") not in [None, "", "Not Configured"]:
            try:
                by_mat[mid] = float(r.get("closing_stock"))
            except ValueError:
                pass
    total_avail_stock = sum(by_mat.values())

    sorted_entries = sorted(
        all_entries,
        key=lambda x: (x.get("entry_date", ""), x.get("created_at", "")),
        reverse=True
    )[:10]

    recent_txs = [
        {
            "entry_id": e.get("entry_id"),
            "entry_date": e.get("entry_date"),
            "job_number": e.get("job_number"),
            "shift": e.get("shift"),
            "material_name": e.get("material_name"),
            "used_quantity": round_display(e.get("used_quantity", 0)),
            "weight_per_sheet": round_display(e.get("weight_per_sheet", 0)),
            "total_input_weight": round_display(e.get("total_input_weight", 0)),
            "scrap_weight": round_display(e.get("scrap_weight", 0)),
            "wastage_percentage": round_display(e.get("wastage_percentage", 0)),
            "closing_stock": round_display(e.get("closing_stock", 0)),
            "employee": e.get("employee")
        }
        for e in sorted_entries
    ]

    return jsonify({
        "success": True,
        "filter": {
            "type": filter_type,
            "start_date": start_date,
            "end_date": end_date
        },
        "kpis": {
            "total_sheets_punched": round_display(total_sheets_punched),
            "total_material_consumed_kg": round_display(total_material_consumed),
            "total_scrap_generated_kg": round_display(total_scrap_generated),
            "overall_wastage_percentage": round_display(overall_wastage),
            "total_cutbit_used": round_display(total_cutbit),
            "total_available_stock": round_display(total_avail_stock)
        },
        "recent_transactions": recent_txs
    })

@dashboard_bp.route("/charts", methods=["GET"])
@director_required
def get_dashboard_charts(current_user):
    """Returns analytics chart datasets for the Director."""
    filter_type = request.args.get("filter", "this_month")
    custom_start = request.args.get("start_date")
    custom_end = request.args.get("end_date")

    start_date, end_date = _resolve_date_range(filter_type, custom_start, custom_end)

    all_entries = sheets_client.read_rows("Daily_Entries")
    materials = sheets_client.read_rows("Material_Master")
    stock_rows = sheets_client.read_rows("Material_Stock")

    filtered_entries = [
        e for e in all_entries
        if (not start_date or e.get("entry_date", "") >= start_date)
        and (not end_date or e.get("entry_date", "") <= end_date)
    ]

    daily_groups = defaultdict(lambda: {"consumption": 0.0, "scrap": 0.0, "punching": 0.0, "input": 0.0})
    for e in filtered_entries:
        d = e.get("entry_date", "")
        if d:
            daily_groups[d]["consumption"] += float(e.get("net_consumption", 0))
            daily_groups[d]["scrap"] += float(e.get("scrap_weight", 0))
            daily_groups[d]["punching"] += float(e.get("used_quantity", 0))
            daily_groups[d]["input"] += float(e.get("total_input_weight", 0))

    daily_trend = []
    for d in sorted(daily_groups.keys()):
        inp = daily_groups[d]["input"]
        scr = daily_groups[d]["scrap"]
        w_pct = (scr / inp * 100.0) if inp > 0 else 0.0
        daily_trend.append({
            "date": d,
            "consumption_kg": round_display(daily_groups[d]["consumption"]),
            "scrap_kg": round_display(scr),
            "punching_sheets": round_display(daily_groups[d]["punching"]),
            "wastage_percentage": round_display(w_pct)
        })

    material_usage_map = defaultdict(lambda: {"material_name": "", "consumed_kg": 0.0, "scrap_kg": 0.0, "sheets_used": 0.0})
    for e in filtered_entries:
        mid = e.get("material_id")
        mname = e.get("material_name") or mid
        material_usage_map[mid]["material_name"] = mname
        material_usage_map[mid]["consumed_kg"] += float(e.get("net_consumption", 0))
        material_usage_map[mid]["scrap_kg"] += float(e.get("scrap_weight", 0))
        material_usage_map[mid]["sheets_used"] += float(e.get("used_quantity", 0))

    all_mat_list = [
        {
            "material_id": mid,
            "material_name": val["material_name"],
            "consumed_kg": round_display(val["consumed_kg"]),
            "scrap_kg": round_display(val["scrap_kg"]),
            "sheets_used": round_display(val["sheets_used"])
        }
        for mid, val in material_usage_map.items()
    ]

    top_5_consumed = sorted(all_mat_list, key=lambda x: x["consumed_kg"], reverse=True)[:5]
    top_5_scrap = sorted(all_mat_list, key=lambda x: x["scrap_kg"], reverse=True)[:5]

    month_groups = defaultdict(lambda: {"scrap": 0.0, "input": 0.0})
    for e in all_entries:
        ed = e.get("entry_date", "")
        if len(ed) >= 7:
            m_key = ed[:7]
            month_groups[m_key]["scrap"] += float(e.get("scrap_weight", 0))
            month_groups[m_key]["input"] += float(e.get("total_input_weight", 0))

    monthly_wastage = []
    for m in sorted(month_groups.keys()):
        inp = month_groups[m]["input"]
        scr = month_groups[m]["scrap"]
        w_pct = (scr / inp * 100.0) if inp > 0 else 0.0
        monthly_wastage.append({
            "month": m,
            "wastage_percentage": round_display(w_pct),
            "scrap_kg": round_display(scr),
            "input_kg": round_display(inp)
        })

    mat_latest_stock = {}
    for s in stock_rows:
        mid = s.get("material_id")
        if mid:
            mat_latest_stock[mid] = s

    stock_comparison = []
    for m in materials:
        if m.get("is_active") in ("TRUE", "True", True, "1"):
            mid = m.get("material_id")
            s_rec = mat_latest_stock.get(mid, {})
            try:
                op = float(s_rec.get("opening_stock", 0))
                cl = float(s_rec.get("closing_stock", 0))
            except (ValueError, TypeError):
                op = cl = 0.0
            stock_comparison.append({
                "material_name": m.get("material_name", mid).split("(")[0].strip(),
                "opening_stock": round_display(op),
                "closing_stock": round_display(cl)
            })

    return jsonify({
        "success": True,
        "daily_trend": daily_trend,
        "material_usage": all_mat_list,
        "top_5_consumed": top_5_consumed,
        "top_5_scrap": top_5_scrap,
        "monthly_wastage": monthly_wastage,
        "stock_comparison": stock_comparison[:8]
    })
