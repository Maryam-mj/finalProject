# routes/__init__.py
from .auth import auth_bp
from .profile import profile_bp
from .overview import overview_bp
from .buddies import buddies_bp
from .challenges import challenges_bp
from .activities import activities_bp
from .personalized_challenges import personalized_challenges_bp

__all__ = [
    'auth_bp',
    'profile_bp', 
    'overview_bp',
    'buddies_bp',
    'challenges_bp',
    'activities_bp',
    'personalized_challenges_bp'
]