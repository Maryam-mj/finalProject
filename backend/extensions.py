from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail

db = SQLAlchemy()
bcrypt = Bcrypt()
mail = Mail()

__all__ = ["User", "Profile", "BuddyConnection", "Activity", "StudyGroup", "StudyGroupMember", "Challenge"]