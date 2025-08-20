from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from models import Profile
import random

personalized_challenges_bp = Blueprint("personalized_challenges", __name__)

@personalized_challenges_bp.route("/personalized", methods=["GET"])
@login_required
def personalized_challenges():
    """Get personalized challenges based on user interests and specialization"""
    try:
        # Get user's profile
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Extract interests and specialization
        interests = profile.interests or ""
        specialization = profile.specialization or ""
        
        # Generate personalized challenges
        challenges = generate_personalized_challenges(interests, specialization)
        
        return jsonify(challenges)
    except Exception as e:
        return jsonify({"error": "Failed to fetch challenges"}), 500

def generate_personalized_challenges(interests, specialization):
    """Generate personalized challenges based on user interests"""
    # Parse interests
    interests_list = [interest.strip().lower() for interest in interests.split(',')] if interests else []
    specialization = specialization.lower() if specialization else ""
    
    challenges = []
    challenge_id = 1
    
    # Programming challenges
    programming_keywords = ['programming', 'coding', 'python', 'javascript', 'java', 'web development', 
                          'software', 'developer', 'code', 'html', 'css', 'react', 'node', 'flask']
    
    if any(keyword in interests_list or keyword in specialization for keyword in programming_keywords):
        challenges.extend([
            {
                "id": f"prog-{challenge_id}",
                "title": "Build a REST API with Python Flask",
                "description": "Create a fully functional REST API with authentication and CRUD operations",
                "category": "Programming",
                "difficulty": "Intermediate",
                "duration": "5 days",
                "xp_reward": 200,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://flask.palletsprojects.com/",
                    "https://www.restapitutorial.com/"
                ]
            },
            {
                "id": f"prog-{challenge_id + 1}",
                "title": "Create a React Component Library",
                "description": "Build a reusable component library with Storybook documentation",
                "category": "Programming",
                "difficulty": "Advanced",
                "duration": "7 days",
                "xp_reward": 300,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://reactjs.org/docs/components-and-props.html",
                    "https://storybook.js.org/"
                ]
            }
        ])
        challenge_id += 2
    
    # Data science challenges
    ds_keywords = ['data science', 'machine learning', 'ai', 'analytics', 'data analysis', 
                  'statistics', 'python', 'r', 'sql', 'data visualization']
    
    if any(keyword in interests_list or keyword in specialization for keyword in ds_keywords):
        challenges.extend([
            {
                "id": f"ds-{challenge_id}",
                "title": "Build a Predictive Model",
                "description": "Create a machine learning model to predict housing prices",
                "category": "Data Science",
                "difficulty": "Intermediate",
                "duration": "5 days",
                "xp_reward": 250,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://scikit-learn.org/",
                    "https://pandas.pydata.org/"
                ]
            },
            {
                "id": f"ds-{challenge_id + 1}",
                "title": "Data Visualization Project",
                "description": "Create interactive visualizations for a complex dataset",
                "category": "Data Science",
                "difficulty": "Beginner",
                "duration": "3 days",
                "xp_reward": 150,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://matplotlib.org/",
                    "https://seaborn.pydata.org/"
                ]
            }
        ])
        challenge_id += 2
    
    # Design challenges
    design_keywords = ['design', 'ui', 'ux', 'graphic design', 'web design', 'user interface', 
                      'user experience', 'figma', 'adobe', 'photoshop']
    
    if any(keyword in interests_list or keyword in specialization for keyword in design_keywords):
        challenges.extend([
            {
                "id": f"design-{challenge_id}",
                "title": "Redesign a Popular Website",
                "description": "Choose a website and create an improved UI/UX design",
                "category": "Design",
                "difficulty": "Beginner",
                "duration": "3 days",
                "xp_reward": 150,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://www.figma.com/",
                    "https://www.interaction-design.org/literature/topics/ux-design"
                ]
            }
        ])
        challenge_id += 1
    
    # Language learning challenges
    language_keywords = ['language', 'english', 'spanish', 'french', 'german', 'japanese', 
                        'chinese', 'learning', 'linguistics']
    
    if any(keyword in interests_list or keyword in specialization for keyword in language_keywords):
        challenges.extend([
            {
                "id": f"lang-{challenge_id}",
                "title": "30-Day Language Challenge",
                "description": "Practice a new language for 30 minutes every day",
                "category": "Language",
                "difficulty": "Beginner",
                "duration": "30 days",
                "xp_reward": 300,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://www.duolingo.com/",
                    "https://www.memrise.com/"
                ]
            }
        ])
        challenge_id += 1
    
    # Add some general challenges if we don't have enough personalized ones
    if len(challenges) < 3:
        challenges.extend([
            {
                "id": f"gen-{challenge_id}",
                "title": "Learn a New Skill",
                "description": "Spend 30 minutes each day learning something completely new",
                "category": "Personal Development",
                "difficulty": "Beginner",
                "duration": "5 days",
                "xp_reward": 100,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://www.coursera.org/",
                    "https://www.khanacademy.org/"
                ]
            },
            {
                "id": f"gen-{challenge_id + 1}",
                "title": "Daily Reading Habit",
                "description": "Read for 20 minutes each day on any topic of interest",
                "category": "Personal Development",
                "difficulty": "Beginner",
                "duration": "5 days",
                "xp_reward": 80,
                "progress": random.randint(0, 100),
                "resources": [
                    "https://www.goodreads.com/",
                    "https://www.blinkist.com/"
                ]
            }
        ])
    
    return challenges