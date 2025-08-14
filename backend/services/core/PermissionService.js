/**
 * 权限管理服务
 * 实现基于角色的权限控制（RBAC）
 */

const { query } = require('..\..\config\database.js');
const { ErrorFactory } = require('..\..\utils\ApiError.js');

/**
 * 预定义的权限常量
 */
const PERMISSIONS = {
    // 用户管理权限
    USER_READ: 'user:read',
    USER_WRITE: 'user:write',
    USER_DELETE: 'user:delete',
    USER_ADMIN: 'user:admin',

    // 测试相关权限
    TEST_CREATE: 'test:create',
    TEST_READ: 'test:read',
    TEST_UPDATE: 'test:update',
    TEST_DELETE: 'test:delete',
    TEST_EXECUTE: 'test:execute',
    TEST_ADMIN: 'test:admin',

    // 监控权限
    MONITORING_READ: 'monitoring:read',
    MONITORING_WRITE: 'monitoring:write',
    MONITORING_ADMIN: 'monitoring:admin',

    // 系统管理权限
    SYSTEM_CONFIG: 'system:config',
    SYSTEM_LOGS: 'system:logs',
    SYSTEM_ADMIN: 'system:admin',

    // 数据管理权限
    DATA_EXPORT: 'data:export',
    DATA_IMPORT: 'data:import',
    DATA_BACKUP: 'data:backup',
    DATA_ADMIN: 'data:admin',

    // 报告权限
    REPORT_READ: 'report:read',
    REPORT_CREATE: 'report:create',
    REPORT_ADMIN: 'report:admin',

    // 集成权限
    INTEGRATION_READ: 'integration:read',
    INTEGRATION_WRITE: 'integration:write',
    INTEGRATION_ADMIN: 'integration:admin'
};

/**
 * 预定义的角色和权限映射
 */
const ROLE_PERMISSIONS = {
    // 超级管理员 - 拥有所有权限
    admin: Object.values(PERMISSIONS),

    // 管理员 - 拥有大部分权限，但不能管理系统配置
    manager: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_WRITE,
        PERMISSIONS.TEST_CREATE,
        PERMISSIONS.TEST_READ,
        PERMISSIONS.TEST_UPDATE,
        PERMISSIONS.TEST_DELETE,
        PERMISSIONS.TEST_EXECUTE,
        PERMISSIONS.TEST_ADMIN,
        PERMISSIONS.MONITORING_READ,
        PERMISSIONS.MONITORING_WRITE,
        PERMISSIONS.MONITORING_ADMIN,
        PERMISSIONS.DATA_EXPORT,
        PERMISSIONS.DATA_IMPORT,
        PERMISSIONS.DATA_BACKUP,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.REPORT_CREATE,
        PERMISSIONS.REPORT_ADMIN,
        PERMISSIONS.INTEGRATION_READ,
        PERMISSIONS.INTEGRATION_WRITE
    ],

    // 高级用户 - 可以执行测试和查看报告
    premium: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.TEST_CREATE,
        PERMISSIONS.TEST_READ,
        PERMISSIONS.TEST_UPDATE,
        PERMISSIONS.TEST_DELETE,
        PERMISSIONS.TEST_EXECUTE,
        PERMISSIONS.MONITORING_READ,
        PERMISSIONS.DATA_EXPORT,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.REPORT_CREATE,
        PERMISSIONS.INTEGRATION_READ
    ],

    // 普通用户 - 基本的测试功能
    user: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.TEST_CREATE,
        PERMISSIONS.TEST_READ,
        PERMISSIONS.TEST_UPDATE,
        PERMISSIONS.TEST_EXECUTE,
        PERMISSIONS.MONITORING_READ,
        PERMISSIONS.DATA_EXPORT,
        PERMISSIONS.REPORT_READ
    ],

    // 只读用户 - 只能查看
    viewer: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.TEST_READ,
        PERMISSIONS.MONITORING_READ,
        PERMISSIONS.REPORT_READ
    ]
};

class PermissionService {
    constructor() {
        this.permissionCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
    }

