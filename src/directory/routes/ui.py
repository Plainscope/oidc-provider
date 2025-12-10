"""UI routes for the web dashboard."""
import logging
from flask import render_template_string

logger = logging.getLogger('remote-directory')

# UI HTML Template
UI_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remote Directory - User Management</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
</head>
<body class="bg-gray-50">
    <div x-data="app()" class="min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-gray-900">Remote Directory</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <button @click="currentTab = 'users'" :class="currentTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'" class="px-4 py-2 font-medium">Users</button>
                        <button @click="currentTab = 'roles'" :class="currentTab === 'roles' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'" class="px-4 py-2 font-medium">Roles</button>
                        <button @click="currentTab = 'groups'" :class="currentTab === 'groups' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'" class="px-4 py-2 font-medium">Groups</button>
                        <button @click="currentTab = 'domains'" :class="currentTab === 'domains' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'" class="px-4 py-2 font-medium">Domains</button>
                        <button @click="currentTab = 'audit'" :class="currentTab === 'audit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'" class="px-4 py-2 font-medium">Audit</button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Users Tab -->
            <div x-show="currentTab === 'users'" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-900">Users</h2>
                    <button @click="showCreateUserForm = true" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Add User</button>
                </div>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Display Name</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <template x-for="user in users" :key="user.id">
                                <tr>
                                    <td class="px-6 py-4 text-sm text-gray-900" x-text="user.username"></td>
                                    <td class="px-6 py-4 text-sm text-gray-900" x-text="user.display_name"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        <template x-if="user.emails && user.emails.length > 0">
                                            <span x-text="user.emails[0].email"></span>
                                        </template>
                                    </td>
                                    <td class="px-6 py-4 text-sm">
                                        <span x-show="user.is_active" class="px-2 py-1 bg-green-100 text-green-800 rounded">Active</span>
                                        <span x-show="!user.is_active" class="px-2 py-1 bg-red-100 text-red-800 rounded">Inactive</span>
                                    </td>
                                    <td class="px-6 py-4 text-sm space-x-2">
                                        <button @click="editUser(user)" class="text-blue-600 hover:text-blue-700">Edit</button>
                                        <button @click="deleteUser(user.id)" class="text-red-600 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Roles Tab -->
            <div x-show="currentTab === 'roles'" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-900">Roles</h2>
                    <button @click="showCreateRoleForm = true" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Add Role</button>
                </div>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <template x-for="role in roles" :key="role.id">
                                <tr>
                                    <td class="px-6 py-4 text-sm text-gray-900" x-text="role.name"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600" x-text="role.description || '-'"></td>
                                    <td class="px-6 py-4 text-sm space-x-2">
                                        <button @click="deleteRole(role.id)" class="text-red-600 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Groups Tab -->
            <div x-show="currentTab === 'groups'" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-900">Groups</h2>
                    <button @click="showCreateGroupForm = true" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Add Group</button>
                </div>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Members</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <template x-for="group in groups" :key="group.id">
                                <tr>
                                    <td class="px-6 py-4 text-sm text-gray-900" x-text="group.name"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600" x-text="group.description || '-'"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600">-</td>
                                    <td class="px-6 py-4 text-sm space-x-2">
                                        <button @click="deleteGroup(group.id)" class="text-red-600 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Domains Tab -->
            <div x-show="currentTab === 'domains'" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-900">Domains</h2>
                    <button @click="showCreateDomainForm = true" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Add Domain</button>
                </div>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Default</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <template x-for="domain in domains" :key="domain.id">
                                <tr>
                                    <td class="px-6 py-4 text-sm text-gray-900" x-text="domain.name"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600" x-text="domain.description || '-'"></td>
                                    <td class="px-6 py-4 text-sm">
                                        <span x-show="domain.is_default" class="text-green-600">✓</span>
                                    </td>
                                    <td class="px-6 py-4 text-sm space-x-2">
                                        <button @click="deleteDomain(domain.id)" class="text-red-600 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Audit Tab -->
            <div x-show="currentTab === 'audit'" class="space-y-4">
                <h2 class="text-xl font-semibold text-gray-900">Audit Log</h2>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                                <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Changes</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <template x-for="log in auditLogs" :key="log.id">
                                <tr>
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        <span x-text="`${log.entity_type}:${log.entity_id.substring(0, 8)}`"></span>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600" x-text="log.action"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600" x-text="new Date(log.created_at).toLocaleString()"></td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        <details>
                                            <summary class="cursor-pointer text-blue-600">View</summary>
                                            <pre class="mt-2 text-xs bg-gray-50 p-2 rounded" x-text="JSON.stringify(JSON.parse(log.changes || '{}'), null, 2)"></pre>
                                        </details>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        function app() {
            return {
                currentTab: 'users',
                users: [],
                roles: [],
                groups: [],
                domains: [],
                auditLogs: [],
                
                async init() {
                    await this.loadUsers();
                    await this.loadRoles();
                    await this.loadGroups();
                    await this.loadDomains();
                    await this.loadAuditLogs();
                },
                
                async loadUsers() {
                    try {
                        const resp = await fetch('/api/users');
                        this.users = await resp.json();
                    } catch (err) {
                        console.error('Error loading users:', err);
                    }
                },
                
                async loadRoles() {
                    try {
                        const resp = await fetch('/api/roles');
                        this.roles = await resp.json();
                    } catch (err) {
                        console.error('Error loading roles:', err);
                    }
                },
                
                async loadGroups() {
                    try {
                        const resp = await fetch('/api/groups');
                        this.groups = await resp.json();
                    } catch (err) {
                        console.error('Error loading groups:', err);
                    }
                },
                
                async loadDomains() {
                    try {
                        const resp = await fetch('/api/domains');
                        this.domains = await resp.json();
                    } catch (err) {
                        console.error('Error loading domains:', err);
                    }
                },
                
                async loadAuditLogs() {
                    try {
                        const resp = await fetch('/api/audit?limit=50');
                        this.auditLogs = await resp.json();
                    } catch (err) {
                        console.error('Error loading audit logs:', err);
                    }
                },
                
                async deleteUser(userId) {
                    if (confirm('Are you sure you want to delete this user?')) {
                        try {
                            await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                            await this.loadUsers();
                            await this.loadAuditLogs();
                        } catch (err) {
                            alert('Error deleting user');
                        }
                    }
                },
                
                async deleteRole(roleId) {
                    if (confirm('Are you sure you want to delete this role?')) {
                        try {
                            await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
                            await this.loadRoles();
                            await this.loadAuditLogs();
                        } catch (err) {
                            alert('Error deleting role');
                        }
                    }
                },
                
                async deleteGroup(groupId) {
                    if (confirm('Are you sure you want to delete this group?')) {
                        try {
                            await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
                            await this.loadGroups();
                            await this.loadAuditLogs();
                        } catch (err) {
                            alert('Error deleting group');
                        }
                    }
                },
                
                async deleteDomain(domainId) {
                    if (confirm('Are you sure you want to delete this domain?')) {
                        try {
                            await fetch(`/api/domains/${domainId}`, { method: 'DELETE' });
                            await this.loadDomains();
                            await this.loadAuditLogs();
                        } catch (err) {
                            alert('Error deleting domain');
                        }
                    }
                }
            }
        }
    </script>
</body>
</html>
'''


def register_ui_routes(bp):
    """Register UI routes to blueprint."""
    
    @bp.route('/', methods=['GET'])
    def ui_home():
        """GET / - Render the user management UI."""
        logger.info('[API] GET /')
        return render_template_string(UI_HTML)
    
    @bp.route('/ui', methods=['GET'])
    def ui_dashboard():
        """GET /ui - Render the user management dashboard."""
        logger.info('[API] GET /ui')
        return render_template_string(UI_HTML)
