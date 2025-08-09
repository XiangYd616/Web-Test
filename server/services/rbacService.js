/**
 * RBAC权限管理服务
 * 基于角色的访问控制系统
 * 版本: v2.0.0
 */

// const { v4: uuidv4 } = require('uuid');
// 注意：需要安装uuid依赖包
// npm install uuid
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const { getPool } = require('../config/database');
const Logger = require('../utils/logger');

// ==================== 配置 ====================

const RBAC_CONFIG = {
  // 缓存配置
  enableCache: process.env.RBAC_ENABLE_CACHE !== 'false',
  cacheExpiry: parseInt(process.env.RBAC_CACHE_EXPIRY) || 300, // 5分钟

  // 权限检查配置
  enableAuditLog: process.env.RBAC_ENABLE_AUDIT !== 'false',
  maxRoleLevel: parseInt(process.env.RBAC_MAX_ROLE_LEVEL) || 10,

  // 系统角色
  systemRoles: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user',
    VIEWER: 'viewer'
  }
};

// ==================== RBAC服务 ====================

class RBACService {
  constructor() {
    this.permissionCache = new Map();
    this.roleCache = new Map();
    this.userPermissionCache = new Map();
    this.startCacheCleanup();
  }

  // ==================== 权限检查 ====================

  /**
   * 检查用户权限
   */
  async checkPermission(userId, resource, action, resourceId = null, context = {}) {
    try {
      const cacheKey = `${userId}:${resource}:${action}:${resourceId || 'null'}`;

      // 检查缓存
      if (RBAC_CONFIG.enableCache && this.userPermissionCache.has(cacheKey)) {
        const cached = this.userPermissionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < RBAC_CONFIG.cacheExpiry * 1000) {
          return cached.result;
        }
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions(userId);

      // 检查权限匹配
      const result = this.evaluatePermissions(userPermissions, resource, action, resourceId, context);

      // 缓存结果
      if (RBAC_CONFIG.enableCache) {
        this.userPermissionCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      // 记录审计日志
      if (RBAC_CONFIG.enableAuditLog) {
        await this.logPermissionCheck({
          userId,
          resource,
          action,
          resourceId,
          result: result.allowed ? 'success' : 'denied',
          reason: result.reason,
          context
        });
      }

      return result;
    } catch (error) {
      Logger.error('Permission check failed', error, { userId, resource, action });
      return {
        allowed: false,
        reason: 'Permission check error',
        matchedRules: [],
        error: error.message
      };
    }
  }

  /**
   * 批量权限检查
   */
  async checkBatchPermissions(userId, checks, context = {}) {
    const results = {};
    let allowed = 0;
    let denied = 0;

    for (const check of checks) {
      const key = `${check.resource}:${check.action}:${check.resourceId || 'null'}`;
      const result = await this.checkPermission(
        userId,
        check.resource,
        check.action,
        check.resourceId,
        context
      );

      results[key] = result;

      if (result.allowed) {
        allowed++;
      } else {
        denied++;
      }
    }

    return {
      results,
      summary: {
        total: checks.length,
        allowed,
        denied
      }
    };
  }

  /**
   * 评估权限
   */
  evaluatePermissions(permissions, resource, action, resourceId, context) {
    const matchedRules = [];
    const allowedBy = [];
    const deniedBy = [];

    for (const permission of permissions) {
      if (this.isPermissionMatch(permission, resource, action, context)) {
        matchedRules.push(permission);

        if (permission.effect === 'allow') {
          allowedBy.push(permission);
        } else if (permission.effect === 'deny') {
          deniedBy.push(permission);
        }
      }
    }

    // 拒绝优先原则
    if (deniedBy.length > 0) {
      return {
        allowed: false,
        reason: 'Explicitly denied by permission rules',
        matchedRules,
        deniedBy,
        allowedBy
      };
    }

    // 检查是否有允许的权限
    if (allowedBy.length > 0) {
      return {
        allowed: true,
        reason: 'Allowed by permission rules',
        matchedRules,
        allowedBy,
        deniedBy
      };
    }

    // 默认拒绝
    return {
      allowed: false,
      reason: 'No matching permission rules found',
      matchedRules,
      allowedBy,
      deniedBy
    };
  }

  /**
   * 检查权限是否匹配
   */
  isPermissionMatch(permission, resource, action, context) {
    // 检查资源和操作
    if (permission.resource !== resource || permission.action !== action) {
      return false;
    }

    // 检查条件
    if (permission.conditions && permission.conditions.length > 0) {
      return permission.conditions.every(condition =>
        this.validateCondition(condition, context)
      );
    }

    return true;
  }

  /**
   * 验证权限条件
   */
  validateCondition(condition, context) {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'eq': return fieldValue === value;
      case 'ne': return fieldValue !== value;
      case 'gt': return fieldValue > value;
      case 'gte': return fieldValue >= value;
      case 'lt': return fieldValue < value;
      case 'lte': return fieldValue <= value;
      case 'in': return Array.isArray(value) && value.includes(fieldValue);
      case 'nin': return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'regex': return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
      default: return false;
    }
  }

