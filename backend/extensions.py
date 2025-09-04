from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail
from flask_migrate import Migrate
from flask_login import LoginManager


db = SQLAlchemy()
bcrypt = Bcrypt()
mail = Mail()
migrate = Migrate()
login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Export models
__all__ = ["User", "Profile", "BuddyConnection", "Activity", "StudyGroup", "StudyGroupMember", "Challenge"]