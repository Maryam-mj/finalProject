from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import User, BuddyConnection, Message, Notification
from extensions import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from config import Config

chat_bp = Blueprint("chat", __name__, url_prefix="/chat")

@chat_bp.route("/messages/<int:buddy_id>", methods=["GET"])
@login_required
def get_messages(buddy_id):
    try:
        # Check if users are connected
        connection = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == buddy_id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.user_id == buddy_id,
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).first()
        
        if not connection:
            return jsonify({"error": "You are not connected with this user"}), 403
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', getattr(Config, 'MESSAGES_PER_PAGE', 50), type=int)
        
        # Get messages with pagination
        messages = Message.query.filter(
            or_(
                and_(
                    Message.sender_id == current_user.id,
                    Message.receiver_id == buddy_id
                ),
                and_(
                    Message.sender_id == buddy_id,
                    Message.receiver_id == current_user.id
                )
            )
        ).order_by(Message.timestamp.desc()).paginate(
            page=page, 
            per_page=limit, 
            error_out=False
        )
        
        # Format response
        response_data = []
        for message in messages.items:
            response_data.append({
                "id": message.id,
                "senderId": message.sender_id,
                "receiverId": message.receiver_id,
                "content": message.content,
                "timestamp": message.timestamp.isoformat(),
                "read": message.read,
                "type": message.message_type
            })
        
        # Mark messages as read
        Message.query.filter(
            Message.sender_id == buddy_id,
            Message.receiver_id == current_user.id,
            Message.read == False
        ).update({Message.read: True})
        db.session.commit()
        
        return jsonify({
            "messages": response_data,
            "has_next": messages.has_next,
            "has_prev": messages.has_prev,
            "page": messages.page,
            "pages": messages.pages,
            "total": messages.total
        })
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve messages",
            "message": str(e)
        }), 500

@chat_bp.route("/send/<int:buddy_id>", methods=["POST"])
@login_required
def send_message(buddy_id):
    try:
        print(f"DEBUG: Received POST request to /chat/send/{buddy_id}")
        print(f"DEBUG: Headers: {dict(request.headers)}")
        print(f"DEBUG: Method: {request.method}")
        
        data = request.get_json()
        print(f"DEBUG: Request data: {data}")
        
        content = data.get("content")
        message_type = data.get("type", "text")
        
        if not content or not content.strip():
            print("DEBUG: Empty content error")
            return jsonify({"error": "Message content is required"}), 400
        
        # Check if users are connected
        connection = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == buddy_id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.user_id == buddy_id,
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).first()
        
        if not connection:
            print("DEBUG: Users not connected error")
            return jsonify({"error": "You are not connected with this user"}), 403
        
        # Check message length
        if len(content) > 1000:
            print("DEBUG: Message too long error")
            return jsonify({"error": "Message too long. Maximum 1000 characters allowed."}), 400
        
        print("DEBUG: Creating message object...")
        # Create new message with expiration (use default if config not available)
        retention_days = getattr(Config, 'MESSAGE_RETENTION_DAYS', 30)
        message = Message(
            sender_id=current_user.id,
            receiver_id=buddy_id,
            content=content.strip(),
            timestamp=datetime.utcnow(),
            read=False,
            message_type=message_type,
            expires_at=datetime.utcnow() + timedelta(days=retention_days)
        )
        
        print("DEBUG: Adding message to session...")
        db.session.add(message)
        
        # Create notification for the receiver
        print("DEBUG: Creating notification...")
        notification = Notification(
            user_id=buddy_id,
            type="message",
            title="New Message",
            message=f"{current_user.username} sent you a message",
            timestamp=datetime.utcnow(),
            read=False
        )
        notification.set_data({
            "sender_id": current_user.id,
            "message_id": message.id
        })
        db.session.add(notification)
        
        print("DEBUG: Committing to database...")
        db.session.commit()
        print("DEBUG: Commit successful!")
        
        # Check if we need to cleanup old messages for this conversation
        _check_conversation_size(current_user.id, buddy_id)
        
        return jsonify({
            "success": True,
            "message": "Message sent successfully",
            "message_id": message.id
        })
        
    except SQLAlchemyError as e:
        print(f"DEBUG: SQLAlchemy Error: {str(e)}")
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        print(f"DEBUG: General Exception: {str(e)}")
        print(f"DEBUG: Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()  # This will print the full traceback
        return jsonify({
            "error": "Failed to send message",
            "message": str(e)
        }), 500
    
@chat_bp.route("/conversations", methods=["GET"])
@login_required
def get_conversations():
    try:
        # Get all connected buddies
        connections = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).all()
        
        conversations = []
        for conn in connections:
            # Determine which user is the buddy
            if conn.user_id == current_user.id:
                buddy_id = conn.buddy_id
            else:
                buddy_id = conn.user_id
            
            # Get buddy details
            buddy = User.query.get(buddy_id)
            if not buddy or not buddy.profile:
                continue
            
            # Get last message
            last_message = Message.query.filter(
                or_(
                    and_(
                        Message.sender_id == current_user.id,
                        Message.receiver_id == buddy_id
                    ),
                    and_(
                        Message.sender_id == buddy_id,
                        Message.receiver_id == current_user.id
                    )
                )
            ).order_by(Message.timestamp.desc()).first()
            
            # Count unread messages
            unread_count = Message.query.filter(
                Message.sender_id == buddy_id,
                Message.receiver_id == current_user.id,
                Message.read == False
            ).count()
            
            conversations.append({
                "id": buddy.id,
                "userId": buddy.id,
                "username": buddy.username,
                "avatar": buddy.avatar,
                "specialization": buddy.profile.specialization,
                "last_message": last_message.content if last_message else None,
                "last_message_time": last_message.timestamp.isoformat() if last_message else None,
                "unread_count": unread_count
            })
        
        # Sort by last message time
        conversations.sort(key=lambda x: x["last_message_time"] or "", reverse=True)
        
        return jsonify(conversations)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve conversations",
            "message": str(e)
        }), 500