  /**
   * 获取嵌套对象值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // ==================== 用户权限管理 ====================

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId) {
    const pool = getPool();

    try {
      // 检查缓存
      const cacheKey = `user_permissions:${userId}`;
      if (RBAC_CONFIG.enableCache && this.userPermissionCache.has(cacheKey)) {
        const cached = this.userPermissionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < RBAC_CONFIG.cacheExpiry * 1000) {
          return cached.permissions;
        }
      }

      // 获取用户角色和权限
      const result = await pool.query(`
        SELECT DISTINCT 
          p.id, p.name, p.description, p.resource, p.action, p.effect,
          p.conditions, p.metadata, p.created_at, p.updated_at
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 
        AND ur.is_active = true 
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND r.is_active = true
        ORDER BY p.resource, p.action
      `, [userId]);

      const permissions = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        resource: row.resource,
        action: row.action,
        effect: row.effect,
        conditions: row.conditions ? JSON.parse(row.conditions) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // 缓存权限
      if (RBAC_CONFIG.enableCache) {
        this.userPermissionCache.set(cacheKey, {
          permissions,
          timestamp: Date.now()
        });
      }

      return permissions;
    } catch (error) {
      Logger.error('Failed to get user permissions', error, { userId });
      return [];
    }
  }

  /**
   * 获取用户角色
   */
  async getUserRoles(userId) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        SELECT 
          r.id, r.name, r.description, r.type, r.level, r.parent_role_id,
          r.is_active, r.is_system, r.metadata, r.created_at, r.updated_at,
          ur.assigned_at, ur.expires_at, ur.assigned_by
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 
        AND ur.is_active = true 
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND r.is_active = true
        ORDER BY r.level DESC, r.name
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        level: row.level,
        parentRoleId: row.parent_role_id,
        isActive: row.is_active,
        isSystem: row.is_system,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignedAt: row.assigned_at,
        expiresAt: row.expires_at,
        assignedBy: row.assigned_by
      }));
    } catch (error) {
      Logger.error('Failed to get user roles', error, { userId });
      return [];
    }
  }

  // ==================== 角色管理 ====================

  /**
   * 创建角色
   */
  async createRole(roleData, createdBy) {
    const pool = getPool();

    try {
      const roleId = uuidv4();
      const now = new Date().toISOString();

      const result = await pool.query(`
        INSERT INTO roles (
          id, name, description, type, level, parent_role_id,
          is_active, is_system, metadata, created_at, updated_at,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        roleId,
        roleData.name,
        roleData.description,
        roleData.type || 'custom',
        roleData.level || 1,
        roleData.parentRoleId || null,
        roleData.isActive !== false,
        roleData.isSystem || false,
        JSON.stringify(roleData.metadata || {}),
        now,
        now,
        createdBy,
        createdBy
      ]);

      const role = result.rows[0];

      // 分配权限
      if (roleData.permissions && roleData.permissions.length > 0) {
        await this.assignPermissionsToRole(roleId, roleData.permissions);
      }

      // 清除缓存
      this.clearCache();

      // 记录审计日志
      await this.logRoleChange({
        roleId,
        userId: createdBy,
        action: 'create',
        changes: { new: roleData }
      });

      Logger.info('Role created', { roleId, name: roleData.name, createdBy });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        type: role.type,
        level: role.level,
        parentRoleId: role.parent_role_id,
        isActive: role.is_active,
        isSystem: role.is_system,
        metadata: JSON.parse(role.metadata || '{}'),
        createdAt: role.created_at,
        updatedAt: role.updated_at,
        createdBy: role.created_by,
        updatedBy: role.updated_by,
        permissions: roleData.permissions || []
      };
    } catch (error) {
      Logger.error('Failed to create role', error, { roleData, createdBy });
      throw error;
    }
  }

  /**
   * 更新角色
   */
  async updateRole(roleId, updates, updatedBy) {
    const pool = getPool();

    try {
      // 获取当前角色信息
      const currentResult = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      if (currentResult.rows.length === 0) {
        throw new Error('Role not found');
      }

      const currentRole = currentResult.rows[0];

      // 检查是否为系统角色
      if (currentRole.is_system && updates.isSystem === false) {
        throw new Error('Cannot modify system role');
      }

      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      // 构建更新字段
      const allowedFields = ['name', 'description', 'level', 'parent_role_id', 'is_active', 'metadata'];
      for (const field of allowedFields) {
        const dbField = field === 'parentRoleId' ? 'parent_role_id' :
          field === 'isActive' ? 'is_active' : field;

        if (updates[field] !== undefined) {
          updateFields.push(`${dbField} = $${valueIndex}`);
          updateValues.push(field === 'metadata' ? JSON.stringify(updates[field]) : updates[field]);
          valueIndex++;
        }
      }

      if (updateFields.length === 0) {
        return currentRole;
      }

      // 添加更新时间和更新者
      updateFields.push(`updated_at = $${valueIndex}`, `updated_by = $${valueIndex + 1}`);
      updateValues.push(new Date().toISOString(), updatedBy);

      const result = await pool.query(`
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex + 2}
        RETURNING *
      `, [...updateValues, roleId]);

      const updatedRole = result.rows[0];

      // 更新权限关联
      if (updates.permissions) {
        await this.updateRolePermissions(roleId, updates.permissions);
      }

      // 清除缓存
      this.clearCache();

      // 记录审计日志
      await this.logRoleChange({
        roleId,
        userId: updatedBy,
        action: 'update',
        changes: {
          old: currentRole,
          new: updates
        }
      });

      Logger.info('Role updated', { roleId, updates, updatedBy });

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        type: updatedRole.type,
        level: updatedRole.level,
        parentRoleId: updatedRole.parent_role_id,
        isActive: updatedRole.is_active,
        isSystem: updatedRole.is_system,
        metadata: JSON.parse(updatedRole.metadata || '{}'),
        createdAt: updatedRole.created_at,
        updatedAt: updatedRole.updated_at,
        createdBy: updatedRole.created_by,
        updatedBy: updatedRole.updated_by
      };
    } catch (error) {
      Logger.error('Failed to update role', error, { roleId, updates, updatedBy });
      throw error;
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId, deletedBy) {
    const pool = getPool();

    try {
      // 检查角色是否存在且不是系统角色
      const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      if (roleResult.rows.length === 0) {
        throw new Error('Role not found');
      }

      const role = roleResult.rows[0];
      if (role.is_system) {
        throw new Error('Cannot delete system role');
      }

      // 检查是否有用户使用此角色
      const userRoleResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1 AND is_active = true',
        [roleId]
      );

      if (parseInt(userRoleResult.rows[0].count) > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // 开始事务
      await pool.query('BEGIN');

      try {
        // 删除角色权限关联
        await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

        // 删除角色
        await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);

        await pool.query('COMMIT');

        // 清除缓存
        this.clearCache();

        // 记录审计日志
        await this.logRoleChange({
          roleId,
          userId: deletedBy,
          action: 'delete',
          changes: { old: role }
        });

        Logger.info('Role deleted', { roleId, deletedBy });

        return true;
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      Logger.error('Failed to delete role', error, { roleId, deletedBy });
      throw error;
    }
  }

  /**
   * 分配角色给用户
   */
  async assignRole(userId, roleId, assignedBy, expiresAt = null) {
    const pool = getPool();

    try {
      // 检查角色是否存在
      const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1 AND is_active = true', [roleId]);
      if (roleResult.rows.length === 0) {
        throw new Error('Role not found or inactive');
      }

      // 检查是否已经分配
      const existingResult = await pool.query(
        'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2 AND is_active = true',
        [userId, roleId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Role already assigned to user');
      }

      const userRoleId = uuidv4();
      const now = new Date().toISOString();

      await pool.query(`
        INSERT INTO user_roles (
          id, user_id, role_id, assigned_by, assigned_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
      `, [userRoleId, userId, roleId, assignedBy, now, expiresAt]);

      // 清除用户权限缓存
      this.clearUserCache(userId);

      // 记录审计日志
      await this.logRoleChange({
        roleId,
        userId: assignedBy,
        targetUserId: userId,
        action: 'assign',
        changes: {
          new: { roleId, userId, expiresAt }
        }
      });

      Logger.info('Role assigned to user', { userId, roleId, assignedBy, expiresAt });

      return true;
    } catch (error) {
      Logger.error('Failed to assign role', error, { userId, roleId, assignedBy });
      throw error;
    }
  }

  /**
   * 撤销用户角色
   */
  async revokeRole(userId, roleId, revokedBy) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        UPDATE user_roles 
        SET is_active = false, revoked_at = NOW(), revoked_by = $3
        WHERE user_id = $1 AND role_id = $2 AND is_active = true
        RETURNING *
      `, [userId, roleId, revokedBy]);

      if (result.rows.length === 0) {
        throw new Error('User role assignment not found');
      }

      // 清除用户权限缓存
      this.clearUserCache(userId);

      // 记录审计日志
      await this.logRoleChange({
        roleId,
        userId: revokedBy,
        targetUserId: userId,
        action: 'revoke',
        changes: {
          old: { roleId, userId }
        }
      });

      Logger.info('Role revoked from user', { userId, roleId, revokedBy });

      return true;
    } catch (error) {
      Logger.error('Failed to revoke role', error, { userId, roleId, revokedBy });
      throw error;
    }
  }

  // ==================== 权限管理 ====================

  /**
   * 为角色分配权限
   */
  async assignPermissionsToRole(roleId, permissionIds) {
    const pool = getPool();

    try {
      // 删除现有权限关联
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // 添加新的权限关联
      if (permissionIds.length > 0) {
        const values = permissionIds.map((permId, index) =>
          `($1, $${index + 2})`
        ).join(', ');

        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
        `, [roleId, ...permissionIds]);
      }

      // 清除缓存
      this.clearCache();

      Logger.info('Permissions assigned to role', { roleId, permissionIds });
    } catch (error) {
      Logger.error('Failed to assign permissions to role', error, { roleId, permissionIds });
      throw error;
    }
  }

  /**
   * 更新角色权限
   */
  async updateRolePermissions(roleId, permissionIds) {
    return this.assignPermissionsToRole(roleId, permissionIds);
  }

  // ==================== 审计日志 ====================

  /**
   * 记录权限检查日志
   */
  async logPermissionCheck(logData) {
    const pool = getPool();

    try {
      await pool.query(`
        INSERT INTO permission_audit_logs (
          id, user_id, action, resource, resource_id, result, reason,
          ip_address, user_agent, session_id, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      `, [
        uuidv4(),
        logData.userId,
        logData.action,
        logData.resource,
        logData.resourceId,
        logData.result,
        logData.reason,
        logData.context?.ipAddress || null,
        logData.context?.userAgent || null,
        logData.context?.sessionId || null,
        JSON.stringify(logData.context || {})
      ]);
    } catch (error) {
      Logger.error('Failed to log permission check', error, logData);
    }
  }

  /**
   * 记录角色变更日志
   */
  async logRoleChange(logData) {
    const pool = getPool();

    try {
      await pool.query(`
        INSERT INTO role_audit_logs (
          id, role_id, user_id, target_user_id, action, changes,
          reason, ip_address, user_agent, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        uuidv4(),
        logData.roleId,
        logData.userId,
        logData.targetUserId || null,
        logData.action,
        JSON.stringify(logData.changes),
        logData.reason || null,
        logData.ipAddress || null,
        logData.userAgent || null
      ]);
    } catch (error) {
      Logger.error('Failed to log role change', error, logData);
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.permissionCache.clear();
    this.roleCache.clear();
    this.userPermissionCache.clear();
  }

  /**
   * 清除用户相关缓存
   */
  clearUserCache(userId) {
    // 清除用户权限缓存
    for (const [key] of this.userPermissionCache) {
      if (key.startsWith(`user_permissions:${userId}`) || key.startsWith(`${userId}:`)) {
        this.userPermissionCache.delete(key);
      }
    }
  }

  /**
   * 启动缓存清理定时器
   */
  startCacheCleanup() {
    // 每小时清理一次过期缓存
    this.cacheCleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiry = RBAC_CONFIG.cacheExpiry * 1000;

      for (const [key, value] of this.userPermissionCache) {
        if (now - value.timestamp > expiry) {
          this.userPermissionCache.delete(key);
        }
      }
    }, 3600000);
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
    }
    this.clearCache();
  }
}

// ==================== 导出 ====================

const rbacService = new RBACService();

module.exports = {
  RBACService,
  rbacService,
  RBAC_CONFIG
};
