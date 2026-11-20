"""
Google Sheets API Client with Exponential Backoff, Caching, Batch Operations,
and In-Memory Mock Fallback. Unified single-sheet factory inventory.
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from werkzeug.security import generate_password_hash

from app.config import Config
from app.models import PRECONFIGURED_MATERIALS, SHEET_SCHEMAS

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

class SheetsClient:
    def __init__(self):
        self.spreadsheet_id = Config.GOOGLE_SHEETS_SPREADSHEET_ID
        self.service = None
        self.is_connected = False
        self.connection_error = None
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self.cache_ttl = Config.CACHE_TTL_SECONDS

        # In-memory storage fallback used when Google Sheets credentials are not yet configured
        self._mock_data: Dict[str, List[Dict[str, Any]]] = {
            sheet_name: [] for sheet_name in SHEET_SCHEMAS.keys()
        }
        self._init_mock_defaults()

        # Attempt to initialize Google Sheets connection if credentials exist
        self.init_google_sheets()

    def _init_mock_defaults(self):
        """Initializes default master materials, baseline inventory, and users with all entered transaction data cleared."""
        now = datetime.now(timezone.utc).isoformat()
        
        # 1. Reset all transaction sheets completely
        self._mock_data["Daily_Entries"] = []
        self._mock_data["Scrap_Records"] = []
        self._mock_data["Production_Summary"] = []
        self._mock_data["Stock_Adjustments"] = []
        self._mock_data["Audit_Log"] = []
        self._mock_data["Material_Master"] = []
        self._mock_data["Material_Stock"] = []
        self._mock_data["Users"] = []
        self._mock_data["Settings"] = []

        # 2. Seed unified Material_Master
        for mat in PRECONFIGURED_MATERIALS:
            mat_record = {
                "material_id": mat["material_id"],
                "material_name": mat["material_name"],
                "category": mat["category"],
                "material_type": mat["material_type"],
                "length_mm": mat["length_mm"],
                "width_mm": mat["width_mm"],
                "thickness_mm": mat["thickness_mm"],
                "density_coefficient": mat["density_coefficient"],
                "weight_per_sheet": mat["weight_per_sheet"],
                "unit": mat["unit"],
                "is_active": "TRUE" if mat["is_active"] else "FALSE",
                "created_at": now,
                "updated_at": now
            }
            self._mock_data["Material_Master"].append(mat_record)

            # Seed clean baseline stock into unified Material_Stock
            stock_val = mat.get("initial_stock")
            stock_entry = {
                "stock_id": f"INIT-{mat['material_id']}",
                "date": Config.BASELINE_DATE,
                "material_id": mat["material_id"],
                "material_name": mat["material_name"],
                "opening_stock": stock_val if stock_val is not None else "Not Configured",
                "stock_received": 0,
                "punching_stock": 0,
                "closing_stock": stock_val if stock_val is not None else "Not Configured",
                "remarks": "Initial Baseline Stock",
                "updated_by": "System Director",
                "updated_at": now
            }
            self._mock_data["Material_Stock"].append(stock_entry)

        # 3. Seed Director and Data Entry Operator accounts
        director_pass = generate_password_hash("Director@123")
        admin_pass = generate_password_hash("Admin@123")
        operator_pass = generate_password_hash("Operator@123")
        
        self._mock_data["Users"].append({
            "user_id": "USR-DIR",
            "name": "Managing Director",
            "email": "director@factory.com",
            "password_hash": director_pass,
            "role": "Director",
            "is_active": "TRUE",
            "created_at": now
        })
        self._mock_data["Users"].append({
            "user_id": "USR-001",
            "name": "Factory Administrator",
            "email": "admin@factory.com",
            "password_hash": admin_pass,
            "role": "Director",
            "is_active": "TRUE",
            "created_at": now
        })
        self._mock_data["Users"].append({
            "user_id": "USR-002",
            "name": "Data Entry Operator",
            "email": "operator@factory.com",
            "password_hash": operator_pass,
            "role": "Employee",
            "is_active": "TRUE",
            "created_at": now
        })

        # 4. Seed initial settings
        self._mock_data["Settings"].append({
            "setting_key": "baseline_date",
            "setting_value": Config.BASELINE_DATE,
            "updated_at": now
        })
        self._mock_data["Settings"].append({
            "setting_key": "steel_density",
            "setting_value": str(Config.STEEL_DENSITY_COEFFICIENT),
            "updated_at": now
        })

    def clear_all_transaction_data(self):
        """Clears all historical transactions and resets stock to baseline."""
        self._init_mock_defaults()
        self.invalidate_cache()
        logger.info("Cleared all transaction data and reset inventory to clean baseline.")

    def init_google_sheets(self) -> bool:
        """Initializes connection to Google Sheets API using service account credentials."""
        self.spreadsheet_id = Config.GOOGLE_SHEETS_SPREADSHEET_ID
        creds_json = Config.GOOGLE_SERVICE_ACCOUNT_JSON
        creds_path = Config.GOOGLE_SERVICE_ACCOUNT_PATH

        if not self.spreadsheet_id:
            self.is_connected = False
            self.connection_error = "GOOGLE_SHEETS_SPREADSHEET_ID is not configured."
            return False

        credentials = None
        try:
            if creds_json:
                service_account_info = json.loads(creds_json)
                credentials = service_account.Credentials.from_service_account_info(
                    service_account_info, scopes=SCOPES
                )
            elif creds_path and os.path.exists(creds_path):
                credentials = service_account.Credentials.from_service_account_file(
                    creds_path, scopes=SCOPES
                )
            else:
                default_file = Path(__file__).resolve().parent.parent / 'service_account.json'
                if default_file.exists():
                    credentials = service_account.Credentials.from_service_account_file(
                        str(default_file), scopes=SCOPES
                    )

            if not credentials:
                self.is_connected = False
                self.connection_error = "No valid Google Service Account credentials found."
                return False

            self.service = build('sheets', 'v4', credentials=credentials)
            self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            self.is_connected = True
            self.connection_error = None
            logger.info("Successfully connected to Google Sheets API: %s", self.spreadsheet_id)

            self._ensure_sheets_exist()
            return True

        except Exception as e:
            self.is_connected = False
            self.connection_error = str(e)
            logger.error("Failed to connect to Google Sheets: %s", e)
            return False

    def get_connection_status(self) -> Dict[str, Any]:
        """Returns the health and connection status of the Google Sheets store."""
        return {
            "spreadsheet_id": self.spreadsheet_id or None,
            "is_connected": self.is_connected,
            "using_mock_fallback": not self.is_connected,
            "connection_error": self.connection_error,
            "configured_sheets": list(SHEET_SCHEMAS.keys())
        }

    def _execute_with_retry(self, request_fn, max_retries: int = 4):
        """Executes a Google Sheets API call with exponential backoff on transient errors."""
        delay = 1.0
        for attempt in range(max_retries):
            try:
                return request_fn()
            except HttpError as err:
                if err.resp.status in [429, 500, 502, 503, 504] and attempt < max_retries - 1:
                    logger.warning("Google API temporary error (%s). Retrying in %.1fs...", err.resp.status, delay)
                    time.sleep(delay)
                    delay *= 2
                else:
                    raise

    def _ensure_sheets_exist(self):
        """Verifies all required worksheets exist; creates missing ones with correct headers."""
        if not self.is_connected or not self.service:
            return

        try:
            metadata = self._execute_with_retry(
                lambda: self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            )
            existing_sheets = [s['properties']['title'] for s in metadata.get('sheets', [])]

            add_requests = []
            for sheet_name in SHEET_SCHEMAS.keys():
                if sheet_name not in existing_sheets:
                    add_requests.append({
                        "addSheet": {
                            "properties": {
                                "title": sheet_name,
                                "gridProperties": {"frozenRowCount": 1}
                            }
                        }
                    })

            if add_requests:
                self._execute_with_retry(
                    lambda: self.service.spreadsheets().batchUpdate(
                        spreadsheetId=self.spreadsheet_id,
                        body={"requests": add_requests}
                    ).execute()
                )

            # Check and write headers for each sheet
            for sheet_name, headers in SHEET_SCHEMAS.items():
                result = self._execute_with_retry(
                    lambda: self.service.spreadsheets().values().get(
                        spreadsheetId=self.spreadsheet_id,
                        range=f"{sheet_name}!A1:Z1"
                    ).execute()
                )
                rows = result.get('values', [])
                if not rows or rows[0] != headers:
                    self._execute_with_retry(
                        lambda: self.service.spreadsheets().values().update(
                            spreadsheetId=self.spreadsheet_id,
                            range=f"{sheet_name}!A1",
                            valueInputOption="RAW",
                            body={"values": [headers]}
                        ).execute()
                    )

            # Check if Material_Master is empty; if so, populate initial preconfigured materials
            mm_rows = self.read_rows("Material_Master")
            if not mm_rows:
                now = datetime.now(timezone.utc).isoformat()
                for mat in PRECONFIGURED_MATERIALS:
                    self.append_row("Material_Master", {
                        "material_id": mat["material_id"],
                        "material_name": mat["material_name"],
                        "category": mat["category"],
                        "material_type": mat["material_type"],
                        "length_mm": mat["length_mm"],
                        "width_mm": mat["width_mm"],
                        "thickness_mm": mat["thickness_mm"],
                        "density_coefficient": mat["density_coefficient"],
                        "weight_per_sheet": mat["weight_per_sheet"],
                        "unit": mat["unit"],
                        "is_active": "TRUE" if mat["is_active"] else "FALSE",
                        "created_at": now,
                        "updated_at": now
                    })

        except Exception as e:
            logger.error("Error ensuring Google Sheets existence: %s", e)

    def _get_cache(self, key: str) -> Optional[Any]:
        if key in self._cache:
            ts, val = self._cache[key]
            if time.time() - ts < self.cache_ttl:
                return val
            del self._cache[key]
        return None

    def _set_cache(self, key: str, val: Any):
        self._cache[key] = (time.time(), val)

    def invalidate_cache(self, sheet_name: Optional[str] = None):
        """Invalidates cache for a specific sheet or all sheets."""
        if sheet_name:
            keys_to_remove = [k for k in self._cache if k.startswith(sheet_name)]
            for k in keys_to_remove:
                del self._cache[k]
        else:
            self._cache.clear()

    # --- Read Operations ---

    def read_rows(self, sheet_name: str, use_cache: bool = True) -> List[Dict[str, Any]]:
        """Reads all rows from a sheet as a list of dictionaries keyed by headers."""
        if sheet_name not in SHEET_SCHEMAS:
            raise ValueError(f"Unknown sheet: {sheet_name}")

        headers = SHEET_SCHEMAS[sheet_name]
        cache_key = f"{sheet_name}_rows"

        if use_cache:
            cached = self._get_cache(cache_key)
            if cached is not None:
                return cached

        # If offline / mock mode
        if not self.is_connected or not self.service:
            data = list(self._mock_data.get(sheet_name, []))
            self._set_cache(cache_key, data)
            return data

        try:
            result = self._execute_with_retry(
                lambda: self.service.spreadsheets().values().get(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A:Z"
                ).execute()
            )
            raw_rows = result.get('values', [])
            if len(raw_rows) <= 1:
                self._set_cache(cache_key, [])
                return []

            sheet_headers = raw_rows[0]
            records = []
            for row in raw_rows[1:]:
                padded = row + [''] * (len(sheet_headers) - len(row))
                record = {sheet_headers[i]: padded[i] for i in range(len(sheet_headers))}
                records.append(record)

            self._set_cache(cache_key, records)
            return records
        except Exception as e:
            logger.error("Error reading from Google Sheets (%s): %s", sheet_name, e)
            return list(self._mock_data.get(sheet_name, []))

    # --- Write Operations ---

    def append_row(self, sheet_name: str, record: Dict[str, Any]) -> Dict[str, Any]:
        """Appends a new row to the sheet."""
        if sheet_name not in SHEET_SCHEMAS:
            raise ValueError(f"Unknown sheet: {sheet_name}")

        headers = SHEET_SCHEMAS[sheet_name]
        row_values = [str(record.get(h, '')) if record.get(h) is not None else '' for h in headers]

        self.invalidate_cache(sheet_name)
        self._mock_data[sheet_name].append(dict(record))

        if not self.is_connected or not self.service:
            return record

        try:
            self._execute_with_retry(
                lambda: self.service.spreadsheets().values().append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [row_values]}
                ).execute()
            )
            return record
        except Exception as e:
            logger.error("Error appending to Google Sheet (%s): %s", sheet_name, e)
            return record

    def append_rows_batch(self, sheet_name: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Appends multiple rows in a single batch API call."""
        if not records:
            return []
        headers = SHEET_SCHEMAS[sheet_name]
        all_values = [
            [str(rec.get(h, '')) if rec.get(h) is not None else '' for h in headers]
            for rec in records
        ]

        self.invalidate_cache(sheet_name)
        self._mock_data[sheet_name].extend(records)

        if not self.is_connected or not self.service:
            return records

        try:
            self._execute_with_retry(
                lambda: self.service.spreadsheets().values().append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": all_values}
                ).execute()
            )
            return records
        except Exception as e:
            logger.error("Error batch appending to Google Sheet (%s): %s", sheet_name, e)
            return records

    def update_row_by_id(
        self, sheet_name: str, id_field: str, id_val: str, updated_record: Dict[str, Any]
    ) -> bool:
        """Updates a specific row identified by unique ID."""
        if sheet_name not in SHEET_SCHEMAS:
            raise ValueError(f"Unknown sheet: {sheet_name}")

        headers = SHEET_SCHEMAS[sheet_name]
        self.invalidate_cache(sheet_name)

        found_in_mock = False
        for i, item in enumerate(self._mock_data.get(sheet_name, [])):
            if str(item.get(id_field)) == str(id_val):
                self._mock_data[sheet_name][i].update(updated_record)
                found_in_mock = True
                break

        if not self.is_connected or not self.service:
            return found_in_mock

        try:
            result = self._execute_with_retry(
                lambda: self.service.spreadsheets().values().get(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A:Z"
                ).execute()
            )
            rows = result.get('values', [])
            if not rows:
                return False

            header_row = rows[0]
            if id_field not in header_row:
                return False
            id_col_idx = header_row.index(id_field)

            row_to_update_idx = None
            for idx, r in enumerate(rows[1:], start=2):
                if len(r) > id_col_idx and str(r[id_col_idx]) == str(id_val):
                    row_to_update_idx = idx
                    break

            if not row_to_update_idx:
                return False

            row_values = [str(updated_record.get(h, '')) if updated_record.get(h) is not None else '' for h in headers]
            self._execute_with_retry(
                lambda: self.service.spreadsheets().values().update(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A{row_to_update_idx}:Z{row_to_update_idx}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [row_values]}
                ).execute()
            )
            return True
        except Exception as e:
            logger.error("Error updating row in Google Sheets (%s): %s", sheet_name, e)
            return found_in_mock

    def delete_row_by_id(self, sheet_name: str, id_field: str, id_val: str) -> bool:
        """Deletes a row from the sheet by ID."""
        if sheet_name not in SHEET_SCHEMAS:
            raise ValueError(f"Unknown sheet: {sheet_name}")

        self.invalidate_cache(sheet_name)

        before_len = len(self._mock_data.get(sheet_name, []))
        self._mock_data[sheet_name] = [
            item for item in self._mock_data.get(sheet_name, [])
            if str(item.get(id_field)) != str(id_val)
        ]
        removed_mock = len(self._mock_data[sheet_name]) < before_len

        if not self.is_connected or not self.service:
            return removed_mock

        try:
            metadata = self._execute_with_retry(
                lambda: self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            )
            sheet_id = None
            for s in metadata.get('sheets', []):
                if s['properties']['title'] == sheet_name:
                    sheet_id = s['properties']['sheetId']
                    break

            if sheet_id is None:
                return False

            result = self._execute_with_retry(
                lambda: self.service.spreadsheets().values().get(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{sheet_name}!A:Z"
                ).execute()
            )
            rows = result.get('values', [])
            header_row = rows[0]
            id_col_idx = header_row.index(id_field)

            row_idx_to_delete = None
            for idx, r in enumerate(rows[1:], start=1):
                if len(r) > id_col_idx and str(r[id_col_idx]) == str(id_val):
                    row_idx_to_delete = idx
                    break

            if row_idx_to_delete is None:
                return False

            self._execute_with_retry(
                lambda: self.service.spreadsheets().batchUpdate(
                    spreadsheetId=self.spreadsheet_id,
                    body={
                        "requests": [{
                            "deleteDimension": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "dimension": "ROWS",
                                    "startIndex": row_idx_to_delete,
                                    "endIndex": row_idx_to_delete + 1
                                }
                            }
                        }]
                    }
                ).execute()
            )
            return True
        except Exception as e:
            logger.error("Error deleting row in Google Sheets (%s): %s", sheet_name, e)
            return removed_mock

sheets_client = SheetsClient()
