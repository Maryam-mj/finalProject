from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Profile
import os
from werkzeug.utils import secure_filename
from flask_cors import cross_origin

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")

UPLOAD_FOLDER = "uploads/profile_pics"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route("", methods=["GET"])
@login_required
@cross_origin(supports_credentials=True)
def get_profile():
    try:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        
        # Return empty profile structure instead of 404
        if not profile:
            return jsonify({
                "user": {
                    "id": current_user.id, 
                    "username": current_user.username,
                    "email": current_user.email
                },
                "profile": {
                    "bio": "",
                    "interests": [],
                    "specialization": "",
                    "level": "Beginner",
                    "schedule": "",
                    "profile_picture": None
                }
            }), 200

        # Build the full URL for the profile picture
        profile_picture_url = None
        if profile.profile_picture:
            # Remove any leading slash to avoid double slashes in URL
            picture_path = profile.profile_picture.lstrip('/')
            profile_picture_url = f"http://127.0.0.1:5000/{picture_path}"

        return jsonify({
            "user": {
                "id": current_user.id, 
                "username": current_user.username,
                "email": current_user.email
            },
            "profile": {
                "bio": profile.bio,
                "interests": profile.interests.split(",") if profile.interests else [],
                "specialization": profile.specialization,
                "level": profile.level,
                "schedule": profile.schedule,
                "profile_picture": profile_picture_url
            }
        }), 200
    except Exception as e:
        print("🔥 Get profile error:", str(e))
        return jsonify({"error": "Failed to fetch profile"}), 500

# Update profile
@profile_bp.route("", methods=["PUT"])
@login_required
@cross_origin(supports_credentials=True)
def update_profile():
    try:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        
        # If profile doesn't exist, create one instead of returning 404
        if not profile:
            return create_profile()  # Reuse the create function

        # Rest of your existing update code...
        # Handle both form data and JSON
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
            # Handle file upload
            if "profilePic" in request.files:
                file = request.files["profilePic"]
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    name, ext = os.path.splitext(filename)
                    filename = f"{current_user.id}_{name}{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    profile.profile_picture = f"/uploads/profile_pics/{filename}"
        else:
            data = request.get_json()
        
        # Update profile fields
        if data:
            profile.bio = data.get("bio", profile.bio)
            profile.interests = data.get("interests", profile.interests)
            profile.specialization = data.get("specialization", profile.specialization)
            profile.level = data.get("level", profile.level)
            profile.schedule = data.get("schedule", profile.schedule)

        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

# Create profile (POST /api/profile)
@profile_bp.route("", methods=["POST"])
@login_required
@cross_origin(supports_credentials=True)
def create_profile():
    try:
        # Check if content type is multipart/form-data for file upload
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
        else:
            data = request.get_json()
            
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        # Check if user already has a profile
        existing_profile = Profile.query.filter_by(user_id=current_user.id).first()
        if existing_profile:
            return jsonify({"error": "Profile already exists"}), 400

        # Handle file upload if present
        profile_picture_path = None
        if "profilePic" in request.files:
            file = request.files["profilePic"]
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add user ID to filename to make it unique
                name, ext = os.path.splitext(filename)
                filename = f"{current_user.id}_{name}{ext}"
                
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                
                # Store the relative path
                profile_picture_path = f"/uploads/profile_pics/{filename}"

        new_profile = Profile(
            user_id=current_user.id,
            bio=data.get("bio"),
            interests=data.get("interests"),
            specialization=data.get("specialization"),
            level=data.get("level", "Beginner"),
            schedule=data.get("schedule"),
            profile_picture=profile_picture_path,
        )

        db.session.add(new_profile)
        db.session.commit()

        return jsonify({"message": "Profile created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create profile: {str(e)}"}), 500