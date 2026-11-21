/**
 * MATERIAL CONSUMPTION & WASTAGE MANAGEMENT SYSTEM
 * Google Apps Script Web App Backend & Spreadsheet Controller
 * 
 * Saravanan Electricals and Engineering Pvt. Ltd
 * 
 * Single Source of Truth: Google Sheets
 */

// ============================================================================
// CONFIGURATION & SCHEMAS
// ============================================================================

const SCHEMAS = {
  Material_Master: [
    "material_id", "material_name", "category", "material_type", "length_mm",
    "width_mm", "thickness_mm", "density_coefficient", "weight_per_sheet",
    "unit", "is_active", "remarks", "created_at", "updated_at"
  ],
  Daily_Entries: [
    "entry_id", "entry_date", "job_number", "shift", "material_id", "material_name",
    "opening_stock", "stock_received", "used_quantity", "closing_stock",
    "weight_per_sheet", "total_input_weight", "scrap_weight", "net_consumption",
    "wastage_percentage", "cutbit_used", "remarks", "employee", "created_at", "updated_at"
  ],
  Material_Stock: [
    "stock_id", "date", "material_id", "material_name", "opening_stock",
    "stock_received", "punching_stock", "closing_stock", "remarks", "updated_by", "updated_at"
  ],
  Scrap_Records: [
    "scrap_id", "date", "material_id", "material_name", "total_input_weight",
    "scrap_weight", "net_consumption", "wastage_percentage", "remarks", "employee", "created_at"
  ],
  Production_Summary: [
    "summary_id", "date", "total_sheet_punching", "total_cutbit_used", "remarks", "updated_at"
  ],
  Stock_Adjustments: [
    "adjustment_id", "date", "material_id", "material_name", "adjustment_quantity",
    "reason", "authorized_by", "created_at"
  ],
  Users: [
    "user_id", "name", "email", "password_hash", "role", "is_active", "created_at"
  ],
  Audit_Log: [
    "log_id", "timestamp", "user_id", "action", "record_type", "record_id", "old_value", "new_value"
  ],
  Settings: [
    "setting_key", "setting_value", "updated_at"
  ]
};

const STANDARD_MATERIALS = [
  { id: "MAT-01", name: "1.2 CRCA Sheet (1250 × 2500)", cat: "CRCA", l: 1250, w: 2500, t: 1.2, d: 0.00000785, wt: 29.4375, stock: 135 },
  { id: "MAT-02", name: "1.5 CRCA Sheet (1250 × 2500)", cat: "CRCA", l: 1250, w: 2500, t: 1.5, d: 0.00000785, wt: 36.7969, stock: 291 },
  { id: "MAT-03", name: "2.0 CRCA Sheet (1250 × 2500)", cat: "CRCA", l: 1250, w: 2500, t: 2.0, d: 0.00000785, wt: 49.0625, stock: 93 },
  { id: "MAT-04", name: "2.0 HRPO Sheet (1250 × 2500)", cat: "HRPO", l: 1250, w: 2500, t: 2.0, d: 0.00000785, wt: 49.0625, stock: "Not Configured" },
  { id: "MAT-05", name: "3.0 HRPO Sheet (1250 × 2500)", cat: "HRPO", l: 1250, w: 2500, t: 3.0, d: 0.00000785, wt: 73.5938, stock: 3 },
  { id: "MAT-06", name: "5.0 HR Sheet (1250 × 2500)", cat: "HR", l: 1250, w: 2500, t: 5.0, d: 0.00000785, wt: 122.6563, stock: 4 },
  { id: "MAT-07", name: "CP-1.6 Sheet (1250 × 2500)", cat: "CRCA", l: 1250, w: 2500, t: 1.6, d: 0.00000785, wt: 39.2500, stock: 4 },
  { id: "MAT-08", name: "1.0 GP Sheet (1250 × 2500)", cat: "GP", l: 1250, w: 2500, t: 1.0, d: 0.00000785, wt: 24.5313, stock: "Not Configured" },
  { id: "MAT-09", name: "1.2 GP Sheet (1250 × 2500)", cat: "GP", l: 1250, w: 2500, t: 1.2, d: 0.00000785, wt: 29.4375, stock: 16 },
  { id: "MAT-10", name: "1.5 GP Sheet (1250 × 2500)", cat: "GP", l: 1250, w: 2500, t: 1.5, d: 0.00000785, wt: 36.7969, stock: 13 },
  { id: "MAT-11", name: "1.6 / 2.0 GP Sheet (1250 × 2500)", cat: "GP", l: 1250, w: 2500, t: 1.6, d: 0.00000785, wt: 39.2500, stock: "Not Configured" },
  { id: "MAT-12", name: "2.0 GP Sheet (1250 × 2500)", cat: "GP", l: 1250, w: 2500, t: 2.0, d: 0.00000785, wt: 49.0625, stock: "Not Configured" }
];

