"""Audit logging routes."""
import logging
from flask import request, jsonify, abort
from models import AuditLog

logger = logging.getLogger('remote-directory')


def register_audit_routes(bp):
    """Register audit routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def get_audit_logs():
        """GET /api/audit - Get audit logs with optional filtering."""
        logger.info('[API] GET /api/audit')
        
        entity_type = request.args.get('entity_type')
        entity_id = request.args.get('entity_id')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        try:
            if entity_type and entity_id:
                logs = AuditLog.get_for_entity(entity_type, entity_id, limit)
            else:
                logs = AuditLog.get_all(limit, offset)
            
            return jsonify(logs)
        except Exception as e:
            logger.error(f'[API] Error getting audit logs: {str(e)}')
            abort(500)
