# Material Consumption & Wastage Management System (MCWMS)

A professional, industrial-grade web application for manufacturing facilities to track daily material usage, sheet punching quantities, opening and closing stocks, cutbit usage, scrap generation, and wastage analytics across independent **Left Side** and **Right Side** operations.

Single Persistent Source of Truth: **Google Sheets API**.

---

## 1. System Architecture

```
[ Frontend: React.js + Vite + Tailwind CSS ]  (Hosted on Vercel)
                     │
               HTTPS │ (REST / JWT Bearer)
                     ▼
[ Backend: Python Flask + Gunicorn WSGI ]      (Hosted on Render)
                     │
    Google Cloud API │ (Service Account Auth with Exponential Backoff & Caching)
                     ▼
[ Database: Google Sheets (10 Worksheets) ]
   ├── Sheet 1:  Material_Master
   ├── Sheet 2:  Daily_Entries
   ├── Sheet 3:  Left_Stock
   ├── Sheet 4:  Right_Stock
   ├── Sheet 5:  Scrap_Records
   ├── Sheet 6:  Production_Summary
   ├── Sheet 7:  Stock_Adjustments
   ├── Sheet 8:  Users
   ├── Sheet 9:  Audit_Log
   └── Sheet 10: Settings
```

---

## 2. Core Capabilities & Industrial Engine

1. **Precision Material Weight Calculation Engine**:
   $$\text{Weight (kg)} = \text{Length (mm)} \times \text{Width (mm)} \times \text{Thickness (mm)} \times \text{Density Coefficient}$$
   - Preconfigured mild steel density: `0.00000785`.
   - Supports non-steel custom densities (e.g. Brass, Aluminum) or manual weight entry for non-dimensional materials.
   - Example (1.2 CRCA): $1250 \times 2500 \times 1.2 \times 0.00000785 = 29.4375\text{ kg} \rightarrow 29.44\text{ kg}$.
   - For 3 sheets: $3 \times 29.4375 = 88.3125\text{ kg} \rightarrow 88.31\text{ kg}$.

2. **Scrap & Wastage Formulas**:
   $$\text{Net Consumption} = \text{Total Input Weight} - \text{Scrap Weight}$$
   $$\text{Wastage \%} = \left(\frac{\text{Scrap Weight}}{\text{Total Input Weight}}\right) \times 100$$
   - Example (8 kg scrap on 88.3125 kg input): $\text{Net} = 80.3125\text{ kg}$, $\text{Wastage} = 9.06\%$.
   - **Period Wastage Rule**: Calculated as $\frac{\sum \text{Scrap Weight}}{\sum \text{Total Input Weight}} \times 100$ (never averages individual percentages).

3. **Stock Auto Carry-Forward & Calculations**:
   $$\text{Closing Stock} = \text{Opening Stock} + \text{Stock Received} - \text{Sheets Used}$$
   - Next day's opening stock automatically inherits the previous valid closing stock balance.
   - Prevents negative closing stock without authorized override and reason.

4. **Rare Material Management**:
   - Authorized operators can add rare materials on the fly without cluttering standard lists.
   - Automatically saved to `Material_Master` and available immediately in dropdowns.

5. **Multi-Format Reports & Exports**:
   - Daily material consumption report, monthly report, side-by-side comparison, rare material history.
   - One-click export to **Excel (.xls)**, **CSV**, and **Print-Ready PDF**.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts.
- **Backend**: Python 3.14 / Flask 3.1, Gunicorn, PyJWT, Google API Python Client, Google Auth.
- **Database / Store**: Google Sheets API v4.
- **Deployment**: Render (Backend Web Service) + Vercel (Frontend SPA).

---

## 4. Local Development Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt

# Run backend development server
python run.py
# Server runs on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### 3. Default Demo Accounts
- **Administrator**: `admin@factory.com` / `Admin@123` (Full permissions, stock adjustments, user management)
- **Operator**: `operator@factory.com` / `Employee@123` (Daily entries, stock and report viewing)

---

## 5. Google Sheets Configuration

1. Create a Google Cloud Project and enable the **Google Sheets API** and **Google Drive API**.
2. Create a **Service Account** and generate a JSON key.
3. Create a blank Google Spreadsheet and share it with the service account email as **Editor**.
4. Set the following environment variables on Render (or local `.env`):
   ```env
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "...", ...}
   ```
5. When the application boots, it automatically inspects the spreadsheet and creates any missing worksheets and headers from the 10 defined schemas without deleting existing data.

*Note: If credentials are not yet configured, the system operates in local in-memory mock mode and clearly displays connection diagnostic status in the UI.*

---

## 6. Production Deployment

### Render (Backend)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --workers 1 --threads 4 --timeout 120 wsgi:app`
- **Root Directory**: `backend`
- Set Environment Variables:
  - `FLASK_ENV`: `production`
  - `FLASK_SECRET_KEY`: `<secure-random-string>`
  - `JWT_SECRET_KEY`: `<secure-random-string>`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`: `<id>`
  - `GOOGLE_SERVICE_ACCOUNT_JSON`: `<json-string>`
  - `FRONTEND_URL`: `https://your-app.vercel.app`

### Vercel (Frontend)
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Set Environment Variable:
  - `VITE_API_BASE_URL`: `https://your-backend.onrender.com`

---

## 7. Automated Test Suite (Tests 1 - 10)

Run the test suite:
```bash
cd backend
python -m pytest tests/
```
All 11 automated test cases verify the 10 industrial requirements:
- **Test 1**: 1.2 CRCA Sheet (1250 x 2500 x 1.2) weight = 29.4375 kg (display: 29.44 kg).
- **Test 2**: 3 sheets used input weight = 88.3125 kg (display: 88.31 kg).
- **Test 3**: 8 kg scrap net consumption = 80.3125 kg, wastage % = 9.06%.
- **Test 4**: Opening 135, Used 3, Received 0 -> Closing stock = 132.
- **Test 5**: Rare material creation, Google Sheets persistence, dynamic weight.
- **Test 6**: Left and Right Side daily entries on same date with independent stock and combined production summary.
- **Test 7**: Automatic opening stock carryforward from previous day's closing stock.
- **Test 8**: Historical transaction edit with audit trail and stock reconciliation.
- **Test 9**: Google Sheets persistence across application restarts.
- **Test 10**: Graceful backend error handling and connection status diagnostics.
