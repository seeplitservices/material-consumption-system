import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent

# Load local environment files if present
load_dotenv(backend_dir / '.env')
load_dotenv(project_root / '.env')

class Config:
    PORT = int(os.environ.get('PORT', 5000))
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1')

    # Security Keys
    FLASK_SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'mcwms-industrial-secret-key-prod-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'mcwms-jwt-access-key-industrial-998822')
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

    # Google Sheets API Configuration
    GOOGLE_SHEETS_SPREADSHEET_ID = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID', '').strip()
    GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    GOOGLE_SERVICE_ACCOUNT_PATH = os.environ.get('GOOGLE_SERVICE_ACCOUNT_PATH', '').strip()

    # CORS Frontend URL (Allow localhost, Vercel deployments, or wildcards for local dev)
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # Defaults
    STEEL_DENSITY_COEFFICIENT = float(os.environ.get('STEEL_DENSITY_COEFFICIENT', 0.00000785))
    BASELINE_DATE = os.environ.get('BASELINE_DATE', '2026-11-01')
    CACHE_TTL_SECONDS = int(os.environ.get('CACHE_TTL_SECONDS', 30))
