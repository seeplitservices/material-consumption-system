"""
Local Development Runner
"""

import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Material Consumption System Backend on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
