from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from flask_login import LoginManager
from extensions import db, bcrypt, mail
from datetime import timedelta
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.overview import overview_bp
from routes.buddies import buddies_bp
from routes.challenges import challenges_bp
from routes.activities import activities_bp
from routes.personalized_challenges import personalized_challenges_bp
import os
from dotenv import load_dotenv
from models import User

load_dotenv()

is_prod = os.getenv("FLASK_ENV") == "production"

def create_app():
    app = Flask(__name__)

    # ------------------ App Config ------------------
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'supersecretkey-dev-fallback')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///studybuddy.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ------------------ Session Cookie Config ------------------
    if is_prod:
        app.config.update(
            SESSION_COOKIE_SAMESITE="None",
            SESSION_COOKIE_SECURE=True,
            REMEMBER_COOKIE_SAMESITE="None",
            REMEMBER_COOKIE_SECURE=True,
            PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        )
    else:
        app.config.update(
            SESSION_COOKIE_SAMESITE="Lax",
            SESSION_COOKIE_SECURE=False,
            REMEMBER_COOKIE_SAMESITE="Lax",
            REMEMBER_COOKIE_SECURE=False,
            REMEMBER_COOKIE_DURATION=timedelta(days=30),
        )

    # ------------------ Mail Config ------------------
    app.config.update(
        MAIL_SERVER='smtp.gmail.com',
        MAIL_PORT=587,
        MAIL_USE_TLS=True,
        MAIL_USERNAME='systembuddy12@gmail.com',
        MAIL_PASSWORD='kxro cuww gxyx jtto',
        MAIL_DEFAULT_SENDER='studybuddy12@gmail.com'
    )

    # ------------------ Uploads Config ------------------
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), "uploads/profile_pics")
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

    # ------------------ Init Extensions ------------------
    db.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)

    # Initialize LoginManager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.session_protection = "strong"

    @login_manager.unauthorized_handler
    def unauthorized_callback():
        return jsonify({"error": "Unauthorized"}), 401

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # ------------------ CORS ------------------
    CORS(
        app,
        supports_credentials=True,
        origins=os.getenv('CORS_ORIGINS', "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000").split(','),
        methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
        max_age=86400,
    )

    # ------------------ DB Migrations ------------------
    Migrate(app, db)

    # ------------------ Routes ------------------
    @app.route("/")
    def index():
        return "Flask backend is running!"

    # Route to serve uploaded profile pictures
    @app.route('/uploads/profile_pics/<filename>')
    def uploaded_profile_pic(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Import and register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(buddies_bp, url_prefix='/api/buddies')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(overview_bp)
    app.register_blueprint(challenges_bp)
    app.register_blueprint(activities_bp)
    app.register_blueprint(personalized_challenges_bp, url_prefix='/api/challenges')

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=not is_prod, port=int(os.getenv('PORT', 5000)))