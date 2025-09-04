from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import User, BuddyConnection, Notification, Profile
from extensions import db
from sqlalchemy.orm import joinedload
from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_
from datetime import datetime
import json  

buddies_bp = Blueprint("buddies", __name__, url_prefix="/api/buddies")

def calculate_compatibility(profile1, profile2):
    """
    Calculate compatibility score between two profiles
    """
    score = 0
    max_score = 100
    
    # Check interests (40% of score)
    if profile1.interests and profile2.interests:
        # Handle both string and list formats for interests
        if isinstance(profile1.interests, str):
            interests1 = set([i.strip().lower() for i in profile1.interests.split(',')])
        else:
            interests1 = set([i.strip().lower() for i in profile1.interests])
            
        if isinstance(profile2.interests, str):
            interests2 = set([i.strip().lower() for i in profile2.interests.split(',')])
        else:
            interests2 = set([i.strip().lower() for i in profile2.interests])
        
        if interests1 and interests2:
            common_interests = interests1.intersection(interests2)
            interest_score = (len(common_interests) / max(len(interests1), len(interests2))) * 40
            score += interest_score
    elif not profile1.interests and not profile2.interests:
        # Both have no interests specified - give partial score
        score += 20
    
    # Check specialization (30% of score)
    if profile1.specialization and profile2.specialization:
        if profile1.specialization.lower() == profile2.specialization.lower():
            score += 30
    elif not profile1.specialization and not profile2.specialization:
        # Both have no specialization specified - give partial score
        score += 15
    
    # Check schedule (30% of score)
    if profile1.schedule and profile2.schedule:
        schedule1 = profile1.schedule.lower()
        schedule2 = profile2.schedule.lower()
        
        common_indicators = ["weekday", "weekend", "morning", "afternoon", "evening", "night"]
        matches = sum(1 for indicator in common_indicators if indicator in schedule1 and indicator in schedule2)
        
        schedule_score = (matches / len(common_indicators)) * 30
        score += schedule_score
    elif not profile1.schedule and not profile2.schedule:
        # Both have no schedule specified - give partial score
        score += 15
    
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
        if connection.status == "approved":
            return "connected"
        elif connection.user_id == user_id:
            return "request_sent"
        else:
            return "request_received"
    
    return "not_connected"

def create_connection_notification(sender_id, receiver_id):
    """
    Create a notification for a connection request
    """
    try:
        # Get sender's username
        sender = User.query.get(sender_id)
        if not sender:
            return None
            
        # Create notification - make sure Notification model is imported
        notification = Notification(
            user_id=receiver_id,
            type="connection_request",
            title="New Connection Request",
            message=f"{sender.username} wants to connect with you",
            timestamp=datetime.utcnow(),
            read=False
        )
        notification.set_data({
            "sender_id": sender_id,
            "sender_username": sender.username
        })
        
        db.session.add(notification)
        db.session.commit()
        
        return notification
        
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Error creating notification: {str(e)}")
        return None

@buddies_bp.route("/", methods=["GET"])
@login_required
def get_all_buddies():
    """
    Get all buddies (connected, pending, recommended) for the current user
    """
    try:
        # Get connected buddies
        connected_buddies = get_connected_buddies().get_json()
        
        # Get pending requests
        pending_requests = get_connection_requests().get_json()
        
        # Get recommended buddies
        recommended = get_recommended_buddies().get_json()
        
        return jsonify({
            "connected": connected_buddies,
            "pending_requests": pending_requests,
            "recommended": recommended
        })
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve buddies",
            "message": str(e)
        }), 500

