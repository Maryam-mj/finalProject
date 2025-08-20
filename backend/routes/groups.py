from flask import Blueprint, jsonify
from flask_login import login_required
from models import StudyGroup

groups_bp = Blueprint("dashboard_groups", __name__, url_prefix="/groups")

@groups_bp.route("", methods=["GET"])
@login_required
def groups():
    groups = StudyGroup.query.all()
    return jsonify([
        {"id": g.id, "name": g.name, "members": g.members, "online": g.online, "avatar": g.avatar}
        for g in groups
    ])
