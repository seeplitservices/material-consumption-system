# Deployment & Hosting Guide
## Material Consumption & Wastage Management System
**Saravanan Electricals and Engineering Pvt. Ltd**

This guide provides step-by-step instructions to:
1. **Push the source code to GitHub**
2. **Deploy the Google Sheets Apps Script Backend** (Single Source of Truth)
3. **Deploy the Frontend on Vercel** (with live connection to your Google Sheets)

---

## PART 1: Push Code to GitHub

### Step 1.1: Create a Repository on GitHub
1. Open [GitHub](https://github.com) and log into your account.
2. Click the **`+`** icon in the top-right corner and select **New repository**.
3. Repository name: `material-consumption-system` (or your preferred name).
4. Set visibility to **Private** or **Public**.
5. **Do NOT** check "Add a README file" or ".gitignore" (these already exist locally).
6. Click **Create repository**.
7. Copy the repository URL (e.g., `https://github.com/<your-username>/material-consumption-system.git`).

### Step 1.2: Push Local Git Repository to GitHub
Open your terminal (PowerShell or Bash) and run:

```powershell
# Navigate to project directory
cd "C:\Users\amdha\.gemini\antigravity\scratch\material-consumption-system"

# Set default branch to main (recommended by GitHub)
git branch -M main

# Link your GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/<your-username>/material-consumption-system.git

# Push all code and commits to GitHub
git push -u origin main
```

---

## PART 2: Deploy Google Apps Script in Google Sheets

By using Google Apps Script as the backend:
- **Zero server costs** (no Render or AWS server needed).
- Direct, native read/write access to your Google Spreadsheet.
- Zero credential keys or service accounts to expire.

### Step 2.1: Create Your Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Title it: **`Saravanan Electricals - Material Consumption System`**.

### Step 2.2: Add Google Apps Script
1. In your Google Spreadsheet, click on **Extensions** in the top menu and select **Apps Script**.
2. Erase any code in the editor (`myFunction`).
3. Open [`google_apps_script/Code.gs`](file:///C:/Users/amdha/.gemini/antigravity/scratch/material-consumption-system/google_apps_script/Code.gs) from this project repository, copy its entire contents, and paste it into the Apps Script editor.
4. Click the **Save** icon (diskette icon) or press `Ctrl + S`.

### Step 2.3: Run One-Click Initialization
1. In the toolbar dropdown at the top, select the function **`initializeSheets`**.
2. Click **Run**.
3. When prompted, click **Review permissions**, select your Google account, click **Advanced**, and click **Go to Untitled project (unsafe)** to grant permissions.
4. In ~5 seconds, switch back to your Google Spreadsheet tab:
   - You will see all 9 tabs automatically created with formatted headers, standard materials, baseline stock, and default login credentials:
     - `Material_Master` (12 preconfigured factory sheets)
     - `Daily_Entries`
     - `Material_Stock`
     - `Scrap_Records`
     - `Production_Summary`
     - `Stock_Adjustments`
     - `Users` (`director@factory.com` / `Director@123`, `operator@factory.com` / `Operator@123`)
     - `Audit_Log`
     - `Settings`

### Step 2.4: Deploy as a Web App
1. In the Apps Script editor, click the blue **Deploy** button (top-right) > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the settings:
   - **Description**: `MCWMS API Production`
   - **Execute as**: `Me (<your-email>)`
   - **Who has access**: `Anyone` *(Crucial so Vercel frontend can send API calls)*
4. Click **Deploy**.
5. Copy the generated **Web App URL**:
   `https://script.google.com/macros/s/AKfycbx.../exec`
   *(Save this URL — you will need it for Vercel in Part 3).*

---

## PART 3: Deploy Frontend on Vercel

### Step 3.1: Import Project into Vercel
1. Go to [Vercel](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** > **Project**.
3. Select your GitHub repository (`material-consumption-system`) and click **Import**.

### Step 3.2: Configure Vercel Build Settings
In the Project Configuration screen:
1. **Framework Preset**: `Vite` (detected automatically)
2. **Root Directory**: Click "Edit" and choose **`frontend`** (Important!).
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Step 3.3: Add Environment Variable
Expand the **Environment Variables** section and add:
- **Key**: `VITE_API_BASE_URL`
- **Value**: Your Google Apps Script Web App URL from Step 2.4:
  `https://script.google.com/macros/s/AKfycbx.../exec`

*(Note: If you are using the Python Flask backend on Render instead, set this value to `https://<your-render-app>.onrender.com`).*

### Step 3.4: Deploy
1. Click **Deploy**.
2. In ~1 minute, Vercel will build and launch your application at:
   `https://<your-project-name>.vercel.app`

---

## PART 4: Verification & Log In

Open your live Vercel URL in your browser:
1. You will see the **Saravanan Electricals and Engineering Pvt. Ltd** branded light-theme login page.
2. Click the quick login presets:
   - **Director**: `director@factory.com` / `Director@123` (Access all executive reports, stock, master settings).
   - **Data Entry User**: `operator@factory.com` / `Operator@123` (Daily punching entry & historical records).
3. When entering a daily punching transaction:
   - Type the operator's actual name in **Operator / Person Name**.
   - Input overall scrap weight.
   - Click **Save Daily Entry Batch** &rarr; Verify the record appears live in your Google Sheet!
