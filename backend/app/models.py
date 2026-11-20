"""
Data Models, Google Sheets Schema Definitions, and Preconfigured Master Data
Unified factory inventory without Left / Right side split.
"""

from datetime import datetime, timezone
from app.calculator import calculate_sheet_weight

SHEET_SCHEMAS = {
    "Material_Master": [
        "material_id",
        "material_name",
        "category",
        "material_type",
        "length_mm",
        "width_mm",
        "thickness_mm",
        "density_coefficient",
        "weight_per_sheet",
        "unit",
        "is_active",
        "created_at",
        "updated_at"
    ],
    "Daily_Entries": [
        "entry_id",
        "entry_date",
        "job_number",
        "shift",
        "material_id",
        "material_name",
        "opening_stock",
        "stock_received",
        "used_quantity",
        "closing_stock",
        "weight_per_sheet",
        "total_input_weight",
        "scrap_weight",
        "net_consumption",
        "wastage_percentage",
        "cutbit_used",
        "remarks",
        "employee",
        "created_at",
        "updated_at"
    ],
    "Material_Stock": [
        "stock_id",
        "date",
        "material_id",
        "material_name",
        "opening_stock",
        "stock_received",
        "punching_stock",
        "closing_stock",
        "remarks",
        "updated_by",
        "updated_at"
    ],
    "Scrap_Records": [
        "scrap_id",
        "date",
        "material_id",
        "material_name",
        "total_input_weight",
        "scrap_weight",
        "net_consumption",
        "wastage_percentage",
        "remarks",
        "employee",
        "created_at"
    ],
    "Production_Summary": [
        "production_id",
        "date",
        "total_punching",
        "total_cutbit",
        "remarks",
        "created_at"
    ],
    "Stock_Adjustments": [
        "adjustment_id",
        "date",
        "material_id",
        "adjustment_quantity",
        "adjustment_reason",
        "employee",
        "created_at"
    ],
    "Users": [
        "user_id",
        "name",
        "email",
        "password_hash",
        "role",
        "is_active",
        "created_at"
    ],
    "Audit_Log": [
        "log_id",
        "user_id",
        "action",
        "record_type",
        "record_id",
        "old_value",
        "new_value",
        "timestamp"
    ],
    "Settings": [
        "setting_key",
        "setting_value",
        "updated_at"
    ]
}

# Preconfigured Factory Standard Materials (Unified Sheet)
PRECONFIGURED_MATERIALS = [
    {
        "material_id": "MAT-01",
        "material_name": "1.2 CRCA Sheet (1250 × 2500)",
        "category": "CRCA",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.2,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.2, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 135
    },
    {
        "material_id": "MAT-02",
        "material_name": "1.5 CRCA Sheet (1250 × 2500)",
        "category": "CRCA",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.5,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.5, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 291
    },
    {
        "material_id": "MAT-03",
        "material_name": "2.0 CRCA Sheet (1250 × 2500)",
        "category": "CRCA",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 2.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 2.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 93
    },
    {
        "material_id": "MAT-04",
        "material_name": "2.0 HRPO Sheet (1250 × 2500)",
        "category": "HRPO",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 2.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 2.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": None  # "Not Configured"
    },
    {
        "material_id": "MAT-05",
        "material_name": "3.0 HRPO Sheet (1250 × 2500)",
        "category": "HRPO",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 3.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 3.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 3
    },
    {
        "material_id": "MAT-06",
        "material_name": "5.0 HR Sheet (1250 × 2500)",
        "category": "HR",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 5.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 5.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 4
    },
    {
        "material_id": "MAT-07",
        "material_name": "CP-1.6 Sheet (1250 × 2500)",
        "category": "CP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.6,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.6, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 4
    },
    {
        "material_id": "MAT-08",
        "material_name": "1.0 GP Sheet (1250 × 2500)",
        "category": "GP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": None  # "Not Configured"
    },
    {
        "material_id": "MAT-09",
        "material_name": "1.2 GP Sheet (1250 × 2500)",
        "category": "GP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.2,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.2, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 16
    },
    {
        "material_id": "MAT-10",
        "material_name": "1.5 GP Sheet (1250 × 2500)",
        "category": "GP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.5,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.5, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": 13
    },
    {
        "material_id": "MAT-11",
        "material_name": "1.6 / 2.0 GP Sheet (1250 × 2500)",
        "category": "GP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.6,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 1.6, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": None  # "Not Configured"
    },
    {
        "material_id": "MAT-12",
        "material_name": "2.0 GP Sheet (1250 × 2500)",
        "category": "GP",
        "material_type": "Standard",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 2.0,
        "density_coefficient": 0.00000785,
        "weight_per_sheet": calculate_sheet_weight(1250, 2500, 2.0, 0.00000785),
        "unit": "Sheets",
        "is_active": True,
        "initial_stock": None  # "Not Configured"
    }
]
