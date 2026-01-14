/**
 * 用户数据访问对象
 * 提供用户相关的数据库操作
 */

import { UserRole, UserStatus } from '../../types/enums';
import type { CreateUserData, UpdateUserData } from '../../types/user';

type UserRecord = {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive?: boolean;
  profile: {
    firstName?: string;
    lastName?: string;
    bio?: string;
  };
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      browser: boolean;
      testComplete?: boolean;
      testFailed?: boolean;
      weeklyReport?: boolean;
      securityAlert?: boolean;
    };
    dashboard: {
      layout: string;
      widgets: string[];
      defaultView?: string;
      refreshInterval?: number;
    };
  };
};

// 模拟用户数据存储
const users: UserRecord[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', // 'admin123'
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    permissions: [],
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: undefined,
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      bio: 'System Administrator',
    },
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: true,
        sms: false,
        browser: true,
      },
      dashboard: {
        layout: 'grid',
        widgets: ['overview', 'recent-tests'],
      },
    },
  },
  {
    id: '2',
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', // 'test123'
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    permissions: [],
    emailVerified: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    lastLoginAt: undefined,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      bio: 'Test User Account',
    },
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: false,
        sms: false,
        browser: false,
      },
      dashboard: {
        layout: 'list',
        widgets: ['recent-tests'],
      },
    },
  },
];

/**
 * 用户数据访问对象
 */
export const userDao = {
  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<UserRecord | null> {
    const user = users.find(u => u.id === id);
    return user || null;
  },

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<UserRecord | null> {
    const user = users.find(u => u.username === username);
    return user || null;
  },

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = users.find(u => u.email === email);
    return user || null;
  },

  /**
   * 创建新用户
   */
  async create(userData: CreateUserData): Promise<UserRecord> {
    const newUser: UserRecord = {
      id: (users.length + 1).toString(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: (userData.role as unknown as UserRole) || UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: [],
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: undefined,
      profile: {
        firstName: (userData as any).firstName || '',
        lastName: (userData as any).lastName || '',
        bio: '',
      },
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          push: true,
          sms: false,
          browser: true,
        },
        dashboard: {
          layout: 'grid',
          widgets: ['overview'],
        },
      },
    };

    users.push(newUser);
    return newUser;
  },

  /**
   * 更新用户信息
   */
  async update(id: string, updateData: UpdateUserData): Promise<UserRecord | null> {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return null;
    }

    const user = users[userIndex];
    const updatedUser: UserRecord = {
      ...user,
      ...updateData,
      role: (updateData as any).role
        ? ((updateData as any).role as unknown as UserRole)
        : user.role,
      status: (updateData as any).status
        ? ((updateData as any).status as unknown as UserStatus)
        : user.status,
      updatedAt: new Date().toISOString(),
      profile: {
        ...user.profile,
        ...(updateData as any).profile,
      },
      preferences: {
        ...user.preferences,
        ...(updateData as any).preferences,
      },
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
  async findAll(): Promise<UserRecord[]> {
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
  async validateCredentials(username: string, password: string): Promise<UserRecord | null> {
    const user = (await this.findByUsername(username)) || (await this.findByEmail(username));
    if (!user || user.isActive === false) {
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
  async findWithPagination(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: UserRecord[];
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
      totalPages: Math.ceil(users.length / limit),
    };
  },

  /**
   * 搜索用户
   */
  async search(query: string): Promise<UserRecord[]> {
    const lowercaseQuery = query.toLowerCase();
    return users.filter(
      user =>
        user.username.toLowerCase().includes(lowercaseQuery) ||
        user.email.toLowerCase().includes(lowercaseQuery) ||
        user.profile.firstName?.toLowerCase().includes(lowercaseQuery) ||
        user.profile.lastName?.toLowerCase().includes(lowercaseQuery)
    );
  },

  /**
   * 按角色查找用户
   */
  async findByRole(role: string): Promise<UserRecord[]> {
    return users.filter(user => String(user.role) === role);
  },

  /**
   * 获取活跃用户数量
   */
  async getActiveUserCount(): Promise<number> {
    return users.filter(user => user.isActive !== false).length;
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
  },
};

export default userDao;
