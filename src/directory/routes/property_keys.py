"""Property key routes for managing user property keys."""
import logging
from flask import jsonify

from models import PropertyKey

logger = logging.getLogger('remote-directory')


def register_property_key_routes(bp):
    """Register property key routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def list_property_keys():
        """GET /api/property-keys - List all property keys."""
        logger.info('[API] GET /api/property-keys')
        
        try:
            keys = PropertyKey.list_all()
            return jsonify(keys)
        except Exception as e:
            logger.error(f'[API] Error listing property keys: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500
    
    @bp.route('/standard', methods=['GET'])
    def list_standard_keys():
        """GET /api/property-keys/standard - List standard property keys."""
        logger.info('[API] GET /api/property-keys/standard')
        
        try:
            keys = PropertyKey.list_standard()
            return jsonify(keys)
        except Exception as e:
            logger.error(f'[API] Error listing standard keys: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500