    /**
     * 获取用户权限列表
     * @param {number} userId - 用户ID
     * @returns {Promise<string[]>} 权限列表
     */
    async getUserPermissions(userId) {
        try {
            // 检查缓存
            const cacheKey = `user_permissions_${userId}`;
            const cached = this.permissionCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.permissions;
            }

            // 从数据库获取用户信息
            const userResult = await query(
                'SELECT id, role, is_active FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                throw ErrorFactory.notFound('用户');
            }

            const user = userResult.rows[0];

            if (!user.is_active) {
                return []; // 非活跃用户没有任何权限
            }

            // 获取基于角色的权限
            let permissions = ROLE_PERMISSIONS[user.role] || [];

            // 获取用户特定的权限（如果有自定义权限表）
            try {
                const customPermissionsResult = await query(
                    'SELECT permission FROM user_permissions WHERE user_id = $1 AND is_active = true',
                    [userId]
                );

                const customPermissions = customPermissionsResult.rows.map(row => row.permission);
                permissions = [...new Set([...permissions, ...customPermissions])];
            } catch (error) {
                // 如果没有自定义权限表，忽略错误
                console.warn('自定义权限表不存在，使用基于角色的权限');
            }

            // 缓存权限
            this.permissionCache.set(cacheKey, {
                permissions,
                timestamp: Date.now()
            });

            return permissions;
        } catch (error) {
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 检查用户是否拥有特定权限
     * @param {number} userId - 用户ID
     * @param {string|string[]} requiredPermissions - 需要的权限
     * @param {boolean} [requireAll=true] - 是否需要所有权限
     * @returns {Promise<boolean>} 是否拥有权限
     */
    async hasPermission(userId, requiredPermissions, requireAll = true) {
        try {
            const userPermissions = await this.getUserPermissions(userId);
            const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

            if (requireAll) {
                return permissions.every(permission => userPermissions.includes(permission));
            } else {
                return permissions.some(permission => userPermissions.includes(permission));
            }
        } catch (error) {
            console.error('权限检查失败:', error);
            return false;
        }
    }

    /**
     * 检查用户是否拥有管理员权限
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否为管理员
     */
    async isAdmin(userId) {
        try {
            const userResult = await query(
                'SELECT role FROM users WHERE id = $1 AND is_active = true',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return false;
            }

            return userResult.rows[0].role === 'admin';
        } catch (error) {
            console.error('管理员权限检查失败:', error);
            return false;
        }
    }

    /**
     * 获取角色的所有权限
     * @param {string} role - 角色名称
     * @returns {string[]} 权限列表
     */
    getRolePermissions(role) {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * 获取所有可用权限
     * @returns {Object} 权限常量对象
     */
    getAllPermissions() {
        return PERMISSIONS;
    }

    /**
     * 获取所有角色
     * @returns {string[]} 角色列表
     */
    getAllRoles() {
        return Object.keys(ROLE_PERMISSIONS);
    }

    /**
     * 验证权限格式
     * @param {string} permission - 权限字符串
     * @returns {boolean} 是否为有效权限
     */
    isValidPermission(permission) {
        return Object.values(PERMISSIONS).includes(permission);
    }

    /**
     * 验证角色格式
     * @param {string} role - 角色字符串
     * @returns {boolean} 是否为有效角色
     */
    isValidRole(role) {
        return Object.keys(ROLE_PERMISSIONS).includes(role);
    }

    /**
     * 清除用户权限缓存
     * @param {number} userId - 用户ID
     */
    clearUserPermissionCache(userId) {
        const cacheKey = `user_permissions_${userId}`;
        this.permissionCache.delete(cacheKey);
    }

    /**
     * 清除所有权限缓存
     */
    clearAllPermissionCache() {
        this.permissionCache.clear();
    }

    /**
     * 添加用户自定义权限
     * @param {number} userId - 用户ID
     * @param {string} permission - 权限
     * @returns {Promise<boolean>} 是否添加成功
     */
    async addUserPermission(userId, permission) {
        try {
            if (!this.isValidPermission(permission)) {
                throw ErrorFactory.validation([{ field: 'permission', message: '无效的权限' }]);
            }

            await query(`
        INSERT INTO user_permissions (user_id, permission, is_active, created_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (user_id, permission) DO UPDATE SET
          is_active = true,
          updated_at = NOW()
      `, [userId, permission]);

            // 清除缓存
            this.clearUserPermissionCache(userId);

            return true;
        } catch (error) {
            if (error.code === '42P01') {
                // 表不存在，忽略错误
                console.warn('用户权限表不存在，跳过自定义权限添加');
                return false;
            }
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 移除用户自定义权限
     * @param {number} userId - 用户ID
     * @param {string} permission - 权限
     * @returns {Promise<boolean>} 是否移除成功
     */
    async removeUserPermission(userId, permission) {
        try {
            await query(
                'UPDATE user_permissions SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND permission = $2',
                [userId, permission]
            );

            // 清除缓存
            this.clearUserPermissionCache(userId);

            return true;
        } catch (error) {
            if (error.code === '42P01') {
                // 表不存在，忽略错误
                console.warn('用户权限表不存在，跳过自定义权限移除');
                return false;
            }
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 获取权限的描述信息
     * @param {string} permission - 权限
     * @returns {Object} 权限描述
     */
    getPermissionDescription(permission) {
        const descriptions = {
            [PERMISSIONS.USER_READ]: { name: '查看用户', description: '可以查看用户信息' },
            [PERMISSIONS.USER_WRITE]: { name: '编辑用户', description: '可以编辑用户信息' },
            [PERMISSIONS.USER_DELETE]: { name: '删除用户', description: '可以删除用户' },
            [PERMISSIONS.USER_ADMIN]: { name: '用户管理', description: '完整的用户管理权限' },

            [PERMISSIONS.TEST_CREATE]: { name: '创建测试', description: '可以创建新的测试' },
            [PERMISSIONS.TEST_READ]: { name: '查看测试', description: '可以查看测试结果' },
            [PERMISSIONS.TEST_UPDATE]: { name: '编辑测试', description: '可以编辑测试配置' },
            [PERMISSIONS.TEST_DELETE]: { name: '删除测试', description: '可以删除测试记录' },
            [PERMISSIONS.TEST_EXECUTE]: { name: '执行测试', description: '可以执行测试' },
            [PERMISSIONS.TEST_ADMIN]: { name: '测试管理', description: '完整的测试管理权限' },

            [PERMISSIONS.MONITORING_READ]: { name: '查看监控', description: '可以查看监控数据' },
            [PERMISSIONS.MONITORING_WRITE]: { name: '配置监控', description: '可以配置监控规则' },
            [PERMISSIONS.MONITORING_ADMIN]: { name: '监控管理', description: '完整的监控管理权限' },

            [PERMISSIONS.SYSTEM_CONFIG]: { name: '系统配置', description: '可以修改系统配置' },
            [PERMISSIONS.SYSTEM_LOGS]: { name: '系统日志', description: '可以查看系统日志' },
            [PERMISSIONS.SYSTEM_ADMIN]: { name: '系统管理', description: '完整的系统管理权限' },

            [PERMISSIONS.DATA_EXPORT]: { name: '数据导出', description: '可以导出数据' },
            [PERMISSIONS.DATA_IMPORT]: { name: '数据导入', description: '可以导入数据' },
            [PERMISSIONS.DATA_BACKUP]: { name: '数据备份', description: '可以备份和恢复数据' },
            [PERMISSIONS.DATA_ADMIN]: { name: '数据管理', description: '完整的数据管理权限' },

            [PERMISSIONS.REPORT_READ]: { name: '查看报告', description: '可以查看报告' },
            [PERMISSIONS.REPORT_CREATE]: { name: '创建报告', description: '可以创建自定义报告' },
            [PERMISSIONS.REPORT_ADMIN]: { name: '报告管理', description: '完整的报告管理权限' },

            [PERMISSIONS.INTEGRATION_READ]: { name: '查看集成', description: '可以查看集成配置' },
            [PERMISSIONS.INTEGRATION_WRITE]: { name: '配置集成', description: '可以配置第三方集成' },
            [PERMISSIONS.INTEGRATION_ADMIN]: { name: '集成管理', description: '完整的集成管理权限' }
        };

        return descriptions[permission] || { name: permission, description: '未知权限' };
    }

    /**
     * 获取角色的描述信息
     * @param {string} role - 角色
     * @returns {Object} 角色描述
     */
    getRoleDescription(role) {
        const descriptions = {
            admin: { name: '超级管理员', description: '拥有系统的完整访问权限' },
            manager: { name: '管理员', description: '拥有大部分管理权限，但不能修改系统配置' },
            premium: { name: '高级用户', description: '可以使用高级功能和创建报告' },
            user: { name: '普通用户', description: '可以使用基本的测试功能' },
            viewer: { name: '只读用户', description: '只能查看数据，不能进行修改操作' }
        };

        return descriptions[role] || { name: role, description: '未知角色' };
    }
}

module.exports = {
    PermissionService,
    PERMISSIONS,
    ROLE_PERMISSIONS
};