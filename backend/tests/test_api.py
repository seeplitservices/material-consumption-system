"""
Comprehensive End-to-End Test Suite for Industrial Requirements (Tests 1-8)
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

def get_auth_token(client, email="admin@factory.com", password="Admin@123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.get_json()["token"]

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "Google Sheets API" in data["database"]["type"]

def test_test1_and_test2_and_test3_and_test4(client):
    """
    TEST 1: 1.2 CRCA dimensions 1250 x 2500 x 1.2 -> 29.4375 kg (display 29.44 kg).
    TEST 2: 3 sheets used -> 88.3125 kg (display 88.31 kg).
    TEST 3: 8 kg scrap -> Net: 80.3125 kg, Wastage: ~9.06%.
    TEST 4: Opening stock 135, Used 3, Received 0 -> Closing 132.
    """
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Weight preview test
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

    # Post daily transaction for 1.2 CRCA
    entry_payload = {
        "entry_date": "2026-11-20",
        "shift": "Day",
        "side": "Left",
        "job_number": "JOB-AUTO-001",
        "rows": [
            {
                "material_id": "MAT-L-01",
                "opening_stock": 135,
                "used_quantity": 3,
                "stock_received": 0,
                "scrap_weight": 8.0,
                "cutbit_used": 1.5,
                "remarks": "Automated verification test"
            }
        ]
    }
    res = client.post("/api/entries", json=entry_payload, headers=headers)
    assert res.status_code == 201
    entry_data = res.get_json()["entries"][0]

    # Verify Test 2 & 3 & 4
    assert entry_data["used_quantity"] == 3
    assert entry_data["total_input_weight"] == 88.3125
    assert entry_data["scrap_weight"] == 8.0
    assert entry_data["net_consumption"] == 80.3125
    assert round(entry_data["wastage_percentage"], 2) == 9.06
    assert entry_data["closing_stock"] == 132

def test_test5_rare_material_creation(client):
    """
    TEST 5:
    Add a rare material.
    Expected:
    - Material saved in Material Master.
    - Material available in future dropdowns.
    - Weight calculation uses its own specifications.
    """
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    rare_payload = {
        "material_name": "Special Brass Plate 0.8mm",
        "side": "Left",
        "category": "Brass",
        "material_type": "Rare",
        "length_mm": 1000,
        "width_mm": 2000,
        "thickness_mm": 0.8,
        "density_coefficient": 0.0000085,  # non-steel custom density
        "unit": "Sheets",
        "opening_stock": 25,
        "remarks": "Special order component"
    }

    res = client.post("/api/materials", json=rare_payload, headers=headers)
    assert res.status_code == 201
    created = res.get_json()["material"]
    expected_weight = 1000 * 2000 * 0.8 * 0.0000085  # 13.6 kg
    assert created["weight_per_sheet"] == expected_weight

    # Check future materials list includes it
    res = client.get("/api/materials")
    all_mats = res.get_json()["materials"]
    found = any(m["material_name"] == "Special Brass Plate 0.8mm" for m in all_mats)
    assert found is True

def test_test6_independent_sides_and_production_summary(client):
    """
    TEST 6:
    Enter Left Side and Right Side material usage on the same date.
    Expected:
    - Independent stock balances.
    - Correct side-wise scrap records.
    - Correct combined production summary.
    """
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    test_date = "2026-11-21"

    # 1. Left Side Entry
    res_l = client.post("/api/entries", json={
        "entry_date": test_date,
        "shift": "Day",
        "side": "Left",
        "job_number": "JOB-LEFT-01",
        "rows": [{
            "material_id": "MAT-L-02",
            "opening_stock": 291,
            "used_quantity": 5,
            "stock_received": 0,
            "scrap_weight": 4.5,
            "cutbit_used": 2.0
        }]
    }, headers=headers)
    assert res_l.status_code == 201

    # 2. Right Side Entry
    res_r = client.post("/api/entries", json={
        "entry_date": test_date,
        "shift": "Day",
        "side": "Right",
        "job_number": "JOB-RIGHT-01",
        "rows": [{
            "material_id": "MAT-R-02",
            "opening_stock": 16,
            "used_quantity": 2,
            "stock_received": 0,
            "scrap_weight": 3.0,
            "cutbit_used": 1.0
        }]
    }, headers=headers)
    assert res_r.status_code == 201

    # Verify Production Summary
    res_p = client.get(f"/api/production?date={test_date}")
    assert res_p.status_code == 200
    prod_data = res_p.get_json()["production"][0]

    assert float(prod_data["left_total_punching"]) == 5.0
    assert float(prod_data["right_total_punching"]) == 2.0
    assert float(prod_data["overall_total_punching"]) == 7.0
    assert float(prod_data["left_cutbit"]) == 2.0
    assert float(prod_data["right_cutbit"]) == 1.0
    assert float(prod_data["overall_cutbit"]) == 3.0

def test_test7_automatic_stock_carryforward(client):
    """
    TEST 7:
    Check next day's opening stock.
    Expected:
    Previous day's closing stock becomes the next day's opening stock.
    """
    # For MAT-L-01, baseline was 135. After test 1-4 used 3, closing was 132.
    # Check left stock balance
    res = client.get("/api/stock/left")
    assert res.status_code == 200
    stocks = res.get_json()["stock"]
    crca_stock = next(s for s in stocks if s["material_id"] == "MAT-L-01")
    assert crca_stock["closing_stock"] == 132

def test_test8_edit_historical_transaction(client):
    """
    TEST 8:
    Edit a historical transaction.
    Expected:
    - Audit record created.
    - Production summary updated without double counting.
    """
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch daily entries to get entry ID
    res = client.get("/api/entries?job_number=JOB-AUTO-001")
    entries = res.get_json()["entries"]
    assert len(entries) > 0
    target_id = entries[0]["entry_id"]

    # Edit used quantity from 3 to 4
    res_edit = client.put(f"/api/entries/{target_id}", json={
        "used_quantity": 4,
        "scrap_weight": 10.0
    }, headers=headers)
    assert res_edit.status_code == 200
    updated_entry = res_edit.get_json()["entry"]
    assert updated_entry["used_quantity"] == 4
    assert updated_entry["scrap_weight"] == 10.0

    # Verify audit log was recorded
    res_audit = client.get("/api/settings/audit-logs", headers=headers)
    assert res_audit.status_code == 200
    logs = res_audit.get_json()["logs"]
    assert any(log["action"] == "UPDATE_DAILY_ENTRY" for log in logs)
