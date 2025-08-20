# routes/activities.py
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timedelta

activities_bp = Blueprint("activities", __name__)

# Example in-memory activity data (replace with DB queries later)
dummy_activities = [
    {
        "type": "study_session",
        "description": "Joined a study session on Data Structures",
        "timestamp": datetime.utcnow() - timedelta(hours=2)
    },
    {
        "type": "buddy_connected",
        "description": "Connected with Alice",
        "timestamp": datetime.utcnow() - timedelta(days=1)
    },
    {
        "type": "challenge_completed",
        "description": "Completed '30-Minute Coding Challenge'",
        "timestamp": datetime.utcnow() - timedelta(days=3)
    }
]

@activities_bp.route("/api/activities", methods=["GET"])
@login_required
def get_activities():
    """
    Returns a list of recent activities for the logged-in user.
    Later, replace dummy_activities with real database query filtering by current_user.id.
    """
    activities = []
    for act in dummy_activities:
        activities.append({
            "type": act["type"],
            "description": act["description"],
            "timestamp": act["timestamp"].isoformat()
        })

    return jsonify({
        "user": current_user.username,
        "activities": activities
    })
