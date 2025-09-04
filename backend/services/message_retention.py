from models import Message, db
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError
import threading
import time

class MessageRetentionService:
    def __init__(self, app):
        self.app = app
        self.running = False
        self.thread = None
        
    def start(self):
        """Start the message retention service"""
        self.running = True
        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self):
        """Stop the message retention service"""
        self.running = False
        if self.thread:
            self.thread.join()
            
    def _run(self):
        """Main loop for message retention"""
        with self.app.app_context():
            while self.running:
                try:
                    self.cleanup_old_messages()
                    time.sleep(3600)  # Run every hour
                except Exception as e:
                    print(f"Error in message retention service: {e}")
                    time.sleep(300)  # Wait 5 minutes on error
    
    def cleanup_old_messages(self):
        """Delete messages older than retention period"""
        try:
            # Use app config or default to 30 days
            retention_days = self.app.config.get('MESSAGE_RETENTION_DAYS', 30)
            
            # Delete messages older than retention period
            retention_period = datetime.utcnow() - timedelta(days=retention_days)
            
            deleted_count = Message.query.filter(
                Message.timestamp < retention_period
            ).delete()
            
            db.session.commit()
            
            if deleted_count > 0:
                print(f"Deleted {deleted_count} old messages")
                
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"Error cleaning up old messages: {e}")
    
    def set_message_expiry(self, message_id, days=None):
        """Set expiration date for a specific message"""
        try:
            if days is None:
                days = self.app.config.get('MESSAGE_RETENTION_DAYS', 30)
                
            message = Message.query.get(message_id)
            if message:
                message.expires_at = datetime.utcnow() + timedelta(days=days)
                db.session.commit()
                return True
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"Error setting message expiry: {e}")
        return False