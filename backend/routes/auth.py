from flask import Blueprint, request, session, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import logging
import random
import string
import re
from models import User, Profile
from extensions import db, bcrypt, mail

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


# -------------------------------
# 🔒 Validators
# -------------------------------

def validate_password_strength(password: str):
    """Enforce strong passwords"""
    if not isinstance(password, str):
        return False, "Invalid password"
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit"
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter"
    return True, ""


def is_valid_email(email: str):
    """Simple regex check for valid email format"""
    if not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


# -------------------------------
# 📝 Signup
# -------------------------------

@auth_bp.route('/signup', methods=['POST', "OPTIONS"])
def signup():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        data = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        confirm_password = data.get('confirmPassword') or data.get('confirm_password') or ''

        # Basic presence checks
        if not username or not email or not password:
          return jsonify({"error": "All fields are required"}), 400  # 🔑 match frontend


        if confirm_password and password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            return jsonify({"error": msg}), 400

        # Uniqueness checks
        if User.query.filter_by(email=email).first():
         return jsonify({"error": "Email already registered"}), 400

        if User.query.filter_by(username=username).first():
         return jsonify({"error": "Username already exists"}), 400  # 🔑 match frontend


        # Create user
        new_user = User(username=username, email=email)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        # Best-effort welcome email
        try:
            msg = Message(
                subject="🎉 Welcome to StudyBuddy!",
                recipients=[email],
                body=f"Hi {username},\n\nWelcome to StudyBuddy! We're excited to have you join our community.\n\nHappy studying! 📚"
            )
            mail.send(msg)
        except Exception as e:
            logger.warning(f"Email sending failed: {e}")

        # ✅ Log the user in immediately after signup
        login_user(new_user, remember=True)
        session.permanent = True

        # Get session lifetime in seconds and convert to timedelta
        session_lifetime_seconds = current_app.config.get('PERMANENT_SESSION_LIFETIME', 604800)  # Default 7 days
        session_lifetime = timedelta(seconds=session_lifetime_seconds)

        response = jsonify({
            "message": "User created successfully",
            "redirect": "/profile",   # 🔑 direct new users to profile setup
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email
            },
            "session_expiry": (datetime.utcnow() + session_lifetime).isoformat()
        })

        return response, 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "User already exists"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Signup error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# -------------------------------
# 🔑 Login
# -------------------------------

@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        if hasattr(user, 'is_active') and not user.is_active:
            return jsonify({"error": "Account deactivated"}), 403

        remember_me = bool(data.get("remember", True))
        login_user(user, remember=remember_me)
        session.permanent = True

        # Check if profile exists - handle both cases where profile might not exist
        has_profile = False
        try:
            profile = Profile.query.filter_by(user_id=user.id).first()
            has_profile = profile is not None
        except Exception:
            # If there's an error querying the profile, assume no profile
            has_profile = False

        redirect_path = "/dashboard" if has_profile else "/profile"

        # Get session lifetime in seconds and convert to timedelta
        session_lifetime_seconds = current_app.config.get('PERMANENT_SESSION_LIFETIME', 604800)  # Default 7 days
        session_lifetime = timedelta(seconds=session_lifetime_seconds)

        response = jsonify({
            "message": "Logged in successfully",
            "redirect": redirect_path,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            },
            "session_expiry": (datetime.utcnow() + session_lifetime).isoformat()
        })

        return response, 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# -------------------------------
# 👤 Get current user
# -------------------------------

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }), 200


# -------------------------------
# 🚪 Logout
# -------------------------------

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    try:
        logout_user()
        session.clear()

        response = jsonify({"message": "Logged out successfully"})

        # Clear the session cookie
        response.set_cookie(
            current_app.config.get('SESSION_COOKIE_NAME', 'session'),
            '',
            expires=0,
            path=current_app.config.get('SESSION_COOKIE_PATH', '/'),
            httponly=current_app.config.get('SESSION_COOKIE_HTTPONLY', True),
            secure=current_app.config.get('SESSION_COOKIE_SECURE', False),
            samesite=current_app.config.get('SESSION_COOKIE_SAMESITE', 'Lax')
        )

        return response, 200
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# -------------------------------
# 🔄 Refresh Token
# -------------------------------

@auth_bp.route("/refresh", methods=["POST"])
@login_required
def refresh_token():
    try:
        session.modified = True
        
        # Get session lifetime in seconds and convert to timedelta
        session_lifetime_seconds = current_app.config.get('PERMANENT_SESSION_LIFETIME', 604800)  # Default 7 days
        session_lifetime = timedelta(seconds=session_lifetime_seconds)
        
        return jsonify({
            "message": "Session refreshed successfully",
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            },
            "session_expiry": (datetime.utcnow() + session_lifetime).isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"error": "Failed to refresh session"}), 500


# -------------------------------
# 🔍 Session Check
# -------------------------------

@auth_bp.route("/session-check", methods=["GET"])
def session_check():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            }
        }), 200
    else:
        return jsonify({
            "authenticated": False,
            "message": "No active session"
        }), 200


# -------------------------------
# 🔁 Forgot password (send code)
# -------------------------------

@auth_bp.route("/forgotpassword", methods=["POST", "OPTIONS"])
def forgot_password():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()

        if not email:
            return jsonify({"error": "Email is required"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"message": "If this email exists, a reset code will be sent"}), 200

        reset_code = ''.join(random.choices(string.digits, k=6))
        user.reset_code = reset_code
        user.reset_code_expiry = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()

        try:
            msg = Message(
                subject="🔑 Your StudyBuddy Password Reset Code",
                recipients=[email],
                body=f"""
Hi {user.username},

Your password reset code is: {reset_code}

It is valid for 10 minutes.
If you didn't request this, please ignore this email.

- The StudyBuddy Team
"""
            )
            mail.send(msg)
        except Exception as e:
            logger.warning(f"Failed to send reset email: {e}")

        return jsonify({"message": "If this email exists, a reset code has been sent"}), 200

    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# ✅ Verify reset code
# -------------------------------

@auth_bp.route("/verify-reset-code", methods=["POST", "OPTIONS"])
def verify_reset_code():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        code = (data.get("code") or "").strip()

        if not email or not code:
            return jsonify({"error": "Email and code are required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not getattr(user, 'reset_code', None):
            return jsonify({"error": "Invalid reset attempt"}), 400

        expiry = getattr(user, 'reset_code_expiry', None)
        if user.reset_code != code or (expiry and datetime.utcnow() > expiry):
            return jsonify({"error": "Invalid or expired code"}), 400

        # Code is valid, but don't reset password yet
        return jsonify({"message": "Code verified successfully"}), 200

    except Exception as e:
        logger.error(f"Verify reset code error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# -------------------------------
# 🔄 Reset password (after code verification)
# -------------------------------

@auth_bp.route("/reset-password", methods=["POST", "OPTIONS"])
def reset_password():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        code = (data.get("code") or "").strip()
        new_password = data.get("newPassword") or ""

        if not all([email, code, new_password]):
            return jsonify({"error": "Email, code, and new password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not getattr(user, 'reset_code', None):
            return jsonify({"error": "Invalid reset attempt"}), 400

        expiry = getattr(user, 'reset_code_expiry', None)
        if user.reset_code != code or (expiry and datetime.utcnow() > expiry):
            return jsonify({"error": "Invalid or expired code"}), 400

        is_valid, msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({"error": msg}), 400

        user.set_password(new_password)
        user.reset_code = None
        user.reset_code_expiry = None
        db.session.commit()

        return jsonify({"message": "Password reset successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Reset password error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500