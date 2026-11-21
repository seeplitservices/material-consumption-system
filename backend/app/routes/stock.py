"""
Stock Management Routes: Unified Factory Inventory, Auto Carry-Forward, Manual Adjustments
All materials managed under the same sheet without Left / Right side split.
"""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.auth_helper import director_required, record_audit_log, token_required
from app.calculator import round_display
from app.sheets_client import sheets_client

stock_bp = Blueprint("stock", __name__)

def get_current_stock_balance(material_id: str) -> dict:
    """
    Retrieves the most recent valid closing stock balance for a material from unified Material_Stock.
    If multiple chronological entries exist, returns the latest closing stock.
    Returns: {"balance": float or None, "status": "Configured" | "Not Configured", "last_date": str}
    """
    rows = sheets_client.read_rows("Material_Stock")
    
    # Filter rows for this material
    material_rows = [r for r in rows if r.get("material_id") == material_id]
    if not material_rows:
        return {"balance": None, "status": "Not Configured", "last_date": None}

    # Sort by date and updated_at
    material_rows.sort(key=lambda x: (x.get("date", ""), x.get("updated_at", "")))
    latest = material_rows[-1]
    closing_val = latest.get("closing_stock")

    if closing_val in [None, "", "Not Configured"]:
        return {"balance": None, "status": "Not Configured", "last_date": latest.get("date")}

    try:
        balance = float(closing_val)
        return {"balance": balance, "status": "Configured", "last_date": latest.get("date")}
    except ValueError:
        return {"balance": None, "status": "Not Configured", "last_date": latest.get("date")}

@stock_bp.route("", methods=["GET"])
@stock_bp.route("/inventory", methods=["GET"])
@stock_bp.route("/left", methods=["GET"])  # Alias for backward compatibility
@stock_bp.route("/right", methods=["GET"]) # Alias for backward compatibility
def get_inventory_stock():
    """
    Returns the comprehensive unified stock inventory for all materials.
    Reads master materials, finds latest stock balance, received, and used.
    """
    materials = sheets_client.read_rows("Material_Master")
    stock_rows = sheets_client.read_rows("Material_Stock")
    date_filter = request.args.get("date")

    items = []
    sno = 1
    for m in materials:
        if m.get("is_active") not in ("TRUE", "True", True, "1"):
            continue

        mat_id = m.get("material_id")
        mat_name = m.get("material_name")

        # Find matching stock records for this material
        m_stocks = [s for s in stock_rows if s.get("material_id") == mat_id]
        if date_filter:
            m_stocks = [s for s in m_stocks if s.get("date") == date_filter]

        if m_stocks:
            m_stocks.sort(key=lambda x: (x.get("date", ""), x.get("updated_at", "")))
            latest_rec = m_stocks[-1]
            op_raw = latest_rec.get("opening_stock")
            rec_raw = latest_rec.get("stock_received", 0)
            used_raw = latest_rec.get("punching_stock", 0)
            cl_raw = latest_rec.get("closing_stock")
            remarks = latest_rec.get("remarks", "")
            last_date = latest_rec.get("date")
        else:
            balance_info = get_current_stock_balance(mat_id)
            op_raw = balance_info["balance"]
            rec_raw = 0
            used_raw = 0
            cl_raw = balance_info["balance"]
            remarks = "No activity recorded for filtered date." if date_filter else "Baseline Stock"
            last_date = balance_info["last_date"]

        is_configured = op_raw not in [None, "", "Not Configured"]
        opening = float(op_raw) if is_configured else None
        received = float(rec_raw) if rec_raw not in [None, ""] else 0.0
        used = float(used_raw) if used_raw not in [None, ""] else 0.0
        closing = float(cl_raw) if cl_raw not in [None, "", "Not Configured"] else None

        try:
            wt_per_sheet = float(m.get("weight_per_sheet", 0))
        except (ValueError, TypeError):
            wt_per_sheet = 0.0

        total_used_weight = used * wt_per_sheet

        items.append({
            "s_no": sno,
            "material_id": mat_id,
            "material_name": mat_name,
            "category": m.get("category"),
            "is_configured": is_configured,
            "opening_stock": opening,
            "opening_stock_display": round_display(opening) if opening is not None else "Not Configured",
            "stock_received": received,
            "punching_stock": used,
            "closing_stock": closing,
            "closing_stock_display": round_display(closing) if closing is not None else "Not Configured",
            "weight_per_sheet": wt_per_sheet,
            "weight_per_sheet_display": round_display(wt_per_sheet),
            "total_used_weight": total_used_weight,
            "total_used_weight_display": round_display(total_used_weight),
            "remarks": remarks,
            "last_date": last_date
        })
        sno += 1

    return jsonify({
        "success": True,
        "count": len(items),
        "stock": items
    })

