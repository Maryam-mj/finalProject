from extensions import db 
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    avatar = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = db.relationship('Profile', backref='user', uselist=False, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy='dynamic')
    challenges = db.relationship('Challenge', backref='user', lazy='dynamic')
    
    # Buddy connections (both initiated and received)
    sent_connections = db.relationship('BuddyConnection', 
                                     foreign_keys='BuddyConnection.user_id',
                                     backref='initiator',
                                     lazy='dynamic')
    
    received_connections = db.relationship('BuddyConnection',
                                         foreign_keys='BuddyConnection.buddy_id',
                                         backref='buddy_user',
                                         lazy='dynamic')

    def get_connections(self):
        """Get all approved connections"""
        return BuddyConnection.query.filter(
            ((BuddyConnection.user_id == self.id) | (BuddyConnection.buddy_id == self.id)) &
            (BuddyConnection.status == 'approved')
        ).all()

    def __repr__(self):
        return f'<User {self.username}>'

class Profile(db.Model):
    __tablename__ = 'profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    bio = db.Column(db.Text)
    interests = db.Column(db.String(200))  # This field is needed for personalized challenges
    specialization = db.Column(db.String(100))  # This field is needed for personalized challenges
    level = db.Column(db.String(50), default='Beginner')
    schedule = db.Column(db.String(100))
    profile_picture = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Profile {self.user.username}>'

class BuddyConnection(db.Model):
    __tablename__ = 'buddy_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    buddy_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'buddy_id', name='unique_connection'),
    )

    def approve(self):
        self.status = 'approved'
        return self

    def reject(self):
        self.status = 'rejected'
        return self

    def __repr__(self):
        return f'<Connection {self.user_id}-{self.buddy_id}: {self.status}>'

class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text)
    xp = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Activity {self.action} by User {self.user_id}>'

class StudyGroup(db.Model):
    __tablename__ = 'study_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    members = db.Column(db.Integer, default=1)
    online = db.Column(db.Integer, default=0)
    avatar = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Add relationship for group members
    group_members = db.relationship('StudyGroupMember', backref='study_group', lazy='dynamic')

    def __repr__(self):
        return f'<StudyGroup {self.name}>'

class StudyGroupMember(db.Model):
    __tablename__ = 'study_group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('study_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    role = db.Column(db.String(20), default='member')  # member, admin
    
    __table_args__ = (
        db.UniqueConstraint('group_id', 'user_id', name='unique_group_member'),
    )

class Challenge(db.Model):
    __tablename__ = 'challenges'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    progress = db.Column(db.Integer, default=0)
    total = db.Column(db.Integer, default=100)
    xp = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')  # active, completed, abandoned
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def update_progress(self, new_progress):
        self.progress = new_progress
        if self.progress >= self.total:
            self.status = 'completed'
            self.completed_at = datetime.utcnow()
        return self

    def __repr__(self):
        return f'<Challenge {self.title} by User {self.user_id}>'