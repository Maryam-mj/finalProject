from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from models import Challenge

challenges_bp = Blueprint("challenges", __name__)

@challenges_bp.route("/", methods=["GET"])
@login_required
def challenges():
    """Get user's saved challenges"""
    challenges = Challenge.query.filter_by(user_id=current_user.id).all()
    return jsonify([
        {"id": c.id, "title": c.title, "progress": c.progress, "total": c.total, "xp": c.xp}
        for c in challenges
    ])