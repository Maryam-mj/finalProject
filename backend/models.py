from extensions import db, bcrypt  # Import bcrypt from extensions
from flask_login import UserMixin
from datetime import datetime
import json

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    avatar = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), 
                          onupdate=db.func.current_timestamp())
    last_login = db.Column(db.DateTime)

    # ✅ Add these two fields
    reset_code = db.Column(db.String(6), nullable=True)
    reset_code_expiry = db.Column(db.DateTime, nullable=True)

    # Relationships
    profile = db.relationship('Profile', backref='user', uselist=False, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy='dynamic')
    challenges = db.relationship('Challenge', backref='user', lazy='dynamic')
    
    sent_connections = db.relationship(
        'BuddyConnection', 
        foreign_keys='BuddyConnection.user_id',
        backref='initiator',
        lazy='dynamic'
    )
    received_connections = db.relationship(
        'BuddyConnection',
        foreign_keys='BuddyConnection.buddy_id',
        backref='buddy_user',
        lazy='dynamic'
    )

    def get_connections(self):
        from models import BuddyConnection
        return BuddyConnection.query.filter(
            ((BuddyConnection.user_id == self.id) | (BuddyConnection.buddy_id == self.id)) &
            (BuddyConnection.status == 'approved')
        ).all()
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

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
    

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # e.g., 'connection_request', 'message', 'challenge'
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    read = db.Column(db.Boolean, default=False)
    data = db.Column(db.Text)  # Store as JSON string
    
    # Relationship
    user = db.relationship('User', backref=db.backref('notifications', lazy=True))
    
    def __repr__(self):
        return f'<Notification {self.id} for User {self.user_id}>'
    
    # Helper method to get data as dict
    def get_data(self):
        if self.data:
            return json.loads(self.data)
        return {}
    
    # Helper method to set data
    def set_data(self, data_dict):
        self.data = json.dumps(data_dict)


class BuddyRelationship(db.Model):
    __tablename__ = 'buddy_relationships'
    
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user1 = db.relationship('User', foreign_keys=[user1_id], backref='initiated_buddies')
    user2 = db.relationship('User', foreign_keys=[user2_id], backref='received_buddies')
    
    @staticmethod
    def get_buddies(user_id):
        return BuddyRelationship.query.filter(
            ((BuddyRelationship.user1_id == user_id) | (BuddyRelationship.user2_id == user_id)) &
            (BuddyRelationship.status == 'accepted')
        ).all()

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - Use back_populates instead of backref
    user1 = db.relationship('User', foreign_keys=[user1_id])
    user2 = db.relationship('User', foreign_keys=[user2_id])
    messages = db.relationship('Message', 
                              back_populates='conversation',  # Changed to back_populates
                              lazy='dynamic', 
                              cascade='all, delete-orphan',
                              foreign_keys='Message.conversation_id')

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=True)
    
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read = db.Column(db.Boolean, default=False)
    message_type = db.Column(db.String(20), default='text')
    expires_at = db.Column(db.DateTime)
    
    # Relationships - Use back_populates instead of backref
    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])
    conversation = db.relationship('Conversation', back_populates='messages')  # Changed to back_populates