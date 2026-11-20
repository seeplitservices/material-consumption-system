import pytest
from decimal import Decimal
from app.calculator import (
    calculate_sheet_weight,
    calculate_material_entry,
    calculate_period_wastage,
    round_display
)

def test_test1_crca_weight():
    """
    TEST 1:
    Select 1.2 CRCA, dimensions 1250 × 2500 × 1.2.
    Expected weight per sheet: 29.4375 kg.
    Display rounded: 29.44 kg.
    """
    weight = calculate_sheet_weight(
        length_mm=1250,
        width_mm=2500,
        thickness_mm=1.2,
        density_coefficient=0.00000785
    )
    assert weight == 29.4375
    assert round_display(weight) == 29.44

def test_test2_input_weight_for_3_sheets():
    """
    TEST 2:
    Enter 3 sheets used.
    Expected input weight: 88.3125 kg.
    Display: 88.31 kg.
    """
    unit_weight = 29.4375
    result = calculate_material_entry(
        opening_stock=135,
        used_quantity=3,
        stock_received=0,
        weight_per_sheet=unit_weight,
        scrap_weight=0
    )
    assert result["total_input_weight"] == 88.3125
    assert result["display"]["total_input_weight"] == 88.31

def test_test3_scrap_and_wastage():
    """
    TEST 3:
    Enter 8 kg scrap for 3 sheets of 1.2 CRCA.
    Expected net consumption: 80.3125 kg.
    Expected wastage: approximately 9.06%.
    """
    unit_weight = 29.4375
    result = calculate_material_entry(
        opening_stock=135,
        used_quantity=3,
        stock_received=0,
        weight_per_sheet=unit_weight,
        scrap_weight=8.0
    )
    assert result["net_consumption"] == 80.3125
    assert result["display"]["net_consumption"] == 80.31
    # 8 / 88.3125 * 100 = 9.05874% -> 9.06%
    assert round_display(result["wastage_percentage"]) == 9.06

def test_test4_closing_stock():
    """
    TEST 4:
    Opening stock = 135.
    Used sheets = 3.
    Received stock = 0.
    Expected closing stock = 132.
    """
    result = calculate_material_entry(
        opening_stock=135,
        used_quantity=3,
        stock_received=0,
        weight_per_sheet=29.4375,
        scrap_weight=8
    )
    assert result["closing_stock"] == 132
    assert result["display"]["closing_stock"] == 132.0

def test_period_wastage_not_averaging():
    """
    Test period wastage is total scrap / total input * 100.
    """
    # Item 1: input 100 kg, scrap 10 kg -> 10%
    # Item 2: input 10 kg, scrap 5 kg -> 50%
    # If averaged: (10 + 50) / 2 = 30% (INCORRECT!)
    # True period wastage: (15 / 110) * 100 = 13.636% -> 13.64%
    total_scrap = 10 + 5
    total_input = 100 + 10
    period_wastage = calculate_period_wastage(total_scrap, total_input)
    assert round_display(period_wastage) == 13.64