@buddies_bp.route("/recommended", methods=["GET"])
@login_required
def get_recommended_buddies():
    """
    Get recommended study buddies with priority: specialization > interests > schedule
    """
    try:
        # Get current user's profile
        current_profile = current_user.profile
        if not current_profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Get all users except current user and existing connections
        existing_connections = BuddyConnection.query.filter(
            or_(
                BuddyConnection.user_id == current_user.id,
                BuddyConnection.buddy_id == current_user.id
            )
        ).all()
        
        # Get IDs of users we're already connected with or have pending requests with
        excluded_user_ids = {current_user.id}
        for conn in existing_connections:
            if conn.user_id == current_user.id:
                excluded_user_ids.add(conn.buddy_id)
            else:
                excluded_user_ids.add(conn.user_id)
        
        # Get all potential buddies (users with profiles, excluding current user and existing connections)
        potential_buddies = User.query.filter(
            User.id != current_user.id,
            User.id.notin_(excluded_user_ids),
            User.profile != None
        ).options(joinedload(User.profile)).all()
        
        # Categorize buddies by priority
        specialization_matches = []  # Highest priority
        interest_matches = []        # Medium priority
        schedule_matches = []        # Lower priority
        
        for user in potential_buddies:
            if user.profile:
                # Calculate compatibility score
                compatibility = calculate_compatibility(current_profile, user.profile)
                
                # Handle interests format
                interests = []
                if user.profile.interests:
                    if isinstance(user.profile.interests, str):
                        interests = [i.strip() for i in user.profile.interests.split(',')]
                    else:
                        interests = user.profile.interests
                
                buddy_data = {
                    "id": user.id,
                    "userId": user.id,
                    "username": user.username,
                    "email": user.email,
                    "avatar": user.avatar,
                    "specialization": user.profile.specialization,
                    "level": user.profile.level if user.profile.level else "Beginner",
                    "interests": interests,
                    "schedule": user.profile.schedule,
                    "compatibility": compatibility,
                    "connection_status": check_connection_status(current_user.id, user.id)
                }
                
                # Check for same specialization (highest priority)
                has_same_specialization = (
                    current_profile.specialization and 
                    user.profile.specialization and
                    current_profile.specialization.lower() == user.profile.specialization.lower()
                )
                
                # Check for common interests (medium priority)
                common_interests = False
                if current_profile.interests and user.profile.interests:
                    # Handle both string and list formats for interests
                    if isinstance(current_profile.interests, str):
                        current_interests = set([i.strip().lower() for i in current_profile.interests.split(',')])
                    else:
                        current_interests = set([i.strip().lower() for i in current_profile.interests])
                        
                    if isinstance(user.profile.interests, str):
                        buddy_interests = set([i.strip().lower() for i in user.profile.interests.split(',')])
                    else:
                        buddy_interests = set([i.strip().lower() for i in user.profile.interests])
                    
                    if current_interests and buddy_interests:
                        common_interests = len(current_interests.intersection(buddy_interests)) > 0
                
                # Check for similar schedule/timeline (lowest priority)
                similar_schedule = False
                if current_profile.schedule and user.profile.schedule:
                    schedule1 = current_profile.schedule.lower()
                    schedule2 = user.profile.schedule.lower()
                    
                    common_indicators = ["weekday", "weekend", "morning", "afternoon", "evening", "night"]
                    matches = sum(1 for indicator in common_indicators if indicator in schedule1 and indicator in schedule2)
                    
                    similar_schedule = matches > 0
                
                # Categorize based on priority
                if has_same_specialization:
                    specialization_matches.append(buddy_data)
                elif common_interests:
                    interest_matches.append(buddy_data)
                elif similar_schedule:
                    schedule_matches.append(buddy_data)
        
        # Sort each category by compatibility score (highest first)
        specialization_matches.sort(key=lambda x: x["compatibility"], reverse=True)
        interest_matches.sort(key=lambda x: x["compatibility"], reverse=True)
        schedule_matches.sort(key=lambda x: x["compatibility"], reverse=True)
        
        # Combine all categories in priority order
        recommended_list = specialization_matches + interest_matches + schedule_matches
        
        return jsonify(recommended_list)
        
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
    
@buddies_bp.route("/all", methods=["GET"])
@login_required
def get_all_potential_buddies():
    """
    Get all potential study buddies (all users with profiles except current user)
    """
    try:
        # Get all users except current user
        all_users = User.query.filter(
            User.id != current_user.id,
            User.profile != None
        ).options(joinedload(User.profile)).all()
        
        # Get existing connections to show status
        existing_connections = BuddyConnection.query.filter(
            or_(
                BuddyConnection.user_id == current_user.id,
                BuddyConnection.buddy_id == current_user.id
            )
        ).all()
        
        # Create a set of connected user IDs
        connected_user_ids = set()
        for conn in existing_connections:
            if conn.user_id == current_user.id:
                connected_user_ids.add(conn.buddy_id)
            else:
                connected_user_ids.add(conn.user_id)
        
        response_data = []
        
        for user in all_users:
            if user.profile:
                # Calculate compatibility with current user
                compatibility = calculate_compatibility(current_user.profile, user.profile) if current_user.profile else 0
                
                # Determine connection status
                connection_status = "not_connected"
                if user.id in connected_user_ids:
                    # Find the specific connection to check status
                    connection = next(
                        (conn for conn in existing_connections if 
                         (conn.user_id == current_user.id and conn.buddy_id == user.id) or
                         (conn.user_id == user.id and conn.buddy_id == current_user.id)),
                        None
                    )
                    if connection:
                        if connection.status == "approved":
                            connection_status = "connected"
                        elif connection.user_id == current_user.id:
                            connection_status = "request_sent"
                        else:
                            connection_status = "request_received"
                
                # Handle interests format
                interests = []
                if user.profile.interests:
                    if isinstance(user.profile.interests, str):
                        interests = [i.strip() for i in user.profile.interests.split(',')]
                    else:
                        interests = user.profile.interests
                
                response_data.append({
                    "id": user.id,
                    "userId": user.id,
                    "username": user.username,
                    "email": user.email,
                    "avatar": user.avatar,
                    "specialization": user.profile.specialization,
                    "level": user.profile.level if user.profile.level else "Beginner",
                    "interests": interests,
                    "schedule": user.profile.schedule,
                    "compatibility": compatibility,
                    "connection_status": connection_status
                })
        
        return jsonify(response_data)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve all buddies",
            "message": str(e)
        }), 500
        
