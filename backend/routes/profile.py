from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Profile
import os
from werkzeug.utils import secure_filename
from flask_cors import cross_origin

# Create blueprint without url_prefix - will be prefixed in app.py
profile_bp = Blueprint("profile", __name__)

UPLOAD_FOLDER = "uploads/profile_pics"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route("/profile", methods=["GET"])
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

@profile_bp.route("/profile", methods=["PUT"])
@login_required
@cross_origin(supports_credentials=True)
def update_profile():
    try:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        
        # If profile doesn't exist, create one
        if not profile:
            return create_profile()

        data = {}
        profile_picture_path = None

        # Handle multipart/form-data (file upload)
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form.to_dict()
            
            # Handle file upload
            if "profilePic" in request.files:
                file = request.files["profilePic"]
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    name, ext = os.path.splitext(filename)
                    filename = f"{current_user.id}_{name}{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    profile_picture_path = f"/uploads/profile_pics/{filename}"
        
        # Handle application/json
        elif request.content_type and request.content_type.startswith('application/json'):
            data = request.get_json()
        else:
            return jsonify({"error": "Unsupported media type. Use multipart/form-data for file uploads or application/json for data only."}), 415

        # Update profile fields from data
        if 'bio' in data:
            profile.bio = data.get('bio')
            
        if 'interests' in data:
            interests = data.get('interests', '')
            if isinstance(interests, list):
                interests = ", ".join(interests)
            profile.interests = interests
            
        if 'specialization' in data:
            profile.specialization = data.get('specialization')
            
        if 'level' in data:
            profile.level = data.get('level')
            
        if 'schedule' in data:
            profile.schedule = data.get('schedule')
            
        # Update profile picture if a new one was uploaded
        if profile_picture_path:
            profile.profile_picture = profile_picture_path

        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print("🔥 Update profile error:", str(e))
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

@profile_bp.route("/profile", methods=["POST"])
@login_required
@cross_origin(supports_credentials=True)
def create_profile():
    try:
        data = {}
        profile_picture_path = None

        # Handle multipart/form-data (file upload)
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form.to_dict()
            
            # Handle file upload
            if "profilePic" in request.files:
                file = request.files["profilePic"]
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    name, ext = os.path.splitext(filename)
                    filename = f"{current_user.id}_{name}{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    profile_picture_path = f"/uploads/profile_pics/{filename}"
        
        # Handle application/json
        elif request.content_type and request.content_type.startswith('application/json'):
            data = request.get_json()
        else:
            return jsonify({"error": "Unsupported media type. Use multipart/form-data for file uploads or application/json for data only."}), 415
            
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        # Check if user already has a profile
        existing_profile = Profile.query.filter_by(user_id=current_user.id).first()
        if existing_profile:
            return jsonify({"error": "Profile already exists"}), 400

        # Handle interests - convert list to comma-separated string if needed
        interests = data.get("interests", "")
        if isinstance(interests, list):
            interests = ", ".join(interests)

        new_profile = Profile(
            user_id=current_user.id,
            bio=data.get("bio", ""),
            interests=interests,
            specialization=data.get("specialization", ""),
            level=data.get("level", "Beginner"),
            schedule=data.get("schedule", ""),
            profile_picture=profile_picture_path,
        )

        db.session.add(new_profile)
        db.session.commit()

        return jsonify({"message": "Profile created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("🔥 Create profile error:", str(e))
        return jsonify({"error": f"Failed to create profile: {str(e)}"}), 500