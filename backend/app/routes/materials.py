"""
Material Master API Routes: Unified Factory Material Management & Weight Calculation
"""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.auth_helper import director_required, record_audit_log, token_required
from app.calculator import calculate_sheet_weight, round_display
from app.config import Config
from app.sheets_client import sheets_client

materials_bp = Blueprint("materials", __name__)

@materials_bp.route("", methods=["GET"])
def get_materials():
    """Returns all materials with optional type filter (Standard or Rare)."""
    type_filter = request.args.get("type")
    include_inactive = request.args.get("include_inactive", "false").lower() == "true"

    rows = sheets_client.read_rows("Material_Master")
    results = []
    for r in rows:
        is_active = r.get("is_active") in ("TRUE", "True", True, "1")
        if not include_inactive and not is_active:
            continue

        if type_filter and r.get("material_type") != type_filter:
            continue

        try:
            wt = float(r.get("weight_per_sheet", 0))
        except (ValueError, TypeError):
            wt = 0.0

        results.append({
            "material_id": r.get("material_id"),
            "material_name": r.get("material_name"),
            "category": r.get("category"),
            "material_type": r.get("material_type", "Standard"),
            "length_mm": float(r.get("length_mm")) if r.get("length_mm") else None,
            "width_mm": float(r.get("width_mm")) if r.get("width_mm") else None,
            "thickness_mm": float(r.get("thickness_mm")) if r.get("thickness_mm") else None,
            "density_coefficient": float(r.get("density_coefficient")) if r.get("density_coefficient") else None,
            "weight_per_sheet": wt,
            "weight_per_sheet_display": round_display(wt),
            "is_manual_weight": r.get("is_manual_weight") in ("TRUE", "True", True, "1"),
            "unit": r.get("unit", "Sheets"),
            "is_active": is_active,
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at")
        })

    return jsonify({"success": True, "count": len(results), "materials": results})

@materials_bp.route("/<material_id>", methods=["GET"])
def get_material_by_id(material_id):
    rows = sheets_client.read_rows("Material_Master")
    for r in rows:
        if r.get("material_id") == material_id:
            try:
                wt = float(r.get("weight_per_sheet", 0))
            except (ValueError, TypeError):
                wt = 0.0
            return jsonify({
                "success": True,
                "material": {
                    **r,
                    "weight_per_sheet": wt,
                    "weight_per_sheet_display": round_display(wt),
                    "is_active": r.get("is_active") in ("TRUE", "True", True, "1")
                }
            })
    return jsonify({"success": False, "error": "Material not found."}), 404