@stock_bp.route("/summary", methods=["GET"])
def get_stock_summary():
    """Returns factory overview KPI balances for all materials."""
    stock_res = get_inventory_stock().get_json()
    stock_items = stock_res.get("stock", [])

    total_closing = sum(
        item["closing_stock"] for item in stock_items if item["closing_stock"] is not None
    )
    unconfigured_count = sum(1 for item in stock_items if not item["is_configured"])

    return jsonify({
        "success": True,
        "total_available_sheets": round_display(total_closing),
        "unconfigured_materials_count": unconfigured_count,
        "total_materials_count": len(stock_items)
    })

@stock_bp.route("/history", methods=["GET"])
@director_required
def get_stock_history(current_user):
    """Returns chronological ledger entries for a material in unified Material_Stock."""
    material_id = request.args.get("material_id")
    rows = sheets_client.read_rows("Material_Stock")

    if material_id:
        rows = [r for r in rows if r.get("material_id") == material_id]

    rows.sort(key=lambda x: (x.get("date", ""), x.get("updated_at", "")), reverse=True)
    return jsonify({"success": True, "count": len(rows), "history": rows})

@stock_bp.route("/adjustment", methods=["POST"])
@director_required
def make_stock_adjustment(current_user):
    """
    Director-only manual stock adjustment with quantity, reason, and audit log.
    Saves to Stock_Adjustments sheet and updates Material_Stock ledger.
    """
    data = request.get_json() or {}
    material_id = data.get("material_id")
    adj_qty = data.get("adjustment_quantity")
    reason = data.get("adjustment_reason", "").strip()
    date_str = data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    if not material_id:
        return jsonify({"success": False, "error": "Material ID is required."}), 400

    if adj_qty is None:
        return jsonify({"success": False, "error": "Adjustment quantity is required."}), 400

    try:
        qty_num = float(adj_qty)
    except ValueError:
        return jsonify({"success": False, "error": "Adjustment quantity must be numeric."}), 400

    if not reason:
        return jsonify({"success": False, "error": "Adjustment reason is mandatory."}), 400

    materials = sheets_client.read_rows("Material_Master")
    target_mat = next((m for m in materials if m.get("material_id") == material_id), None)
    mat_name = target_mat.get("material_name") if target_mat else material_id

    current_bal_info = get_current_stock_balance(material_id)
    current_bal = current_bal_info["balance"] or 0.0
    new_closing = current_bal + qty_num

    now = datetime.now(timezone.utc).isoformat()
    adj_id = f"ADJ-{uuid.uuid4().hex[:6].upper()}"

    # 1. Append to Stock_Adjustments (Sheet 6)
    adj_record = {
        "adjustment_id": adj_id,
        "date": date_str,
        "material_id": material_id,
        "adjustment_quantity": qty_num,
        "adjustment_reason": reason,
        "employee": current_user.get("name", "Director"),
        "created_at": now
    }
    sheets_client.append_row("Stock_Adjustments", adj_record)

    # 2. Append new ledger entry in Material_Stock
    ledger_entry = {
        "stock_id": f"STK-ADJ-{uuid.uuid4().hex[:6].upper()}",
        "date": date_str,
        "material_id": material_id,
        "material_name": mat_name,
        "opening_stock": current_bal,
        "stock_received": qty_num if qty_num > 0 else 0,
        "punching_stock": abs(qty_num) if qty_num < 0 else 0,
        "closing_stock": new_closing,
        "remarks": f"Manual Adjustment ({'+' if qty_num > 0 else ''}{qty_num}): {reason}",
        "updated_by": current_user.get("name", "Director"),
        "updated_at": now
    }
    sheets_client.append_row("Material_Stock", ledger_entry)

    # 3. Record Audit Log
    record_audit_log(
        user_id=current_user["user_id"],
        action="STOCK_ADJUSTMENT",
        record_type="Material_Stock",
        record_id=adj_id,
        old_value=current_bal,
        new_value=f"Adjusted by {qty_num} -> New balance: {new_closing}. Reason: {reason}"
    )

    return jsonify({
        "success": True,
        "message": f"Stock adjustment recorded successfully. New balance: {round_display(new_closing)}.",
        "previous_balance": round_display(current_bal),
        "new_balance": round_display(new_closing)
    })

