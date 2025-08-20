from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import User
from extensions import db, bcrypt, mail
from flask_mail import Message
import random
import string
from datetime import datetime, timedelta

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_current_user():
    if not current_user.is_authenticated:
        return jsonify({"error": "Not authenticated"}), 401
        
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }), 200

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    # Check if user exists FIRST
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Only create user if checks pass
    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(username=username, email=email, password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    # Only login after successful creation
    login_user(new_user, remember=True)
    
    return jsonify({
        "message": "User created and logged in successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    remember = data.get("remember", True)
    login_user(user, remember=remember)
    
    return jsonify({
        "message": "Logged in successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }), 200

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

# Password reset functionality
reset_codes = {}

def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

@auth_bp.route("/forgotpassword", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Return generic message to prevent email enumeration
        return jsonify({"message": "If the email exists, a reset code has been sent"}), 200

    code = generate_code()
    expiry = datetime.utcnow() + timedelta(minutes=15)
    reset_codes[email] = {"code": code, "expires": expiry}

    try:
        msg = Message(
            subject="Your Password Reset Code",
            recipients=[email],
            body=f"Your StudyBuddy password reset code is: {code}\nThis code is valid for 15 minutes."
        )
        mail.send(msg)
    except Exception as e:
        print("Failed to send email:", e)
        return jsonify({"error": "Failed to send reset code email"}), 500

    return jsonify({"message": "Reset code sent to your email"}), 200

@auth_bp.route("/verify-reset-code", methods=["POST"])
def verify_reset_code():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    code = data.get("code", "").strip()

    if not email or not code:
        return jsonify({"error": "Email and code are required"}), 400

    record = reset_codes.get(email)
    if not record or record["code"] != code:
        return jsonify({"error": "Invalid reset code"}), 400
    if datetime.utcnow() > record["expires"]:
        return jsonify({"error": "Reset code expired"}), 400

    return jsonify({"message": "Code verified"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    code = data.get("code", "").strip()
    new_password = data.get("newPassword", "")

    if not email or not code or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    record = reset_codes.get(email)
    if not record or record["code"] != code:
        return jsonify({"error": "Invalid reset code"}), 400
    if datetime.utcnow() > record["expires"]:
        return jsonify({"error": "Reset code expired"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    hashed_pw = bcrypt.generate_password_hash(new_password).decode("utf-8")
    user.password_hash = hashed_pw
    db.session.commit()

    reset_codes.pop(email, None)

    return jsonify({"message": "Password reset successfully"}), 200