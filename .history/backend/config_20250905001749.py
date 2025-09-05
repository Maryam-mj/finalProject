import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey-dev-fallback")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///studybuddy.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Sessions
    SESSION_COOKIE_NAME = "studybuddy"  # <-- FIXED to match frontend/browser
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_PATH = "/"
    SESSION_COOKIE_SAMESITE = "None"  # Allow cross-origin cookies
    SESSION_COOKIE_SECURE = False      # Set to True if using HTTPS
    PERMANENT_SESSION_LIFETIME = int(os.getenv("SESSION_LIFETIME_DAYS", 7)) * 86400
    SESSION_REFRESH_EACH_REQUEST = True

    # Messages
    MESSAGE_RETENTION_DAYS = int(os.getenv("MESSAGE_RETENTION_DAYS", 30))
    MESSAGES_PER_PAGE = int(os.getenv("MESSAGES_PER_PAGE", 50))
    MAX_MESSAGES_PER_CONVERSATION = int(os.getenv("MAX_MESSAGES_PER_CONVERSATION", 5000))

    # Mail (✅ pulled from env)
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME =  "systembuddy12@gmail.com"
    MAIL_PASSWORD =  "kxro cuww gxyx jtto"
    MAIL_DEFAULT_SENDER = "systembuddy12@gmail.com"

    # Admin
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "mariamaliabdi12@gmail.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "may123")

    # Uploads
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads/profile_pics")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB