from models import Message, db
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_

class SimpleMessageStorage:
    def __init__(self, app):
        self.app = app
        
    def store_message(self, sender_id, receiver_id, content, message_type="text"):
        """Store message in SQL database with retention policies"""
        try:
            # Use app config or default values
            retention_days = self.app.config.get('MESSAGE_RETENTION_DAYS', 30)
            
            # Create new message with expiration
            message = Message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                timestamp=datetime.utcnow(),
                message_type=message_type,
                expires_at=datetime.utcnow() + timedelta(days=retention_days)
            )
            
            db.session.add(message)
            db.session.commit()
            
            # Check if we need to cleanup old messages for this conversation
            self._check_conversation_size(sender_id, receiver_id)
            
            return message.id
            
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"Error storing message: {e}")
            return None
    
    def get_recent_messages(self, user1_id, user2_id, limit=50):
        """Get recent messages from SQL database"""
        try:
            messages = Message.query.filter(
                or_(
                    and_(
                        Message.sender_id == user1_id,
                        Message.receiver_id == user2_id
                    ),
                    and_(
                        Message.sender_id == user2_id,
                        Message.receiver_id == user1_id
                    )
                )
            ).order_by(Message.timestamp.desc()).limit(limit).all()
            
            formatted_messages = []
            for message in messages:
                formatted_messages.append({
                    "id": message.id,
                    "senderId": message.sender_id,
                    "receiverId": message.receiver_id,
                    "content": message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "type": message.message_type,
                    "read": message.read
                })
            
            return formatted_messages
            
        except Exception as e:
            print(f"Error getting messages from database: {e}")
            return []
    
    def _check_conversation_size(self, user1_id, user2_id):
        """Check if conversation has too many messages and cleanup if needed"""
        try:
            max_messages = self.app.config.get('MAX_MESSAGES_PER_CONVERSATION', 1000)
            
            message_count = Message.query.filter(
                or_(
                    and_(
                        Message.sender_id == user1_id,
                        Message.receiver_id == user2_id
                    ),
                    and_(
                        Message.sender_id == user2_id,
                        Message.receiver_id == user1_id
                    )
                )
            ).count()
            
            # If more than MAX_MESSAGES_PER_CONVERSATION, delete oldest 100
            if message_count > max_messages:
                oldest_messages = Message.query.filter(
                    or_(
                        and_(
                            Message.sender_id == user1_id,
                            Message.receiver_id == user2_id
                        ),
                        and_(
                            Message.sender_id == user2_id,
                            Message.receiver_id == user1_id
                        )
                    )
                ).order_by(Message.timestamp.asc()).limit(100).all()
                
                for msg in oldest_messages:
                    db.session.delete(msg)
                
                db.session.commit()
                print(f"Cleaned up 100 old messages from conversation {user1_id}-{user2_id}")
                
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"Error cleaning up conversation: {e}")