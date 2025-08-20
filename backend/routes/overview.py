from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import Activity, StudyGroup, Challenge, User, BuddyConnection, db
from sqlalchemy import or_, and_
import math

overview_bp = Blueprint("overview", __name__, url_prefix="/api/overview")

@overview_bp.route("", methods=["GET"])
@login_required
def overview():
    try:
        # Recent activities
        activities = Activity.query.filter_by(user_id=current_user.id)\
            .order_by(Activity.created_at.desc()).limit(5).all()
        recent_activity = [
            {
                "id": a.id, 
                "action": a.action, 
                "details": a.details,
                "xp": a.xp, 
                "time": a.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for a in activities
        ]

        # Study groups
        groups = StudyGroup.query.limit(3).all()
        study_groups = [
            {
                "id": g.id, 
                "name": g.name, 
                "members": g.members, 
                "online": g.online, 
                "avatar": g.avatar
            }
            for g in groups
        ]

        # Challenges
        challenges = Challenge.query.filter_by(user_id=current_user.id).limit(3).all()
        current_challenges = [
            {
                "id": c.id, 
                "title": c.title, 
                "progress": c.progress, 
                "total": c.total, 
                "xp": c.xp
            }
            for c in challenges
        ]

        # Buddy recommendations (limited to 3 for overview)
        recommended_buddies = get_recommended_buddies(limit=3)
        
        # Calculate user stats
        total_xp = sum(activity.xp for activity in current_user.activities)
        level = calculate_level(total_xp)
        streak = calculate_streak(current_user.activities)

        return jsonify({
            "recentActivity": recent_activity,
            "studyGroups": study_groups,
            "currentChallenges": current_challenges,
            "recommendedBuddies": recommended_buddies,
            "userStats": {
                "level": level,
                "xp": total_xp,
                "streak": streak,
                "nextLevelXp": (level ** 2) * 100  # Example formula for next level XP
            }
        })
        
    except Exception as e:
        return jsonify({
            "error": "Failed to load overview data",
            "message": str(e)
        }), 500

def get_recommended_buddies(limit=3):
    """Get recommended buddies for the current user"""
    try:
        current_user_profile = current_user.profile
        
        if not current_user_profile:
            return []
        
        # Find users with similar interests, specialization, or schedule
        recommended_users = User.query.filter(
            User.id != current_user.id,
            User.profile.has()
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
            BuddyConnection.id.is_(None)
        ).all()
        
        # Calculate compatibility and prepare response
        buddies = []
        for user in recommended_users:
            if not user.profile:
                continue
                
            compatibility = calculate_compatibility(current_user_profile, user.profile)
            
            buddies.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar": user.avatar,
                "specialization": user.profile.specialization,
                "level": user.profile.level or "Beginner",
                "compatibility": compatibility,
                "connection_status": check_connection_status(current_user.id, user.id)
            })
        
        # Sort by compatibility and limit
        buddies.sort(key=lambda x: x["compatibility"], reverse=True)
        return buddies[:limit]
        
    except Exception as e:
        print(f"Error getting recommended buddies: {e}")
        return []

def calculate_compatibility(profile1, profile2):
    """Calculate compatibility between two profiles"""
    score = 0
    
    # Check interests
    if profile1.interests and profile2.interests:
        interests1 = set([i.strip().lower() for i in profile1.interests.split(',')])
        interests2 = set([i.strip().lower() for i in profile2.interests.split(',')])
        
        if interests1 and interests2:
            common_interests = interests1.intersection(interests2)
            interest_score = (len(common_interests) / max(len(interests1), len(interests2))) * 40
            score += interest_score
    
    # Check specialization
    if profile1.specialization and profile2.specialization:
        if profile1.specialization.lower() == profile2.specialization.lower():
            score += 30
    
    # Check schedule
    if profile1.schedule and profile2.schedule:
        schedule1 = profile1.schedule.lower()
        schedule2 = profile2.schedule.lower()
        
        common_indicators = ["weekday", "weekend", "morning", "afternoon", "evening", "night"]
        matches = sum(1 for indicator in common_indicators if indicator in schedule1 and indicator in schedule2)
        
        schedule_score = (matches / len(common_indicators)) * 30
        score += schedule_score
    
    return min(round(score), 100)

def check_connection_status(user_id, buddy_id):
    """Check connection status between users"""
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

def calculate_level(xp):
    """Calculate level based on XP"""
    return math.floor(math.sqrt(xp / 100)) + 1 if xp > 0 else 1

def calculate_streak(activities):
    """Calculate current login/activity streak"""
    if not activities:
        return 0
    
    # Simple streak calculation - you might want to enhance this
    return min(3, len(activities) // 2)  # Placeholder logic