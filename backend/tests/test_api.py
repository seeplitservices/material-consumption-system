"""
Comprehensive End-to-End Test Suite for Industrial Requirements (Unified Sheet & Role-Based Access)
"""

import json
import pytest
from app import create_app
from app.sheets_client import sheets_client

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def get_auth_token(client, email="director@factory.com", password="Director@123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.get_json()["token"]

def get_operator_token(client, email="operator@factory.com", password="Operator@123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.get_json()["token"]

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "Google Sheets API" in data["database"]["type"]

def test_role_based_access_control(client):
    """
    Test requirement:
    - User who enters data (Operator) should see ONLY Daily Material Entry.
    - Only the Director can access Dashboard, Reports, Stock Adjustments, User Management.
    """
    op_token = get_operator_token(client)
    op_headers = {"Authorization": f"Bearer {op_token}"}

    dir_token = get_auth_token(client)
    dir_headers = {"Authorization": f"Bearer {dir_token}"}

    # Operator is FORBIDDEN from viewing Dashboard
    res = client.get("/api/dashboard/summary", headers=op_headers)
    assert res.status_code == 403

    # Operator is FORBIDDEN from viewing Reports
    res = client.get("/api/reports/daily", headers=op_headers)
    assert res.status_code == 403

    # Operator is FORBIDDEN from viewing User Management
    res = client.get("/api/auth/users", headers=op_headers)
    assert res.status_code == 403

    # Director has full access to Dashboard, Reports, and Users
    res_dash = client.get("/api/dashboard/summary", headers=dir_headers)
    assert res_dash.status_code == 200

    res_rep = client.get("/api/reports/daily", headers=dir_headers)
    assert res_rep.status_code == 200

    res_users = client.get("/api/auth/users", headers=dir_headers)
    assert res_users.status_code == 200

def test_unified_sheet_stock_and_calculations(client):
    """
    TEST 1: 1.2 CRCA dimensions 1250 x 2500 x 1.2 -> 29.4375 kg (display 29.44 kg).
    TEST 2: 3 sheets used -> 88.3125 kg (display 88.31 kg).
    TEST 3: 8 kg scrap -> Net: 80.3125 kg, Wastage: ~9.06%.
    TEST 4: Opening stock 135, Used 3, Received 0 -> Closing 132.
    Unified under Material_Stock without Left / Right split!
    """
    op_token = get_operator_token(client)
    headers = {"Authorization": f"Bearer {op_token}"}

    # Test weight calculation preview
    res = client.post("/api/materials/calculate-weight", json={
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.2,
        "density_coefficient": 0.00000785
    })
    assert res.status_code == 200
    calc = res.get_json()
    assert calc["weight_per_sheet"] == 29.4375
    assert calc["display_weight"] == 29.44

    # Post daily transaction for MAT-01 (1.2 CRCA)
    entry_payload = {
        "entry_date": "2026-11-20",
        "shift": "Day",
        "job_number": "JOB-UNIFIED-001",
        "rows": [
            {
                "material_id": "MAT-01",
                "opening_stock": 135,
                "used_quantity": 3,
                "stock_received": 0,
                "scrap_weight": 8.0,
                "cutbit_used": 1.5,
                "remarks": "Unified sheet test"
            }
        ]
    }
    res = client.post("/api/entries", json=entry_payload, headers=headers)
    assert res.status_code == 201
    entry_data = res.get_json()["entries"][0]

    assert entry_data["used_quantity"] == 3
    assert entry_data["total_input_weight"] == 88.3125
    assert entry_data["scrap_weight"] == 8.0
    assert entry_data["net_consumption"] == 80.3125
    assert round(entry_data["wastage_percentage"], 2) == 9.06
    assert entry_data["closing_stock"] == 132

    # Check that next day's opening stock automatically inherited closing stock in unified Material_Stock
    dir_token = get_auth_token(client)
    res_stock = client.get("/api/stock", headers={"Authorization": f"Bearer {dir_token}"})
    assert res_stock.status_code == 200
    stock_items = res_stock.get_json()["stock"]
    crca_stock = next(s for s in stock_items if s["material_id"] == "MAT-01")
    assert crca_stock["closing_stock"] == 132

def test_rare_material_creation_unified(client):
    """
    TEST 5:
    Operator / Director creates a rare material on the day of usage.
    Saved to Material_Master and immediately available.
    """
    op_token = get_operator_token(client)
    headers = {"Authorization": f"Bearer {op_token}"}

    rare_payload = {
        "material_name": "Special Copper Strip 0.5mm",
        "category": "Copper",
        "material_type": "Rare",
        "length_mm": 1000,
        "width_mm": 2000,
        "thickness_mm": 0.5,
        "density_coefficient": 0.00000896,
        "unit": "Sheets",
        "opening_stock": 50,
        "remarks": "Custom stamping component"
    }

    res = client.post("/api/materials", json=rare_payload, headers=headers)
    assert res.status_code == 201
    created = res.get_json()["material"]
    expected_weight = 1000 * 2000 * 0.5 * 0.00000896
    assert created["weight_per_sheet"] == expected_weight

    # Check future materials list includes it
    res = client.get("/api/materials")
    all_mats = res.get_json()["materials"]
    found = any(m["material_name"] == "Special Copper Strip 0.5mm" for m in all_mats)
    assert found is True

def test_clear_existing_data_endpoint(client):
    """
    Test requirement: Director can clear existing entered data and reset to baseline.
    """
    dir_token = get_auth_token(client)
    res = client.post("/api/settings/clear-data", headers={"Authorization": f"Bearer {dir_token}"})
    assert res.status_code == 200
    assert "cleared" in res.get_json()["message"].lower()

    # Verify Daily Entries is now completely empty
    res_entries = client.get("/api/entries", headers={"Authorization": f"Bearer {dir_token}"})
    assert len(res_entries.get_json()["entries"]) == 0

def test_delete_material_removes_from_sheet_and_stock(client):
    """
    Test requirement: If deactivate / delete material, it should be removed
    from the UI and also from the backend sheet (Material_Master and Material_Stock).
    """
    dir_token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {dir_token}"}

    # 1. Create a test material with stock
    res = client.post("/api/materials", json={
        "material_name": "Temporary Test Material 101",
        "category": "CRCA",
        "material_type": "Rare",
        "length_mm": 1250,
        "width_mm": 2500,
        "thickness_mm": 1.0,
        "density_coefficient": 0.00000785,
        "opening_stock": 25
    }, headers=headers)
    assert res.status_code == 201
    mat_id = res.get_json()["material"]["material_id"]

    # Verify it exists in Material_Master and Material_Stock
    res_mats = client.get("/api/materials")
    assert any(m["material_id"] == mat_id for m in res_mats.get_json()["materials"])

    stock_rows = sheets_client.read_rows("Material_Stock")
    assert any(s.get("material_id") == mat_id for s in stock_rows)

    # 2. Delete / deactivate material
    del_res = client.delete(f"/api/materials/{mat_id}", headers=headers)
    assert del_res.status_code == 200

    # 3. Verify completely removed from Material_Master
    res_mats_after = client.get("/api/materials")
    assert not any(m["material_id"] == mat_id for m in res_mats_after.get_json()["materials"])

    # 4. Verify stock completely removed from Material_Stock
    stock_rows_after = sheets_client.read_rows("Material_Stock")
    assert not any(s.get("material_id") == mat_id for s in stock_rows_after)

def test_delete_all_material_stock(client):
    """
    Test requirement: Director can delete all material stock records.
    """
    dir_token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {dir_token}"}

    res = client.delete("/api/stock", headers=headers)
    assert res.status_code == 200

    # Verify Material_Stock sheet is now empty
    stock_rows = sheets_client.read_rows("Material_Stock")
    assert len(stock_rows) == 0
