from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from models import User, BuddyConnection, Challenge, StudyGroup, Activity
from extensions import db, bcrypt
from sqlalchemy import func, and_, or_

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ---------------- Admin Login ----------------
@admin_bp.route('/login', methods=['POST', 'OPTIONS'])
def admin_login():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Find user and verify admin status
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Invalid admin credentials'}), 401
    
    if not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Login the admin user
    login_user(user)
    session.permanent = True  # Keep session persistent
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        }
    }), 200

# ---------------- Admin Logout ----------------
@admin_bp.route('/logout', methods=['POST', 'OPTIONS'])
@login_required
def admin_logout():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    logout_user()
    return jsonify({'message': 'Admin logged out successfully'}), 200

# ---------------- Check Admin Session ----------------
@admin_bp.route('/me', methods=['GET', 'OPTIONS'])
@login_required
def admin_me():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'is_admin': current_user.is_admin
    }), 200

# ---------------- Admin Dashboard Stats ----------------
@admin_bp.route('/stats', methods=['GET', 'OPTIONS'])
@login_required
def admin_stats():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get total users count
        total_users = User.query.count()
        
        # Get active buddies count (approved connections)
        active_buddies = BuddyConnection.query.filter_by(status='approved').count()
        
        # Get pending requests count
        pending_requests = BuddyConnection.query.filter_by(status='pending').count()
        
        # Get completed challenges count
        projects_completed = Challenge.query.filter_by(status='completed').count()
        
        return jsonify({
            'totalUsers': total_users,
            'activeBuddies': active_buddies,
            'pendingRequests': pending_requests,
            'projectsCompleted': projects_completed
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch stats'}), 500

# ---------------- Get All Users ----------------
@admin_bp.route('/users', methods=['GET', 'OPTIONS'])
@login_required
def get_all_users():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        users = User.query.all()
        users_data = []
        
        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            
            # Add profile data if exists
            if user.profile:
                user_data['profile'] = {
                    'specialization': user.profile.specialization,
                    'profile_picture': user.profile.profile_picture
                }
            
            users_data.append(user_data)
        
        return jsonify(users_data), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch users'}), 500

# ---------------- Get All Connection Requests ----------------
@admin_bp.route('/requests', methods=['GET', 'OPTIONS'])
@login_required
def get_all_requests():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        requests = BuddyConnection.query.all()
        requests_data = []
        
        for req in requests:
            # Get user details
            initiator = User.query.get(req.user_id)
            buddy = User.query.get(req.buddy_id)
            
            request_data = {
                'id': req.id,
                'user_id': req.user_id,
                'buddy_id': req.buddy_id,
                'status': req.status,
                'created_at': req.created_at.isoformat() if req.created_at else None
            }
            
            # Add user names if available
            if initiator:
                request_data['initiator'] = {
                    'username': initiator.username
                }
            
            if buddy:
                request_data['buddy_user'] = {
                    'username': buddy.username
                }
            
            requests_data.append(request_data)
        
        return jsonify(requests_data), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch requests'}), 500

# ---------------- Delete User ----------------
@admin_bp.route('/users/<int:user_id>', methods=['DELETE', 'OPTIONS'])
@login_required
def delete_user(user_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        user = User.query.get_or_404(user_id)
        
        # Prevent admin from deleting themselves
        if user.id == current_user.id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user'}), 500

# ---------------- Toggle User Status ----------------
@admin_bp.route('/users/<int:user_id>/status', methods=['PUT', 'OPTIONS'])
@login_required
def toggle_user_status(user_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['active', 'inactive']:
            return jsonify({'error': 'Invalid status'}), 400
        
        user = User.query.get_or_404(user_id)
        
        # Prevent admin from deactivating themselves
        if user.id == current_user.id and new_status == 'inactive':
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        user.is_active = (new_status == 'active')
        db.session.commit()
        
        return jsonify({'message': f'User status updated to {new_status}'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user status'}), 500

# ---------------- Approve Connection Request ----------------
@admin_bp.route('/approve-request/<int:request_id>', methods=['POST', 'OPTIONS'])
@login_required
def approve_request(request_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        connection = BuddyConnection.query.get_or_404(request_id)
        connection.status = 'approved'
        db.session.commit()
        
        return jsonify({'message': 'Request approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to approve request'}), 500

# ---------------- Reject Connection Request ----------------
@admin_bp.route('/reject-request/<int:request_id>', methods=['POST', 'OPTIONS'])
@login_required
def reject_request(request_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        connection = BuddyConnection.query.get_or_404(request_id)
        connection.status = 'rejected'
        db.session.commit()
        
        return jsonify({'message': 'Request rejected successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to reject request'}), 500