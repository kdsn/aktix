from pathlib import Path
from flask import Flask, send_from_directory

BASE = Path(__file__).resolve().parents[1]
CLIENT_DIR = BASE / "client"

app = Flask(__name__, static_folder=str(CLIENT_DIR), static_url_path="")

@app.get("/")
def index():
    return send_from_directory(CLIENT_DIR, "index.html")

if __name__ == "__main__":
    # Lyt på alle interfaces, så du kan ramme den udefra
    app.run(host="0.0.0.0", port=5000)
