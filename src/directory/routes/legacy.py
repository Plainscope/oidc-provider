"""Legacy endpoints for backward compatibility."""
import logging
from flask import request, jsonify, abort
import bcrypt
from models import User

logger = logging.getLogger('remote-directory')


def exclude_password(user_dict):
    """Remove password from user dict."""
    if isinstance(user_dict, dict):
        user_dict.pop('password', None)
    return user_dict


def register_legacy_routes(bp):
    """Register legacy routes to blueprint."""
    
    @bp.route('/count', methods=['GET'])
    def get_user_count():
        """GET /count - Get total user count."""
        logger.info('[API] GET /count')
        
        try:
            users = User.list_all()
            return jsonify({'count': len(users)})
        except Exception as e:
            logger.error(f'[API] Error getting user count: {str(e)}')
            abort(500)
    
    @bp.route('/find/<user_id>', methods=['GET'])
    def find_user(user_id):
        """GET /find/<user_id> - Find user by ID."""
        logger.info(f'[API] GET /find/{user_id}')
        
        try:
            user = User.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify(exclude_password(user))
        except Exception as e:
            logger.error(f'[API] Error finding user: {str(e)}')
            abort(500)
    
    @bp.route('/validate', methods=['POST'])
    def validate_credentials():
        """POST /validate - Validate user credentials by email and password."""
        logger.info('[API] POST /validate')
        
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        try:
            user = User.get_by_email(email)
            if not user:
                return jsonify({'valid': False}), 200
            
            stored_password = user.get('password', '')
            # Backward compatibility: plain match OR bcrypt check
            valid = (stored_password == password) or (
                stored_password.startswith('$2') and bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
            )
            # If valid and stored is plain, rehash on first use
            if valid and not stored_password.startswith('$2'):
                new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                try:
                    User.update(user['id'], password=new_hash)
                except Exception:
                    logger.warning('[API] Failed to rehash password during migration')
            
            response = {'valid': valid}
            if valid:
                response['user'] = exclude_password(user)
            
            return jsonify(response)
        except Exception as e:
            logger.error(f'[API] Error validating credentials: {str(e)}')
            abort(500)
    
    @bp.route('/healthz', methods=['GET'])
    def health_check():
        """GET /healthz - Health check endpoint."""
        logger.info('[API] GET /healthz')
        
        try:
            users = User.list_all()
            return jsonify({
                'status': 'healthy',
                'user_count': len(users)
            })
        except Exception as e:
            logger.error(f'[API] Health check failed: {str(e)}')
            return jsonify({
                'status': 'unhealthy',
                'error': str(e)
            }), 500