@buddies_bp.route("/connect", methods=["POST"])
@login_required
def connect_buddy():
    try:
        data = request.get_json()
        buddy_id = data.get("buddy_id")
        
        if not buddy_id:
            return jsonify({"error": "buddy_id is required"}), 400
        
        # Find the buddy by ID
        buddy = User.query.get(buddy_id)
        
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
        
        # Create a notification for the receiver
        create_connection_notification(current_user.id, buddy.id)
        
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

@buddies_bp.route("/requests", methods=["GET"])
@login_required
def get_connection_requests():
    try:
        # Get pending connection requests where current user is the receiver
        requests = BuddyConnection.query.filter(
            BuddyConnection.buddy_id == current_user.id,
            BuddyConnection.status == "pending"
        ).all()
        
        response_data = []
        for req in requests:
            # Get the sender's details
            sender = User.query.get(req.user_id)
            if sender and sender.profile:
                response_data.append({
                    "id": req.id,
                    "user_id": sender.id,
                    "username": sender.username,
                    "avatar": sender.avatar,
                    "specialization": sender.profile.specialization,
                    "message": "Wants to connect with you",
                    "timestamp": req.created_at.isoformat() if req.created_at else datetime.utcnow().isoformat()
                })
        
        return jsonify(response_data)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve connection requests",
            "message": str(e)
        }), 500

@buddies_bp.route("/requests/<int:request_id>/accept", methods=["POST"])
@login_required
def accept_connection_request(request_id):
    try:
        # Find the connection request
        connection = BuddyConnection.query.filter(
            BuddyConnection.id == request_id,
            BuddyConnection.buddy_id == current_user.id,
            BuddyConnection.status == "pending"
        ).first()
        
        if not connection:
            return jsonify({"error": "Connection request not found"}), 404
        
        # Update the connection status to approved
        connection.status = "approved"
        
        # Create a notification for the sender
        notification = Notification(
            user_id=connection.user_id,
            type="connection_accepted",
            title="Connection Accepted",
            message=f"{current_user.username} accepted your connection request",
            timestamp=datetime.utcnow(),
            read=False
        )
        notification.set_data({"user_id": current_user.id})
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Connection request accepted"
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to accept connection request",
            "message": str(e)
        }), 500

@buddies_bp.route("/requests/<int:request_id>/decline", methods=["POST"])
@login_required
def decline_connection_request(request_id):
    try:
        # Find the connection request
        connection = BuddyConnection.query.filter(
            BuddyConnection.id == request_id,
            BuddyConnection.buddy_id == current_user.id,
            BuddyConnection.status == "pending"
        ).first()
        
        if not connection:
            return jsonify({"error": "Connection request not found"}), 404
        
        # Delete the connection request
        db.session.delete(connection)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Connection request declined"
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to decline connection request",
            "message": str(e)
        }), 500

@buddies_bp.route("/connected", methods=["GET"])
@login_required
def get_connected_buddies():
    try:
        # Get approved connections
        connections = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).all()
        
        response_data = []
        for conn in connections:
            # Determine which user is the buddy (not the current user)
            if conn.user_id == current_user.id:
                buddy_id = conn.buddy_id
            else:
                buddy_id = conn.user_id
            
            # Get the buddy's details
            buddy = User.query.get(buddy_id)
            if buddy and buddy.profile:
                # Calculate compatibility
                compatibility = calculate_compatibility(current_user.profile, buddy.profile) if current_user.profile else 0
                
                # Handle interests format
                interests = []
                if buddy.profile.interests:
                    if isinstance(buddy.profile.interests, str):
                        interests = [i.strip() for i in buddy.profile.interests.split(',')]
                    else:
                        interests = buddy.profile.interests
                
                response_data.append({
                    "id": buddy.id,
                    "userId": buddy.id,
                    "username": buddy.username,
                    "email": buddy.email,
                    "avatar": buddy.avatar,
                    "specialization": buddy.profile.specialization,
                    "level": buddy.profile.level if buddy.profile.level else "Beginner",
                    "interests": interests,
                    "schedule": buddy.profile.schedule,
                    "compatibility": compatibility,
                    "connection_status": "connected"
                })
        
        return jsonify(response_data)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve connected buddies",
            "message": str(e)
        }), 500