// ============================================================================
// ONE-CLICK SETUP FUNCTION: Run this in Apps Script once!
// ============================================================================

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();
  
  // 1. Create each tab and header row
  for (const [sheetName, headers] of Object.entries(SCHEMAS)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Set headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#0f172a")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  // 2. Populate Standard Materials if Material_Master is empty
  const matSheet = ss.getSheetByName("Material_Master");
  if (matSheet.getLastRow() <= 1) {
    const matRows = STANDARD_MATERIALS.map(m => [
      m.id, m.name, m.cat, "Standard", m.l, m.w, m.t, m.d, m.wt, "Sheets", "TRUE", "Standard Factory Material", now, now
    ]);
    matSheet.getRange(2, 1, matRows.length, matRows[0].length).setValues(matRows);
  }

  // 3. Populate Material_Stock baseline
  const stockSheet = ss.getSheetByName("Material_Stock");
  if (stockSheet.getLastRow() <= 1) {
    const stockRows = STANDARD_MATERIALS.map((m, idx) => [
      `STK-${1000 + idx}`, now.slice(0, 10), m.id, m.name, m.stock, 0, 0, m.stock, "Initial Baseline Stock", "System", now
    ]);
    stockSheet.getRange(2, 1, stockRows.length, stockRows[0].length).setValues(stockRows);
  }

  // 4. Populate Users
  const userSheet = ss.getSheetByName("Users");
  if (userSheet.getLastRow() <= 1) {
    const userRows = [
      ["USR-DIR", "Managing Director", "director@factory.com", "Director@123", "Director", "TRUE", now],
      ["USR-001", "Factory Administrator", "admin@factory.com", "Director@123", "Director", "TRUE", now],
      ["USR-002", "Data Entry Operator", "operator@factory.com", "Operator@123", "Employee", "TRUE", now]
    ];
    userSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
  }

  // 5. Populate Settings
  const settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet.getLastRow() <= 1) {
    const settingRows = [
      ["company_name", "SARAVANAN ELECTRICALS AND ENGINEERING PVT. LTD", now],
      ["density_coefficient", "0.00000785", now],
      ["baseline_date", now.slice(0, 10), now]
    ];
    settingsSheet.getRange(2, 1, settingRows.length, settingRows[0].length).setValues(settingRows);
  }

  Logger.log("MCWMS Sheets initialization completed successfully!");
}