@materials_bp.route("/calculate-weight", methods=["POST"])
def preview_weight():
    """Previews sheet weight calculation given dimensions and density."""
    data = request.get_json() or {}
    length = data.get("length_mm")
    width = data.get("width_mm")
    thickness = data.get("thickness_mm")
    density = data.get("density_coefficient", Config.STEEL_DENSITY_COEFFICIENT)

    if not all([length, width, thickness]):
        return jsonify({"success": False, "error": "Length, width, and thickness are required."}), 400

    try:
        wt = calculate_sheet_weight(length, width, thickness, density)
        return jsonify({
            "success": True,
            "weight_per_sheet": wt,
            "display_weight": round_display(wt),
            "formula": f"{length} × {width} × {thickness} × {density} = {wt:.4f} kg"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@materials_bp.route("", methods=["POST"])
@token_required
def create_material(current_user):
    """
    Creates a new material (Standard or Rare).
    Both Operators and Directors can register rare materials on the day of usage.
    """
    data = request.get_json() or {}
    material_name = data.get("material_name", "").strip()
    category = data.get("category", "General").strip()
    material_type = data.get("material_type", "Standard")
    unit = data.get("unit", "Sheets")
    opening_stock = data.get("opening_stock")
    remarks = data.get("remarks", "").strip()

    if not material_name:
        return jsonify({"success": False, "error": "Material Name is required."}), 400

    existing_materials = sheets_client.read_rows("Material_Master")
    for m in existing_materials:
        if m.get("material_name", "").strip().lower() == material_name.lower():
            return jsonify({
                "success": False,
                "error": f"A material named '{material_name}' already exists."
            }), 400

    length_mm = data.get("length_mm")
    width_mm = data.get("width_mm")
    thickness_mm = data.get("thickness_mm")
    density_coeff = data.get("density_coefficient")
    manual_weight = data.get("manual_weight")

    is_manual_weight = False
    if length_mm and width_mm and thickness_mm:
        try:
            density = density_coeff if density_coeff is not None else Config.STEEL_DENSITY_COEFFICIENT
            calculated_weight = calculate_sheet_weight(length_mm, width_mm, thickness_mm, density)
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid dimension calculation: {e}"}), 400
    elif manual_weight is not None:
        try:
            calculated_weight = float(manual_weight)
            is_manual_weight = True
        except ValueError:
            return jsonify({"success": False, "error": "Manual weight must be a valid number."}), 400
    else:
        return jsonify({
            "success": False,
            "error": "Provide either (Length, Width, Thickness) or a manual weight per sheet."
        }), 400

    now = datetime.now(timezone.utc).isoformat()
    prefix = "MAT-R-" if material_type == "Rare" else "MAT-"
    material_id = f"{prefix}{uuid.uuid4().hex[:6].upper()}"

    new_record = {
        "material_id": material_id,
        "material_name": material_name,
        "category": category,
        "material_type": material_type,
        "length_mm": length_mm if length_mm is not None else "",
        "width_mm": width_mm if width_mm is not None else "",
        "thickness_mm": thickness_mm if thickness_mm is not None else "",
        "density_coefficient": density_coeff if density_coeff is not None else Config.STEEL_DENSITY_COEFFICIENT,
        "weight_per_sheet": calculated_weight,
        "unit": unit,
        "is_active": "TRUE",
        "created_at": now,
        "updated_at": now
    }

    sheets_client.append_row("Material_Master", new_record)

    if opening_stock is not None and str(opening_stock).strip() != "":
        try:
            stock_num = float(opening_stock)
            stock_record = {
                "stock_id": f"INIT-{material_id}",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "material_id": material_id,
                "material_name": material_name,
                "opening_stock": stock_num,
                "stock_received": 0,
                "punching_stock": 0,
                "closing_stock": stock_num,
                "remarks": f"Initial Stock recorded upon material creation. {remarks}".strip(),
                "updated_by": current_user.get("name", "Operator"),
                "updated_at": now
            }
            sheets_client.append_row("Material_Stock", stock_record)
        except ValueError:
            pass

    record_audit_log(
        user_id=current_user["user_id"],
        action="CREATE_MATERIAL",
        record_type="Material_Master",
        record_id=material_id,
        new_value=f"Created {material_type} material: {material_name} (weight: {calculated_weight:.4f} kg)"
    )

    return jsonify({
        "success": True,
        "message": f"{material_type} Material created successfully.",
        "material": {
            **new_record,
            "weight_per_sheet_display": round_display(calculated_weight)
        }
    }), 201

@materials_bp.route("/<material_id>", methods=["PUT"])
@director_required
def update_material(current_user, material_id):
    """Director updates material specifications."""
    data = request.get_json() or {}
    materials = sheets_client.read_rows("Material_Master")
    target = None
    for m in materials:
        if m.get("material_id") == material_id:
            target = m
            break

    if not target:
        return jsonify({"success": False, "error": "Material not found."}), 404

    updated = dict(target)
    if "material_name" in data:
        updated["material_name"] = data["material_name"].strip()
    if "category" in data:
        updated["category"] = data["category"].strip()
    if "is_active" in data:
        updated["is_active"] = "TRUE" if data["is_active"] else "FALSE"
    if "unit" in data:
        updated["unit"] = data["unit"]

    l = data.get("length_mm", target.get("length_mm"))
    w = data.get("width_mm", target.get("width_mm"))
    t = data.get("thickness_mm", target.get("thickness_mm"))
    dens = data.get("density_coefficient", target.get("density_coefficient"))

    if l and w and t:
        try:
            wt = calculate_sheet_weight(l, w, t, dens)
            updated["length_mm"] = l
            updated["width_mm"] = w
            updated["thickness_mm"] = t
            updated["density_coefficient"] = dens
            updated["weight_per_sheet"] = wt
        except Exception as e:
            return jsonify({"success": False, "error": f"Weight recalculation error: {e}"}), 400
    elif "manual_weight" in data:
        updated["weight_per_sheet"] = float(data["manual_weight"])

    updated["updated_at"] = datetime.now(timezone.utc).isoformat()
    sheets_client.update_row_by_id("Material_Master", "material_id", material_id, updated)

    record_audit_log(
        user_id=current_user["user_id"],
        action="UPDATE_MATERIAL",
        record_type="Material_Master",
        record_id=material_id,
        old_value=target.get("weight_per_sheet"),
        new_value=updated.get("weight_per_sheet")
    )

    return jsonify({
        "success": True,
        "message": "Material updated successfully.",
        "material": updated
    })

@materials_bp.route("/<material_id>", methods=["DELETE"])
@director_required
def delete_material(current_user, material_id):
    """Director soft deletes a material."""
    materials = sheets_client.read_rows("Material_Master")
    target = None
    for m in materials:
        if m.get("material_id") == material_id:
            target = m
            break

    if not target:
        return jsonify({"success": False, "error": "Material not found."}), 404

    updated = dict(target)
    updated["is_active"] = "FALSE"
    updated["updated_at"] = datetime.now(timezone.utc).isoformat()

    sheets_client.update_row_by_id("Material_Master", "material_id", material_id, updated)
    record_audit_log(
        user_id=current_user["user_id"],
        action="DEACTIVATE_MATERIAL",
        record_type="Material_Master",
        record_id=material_id,
        old_value="Active",
        new_value="Inactive"
    )

    return jsonify({"success": True, "message": "Material deactivated successfully."})
