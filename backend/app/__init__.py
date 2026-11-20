"""
Flask Application Factory
Configures modular Blueprints, CORS, Error Handlers, and Production Headers.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure CORS for Vite Frontend (localhost and Vercel domains)
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.materials import materials_bp
    from app.routes.stock import stock_bp
    from app.routes.entries import entries_bp
    from app.routes.scrap import scrap_bp
    from app.routes.production import production_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.reports import reports_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(materials_bp, url_prefix="/api/materials")
    app.register_blueprint(stock_bp, url_prefix="/api/stock")
    app.register_blueprint(entries_bp, url_prefix="/api/entries")
    app.register_blueprint(scrap_bp, url_prefix="/api/scrap")
    app.register_blueprint(production_bp, url_prefix="/api/production")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")

    # Global Health Check alias at root /api/health
    @app.route("/api/health", methods=["GET"])
    def global_health():
        from app.routes.settings import health_check
        return health_check()

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Material Consumption & Wastage Management System API",
            "status": "online",
            "health_endpoint": "/api/health"
        })

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"success": False, "error": "Internal server error occurred."}), 500

    return app
