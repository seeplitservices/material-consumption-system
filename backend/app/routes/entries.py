"""
Daily Material Entry Module: Multi-Row Transactions, Real-time Validation,
Stock Updates, Scrap Recording, and Production Summary Sync.
"""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.auth_helper import record_audit_log, token_required
from app.calculator import calculate_material_entry, round_display
from app.routes.stock import get_current_stock_balance
from app.sheets_client import sheets_client

entries_bp = Blueprint("entries", __name__)

@entries_bp.route("", methods=["GET"])
def get_daily_entries():
    """Returns daily entries with pagination and date/side/job filters."""
    date_filter = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    side_filter = request.args.get("side")
    material_id_filter = request.args.get("material_id")
    job_filter = request.args.get("job_number")

    rows = sheets_client.read_rows("Daily_Entries")

    filtered = []
    for r in rows:
        ed = r.get("entry_date", "")
        if date_filter and ed != date_filter:
            continue
        if start_date and ed < start_date:
            continue
        if end_date and ed > end_date:
            continue
        if side_filter and r.get("side") != side_filter:
            continue
        if material_id_filter and r.get("material_id") != material_id_filter:
            continue
        if job_filter and job_filter.lower() not in r.get("job_number", "").lower():
            continue

        try:
            wt_sheet = float(r.get("weight_per_sheet", 0))
            tot_wt = float(r.get("total_input_weight", 0))
            sc_wt = float(r.get("scrap_weight", 0))
            net_c = float(r.get("net_consumption", 0))
            wast_pct = float(r.get("wastage_percentage", 0))
            op_stk = float(r.get("opening_stock", 0))
            cl_stk = float(r.get("closing_stock", 0))
            used_q = float(r.get("used_quantity", 0))
            cutbit = float(r.get("cutbit_used", 0))
        except (ValueError, TypeError):
            wt_sheet = tot_wt = sc_wt = net_c = wast_pct = op_stk = cl_stk = used_q = cutbit = 0.0

        filtered.append({
            **r,
            "weight_per_sheet_display": round_display(wt_sheet),
            "total_input_weight_display": round_display(tot_wt),
            "scrap_weight_display": round_display(sc_wt),
            "net_consumption_display": round_display(net_c),
            "wastage_percentage_display": round_display(wast_pct),
            "opening_stock_display": round_display(op_stk),
            "closing_stock_display": round_display(cl_stk),
            "used_quantity_display": round_display(used_q),
            "cutbit_used_display": round_display(cutbit)
        })

    # Sort descending by date and created_at
    filtered.sort(key=lambda x: (x.get("entry_date", ""), x.get("created_at", "")), reverse=True)
    return jsonify({"success": True, "count": len(filtered), "entries": filtered})

@entries_bp.route("/<entry_id>", methods=["GET"])
def get_entry_by_id(entry_id):
    rows = sheets_client.read_rows("Daily_Entries")
    for r in rows:
        if r.get("entry_id") == entry_id:
            return jsonify({"success": True, "entry": r})
    return jsonify({"success": False, "error": "Daily entry not found."}), 404

