import { db } from '../config/database';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  password_hash?: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'tester' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  email_verified: boolean;
  permissions?: string[];
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login_at?: Date;
  login_attempts: number;
  locked_until?: Date;
  preferences: any;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role?: string;
  metadata?: any;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  preferences?: any;
  metadata?: any;
}

export interface UserFilter {
  role?: string;
  status?: string;
  search?: string;
  email_verified?: boolean;
  created_after?: Date;
  created_before?: Date;
}

export class UserModel {
  // 创建用户
  static async create(userData: CreateUserData): Promise<User> {
    const { username, email, full_name, password, role = 'tester', metadata = {} } = userData;

    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await this.findByUsernameOrEmail(username, email);
      if (existingUser) {
        throw new Error('用户名或邮箱已存在');
      }

      // 加密密码
      const password_hash = await bcrypt.hash(password, 12);

      const query = `
        INSERT INTO users (username, email, full_name, password_hash, role, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await db.query(query, [
        username,
        email,
        full_name,
        password_hash,
        role,
        JSON.stringify(metadata)
      ]);

      const user = result.rows[0];
      delete user.password_hash; // 不返回密码哈希

      logger.info('用户创建成功', { userId: user.id, username, email });
      return user;
    } catch (error) {
      logger.error('用户创建失败', { username, email, error });
      throw error;
    }
  }

  // 根据ID查找用户
  static async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      delete user.password_hash;
      return user;
    } catch (error) {
      logger.error('查找用户失败', { id, error });
      throw error;
    }
  }

  // 根据用户名查找用户
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await db.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('查找用户失败', { username, error });
      throw error;
    }
  }

  // 根据邮箱查找用户
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('查找用户失败', { email, error });
      throw error;
    }
  }

  // 根据用户名或邮箱查找用户
  static async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE username = $1 OR email = $2';
      const result = await db.query(query, [username, email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('查找用户失败', { username, email, error });
      throw error;
    }
  }

  // 验证密码
  static async validatePassword(user: User, password: string): Promise<boolean> {
    try {
      if (!user.password_hash) {
        return false;
      }
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      logger.error('密码验证失败', { userId: user.id, error });
      return false;
    }
  }

  // 更新用户
  static async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 构建动态更新查询
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('没有提供更新数据');
      }

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      delete user.password_hash;

      logger.info('用户更新成功', { userId: id, fields: Object.keys(updateData) });
      return user;
    } catch (error) {
      logger.error('用户更新失败', { id, error });
      throw error;
    }
  }

  // 删除用户
  static async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      
      const deleted = result.rowCount > 0;
      if (deleted) {
        logger.info('用户删除成功', { userId: id });
      }
      
      return deleted;
    } catch (error) {
      logger.error('用户删除失败', { id, error });
      throw error;
    }
  }

  // 获取用户列表
  static async findMany(
    filter: UserFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: User[]; total: number; totalPages: number }> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 构建过滤条件
      if (filter.role) {
        conditions.push(`role = $${paramIndex}`);
        values.push(filter.role);
        paramIndex++;
      }

      if (filter.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(filter.status);
        paramIndex++;
      }

      if (filter.email_verified !== undefined) {
        conditions.push(`email_verified = $${paramIndex}`);
        values.push(filter.email_verified);
        paramIndex++;
      }

      if (filter.search) {
        conditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`);
        values.push(`%${filter.search}%`);
        paramIndex++;
      }

      if (filter.created_after) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(filter.created_after);
        paramIndex++;
      }

      if (filter.created_before) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(filter.created_before);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // 获取分页数据
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT id, username, email, full_name, avatar_url, role, status, 
               email_verified, last_login_at, login_attempts, preferences, 
               metadata, created_at, updated_at
        FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      const dataResult = await db.query(dataQuery, values);
      const users = dataResult.rows;

      return {
        users,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取用户列表失败', { filter, page, limit, error });
      throw error;
    }
  }

  // 更新登录信息
  static async updateLoginInfo(id: string, success: boolean): Promise<void> {
    try {
      if (success) {
        // 登录成功，重置登录尝试次数
        const query = `
          UPDATE users 
          SET last_login_at = NOW(), login_attempts = 0, locked_until = NULL
          WHERE id = $1
        `;
        await db.query(query, [id]);
      } else {
        // 登录失败，增加尝试次数
        const query = `
          UPDATE users 
          SET login_attempts = login_attempts + 1,
              locked_until = CASE 
                WHEN login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE locked_until
              END
          WHERE id = $1
        `;
        await db.query(query, [id]);
      }
    } catch (error) {
      logger.error('更新登录信息失败', { id, success, error });
      throw error;
    }
  }

  // 检查用户是否被锁定
  static async isLocked(id: string): Promise<boolean> {
    try {
      const query = 'SELECT locked_until FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const lockedUntil = result.rows[0].locked_until;
      return lockedUntil && new Date(lockedUntil) > new Date();
    } catch (error) {
      logger.error('检查用户锁定状态失败', { id, error });
      return false;
    }
  }

  // 获取用户统计信息
  static async getStats(): Promise<any> {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM users',
        'SELECT COUNT(*) as active FROM users WHERE status = \'active\'',
        'SELECT COUNT(*) as inactive FROM users WHERE status = \'inactive\'',
        'SELECT COUNT(*) as suspended FROM users WHERE status = \'suspended\'',
        'SELECT COUNT(*) as new_this_month FROM users WHERE created_at >= date_trunc(\'month\', NOW())',
        'SELECT role, COUNT(*) as count FROM users GROUP BY role',
      ];

      const results = await Promise.all(queries.map(query => db.query(query)));

      return {
        total: parseInt(results[0].rows[0].total),
        active: parseInt(results[1].rows[0].active),
        inactive: parseInt(results[2].rows[0].inactive),
        suspended: parseInt(results[3].rows[0].suspended),
        newThisMonth: parseInt(results[4].rows[0].new_this_month),
        byRole: results[5].rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }
}
