from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import Challenge
from extensions import db

challenges_bp = Blueprint("challenges", __name__)

@challenges_bp.route("/", methods=["GET"])
@login_required
def get_challenges():
    challenges = Challenge.query.filter_by(user_id=current_user.id).all()
    return jsonify({
        "success": True,
        "challenges": [
            {"id": c.id, "title": c.title, "progress": c.progress, "total": c.total, "xp": c.xp}
            for c in challenges
        ]
    })

@challenges_bp.route("/", methods=["POST"])
@login_required
def create_challenge():
    data = request.get_json()
    challenge = Challenge(
        title=data.get("description"),
        user_id=current_user.id,
        progress=0,
        total=1,
        xp=10
    )
    db.session.add(challenge)
    db.session.commit()

    return jsonify({"success": True, "message": "Challenge created!"}), 201