@stock_bp.route("/configure-initial", methods=["POST"])
@director_required
def configure_initial_stock(current_user):
    """Configures initial opening stock for unconfigured materials in Material_Stock."""
    data = request.get_json() or {}
    material_id = data.get("material_id")
    initial_qty = data.get("initial_stock")
    baseline_date = data.get("date", "2026-11-01")

    if not material_id or initial_qty is None:
        return jsonify({"success": False, "error": "Material ID and Initial Stock are required."}), 400

    try:
        qty_num = float(initial_qty)
    except ValueError:
        return jsonify({"success": False, "error": "Initial stock must be a valid number."}), 400

    materials = sheets_client.read_rows("Material_Master")
    target_mat = next((m for m in materials if m.get("material_id") == material_id), None)
    mat_name = target_mat.get("material_name") if target_mat else material_id

    now = datetime.now(timezone.utc).isoformat()

    existing_stocks = sheets_client.read_rows("Material_Stock")
    found_id = None
    for s in existing_stocks:
        if s.get("material_id") == material_id and s.get("date") == baseline_date:
            found_id = s.get("stock_id")
            break

    stock_record = {
        "stock_id": found_id or f"INIT-{material_id}",
        "date": baseline_date,
        "material_id": material_id,
        "material_name": mat_name,
        "opening_stock": qty_num,
        "stock_received": 0,
        "punching_stock": 0,
        "closing_stock": qty_num,
        "remarks": "Initial Baseline Stock Configured",
        "updated_by": current_user.get("name", "Director"),
        "updated_at": now
    }

    if found_id:
        sheets_client.update_row_by_id("Material_Stock", "stock_id", found_id, stock_record)
    else:
        sheets_client.append_row("Material_Stock", stock_record)

    record_audit_log(
        user_id=current_user["user_id"],
        action="CONFIG_INITIAL_STOCK",
        record_type="Material_Stock",
        record_id=material_id,
        new_value=f"Set initial stock to {qty_num} on {baseline_date}"
    )

    return jsonify({
        "success": True,
        "message": f"Initial stock configured for {mat_name}: {qty_num} sheets.",
        "material_id": material_id,
        "initial_stock": qty_num
    })

@stock_bp.route("/clear-all", methods=["POST", "DELETE"])
@stock_bp.route("", methods=["DELETE"])
@director_required
def delete_all_material_stock(current_user):
    """
    Director completely purges all material stock entries from the Material_Stock sheet.
    Resets all inventory stock balances in both Google Sheets and UI.
    """
    sheets_client.clear_sheet_data("Material_Stock")
    record_audit_log(
        user_id=current_user["user_id"],
        action="DELETE_ALL_MATERIAL_STOCK",
        record_type="Material_Stock",
        record_id="all",
        new_value="All records in Material_Stock deleted by Director."
    )
    return jsonify({
        "success": True,
        "message": "All Material stock records successfully deleted from backend sheet and UI."
    })

@stock_bp.route("/delete-selected", methods=["POST", "DELETE"])
@director_required
def delete_selected_material_stock(current_user):
    """
    Director deletes stock records for multiple selected materials from Material_Stock.
    """
    data = request.get_json() or {}
    mat_ids = data.get("material_ids", [])
    if not mat_ids:
        return jsonify({"success": False, "error": "No materials selected."}), 400

    total_deleted = 0
    for mid in mat_ids:
        total_deleted += sheets_client.delete_rows_by_condition("Material_Stock", "material_id", mid)

    record_audit_log(
        user_id=current_user["user_id"],
        action="DELETE_SELECTED_MATERIAL_STOCK",
        record_type="Material_Stock",
        record_id="batch",
        new_value=f"Deleted stock records for {len(mat_ids)} materials ({total_deleted} rows)."
    )

    return jsonify({
        "success": True,
        "message": f"Successfully deleted stock records for {len(mat_ids)} selected materials.",
        "deleted_count": total_deleted
    })

@stock_bp.route("/<material_id>", methods=["DELETE"])
@director_required
def delete_single_material_stock(current_user, material_id):
    """
    Director deletes all stock records for a specific material from Material_Stock.
    """
    deleted_count = sheets_client.delete_rows_by_condition("Material_Stock", "material_id", material_id)
    record_audit_log(
        user_id=current_user["user_id"],
        action="DELETE_MATERIAL_STOCK",
        record_type="Material_Stock",
        record_id=material_id,
        new_value=f"Deleted {deleted_count} stock records for material {material_id}."
    )
    return jsonify({
        "success": True,
        "message": f"Deleted {deleted_count} stock records for material {material_id}."
    })