// ============================================================================
// WEB APP API DISPATCHER (doGet & doPost)
// ============================================================================

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, defaultMethod) {
  try {
    const params = e.parameter || {};
    const endpoint = (params.endpoint || params.action || "").replace(/^\/+/, "");
    const method = (params.http_method || defaultMethod).toUpperCase();
    
    let body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = {};
      }
    }

    let responseData = { success: false, error: "Endpoint not found" };

    // Router
    if (endpoint === "" || endpoint === "health") {
      responseData = {
        success: true,
        service: "Material Consumption Wastage Management System",
        company: "Saravanan Electricals and Engineering Pvt. Ltd",
        version: "1.0.0",
        sheets_connected: true
      };
    } 
    // Auth Routes
    else if (endpoint === "auth/login") {
      responseData = handleLogin(body);
    } else if (endpoint === "auth/me") {
      responseData = handleAuthMe(params.token);
    }
    // Materials Routes
    else if (endpoint === "materials") {
      if (method === "GET") responseData = getMaterials();
      else if (method === "POST") responseData = addMaterial(body);
    } else if (endpoint === "materials/calculate-weight") {
      responseData = calculateMaterialWeight(body);
    } else if (endpoint === "materials/restore-defaults") {
      responseData = restoreDefaultMaterials();
    } else if (endpoint.startsWith("materials/")) {
      const matId = endpoint.split("/")[1];
      if (method === "DELETE") responseData = deleteMaterial(matId);
      else if (method === "PUT") responseData = updateMaterial(matId, body);
    }
    // Stock Routes
    else if (endpoint === "stock" || endpoint === "stock/inventory") {
      if (method === "GET") responseData = getStockInventory(params.date);
      else if (method === "DELETE") responseData = clearAllStock();
    } else if (endpoint === "stock/clear-all") {
      responseData = clearAllStock();
    } else if (endpoint === "stock/delete-selected") {
      responseData = deleteSelectedStock(body);
    } else if (endpoint === "stock/adjust") {
      responseData = recordStockAdjustment(body);
    } else if (endpoint.startsWith("stock/")) {
      const matId = endpoint.split("/")[1];
      if (method === "DELETE") responseData = deleteMaterialStock(matId);
    }
    // Daily Entries Routes
    else if (endpoint === "entries") {
      if (method === "GET") responseData = getDailyEntries(params.start_date, params.end_date, params.date);
      else if (method === "POST") responseData = createDailyEntry(body);
    } else if (endpoint.startsWith("entries/")) {
      const entryId = endpoint.split("/")[1];
      if (method === "DELETE") responseData = deleteDailyEntry(entryId);
      else if (method === "PUT") responseData = updateDailyEntry(entryId, body);
    }
    // Dashboard Routes
    else if (endpoint === "dashboard/summary") {
      responseData = getDashboardSummary(params);
    } else if (endpoint === "dashboard/charts") {
      responseData = getDashboardCharts(params);
    }
    // Reports Routes
    else if (endpoint === "reports/custom-range") {
      responseData = getCustomRangeReport(params.start_date, params.end_date);
    } else if (endpoint === "reports/daily") {
      responseData = getDailyReport(params.date, params.start_date, params.end_date);
    } else if (endpoint === "reports/monthly") {
      responseData = getMonthlyReport(params.month);
    } else if (endpoint === "reports/rare-materials") {
      responseData = getRareMaterialsReport();
    }

    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SHEET DATA HELPERS
// ============================================================================

function getSheetRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
      }
      rowObj[headers[j]] = val;
    }
    rows.push(rowObj);
  }
  return rows;
}

function appendSheetRow(sheetName, rowObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  const rowData = headers.map(h => rowObj[h] !== undefined ? rowObj[h] : "");
  sheet.appendRow(rowData);
}

function updateSheetRow(sheetName, idKey, idVal, updatedObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIdx = headers.indexOf(idKey);
  if (idColIdx === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(idVal)) {
      const newRow = headers.map(h => updatedObj[h] !== undefined ? updatedObj[h] : data[i][headers.indexOf(h)]);
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return true;
    }
  }
  return false;
}

function deleteSheetRow(sheetName, idKey, idVal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIdx = headers.indexOf(idKey);
  if (idColIdx === -1) return false;

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idColIdx]) === String(idVal)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ============================================================================
// CORE CONTROLLERS
// ============================================================================

