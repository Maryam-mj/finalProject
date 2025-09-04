from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import User, Notification, db
from sqlalchemy.exc import SQLAlchemyError
from datetime import timedelta
import json 

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

@notifications_bp.route("", methods=["GET"])
@login_required
def get_notifications():
    try:
        # Get parameters for filtering (optional)
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        unread_only = request.args.get('unread_only', False, type=bool)
        
        # Base query for user's notifications
        query = Notification.query.filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.timestamp.desc())
        
        # Filter by read status if requested
        if unread_only:
            query = query.filter(Notification.read == False)
        
        # Get paginated results
        notifications = query.offset(offset).limit(limit).all()
        
        # Format response
        response_data = []
        for notification in notifications:
            response_data.append({
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "timestamp": notification.timestamp.isoformat(),
                "read": notification.read,
                "data": notification.data
            })
        
        return jsonify(response_data)
        
    except SQLAlchemyError as e:
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve notifications",
            "message": str(e)
        }), 500

@notifications_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@login_required
def mark_notification_as_read(notification_id):
    try:
        # Find the notification
        notification = Notification.query.filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        ).first()
        
        if not notification:
            return jsonify({"error": "Notification not found"}), 404
        
        # Mark as read
        notification.read = True
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Notification marked as read"
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "error": "Database error occurred",
            "message": str(e)
        }), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to mark notification as read",
            "message": str(e)
        }), 500

@notifications_bp.route('/read-all', methods=['PATCH'])
@login_required
def mark_all_notifications_read():
    try:
        # Mark all notifications as read for current user
        Notification.query.filter_by(user_id=current_user.id, read=False).update(
            {'read': True}, synchronize_session=False
        )
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'All notifications marked as read'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@login_required
def mark_notification_read(notification_id):
    try:
        notification = Notification.query.filter_by(
            id=notification_id, 
            user_id=current_user.id
        ).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
            
        notification.read = True
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Notification marked as read'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500