@chat_bp.route("/attach-note/<int:buddy_id>", methods=["POST"])
@login_required
def attach_note(buddy_id):
    try:
        data = request.get_json()
        note_content = data.get("content")
        
        if not note_content or not note_content.strip():
            return jsonify({"error": "Note content is required"}), 400
        
        # Check if users are connected
        connection = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == buddy_id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.user_id == buddy_id,
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).first()
        
        if not connection:
            return jsonify({"error": "You are not connected with this user"}), 403
        
        # Create note message with expiration (use default if config not available)
        retention_days = getattr(Config, 'MESSAGE_RETENTION_DAYS', 30)
        message = Message(
            sender_id=current_user.id,
            receiver_id=buddy_id,
            content=f"📝 Note: {note_content.strip()}",
            timestamp=datetime.utcnow(),
            read=False,
            message_type="note",
            expires_at=datetime.utcnow() + timedelta(days=retention_days)
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Note attached successfully",
            "message_id": message.id
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to attach note",
            "message": str(e)
        }), 500

@chat_bp.route("/send-challenge/<int:buddy_id>", methods=["POST"])
@login_required
def send_challenge(buddy_id):
    try:
        data = request.get_json()
        challenge_title = data.get("title")
        challenge_description = data.get("description")
        
        if not challenge_title or not challenge_title.strip():
            return jsonify({"error": "Challenge title is required"}), 400
        
        # Check if users are connected
        connection = BuddyConnection.query.filter(
            or_(
                and_(
                    BuddyConnection.user_id == current_user.id,
                    BuddyConnection.buddy_id == buddy_id,
                    BuddyConnection.status == "approved"
                ),
                and_(
                    BuddyConnection.user_id == buddy_id,
                    BuddyConnection.buddy_id == current_user.id,
                    BuddyConnection.status == "approved"
                )
            )
        ).first()
        
        if not connection:
            return jsonify({"error": "You are not connected with this user"}), 403
        
        # Create challenge message with expiration (use default if config not available)
        retention_days = getattr(Config, 'MESSAGE_RETENTION_DAYS', 30)
        description = f" - {challenge_description}" if challenge_description else ""
        message = Message(
            sender_id=current_user.id,
            receiver_id=buddy_id,
            content=f"🏆 Challenge: {challenge_title.strip()}{description}",
            timestamp=datetime.utcnow(),
            read=False,
            message_type="challenge",
            expires_at=datetime.utcnow() + timedelta(days=retention_days)
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Challenge sent successfully",
            "message_id": message.id
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to send challenge",
            "message": str(e)
        }), 500

def _check_conversation_size(user1_id, user2_id):
    """Check if conversation has too many messages and cleanup if needed"""
    try:
        max_messages = getattr(Config, 'MAX_MESSAGES_PER_CONVERSATION', 1000)
        
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