function handleLogin(body) {
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const users = getSheetRows("Users");
  
  const user = users.find(u => String(u.email).trim().toLowerCase() === email);
  if (!user || user.password_hash !== password) {
    return { success: false, error: "Invalid email or password." };
  }

  return {
    success: true,
    token: "TOKEN_" + user.user_id + "_" + new Date().getTime(),
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

function handleAuthMe(token) {
  const users = getSheetRows("Users");
  // Default to operator or director based on token prefix
  const isDir = token && token.includes("DIR");
  const user = users.find(u => isDir ? u.role === "Director" : u.role === "Employee") || users[0];
  return {
    success: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

function getMaterials() {
  const mats = getSheetRows("Material_Master");
  const active = mats.filter(m => String(m.is_active).toUpperCase() === "TRUE");
  return { success: true, count: active.length, materials: active };
}

function calculateMaterialWeight(body) {
  const l = parseFloat(body.length_mm) || 0;
  const w = parseFloat(body.width_mm) || 0;
  const t = parseFloat(body.thickness_mm) || 0;
  const d = parseFloat(body.density_coefficient) || 0.00000785;
  const wt = l * w * t * d;
  return {
    success: true,
    weight_per_sheet: wt,
    display_weight: Math.round(wt * 100) / 100
  };
}

function getStockInventory() {
  const mats = getSheetRows("Material_Master");
  const stockRows = getSheetRows("Material_Stock");

  const inventory = mats.map((m, idx) => {
    const matStocks = stockRows.filter(s => String(s.material_id) === String(m.material_id));
    let closing = null;
    let opening = null;
    let received = 0;
    let used = 0;
    let isConfigured = false;
    let remarks = "";

    if (matStocks.length > 0) {
      const latest = matStocks[matStocks.length - 1];
      const cl = latest.closing_stock;
      if (cl !== undefined && cl !== null && cl !== "" && cl !== "Not Configured") {
        closing = parseFloat(cl);
        isConfigured = true;
      }
      const op = latest.opening_stock;
      if (op !== undefined && op !== null && op !== "" && op !== "Not Configured") {
        opening = parseFloat(op);
      }
      received = parseFloat(latest.stock_received) || 0;
      used = parseFloat(latest.punching_stock) || 0;
      remarks = latest.remarks || "";
    }

    const wt = parseFloat(m.weight_per_sheet) || 0;
    const usedNum = parseFloat(used) || 0;

    return {
      s_no: idx + 1,
      material_id: m.material_id,
      material_name: m.material_name,
      category: m.category,
      weight_per_sheet: wt,
      weight_per_sheet_display: wt > 0 ? wt.toFixed(2) : "0.00",
      opening_stock: isConfigured ? opening : null,
      opening_stock_display: isConfigured && opening !== null ? String(opening) : "Not Configured",
      stock_received: received,
      punching_stock: used,
      closing_stock: isConfigured ? closing : null,
      closing_stock_display: isConfigured && closing !== null ? String(closing) : "Not Configured",
      total_used_weight: Math.round(usedNum * wt * 100) / 100,
      total_used_weight_display: (usedNum * wt).toFixed(2),
      is_configured: isConfigured,
      remarks: remarks
    };
  });

  return { success: true, count: inventory.length, stock: inventory };
}

function clearAllStock() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Material_Stock");
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  return {
    success: true,
    message: "All Material stock records successfully deleted from backend sheet and UI."
  };
}

function deleteMaterialStock(matId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Material_Stock");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, message: "No stock records to delete." };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const matIdCol = headers.indexOf("material_id");
  if (matIdCol === -1) return { success: false, error: "Column not found." };

  let deletedCount = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][matIdCol]) === String(matId)) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  return {
    success: true,
    message: `Deleted ${deletedCount} stock records for material ${matId}.`
  };
}

