"""
Material Weight & Consumption Calculation Engine
Industrial manufacturing calculation rules with high internal precision
and standardized 2-decimal display formatting.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional

DEFAULT_STEEL_DENSITY = Decimal('0.00000785')

def round_display(val: float | Decimal | None, decimals: int = 2) -> float:
    """Rounds values for UI display and reporting using ROUND_HALF_UP."""
    if val is None:
        return 0.0
    d = Decimal(str(val))
    return float(d.quantize(Decimal(10) ** -decimals, rounding=ROUND_HALF_UP))

def calculate_sheet_weight(
    length_mm: float | Decimal,
    width_mm: float | Decimal,
    thickness_mm: float | Decimal,
    density_coefficient: float | Decimal | None = None
) -> float:
    """
    Calculates weight per sheet (kg):
    Weight (kg) = Length (mm) × Width (mm) × Thickness (mm) × Density Coefficient
    """
    try:
        l = Decimal(str(length_mm))
        w = Decimal(str(width_mm))
        t = Decimal(str(thickness_mm))
        dens = Decimal(str(density_coefficient)) if density_coefficient is not None else DEFAULT_STEEL_DENSITY
        weight = l * w * t * dens
        return float(weight)
    except Exception as e:
        raise ValueError(f"Invalid dimensions or density for weight calculation: {e}")

def calculate_material_entry(
    opening_stock: float | int,
    used_quantity: float | int,
    stock_received: float | int = 0,
    weight_per_sheet: float | Decimal = 0,
    scrap_weight: float | Decimal = 0,
    allow_scrap_override: bool = False
) -> Dict[str, Any]:
    """
    Calculates closing stock, total input weight, net consumption, and wastage percentage.
    Validates business constraints (scrap non-negative, scrap <= input weight).
    """
    opening = float(opening_stock)
    received = float(stock_received)
    used = float(used_quantity)
    scrap = float(scrap_weight)
    unit_weight = float(weight_per_sheet)

    if scrap < 0:
        raise ValueError("Scrap weight cannot be negative.")

    # Closing Stock = Opening Stock + Stock Received - Sheets Used
    closing_stock = opening + received - used

    # Total Input Weight = Sheets Used × Weight per Sheet
    total_input_weight = used * unit_weight

    if scrap > total_input_weight and not allow_scrap_override and total_input_weight > 0:
        raise ValueError(
            f"Scrap weight ({scrap} kg) cannot exceed total input weight ({round_display(total_input_weight)} kg) without authorized override."
        )

    # Net Material Consumption = Total Input Weight - Scrap Weight
    net_consumption = max(0.0, total_input_weight - scrap)

    # Wastage Percentage = (Scrap Weight / Total Input Weight) × 100
    if total_input_weight > 0:
        wastage_percentage = (scrap / total_input_weight) * 100.0
    else:
        wastage_percentage = 0.0

    return {
        "opening_stock": opening,
        "stock_received": received,
        "used_quantity": used,
        "closing_stock": closing_stock,
        "weight_per_sheet": unit_weight,
        "total_input_weight": total_input_weight,
        "scrap_weight": scrap,
        "net_consumption": net_consumption,
        "wastage_percentage": wastage_percentage,
        # Formatted rounded display fields
        "display": {
            "weight_per_sheet": round_display(unit_weight),
            "total_input_weight": round_display(total_input_weight),
            "scrap_weight": round_display(scrap),
            "net_consumption": round_display(net_consumption),
            "wastage_percentage": round_display(wastage_percentage),
            "closing_stock": round_display(closing_stock)
        }
    }

def calculate_period_wastage(total_scrap_weight: float, total_input_weight: float) -> float:
    """
    Calculates overall period wastage percentage:
    Wastage % = (Total Scrap Weight / Total Input Weight) * 100
    CRITICAL: Never average individual material percentages!
    """
    if total_input_weight <= 0:
        return 0.0
    return float((Decimal(str(total_scrap_weight)) / Decimal(str(total_input_weight))) * Decimal('100'))