@entries_bp.route("", methods=["POST"])
@token_required
def create_daily_entry(current_user):
    """
    Submits a daily material transaction batch.
    Handles multiple material rows in a single submission.
    Atomically records in:
      1. Daily_Entries (Sheet 2)
      2. Left_Stock / Right_Stock (Sheets 3 & 4)
      3. Scrap_Records (Sheet 5)
      4. Production_Summary (Sheet 6)
      5. Audit_Log (Sheet 9)
    """
    data = request.get_json() or {}
    entry_date = data.get("entry_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    shift = data.get("shift", "Day")
    side = data.get("side", "Left")
    job_number = data.get("job_number", "").strip()
    general_remarks = data.get("remarks", "").strip()
    rows = data.get("rows", [])
    allow_negative_override = data.get("allow_negative_override", False)

    if side not in ["Left", "Right"]:
        return jsonify({"success": False, "error": "Side must be Left or Right."}), 400

    if not rows or not isinstance(rows, list):
        return jsonify({"success": False, "error": "At least one material row is required."}), 400

    now = datetime.now(timezone.utc).isoformat()
    employee_name = current_user.get("name", "Employee")
    stock_sheet = "Left_Stock" if side == "Left" else "Right_Stock"

    # Fetch materials to get verified weight/dimensions snapshot
    master_materials = {
        m["material_id"]: m
        for m in sheets_client.read_rows("Material_Master")
    }

    saved_entries = []
    stock_updates = []
    scrap_records = []

    total_punching_in_batch = 0.0
    total_cutbit_in_batch = 0.0

    for idx, row in enumerate(rows, start=1):
        mat_id = row.get("material_id")
        if not mat_id or mat_id not in master_materials:
            return jsonify({"success": False, "error": f"Row {idx}: Invalid or missing material."}), 400

        mat_meta = master_materials[mat_id]
        mat_name = mat_meta.get("material_name", row.get("material_name", mat_id))

        # Weight per sheet snapshot from Master or manual
        try:
            unit_weight = float(mat_meta.get("weight_per_sheet", row.get("weight_per_sheet", 0)))
        except (ValueError, TypeError):
            unit_weight = 0.0

        # Current stock balance
        cur_balance_info = get_current_stock_balance(side, mat_id)
        if cur_balance_info["balance"] is None:
            # Material not yet configured
            if row.get("opening_stock") is not None:
                op_stock = float(row.get("opening_stock"))
            else:
                return jsonify({
                    "success": False,
                    "error": f"Material '{mat_name}' has no configured opening stock. Please set opening stock first."
                }), 400
        else:
            op_stock = cur_balance_info["balance"]

        try:
            used_qty = float(row.get("used_quantity", 0))
            received_qty = float(row.get("stock_received", 0))
            scrap_wt = float(row.get("scrap_weight", 0))
            cutbit_val = float(row.get("cutbit_used", 0))
        except ValueError as e:
            return jsonify({"success": False, "error": f"Row {idx} contains non-numeric inputs: {e}"}), 400

        # Validate closing stock calculation
        try:
            calc = calculate_material_entry(
                opening_stock=op_stock,
                used_quantity=used_qty,
                stock_received=received_qty,
                weight_per_sheet=unit_weight,
                scrap_weight=scrap_wt,
                allow_scrap_override=row.get("allow_scrap_override", False)
            )
        except ValueError as err:
            return jsonify({"success": False, "error": f"Row {idx} ({mat_name}): {err}"}), 400

        if calc["closing_stock"] < 0 and not allow_negative_override:
            return jsonify({
                "success": False,
                "error": f"Row {idx} ({mat_name}): Closing stock cannot be negative ({calc['closing_stock']}) without authorized stock adjustment.",
                "requires_override": True
            }), 400

        entry_id = f"ENT-{uuid.uuid4().hex[:8].upper()}"
        entry_row = {
            "entry_id": entry_id,
            "entry_date": entry_date,
            "job_number": job_number,
            "shift": shift,
            "side": side,
            "material_id": mat_id,
            "material_name": mat_name,
            "opening_stock": calc["opening_stock"],
            "stock_received": calc["stock_received"],
            "used_quantity": calc["used_quantity"],
            "closing_stock": calc["closing_stock"],
            "weight_per_sheet": calc["weight_per_sheet"],
            "total_input_weight": calc["total_input_weight"],
            "scrap_weight": calc["scrap_weight"],
            "net_consumption": calc["net_consumption"],
            "wastage_percentage": calc["wastage_percentage"],
            "cutbit_used": cutbit_val,
            "remarks": row.get("remarks", general_remarks),
            "employee": employee_name,
            "created_at": now,
            "updated_at": now
        }
        saved_entries.append(entry_row)

        # Prepare stock ledger update
        stock_updates.append({
            "stock_id": f"STK-{uuid.uuid4().hex[:6].upper()}",
            "date": entry_date,
            "material_id": mat_id,
            "material_name": mat_name,
            "opening_stock": calc["opening_stock"],
            "stock_received": calc["stock_received"],
            "punching_stock": calc["used_quantity"],
            "closing_stock": calc["closing_stock"],
            "remarks": f"Job: {job_number} (Shift: {shift})",
            "updated_by": employee_name,
            "updated_at": now
        })

        # Prepare scrap record if scrap > 0
        if calc["scrap_weight"] > 0 or calc["total_input_weight"] > 0:
            scrap_records.append({
                "scrap_id": f"SCRAP-{uuid.uuid4().hex[:6].upper()}",
                "date": entry_date,
                "side": side,
                "material_id": mat_id,
                "material_name": mat_name,
                "total_input_weight": calc["total_input_weight"],
                "scrap_weight": calc["scrap_weight"],
                "net_consumption": calc["net_consumption"],
                "wastage_percentage": calc["wastage_percentage"],
                "remarks": row.get("remarks", general_remarks),
                "employee": employee_name,
                "created_at": now
            })

        total_punching_in_batch += used_qty
        total_cutbit_in_batch += cutbit_val

    # Batch write to Google Sheets
    sheets_client.append_rows_batch("Daily_Entries", saved_entries)
    sheets_client.append_rows_batch(stock_sheet, stock_updates)
    if scrap_records:
        sheets_client.append_rows_batch("Scrap_Records", scrap_records)

    # Sync Production_Summary for the date
    _sync_production_summary(entry_date)

    # Record Audit Log
    record_audit_log(
        user_id=current_user["user_id"],
        action="CREATE_DAILY_ENTRY",
        record_type="Daily_Entries",
        record_id=",".join(e["entry_id"] for e in saved_entries),
        new_value=f"{side} Side: {len(saved_entries)} materials recorded by {employee_name} on {entry_date}"
    )

    return jsonify({
        "success": True,
        "message": f"Successfully recorded {len(saved_entries)} material entries for {side} Side.",
        "entries": saved_entries
    }), 201

@entries_bp.route("/<entry_id>", methods=["PUT"])
@token_required
def update_daily_entry(current_user, entry_id):
    """
    Edits a saved entry, recalculates weights/stocks, records audit log,
    and updates production summary.
    """
    data = request.get_json() or {}
    entries = sheets_client.read_rows("Daily_Entries")
    target = next((e for e in entries if e.get("entry_id") == entry_id), None)

    if not target:
        return jsonify({"success": False, "error": "Daily entry not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    old_used = target.get("used_quantity")
    old_scrap = target.get("scrap_weight")

    updated = dict(target)
    for field in ["job_number", "shift", "remarks"]:
        if field in data:
            updated[field] = data[field]

    # Recalculate if used, received, or scrap changed
    if any(k in data for k in ["used_quantity", "stock_received", "scrap_weight", "weight_per_sheet"]):
        op_stock = float(data.get("opening_stock", target.get("opening_stock", 0)))
        used_q = float(data.get("used_quantity", target.get("used_quantity", 0)))
        rec_q = float(data.get("stock_received", target.get("stock_received", 0)))
        scrap_w = float(data.get("scrap_weight", target.get("scrap_weight", 0)))
        unit_w = float(data.get("weight_per_sheet", target.get("weight_per_sheet", 0)))

        calc = calculate_material_entry(
            opening_stock=op_stock,
            used_quantity=used_q,
            stock_received=rec_q,
            weight_per_sheet=unit_w,
            scrap_weight=scrap_w,
            allow_scrap_override=True
        )
        updated.update({
            "opening_stock": calc["opening_stock"],
            "used_quantity": calc["used_quantity"],
            "stock_received": calc["stock_received"],
            "closing_stock": calc["closing_stock"],
            "total_input_weight": calc["total_input_weight"],
            "scrap_weight": calc["scrap_weight"],
            "net_consumption": calc["net_consumption"],
            "wastage_percentage": calc["wastage_percentage"]
        })

    if "cutbit_used" in data:
        updated["cutbit_used"] = float(data["cutbit_used"])

    updated["updated_at"] = now
    sheets_client.update_row_by_id("Daily_Entries", "entry_id", entry_id, updated)

    # Sync Production_Summary for that date
    _sync_production_summary(updated.get("entry_date"))

    record_audit_log(
        user_id=current_user["user_id"],
        action="UPDATE_DAILY_ENTRY",
        record_type="Daily_Entries",
        record_id=entry_id,
        old_value=f"used={old_used}, scrap={old_scrap}",
        new_value=f"used={updated.get('used_quantity')}, scrap={updated.get('scrap_weight')}"
    )

    return jsonify({
        "success": True,
        "message": "Daily entry updated and audited successfully.",
        "entry": updated
    })

def _sync_production_summary(target_date: str):
    """
    Re-aggregates Left and Right punching and cutbit quantities for target_date
    into Sheet 6: Production_Summary without double counting.
    """
    if not target_date:
        return

    all_entries = sheets_client.read_rows("Daily_Entries")
    date_entries = [e for e in all_entries if e.get("entry_date") == target_date]

    left_punch = sum(
        float(e.get("used_quantity", 0)) for e in date_entries if e.get("side") == "Left"
    )
    right_punch = sum(
        float(e.get("used_quantity", 0)) for e in date_entries if e.get("side") == "Right"
    )
    left_cut = sum(
        float(e.get("cutbit_used", 0)) for e in date_entries if e.get("side") == "Left"
    )
    right_cut = sum(
        float(e.get("cutbit_used", 0)) for e in date_entries if e.get("side") == "Right"
    )

    now = datetime.now(timezone.utc).isoformat()
    prod_summaries = sheets_client.read_rows("Production_Summary")
    existing_record = next((p for p in prod_summaries if p.get("date") == target_date), None)

    summary_data = {
        "production_id": existing_record.get("production_id") if existing_record else f"PROD-{uuid.uuid4().hex[:6].upper()}",
        "date": target_date,
        "left_total_punching": left_punch,
        "right_total_punching": right_punch,
        "overall_total_punching": left_punch + right_punch,
        "left_cutbit": left_cut,
        "right_cutbit": right_cut,
        "overall_cutbit": left_cut + right_cut,
        "remarks": f"Daily total calculated from {len(date_entries)} transactions",
        "created_at": existing_record.get("created_at") if existing_record else now
    }

    if existing_record:
        sheets_client.update_row_by_id(
            "Production_Summary", "production_id", summary_data["production_id"], summary_data
        )
    else:
        sheets_client.append_row("Production_Summary", summary_data)
