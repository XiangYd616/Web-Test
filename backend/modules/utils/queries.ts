/**
 * 优化的数据库查询工具
 * 直接在 SQL 层面进行字段映射，减少应用层转换
 */

import {
  FieldMapper,
  TEST_FIELD_MAPPING,
  USER_FIELD_MAPPING,
} from '../../../shared/utils/fieldMapping';
import { query as dbQuery } from '../config/database';

type UserFilters = {
  role?: string;
  status?: string;
};

type PaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

type UserRecordInput = {
  username: string;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
};

class Queries {
  /**
   * 优化的用户查询 - 直接返回 camelCase 字段
   */
  static async getUserById(userId: string) {
    const aliases = FieldMapper.generateSQLAliases(USER_FIELD_MAPPING, 'u');

    const sql = `
      SELECT ${aliases}
      FROM users u
      WHERE u.id = $1
    `;

    const result = await dbQuery(sql, [userId]);
    if (result.rows.length === 0) return null;

    // 直接解析 JSON 字段，无需额外转换
    return FieldMapper.parseJSONFields(result.rows[0], ['preferences', 'metadata']);
  }

  /**
   * 优化的用户列表查询
   */
  static async getUserList(filters: UserFilters = {}, pagination: PaginationOptions = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // 构建 WHERE 条件
    const whereConditions: string[] = [];
    const params: Array<string | number> = [];
    let paramIndex = 1;

    if (filters.role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex += 1;
    }

    if (filters.status) {
      whereConditions.push(`u.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex += 1;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 字段映射
    const aliases = FieldMapper.generateSQLAliases(USER_FIELD_MAPPING, 'u');
    const dbSortField = USER_FIELD_MAPPING[sortBy] || 'created_at';

    // 主查询
    const sql = `
      SELECT ${aliases}
      FROM users u
      ${whereClause}
      ORDER BY u.${dbSortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // 计数查询
    const countSql = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      dbQuery(sql, [...params, limit, offset]),
      dbQuery(countSql, params),
    ]);

    const users = dataResult.rows.map((row: Record<string, unknown>) =>
      FieldMapper.parseJSONFields(row, ['preferences', 'metadata'])
    );

    const total = Number.parseInt(String(countResult.rows[0].total), 10);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 优化的测试历史查询
   */
  static async getTestHistory(
    userId: string,
    filters: Record<string, unknown> = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    void filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const aliases = FieldMapper.generateSQLAliases(TEST_FIELD_MAPPING, 't');

    const sql = `
      SELECT ${aliases},
             t.test_url AS url,
             t.test_config AS config,
             t.results,
             t.status
      FROM test_executions t
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await dbQuery(sql, [userId, limit, offset]);

    return result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results,
    }));
  }

  /**
   * 批量插入优化
   */
  static async batchInsertUsers(users: UserRecordInput[]) {
    if (!users || users.length === 0) return [];

    // 构建批量插入的 VALUES 子句
    const values: string[] = [];
    const params: Array<string | number | null> = [];
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

    const sql = `
      INSERT INTO users (${insertFields.join(', ')})
      VALUES ${values.join(', ')}
      RETURNING ${FieldMapper.generateSQLAliases(USER_FIELD_MAPPING)}
    `;

    const result = await dbQuery(sql, params);
    return result.rows.map((row: Record<string, unknown>) =>
      FieldMapper.parseJSONFields(row, ['preferences', 'metadata'])
    );
  }
}

export default Queries;
