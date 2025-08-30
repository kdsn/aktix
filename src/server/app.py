from __future__ import annotations
import os
import secrets
from pathlib import Path
from flask import Flask, request, jsonify, session, send_from_directory
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv


from .db import SessionLocal, engine
from .models import Base, User, Credential
from .utils import b64url_encode, b64url_decode


# WebAuthn helpers (duo-labs/web-authn python lib)
from webauthn import (
generate_registration_options,
generate_authentication_options,
verify_registration_response,
verify_authentication_response,
)
from webauthn.helpers.structs import (
PublicKeyCredentialDescriptor,
AuthenticatorSelectionCriteria,
ResidentKeyRequirement,
UserVerificationRequirement,
)


# --- Setup ---
load_dotenv()
BASE_DIR = Path(__file__).resolve().parents[1]
CLIENT_DIR = BASE_DIR / "client"


app = Flask(
__name__,
static_folder=str(CLIENT_DIR),
static_url_path="",
)
app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(32))


# DB init
Base.metadata.create_all(bind=engine)


RP_ID = os.getenv("RP_ID", "localhost")
ORIGIN = os.getenv("ORIGIN", "http://localhost:5000")
RP_NAME = os.getenv("RP_NAME", "Aktix")


# --- Static (PWA) routes ---
@app.get("/")
def index():
return send_from_directory(CLIENT_DIR, "index.html")


# --- WebAuthn: Registration ---
@app.post("/api/webauthn/register/begin")
def webauthn_register_begin():
data = request.get_json(force=True)
username = (data.get("username") or "").strip().lower()
display_name = data.get("displayName") or username


if not username:
return jsonify({"error": "username_required"}), 400


db = SessionLocal()
try:
user = db.scalar(select(User).where(User.username == username))
if user is None:
user = User(
username=username,
display_name=display_name,
user_handle=secrets.token_bytes(32),
)
db.add(user)
db.commit()
db.refresh(user)


# Collect existing credential IDs to disallow duplicate registration on same device
existing_creds = db.scalars(select(Credential).where(Credential.user_id == user.id)).all()
exclude_list = [
PublicKeyCredentialDescriptor(id=cred.credential_id, type="public-key")
for cred in existing_creds
app.run(host="0.0.0.0", port=5000, debug=True)