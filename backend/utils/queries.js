/**
 * 优化的数据库查询工具
 * 直接在 SQL 层面进行字段映射，减少应用层转换
 */

const { getPool } = require('../config/database');
const { USER_FIELD_MAPPING, TEST_FIELD_MAPPING, FieldMapper } = require('../config/fieldMapping');

class Queries {
  /**
   * 优化的用户查询 - 直接返回 camelCase 字段
   */
  static async getUserById(userId) {
    const pool = getPool();
    const aliases = FieldMapper.generateSQLAliases(USER_FIELD_MAPPING, 'u');
    
    const query = `
      SELECT ${aliases}
      FROM users u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) return null;
    
    // 直接解析 JSON 字段，无需额外转换
    return FieldMapper.parseJSONFields(result.rows[0], ['preferences', 'metadata']);
  }

  /**
   * 优化的用户列表查询
   */
  static async getUserList(filters = {}, pagination = {}) {
    const pool = getPool();
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;
    
    // 构建 WHERE 条件
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (filters.role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex++;
    }
    
    if (filters.status) {
      whereConditions.push(`u.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 字段映射
    const aliases = FieldMapper.generateSQLAliases(USER_FIELD_MAPPING, 'u');
    const dbSortField = USER_FIELD_MAPPING[sortBy] || 'created_at';
    
    // 主查询
    const query = `
      SELECT ${aliases}
      FROM users u
      ${whereClause}
      ORDER BY u.${dbSortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // 计数查询
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);
    
    const users = dataResult.rows.map(row => 
      FieldMapper.parseJSONFields(row, ['preferences', 'metadata'])
    );
    
    return {
      users,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  /**
   * 优化的测试历史查询
   */
  static async getTestHistory(userId, filters = {}, pagination = {}) {
    const pool = getPool();
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    
    const aliases = FieldMapper.generateSQLAliases(TEST_FIELD_MAPPING, 't');
    
    const query = `
      SELECT ${aliases},
             t.url,
             t.config,
             t.results,
             t.status
      FROM test_executions t
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results
    }));
  }

  /**
   * 批量插入优化
   */
  static async batchInsertUsers(users) {
    const pool = getPool();
    
    if (!users || users.length === 0) return [];
    
    // 构建批量插入的 VALUES 子句
    const values = [];
    const params = [];
    let paramIndex = 1;
    
    const insertFields = ['username', 'email', 'password_hash', 'first_name', 'last_name', 'role'];
    
    for (const user of users) {
      const userValues = insertFields.map(() => `$${paramIndex++}`);
      values.push(`(${userValues.join(', ')})`);
      
      params.push(
        user.username,
        user.email,
        user.passwordHash,
        user.firstName || null,
        user.lastName || null,
        user.role || 'user'
      );
    }
    
    const query = `
      INSERT INTO users (${insertFields.join(', ')})
      VALUES ${values.join(', ')}
      RETURNING ${FieldMapper.generateSQLAliases(USER_FIELD_MAPPING)}
    `;
    
    const result = await pool.query(query, params);
    return result.rows.map(row => 
      FieldMapper.parseJSONFields(row, ['preferences', 'metadata'])
    );
  }
}

module.exports = Queries;
