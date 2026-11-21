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

def test_restore_default_materials(client):
    """
    Test requirement: Materials can be restored and auto-recovered if removed,
    ensuring all 12 preconfigured factory standard materials are present.
    """
    dir_token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {dir_token}"}

    # Delete all standard materials from mock data to simulate accidental purge
    sheets_client._mock_data["Material_Master"] = []
    sheets_client.invalidate_cache("Material_Master")

    # 1. GET /api/materials should auto-restore them
    res = client.get("/api/materials")
    assert res.status_code == 200
    mats = res.get_json()["materials"]
    assert len(mats) == 12
    assert any(m["material_id"] == "MAT-01" for m in mats)
    assert any("CRCA" in m["material_name"] for m in mats)

    # 2. Test explicit POST /api/materials/restore-defaults
    sheets_client._mock_data["Material_Master"] = []
    sheets_client.invalidate_cache("Material_Master")

    res_post = client.post("/api/materials/restore-defaults", headers=headers)
    assert res_post.status_code == 200
    data = res_post.get_json()
    assert data["success"] is True
    assert len(data["materials"]) == 12

def test_delete_daily_entry_by_operator(client):
    """
    Test requirement: Operator / Data Entry User can view and delete historical entries.
    """
    op_token = get_operator_token(client)
    headers = {"Authorization": f"Bearer {op_token}"}

    # Create an entry
    payload = {
        "entry_date": "2026-11-20",
        "shift": "Day",
        "job_number": "DEL-JOB-001",
        "total_scrap_weight": 10.0,
        "rows": [
            {
                "material_id": "MAT-01",
                "opening_stock": 50,
                "used_quantity": 2,
                "weight_per_sheet": 29.4375,
                "cutbit_used": 0
            }
        ]
    }
    res = client.post("/api/entries", json=payload, headers=headers)
    assert res.status_code == 201
    entry_id = res.get_json()["entries"][0]["entry_id"]

    # Verify entry exists
    res_list = client.get("/api/entries", headers=headers)
    assert any(e["entry_id"] == entry_id for e in res_list.get_json()["entries"])

    # Operator deletes the entry
    del_res = client.delete(f"/api/entries/{entry_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.get_json()["success"] is True

    # Verify entry is removed
    res_list_after = client.get("/api/entries", headers=headers)
    assert not any(e["entry_id"] == entry_id for e in res_list_after.get_json()["entries"])

def test_operator_can_edit_historical_entry(client):
    """
    Test requirement:
    - Operator / Data Entry User can edit a historical entry in Historical Records.
    - Updated used_quantity and opening_stock reconciles closing stock correctly.
    """
    op_token = get_operator_token(client)
    headers = {"Authorization": f"Bearer {op_token}"}

    # Create entry
    create_payload = {
        "entry_date": "2026-11-20",
        "shift": "Day",
        "job_number": "EDIT-TEST-001",
        "rows": [
            {
                "material_id": "MAT-01",
                "opening_stock": 60,
                "used_quantity": 4,
                "cutbit_used": 0.5,
                "remarks": "Original entry"
            }
        ]
    }
    create_res = client.post("/api/entries", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    entry_id = create_res.get_json()["entries"][0]["entry_id"]

    # Operator edits the entry: changes used_quantity to 6, cutbit to 1.0, remarks
    edit_payload = {
        "job_number": "EDIT-TEST-001-MOD",
        "shift": "Night",
        "opening_stock": 60,
        "used_quantity": 6,
        "cutbit_used": 1.0,
        "remarks": "Corrected by operator"
    }
    edit_res = client.put(f"/api/entries/{entry_id}", json=edit_payload, headers=headers)
    assert edit_res.status_code == 200
    updated = edit_res.get_json()["entry"]
    assert updated["used_quantity"] == 6.0
    assert updated["closing_stock"] == 54.0  # 60 - 6
    assert updated["shift"] == "Night"
    assert updated["job_number"] == "EDIT-TEST-001-MOD"
    assert updated["remarks"] == "Corrected by operator"

def test_overall_scrap_and_no_received(client):
    """
    Test requirement:
    - No stock received field (Closing = Opening - Used).
    - Scrap is calculated by the use of overall materials and the total scrap only (no specific material scrap).
    """
    op_token = get_operator_token(client)
    headers = {"Authorization": f"Bearer {op_token}"}

    # Batch with 2 materials:
    # Mat 1 (MAT-01, wt 29.4375 kg): 2 sheets -> 58.875 kg
    # Mat 2 (MAT-02, wt 36.7969 kg): 1 sheet  -> 36.7969 kg
    # Overall Material Input Wt = 58.875 + 36.7969 = 95.6719 kg
    # Total Scrap Weighed = 9.56719 kg (~10% overall wastage)
    payload = {
        "entry_date": "2026-11-20",
        "shift": "Day",
        "job_number": "SCRAP-OVERALL-JOB",
        "total_scrap_weight": 9.56719,
        "rows": [
            {
                "material_id": "MAT-01",
                "opening_stock": 100,
                "used_quantity": 2
            },
            {
                "material_id": "MAT-02",
                "opening_stock": 80,
                "used_quantity": 1
            }
        ]
    }
    res = client.post("/api/entries", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()

    entries = data["entries"]
    assert len(entries) == 2

    # Closing stock has no received: Closing = Opening - Used
    assert entries[0]["closing_stock"] == 98  # 100 - 2
    assert entries[1]["closing_stock"] == 79  # 80 - 1

    # Batch summary matches overall materials and total scrap
    summary = data["batch_summary"]
    assert round(summary["total_scrap_weight"], 2) == 9.57
    assert round(summary["wastage_percentage"], 2) == 10.00

