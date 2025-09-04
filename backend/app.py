# app.py
from flask import Flask, request, jsonify, send_from_directory, session
from flask_mail import Mail
from flask_cors import CORS
from flask_migrate import Migrate
from flask_login import LoginManager, current_user
from datetime import timedelta
from extensions import db, bcrypt
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.overview import overview_bp
from routes.buddies import buddies_bp
from routes.challenges import challenges_bp
from routes.activities import activities_bp
from routes.notifications import notifications_bp
from routes.personalized_challenges import personalized_challenges_bp
from routes.chat import chat_bp
from routes.admin import admin_bp
from services.message_retention import MessageRetentionService
from services.message_storage import SimpleMessageStorage
from models import User
from config import Config
import os

mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ---------------- Database Path Fix ----------------
    db_path = os.path.join(os.getcwd(), "instance", "studybuddy.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URI", f"sqlite:///{db_path}"
    )

    # ---------------- Init Extensions ----------------
    db.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)
    Migrate(app, db)

    # ---------------- CORS ----------------
    CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    methods=["GET","POST","PUT","DELETE","OPTIONS","PATCH"],
    allow_headers=["Content-Type","Authorization","Cookie"],
    expose_headers=["Content-Type","Set-Cookie"],
)


    # ---------------- Login Manager ----------------
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # ---------------- Background Services ----------------
    with app.app_context():
        app.message_retention_service = MessageRetentionService(app)
        app.message_retention_service.start()
        app.message_storage = SimpleMessageStorage(app)

        # ✅ Ensure admin user exists safely - MOVED INSIDE APP CONTEXT
        try:
            admin_email = Config.ADMIN_EMAIL
            admin_password = Config.ADMIN_PASSWORD
            if admin_email and admin_password:
                admin_user = User.query.filter_by(email=admin_email).first()
                if not admin_user:
                    hashed_pw = bcrypt.generate_password_hash(admin_password).decode("utf-8")
                    admin_user = User(
                        username="Admin",
                        email=admin_email,
                        password_hash=hashed_pw,
                        is_admin=True,
                    )
                    db.session.add(admin_user)
                    db.session.commit()
                    print("✅ Admin user created successfully")
                else:
                    # Update password if it's different
                    if not admin_user.check_password(admin_password):
                        admin_user.password_hash = bcrypt.generate_password_hash(admin_password).decode("utf-8")
                        db.session.commit()
                        print("✅ Admin password updated")
        except Exception as e:
            # Skip if tables don't exist yet (first migration)
            print("⚠️ Skipping admin creation until DB is ready:", e)

    # ---------------- Routes ----------------
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(buddies_bp, url_prefix="/api/buddies")
    app.register_blueprint(challenges_bp, url_prefix="/api")
    app.register_blueprint(overview_bp, url_prefix="/api")
    app.register_blueprint(activities_bp, url_prefix="/api/activities")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(personalized_challenges_bp, url_prefix="/api/challenges")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    

    # ---------------- Utility Routes ----------------
    @app.route("/")
    def index():
        return "Flask backend is running!"

    @app.route("/uploads/profile_pics/<filename>")
    def uploaded_profile_pic(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/health")
    def health_check():
        return jsonify(
            {"status": "healthy", "env": os.getenv("FLASK_ENV", "development")}
        )

     
    # ---------------- Error Handlers ----------------
    @app.errorhandler(401)
    def handle_unauthorized(error):
        return (
            jsonify(
                {
                    "error": "Authentication required",
                    "message": "Your session has expired. Please login again.",
                }
            ),
            401,
        )

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(415)
    def unsupported_media_type(error):
        return jsonify({"error": "Unsupported media type. Please use multipart/form-data for file uploads or application/json for data only."}), 415

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app

    


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))