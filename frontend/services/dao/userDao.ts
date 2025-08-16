/**
 * 用户数据访问对象
 * 提供用户相关的数据库操作
 */

import {CreateUserData, UpdateUserData, User} from '../../types/user';

// 模拟用户数据存储
const users: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', // 'admin123'
    role: 'admin' as any, // 临时修复，稍后会正确导入枚举
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
    lastLoginAt: null,
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      avatar: null,
      bio: 'System Administrator',
      phone: null,
      address: null,
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          push: true,
          sms: false,
          browser: true
        }
      }
    }
  },
  {
    id: '2',
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', // 'test123'
    role: 'user' as any, // 临时修复，稍后会正确导入枚举
    isActive: true,
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
    lastLoginAt: null,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      bio: 'Test User Account',
      phone: null,
      address: null,
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          push: false,
          sms: false,
          browser: false
        }
      }
    }
  }
];

/**
 * 用户数据访问对象
 */
export const userDao = {
  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    const user = users.find(u => u.id === id);
    return user || null;
  },

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const user = users.find(u => u.username === username);
    return user || null;
  },

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = users.find(u => u.email === email);
    return user || null;
  },

  /**
   * 创建新用户
   */
  async create(userData: CreateUserData): Promise<User> {
    const newUser: User = {
      id: (users.length + 1).toString(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user' as any,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      profile: {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        avatar: null,
        bio: '',
        phone: null,
        address: null,
        preferences: {
          theme: 'light',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          notifications: {
            email: true,
            push: true,
            sms: false,
            browser: true
          }
        }
      }
    };

    users.push(newUser);
    return newUser;
  },

  /**
   * 更新用户信息
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return null;
    }

    const user = users[userIndex];
    const updatedUser: User = {
      ...user,
      ...updateData,
      updatedAt: new Date().toISOString(),
      profile: {
        ...user.profile,
        ...updateData.profile
      }
    };

    users[userIndex] = updatedUser;
    return updatedUser;
  },

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return false;
    }

    users.splice(userIndex, 1);
    return true;
  },

  /**
   * 获取所有用户
   */
  async findAll(): Promise<User[]> {
    return [...users];
  },

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    const user = users.find(u => u.id === id);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
    }
  },

  /**
   * 验证用户凭据
   */
  async validateCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username) || await this.findByEmail(username);
    if (!user || !user.isActive) {
      return null;
    }

    // 在实际应用中，这里应该使用 bcrypt 比较密码
    // 这里为了简化，直接比较（不安全，仅用于演示）
    if (user.password === password) {
      return user;
    }

    return null;
  },

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  },

  /**
   * 检查邮箱是否存在
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  },

  /**
   * 分页查询用户
   */
  async findWithPagination(page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      total: users.length,
      page,
      limit,
      totalPages: Math.ceil(users.length / limit)
    };
  },

  /**
   * 搜索用户
   */
  async search(query: string): Promise<User[]> {
    const lowercaseQuery = query.toLowerCase();
    return users.filter(user =>
      user.username.toLowerCase().includes(lowercaseQuery) ||
      user.email.toLowerCase().includes(lowercaseQuery) ||
      user.profile.firstName?.toLowerCase().includes(lowercaseQuery) ||
      user.profile.lastName?.toLowerCase().includes(lowercaseQuery)
    );
  },

  /**
   * 按角色查找用户
   */
  async findByRole(role: string): Promise<User[]> {
    return users.filter(user => user.role === role);
  },

  /**
   * 获取活跃用户数量
   */
  async getActiveUserCount(): Promise<number> {
    return users.filter(user => user.isActive).length;
  },

  /**
   * 批量更新用户状态
   */
  async batchUpdateStatus(userIds: string[], isActive: boolean): Promise<number> {
    let updatedCount = 0;

    for (const id of userIds) {
      const user = users.find(u => u.id === id);
      if (user) {
        user.isActive = isActive;
        user.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    }

    return updatedCount;
  }
};

export default userDao;