function deleteSelectedStock(body) {
  const matIds = (body.material_ids || []).map(id => String(id));
  if (!matIds.length) {
    return { success: false, error: "No materials selected." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Material_Stock");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, message: "No stock records to delete." };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const matIdCol = headers.indexOf("material_id");
  if (matIdCol === -1) return { success: false, error: "Column not found." };

  let deletedCount = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (matIds.includes(String(data[i][matIdCol]))) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  return {
    success: true,
    message: `Deleted stock records for ${matIds.length} materials.`,
    deleted_count: deletedCount
  };
}

function createDailyEntry(body) {
  const now = new Date().toISOString();
  const entryDate = body.entry_date || now.slice(0, 10);
  const shift = body.shift || "Day";
  const jobNo = body.job_number || "";
  const employeeName = (body.employee_name || body.employee || "").trim() || "Operator";
  const totalScrap = parseFloat(body.total_scrap_weight) || 0;
  const rows = body.rows || [];

  if (!rows.length) return { success: false, error: "At least one row required." };

  let totalBatchInput = 0;
  rows.forEach(r => {
    totalBatchInput += (parseFloat(r.used_quantity) || 0) * (parseFloat(r.weight_per_sheet) || 0);
  });

  const wastagePct = totalBatchInput > 0 ? (totalScrap / totalBatchInput) * 100 : 0;
  const savedEntries = [];

  rows.forEach(r => {
    const entryId = "ENT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const used = parseFloat(r.used_quantity) || 0;
    const op = parseFloat(r.opening_stock) || 0;
    const cl = op - used;
    const unitWt = parseFloat(r.weight_per_sheet) || 0;
    const inputWt = used * unitWt;
    const rowScrap = totalBatchInput > 0 ? (inputWt / totalBatchInput) * totalScrap : 0;

    const entryObj = {
      entry_id: entryId,
      entry_date: entryDate,
      job_number: jobNo,
      shift: shift,
      material_id: r.material_id,
      material_name: r.material_name,
      opening_stock: op,
      stock_received: 0,
      used_quantity: used,
      closing_stock: cl,
      weight_per_sheet: unitWt,
      total_input_weight: inputWt,
      scrap_weight: rowScrap,
      net_consumption: Math.max(0, inputWt - rowScrap),
      wastage_percentage: Math.round(wastagePct * 100) / 100,
      cutbit_used: parseFloat(r.cutbit_used) || 0,
      remarks: r.remarks || "",
      employee: employeeName,
      created_at: now,
      updated_at: now
    };

    appendSheetRow("Daily_Entries", entryObj);
    savedEntries.push(entryObj);

    // Update Material_Stock
    appendSheetRow("Material_Stock", {
      stock_id: "STK-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      date: entryDate,
      material_id: r.material_id,
      material_name: r.material_name,
      opening_stock: op,
      stock_received: 0,
      punching_stock: used,
      closing_stock: cl,
      remarks: `Job: ${jobNo} (${shift})`,
      updated_by: employeeName,
      updated_at: now
    });
  });

  // Record overall scrap
  if (totalScrap > 0 || totalBatchInput > 0) {
    appendSheetRow("Scrap_Records", {
      scrap_id: "SCRAP-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      date: entryDate,
      material_id: "OVERALL",
      material_name: "Overall Materials",
      total_input_weight: totalBatchInput,
      scrap_weight: totalScrap,
      net_consumption: Math.max(0, totalBatchInput - totalScrap),
      wastage_percentage: Math.round(wastagePct * 100) / 100,
      remarks: `Job: ${jobNo}`,
      employee: employeeName,
      created_at: now
    });
  }

  return { success: true, count: savedEntries.length, entries: savedEntries };
}

function getDailyEntries(startDate, endDate, specificDate) {
  const rawEntries = getSheetRows("Daily_Entries");

  const formatted = rawEntries.map(e => {
    let dateStr = "";
    if (e.entry_date instanceof Date) {
      dateStr = Utilities.formatDate(e.entry_date, Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
    } else if (e.entry_date) {
      dateStr = String(e.entry_date).split("T")[0];
    }

    const op = (e.opening_stock !== "" && e.opening_stock !== null && e.opening_stock !== undefined) ? parseFloat(e.opening_stock) : 0;
    const used = (e.used_quantity !== "" && e.used_quantity !== null && e.used_quantity !== undefined) ? parseFloat(e.used_quantity) : 0;
    const cl = (e.closing_stock !== "" && e.closing_stock !== null && e.closing_stock !== undefined) ? parseFloat(e.closing_stock) : (op - used);
    const wt = parseFloat(e.weight_per_sheet) || 0;
    const totWt = (e.total_input_weight !== "" && e.total_input_weight !== null && e.total_input_weight !== undefined) ? parseFloat(e.total_input_weight) : (used * wt);
    const cutbit = parseFloat(e.cutbit_used) || 0;
    const scrap = parseFloat(e.scrap_weight) || 0;
    const net = (e.net_consumption !== "" && e.net_consumption !== null && e.net_consumption !== undefined) ? parseFloat(e.net_consumption) : Math.max(0, totWt - scrap);
    const wast = (e.wastage_percentage !== "" && e.wastage_percentage !== null && e.wastage_percentage !== undefined) ? parseFloat(e.wastage_percentage) : (totWt > 0 ? (scrap / totWt) * 100 : 0);

    return Object.assign({}, e, {
      entry_date: dateStr,
      opening_stock: op,
      opening_stock_display: String(op),
      used_quantity: used,
      used_quantity_display: String(used),
      closing_stock: cl,
      closing_stock_display: String(cl),
      weight_per_sheet: wt,
      weight_per_sheet_display: wt > 0 ? wt.toFixed(2) : "0.00",
      total_input_weight: totWt,
      total_input_weight_display: totWt > 0 ? totWt.toFixed(2) : "0.00",
      cutbit_used: cutbit,
      cutbit_used_display: String(cutbit),
      scrap_weight: scrap,
      scrap_weight_display: scrap > 0 ? scrap.toFixed(2) : "0.00",
      net_consumption: net,
      net_consumption_display: net > 0 ? net.toFixed(2) : "0.00",
      wastage_percentage: Math.round(wast * 100) / 100,
      wastage_percentage_display: wast > 0 ? (Math.round(wast * 100) / 100).toFixed(2) + "%" : "0.00%"
    });
  });

  let filtered = formatted;
  if (specificDate) {
    filtered = filtered.filter(e => e.entry_date === specificDate);
  } else {
    if (startDate) filtered = filtered.filter(e => e.entry_date >= startDate);
    if (endDate) filtered = filtered.filter(e => e.entry_date <= endDate);
  }

  filtered.sort((a, b) => {
    const da = String(a.entry_date || "");
    const db = String(b.entry_date || "");
    if (db !== da) return db.localeCompare(da);
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  return { success: true, count: filtered.length, entries: filtered };
}

function deleteDailyEntry(entryId) {
  const success = deleteSheetRow("Daily_Entries", "entry_id", entryId);
  return { success: success, message: "Transaction deleted." };
}

function updateDailyEntry(entryId, body) {
  const now = new Date().toISOString();
  const entries = getSheetRows("Daily_Entries");
  const target = entries.find(e => e.entry_id === entryId);
  if (!target) return { success: false, error: "Entry not found" };

  const op = body.opening_stock !== undefined ? parseFloat(body.opening_stock) : target.opening_stock;
  const used = body.used_quantity !== undefined ? parseFloat(body.used_quantity) : target.used_quantity;
  const cl = op - used;
  const unitWt = target.weight_per_sheet || 0;
  const inputWt = used * unitWt;

  const updatedObj = Object.assign({}, target, {
    job_number: body.job_number || target.job_number,
    shift: body.shift || target.shift,
    employee: body.employee || body.employee_name || target.employee,
    opening_stock: op,
    used_quantity: used,
    closing_stock: cl,
    total_input_weight: inputWt,
    cutbit_used: body.cutbit_used !== undefined ? parseFloat(body.cutbit_used) : target.cutbit_used,
    remarks: body.remarks !== undefined ? body.remarks : target.remarks,
    updated_at: now
  });

  updateSheetRow("Daily_Entries", "entry_id", entryId, updatedObj);
  return { success: true, entry: updatedObj };
}

function getCustomRangeReport(startDate, endDate) {
  let entries = getSheetRows("Daily_Entries");
  if (startDate) entries = entries.filter(e => e.entry_date >= startDate);
  if (endDate) entries = entries.filter(e => e.entry_date <= endDate);

  let totalSheets = 0;
  let totalInput = 0;
  let totalScrap = 0;
  let totalNet = 0;

  const matMap = {};

  entries.forEach(e => {
    const sheets = parseFloat(e.used_quantity) || 0;
    const inp = parseFloat(e.total_input_weight) || 0;
    const scr = parseFloat(e.scrap_weight) || 0;
    const net = parseFloat(e.net_consumption) || 0;

    totalSheets += sheets;
    totalInput += inp;
    totalScrap += scr;
    totalNet += net;

    const mid = e.material_id;
    if (!matMap[mid]) {
      matMap[mid] = {
        material_id: mid,
        material_name: e.material_name,
        used_sheets: 0,
        input_weight: 0,
        scrap_weight: 0,
        net_consumption: 0
      };
    }
    matMap[mid].used_sheets += sheets;
    matMap[mid].input_weight += inp;
    matMap[mid].scrap_weight += scr;
    matMap[mid].net_consumption += net;
  });

  const wastagePct = totalInput > 0 ? (totalScrap / totalInput) * 100 : 0;
  const materials = Object.values(matMap).map(m => {
    m.wastage_percentage = m.input_weight > 0 ? Math.round((m.scrap_weight / m.input_weight) * 10000) / 100 : 0;
    m.input_weight = Math.round(m.input_weight * 100) / 100;
    m.scrap_weight = Math.round(m.scrap_weight * 100) / 100;
    m.net_consumption = Math.round(m.net_consumption * 100) / 100;
    return m;
  });

  const formattedRecords = entries.map(e => {
    const op = (e.opening_stock !== "" && e.opening_stock !== null && e.opening_stock !== undefined) ? parseFloat(e.opening_stock) : 0;
    const used = (e.used_quantity !== "" && e.used_quantity !== null && e.used_quantity !== undefined) ? parseFloat(e.used_quantity) : 0;
    const cl = (e.closing_stock !== "" && e.closing_stock !== null && e.closing_stock !== undefined) ? parseFloat(e.closing_stock) : (op - used);
    const wt = parseFloat(e.weight_per_sheet) || 0;
    const totWt = (e.total_input_weight !== "" && e.total_input_weight !== null && e.total_input_weight !== undefined) ? parseFloat(e.total_input_weight) : (used * wt);
    const cutbit = parseFloat(e.cutbit_used) || 0;

    return Object.assign({}, e, {
      entry_date: String(e.entry_date || "").split("T")[0],
      opening_stock: op,
      opening_stock_display: String(op),
      used_quantity: used,
      used_quantity_display: String(used),
      closing_stock: cl,
      closing_stock_display: String(cl),
      weight_per_sheet: wt,
      weight_per_sheet_display: wt > 0 ? wt.toFixed(2) : "0.00",
      total_input_weight: totWt,
      total_input_weight_display: totWt > 0 ? totWt.toFixed(2) : "0.00",
      cutbit_used: cutbit,
      cutbit_used_display: String(cutbit)
    });
  });

  return {
    success: true,
    start_date: startDate || "Earliest",
    end_date: endDate || "Latest",
    range_label: `${startDate || "Earliest"} to ${endDate || "Latest"}`,
    summary: {
      total_records: entries.length,
      total_sheets: totalSheets,
      total_input_kg: Math.round(totalInput * 100) / 100,
      total_scrap_kg: Math.round(totalScrap * 100) / 100,
      total_net_consumption_kg: Math.round(totalNet * 100) / 100,
      wastage_percentage: Math.round(wastagePct * 100) / 100
    },
    materials: materials,
    records: formattedRecords
  };
}

function getDailyReport(specificDate, startDate, endDate) {
  return getCustomRangeReport(specificDate || startDate, specificDate || endDate);
}

function getMonthlyReport(month) {
  let entries = getSheetRows("Daily_Entries");
  if (month) entries = entries.filter(e => String(e.entry_date).startsWith(month));
  return getCustomRangeReport(month ? month + "-01" : "", month ? month + "-31" : "");
}

function getRareMaterialsReport() {
  const mats = getSheetRows("Material_Master").filter(m => m.material_type === "Rare");
  return { success: true, count: mats.length, materials: mats };
}

function restoreDefaultMaterials() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Material_Master");
  const now = new Date().toISOString();
  
  // Clear existing and re-seed
  sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
  const matRows = STANDARD_MATERIALS.map(m => [
    m.id, m.name, m.cat, "Standard", m.l, m.w, m.t, m.d, m.wt, "Sheets", "TRUE", "Standard Factory Material", now, now
  ]);
  sheet.getRange(2, 1, matRows.length, matRows[0].length).setValues(matRows);
  return { success: true, restored_count: matRows.length, materials: getMaterials().materials };
}

function resolveDateRange(filterType, customStart, customEnd) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (filterType === "today") return { start: todayStr, end: todayStr };
  if (filterType === "yesterday") {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    return { start: yStr, end: yStr };
  }
  if (filterType === "7days") {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    return { start: past.toISOString().slice(0, 10), end: todayStr };
  }
  if (filterType === "this_month") {
    const startM = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { start: startM, end: todayStr };
  }
  if (filterType === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  return { start: past30.toISOString().slice(0, 10), end: todayStr };
}

function getDashboardSummary(params) {
  const filterType = params.filter || "today";
  const dates = resolveDateRange(filterType, params.start_date, params.end_date);
  const startDate = dates.start;
  const endDate = dates.end;

  const allEntries = getSheetRows("Daily_Entries");
  const stockRows = getSheetRows("Material_Stock");

  const filtered = allEntries.filter(e => {
    const d = e.entry_date || "";
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  let totalSheets = 0;
  let totalConsumed = 0;
  let totalInput = 0;
  let totalScrap = 0;
  let totalCutbit = 0;

  filtered.forEach(e => {
    totalSheets += parseFloat(e.used_quantity) || 0;
    totalConsumed += parseFloat(e.net_consumption) || 0;
    totalInput += parseFloat(e.total_input_weight) || 0;
    totalScrap += parseFloat(e.scrap_weight) || 0;
    totalCutbit += parseFloat(e.cutbit_used) || 0;
  });

  const overallWastage = totalInput > 0 ? (totalScrap / totalInput) * 100 : 0;

  const matStockMap = {};
  stockRows.forEach(r => {
    if (r.material_id && r.closing_stock !== undefined && r.closing_stock !== "" && r.closing_stock !== "Not Configured") {
      matStockMap[r.material_id] = parseFloat(r.closing_stock) || 0;
    }
  });
  const totalAvailStock = Object.values(matStockMap).reduce((a, b) => a + b, 0);

  const sortedRecent = allEntries.slice(-10).reverse().map(e => ({
    entry_id: e.entry_id,
    entry_date: e.entry_date,
    job_number: e.job_number,
    shift: e.shift,
    material_name: e.material_name,
    used_quantity: parseFloat(e.used_quantity) || 0,
    weight_per_sheet: parseFloat(e.weight_per_sheet) || 0,
    total_input_weight: parseFloat(e.total_input_weight) || 0,
    scrap_weight: parseFloat(e.scrap_weight) || 0,
    wastage_percentage: parseFloat(e.wastage_percentage) || 0,
    closing_stock: parseFloat(e.closing_stock) || 0,
    employee: e.employee
  }));

  return {
    success: true,
    filter: { type: filterType, start_date: startDate, end_date: endDate },
    kpis: {
      total_sheets_punched: totalSheets,
      total_material_consumed_kg: Math.round(totalConsumed * 100) / 100,
      total_scrap_generated_kg: Math.round(totalScrap * 100) / 100,
      overall_wastage_percentage: Math.round(overallWastage * 100) / 100,
      total_cutbit_used: totalCutbit,
      total_available_stock: totalAvailStock
    },
    recent_transactions: sortedRecent
  };
}

function getDashboardCharts(params) {
  const filterType = params.filter || "this_month";
  const dates = resolveDateRange(filterType, params.start_date, params.end_date);
  const startDate = dates.start;
  const endDate = dates.end;

  const allEntries = getSheetRows("Daily_Entries");
  const materials = getSheetRows("Material_Master");
  const stockRows = getSheetRows("Material_Stock");

  const filtered = allEntries.filter(e => {
    const d = e.entry_date || "";
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const dailyMap = {};
  filtered.forEach(e => {
    const d = e.entry_date || "";
    if (!dailyMap[d]) {
      dailyMap[d] = { date: d, consumption_kg: 0, scrap_kg: 0, punching_sheets: 0, input: 0 };
    }
    dailyMap[d].consumption_kg += parseFloat(e.net_consumption) || 0;
    dailyMap[d].scrap_kg += parseFloat(e.scrap_weight) || 0;
    dailyMap[d].punching_sheets += parseFloat(e.used_quantity) || 0;
    dailyMap[d].input += parseFloat(e.total_input_weight) || 0;
  });

  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map(item => {
    item.wastage_percentage = item.input > 0 ? Math.round((item.scrap_kg / item.input) * 10000) / 100 : 0;
    item.consumption_kg = Math.round(item.consumption_kg * 100) / 100;
    item.scrap_kg = Math.round(item.scrap_kg * 100) / 100;
    return item;
  });

  const matMap = {};
  filtered.forEach(e => {
    const mid = e.material_id;
    if (!matMap[mid]) {
      matMap[mid] = {
        material_id: mid,
        material_name: e.material_name || mid,
        consumed_kg: 0,
        scrap_kg: 0,
        sheets_used: 0
      };
    }
    matMap[mid].consumed_kg += parseFloat(e.net_consumption) || 0;
    matMap[mid].scrap_kg += parseFloat(e.scrap_weight) || 0;
    matMap[mid].sheets_used += parseFloat(e.used_quantity) || 0;
  });

  const allMatList = Object.values(matMap).map(m => {
    m.consumed_kg = Math.round(m.consumed_kg * 100) / 100;
    m.scrap_kg = Math.round(m.scrap_kg * 100) / 100;
    return m;
  });

  const topConsumed = allMatList.slice().sort((a, b) => b.consumed_kg - a.consumed_kg).slice(0, 5);
  const topScrap = allMatList.slice().sort((a, b) => b.scrap_kg - a.scrap_kg).slice(0, 5);

  const latestStock = {};
  stockRows.forEach(s => {
    if (s.material_id) latestStock[s.material_id] = s;
  });

  const stockComp = materials.slice(0, 8).map(m => {
    const s = latestStock[m.material_id] || {};
    return {
      material_name: (m.material_name || "").split("(")[0].trim(),
      opening_stock: parseFloat(s.opening_stock) || 0,
      closing_stock: parseFloat(s.closing_stock) || 0
    };
  });

  return {
    success: true,
    daily_trend: dailyTrend,
    material_usage: allMatList,
    top_5_consumed: topConsumed,
    top_5_scrap: topScrap,
    monthly_wastage: [],
    stock_comparison: stockComp
  };
}
