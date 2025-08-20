from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import User, BuddyConnection, db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_

buddies_bp = Blueprint("buddies", __name__, url_prefix="/api/buddies")

@buddies_bp.route("/recommended", methods=["GET"])
@login_required
def recommended_buddies():
    try:
        # Get current user's profile information
        current_user_profile = current_user.profile
        
        if not current_user_profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Get parameters for filtering (optional)
        limit = request.args.get('limit', 10, type=int)
        min_compatibility = request.args.get('min_compatibility', 50, type=int)
        
        # Find users who have signed up and have profiles
        recommended_users = User.query.filter(
            User.id != current_user.id,  # Exclude current user
            User.profile.has()  # Only users with profiles (signed up)
        ).outerjoin(
            BuddyConnection, 
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == User.id
                ),
                and_(
                    BuddyConnection.user_id == User.id,
                    BuddyConnection.buddy_id == current_user.id
                )
            )
        ).filter(
            BuddyConnection.id.is_(None)  # Exclude already connected users
        ).all()
        
        # Calculate compatibility score for each user
        buddies_with_compatibility = []
        for user in recommended_users:
            if not user.profile:
                continue
                
            compatibility = calculate_compatibility(current_user_profile, user.profile)
            
            if compatibility >= min_compatibility:
                buddies_with_compatibility.append({
                    "user": user,
                    "compatibility": compatibility
                })
        
        # Sort by compatibility (highest first) and limit results
        buddies_with_compatibility.sort(key=lambda x: x["compatibility"], reverse=True)
        top_buddies = buddies_with_compatibility[:limit]
        
        # Format response
        response_data = []
        for buddy in top_buddies:
            user = buddy["user"]
            profile = user.profile
            
            response_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar": user.avatar,
                "specialization": profile.specialization if profile else None,
                "level": profile.level if profile else "Beginner",
                "compatibility": buddy["compatibility"],
                "connection_status": check_connection_status(current_user.id, user.id)
            })
        
        return jsonify(response_data)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve recommended buddies",
            "message": str(e)
        }), 500

@buddies_bp.route("/connect", methods=["POST"])
@login_required
def connect_buddy():
    try:
        data = request.get_json()
        buddy_id = data.get("buddy_id")
        buddy_email = data.get("buddy_email")
        
        if not buddy_id and not buddy_email:
            return jsonify({"error": "Either buddy_id or buddy_email is required"}), 400
        
        # Find the buddy by ID or email
        if buddy_id:
            buddy = User.query.get(buddy_id)
        else:
            buddy = User.query.filter_by(email=buddy_email).first()
        
        if not buddy:
            return jsonify({"error": "User not found"}), 404
        
        if buddy.id == current_user.id:
            return jsonify({"error": "Cannot connect with yourself"}), 400
        
        # Check if connection already exists
        existing_connection = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == buddy.id
                ),
                and_(
                    BuddyConnection.user_id == buddy.id,
                    BuddyConnection.buddy_id == current_user.id
                )
            )
        ).first()
        
        if existing_connection:
            return jsonify({"error": "Connection already exists"}), 400
        
        # Create a new connection (pending status)
        new_connection = BuddyConnection(
            user_id=current_user.id,
            buddy_id=buddy.id,
            status="pending"
        )
        
        db.session.add(new_connection)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Connection request sent successfully"
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to send connection request",
            "message": str(e)
        }), 500

def calculate_compatibility(profile1, profile2):
    """
    Calculate compatibility score between two profiles
    """
    score = 0
    max_score = 100
    
    # Check interests (40% of score)
    if profile1.interests and profile2.interests:
        interests1 = set([i.strip().lower() for i in profile1.interests.split(',')])
        interests2 = set([i.strip().lower() for i in profile2.interests.split(',')])
        
        if interests1 and interests2:
            common_interests = interests1.intersection(interests2)
            interest_score = (len(common_interests) / max(len(interests1), len(interests2))) * 40
            score += interest_score
    
    # Check specialization (30% of score)
    if profile1.specialization and profile2.specialization:
        if profile1.specialization.lower() == profile2.specialization.lower():
            score += 30
    
    # Check schedule (30% of score)
    if profile1.schedule and profile2.schedule:
        schedule1 = profile1.schedule.lower()
        schedule2 = profile2.schedule.lower()
        
        common_indicators = ["weekday", "weekend", "morning", "afternoon", "evening", "night"]
        matches = sum(1 for indicator in common_indicators if indicator in schedule1 and indicator in schedule2)
        
        schedule_score = (matches / len(common_indicators)) * 30
        score += schedule_score
    
    return min(round(score), 100)

def check_connection_status(user_id, buddy_id):
    """
    Check the connection status between two users
    """
    connection = BuddyConnection.query.filter(
        or_(
            and_(
                BuddyConnection.user_id == user_id,
                BuddyConnection.buddy_id == buddy_id
            ),
            and_(
                BuddyConnection.user_id == buddy_id,
                BuddyConnection.buddy_id == user_id
            )
        )
    ).first()
    
    if connection:
        if connection.status == "accepted":
            return "connected"
        elif connection.user_id == user_id:
            return "request_sent"
        else:
            return "request_received"
    
    return "not_connected"