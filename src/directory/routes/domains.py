"""Domain management routes."""
import logging
from flask import request, jsonify, abort
from models import Domain, AuditLog

logger = logging.getLogger('remote-directory')


def get_audit_metadata():
    """Get audit metadata from request."""
    return {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', '')
    }


def register_domain_routes(bp):
    """Register domain routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def list_domains():
        """GET /api/domains - List all domains."""
        logger.info('[API] GET /api/domains')
        try:
            domains = Domain.list_all()
            return jsonify(domains)
        except Exception as e:
            logger.error(f'[API] Error listing domains: {str(e)}')
            abort(500)
    
    @bp.route('', methods=['POST'])
    def create_domain():
        """POST /api/domains - Create a new domain."""
        logger.info('[API] POST /api/domains')
        
        data = request.get_json()
        if not data or 'name' not in data:
            abort(400)
        
        # Validate name is not empty
        name = data['name'].strip() if data['name'] else ''
        if not name:
            return jsonify({'error': 'Domain name is required'}), 400
        
        try:
            # Uniqueness validation
            existing = Domain.get_by_name(name)
            if existing:
                return jsonify({'error': 'Domain name already exists'}), 409

            domain_id = Domain.create(
                name=name,
                description=data.get('description', ''),
                is_default=data.get('is_default', False)
            )
            domain = Domain.get(domain_id)
            AuditLog.log('domain', domain_id, 'created', 
                         changes={'name': name}, **get_audit_metadata())
            return jsonify(domain), 201
        except Exception as e:
            logger.error(f'[API] Error creating domain: {str(e)}')
            abort(500)
    
    @bp.route('/<domain_id>', methods=['GET'])
    def get_domain(domain_id):
        """GET /api/domains/<domain_id> - Get a domain by ID."""
        logger.info(f'[API] GET /api/domains/{domain_id}')
        
        domain = Domain.get(domain_id)
        if not domain:
            abort(404)
        
        return jsonify(domain)
    
    @bp.route('/<domain_id>', methods=['DELETE'])
    def delete_domain(domain_id):
        """DELETE /api/domains/<domain_id> - Delete a domain."""
        logger.info(f'[API] DELETE /api/domains/{domain_id}')
        
        try:
            Domain.delete(domain_id)
            AuditLog.log('domain', domain_id, 'deleted', **get_audit_metadata())
            return jsonify({'message': 'Domain deleted'}), 204
        except Exception as e:
            logger.error(f'[API] Error deleting domain: {str(e)}')
            abort(500)
