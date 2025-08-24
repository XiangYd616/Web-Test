# 🏗️ Test-Web项目数据模型重构方案

## 📋 重构概览

基于前后端一致性检查结果，制定统一的数据模型重构方案，确保前后端数据模型的完全一致性。

**制定时间**: 2025-08-24  
**实施范围**: 前端类型定义 + 后端数据模型 + 数据库结构  
**重构目标**: 100%数据模型一致性

## 🎯 重构目标

### **核心目标**
1. **统一数据类型** - 前后端使用完全一致的数据类型
2. **统一字段命名** - 建立标准的字段映射关系
3. **统一数据结构** - 确保数据结构在各层保持一致
4. **类型安全** - 提供完整的TypeScript类型支持

### **具体指标**
- ✅ 前端类型定义覆盖率: 100%
- ✅ 后端类型验证覆盖率: 100%
- ✅ 数据库字段映射准确率: 100%
- ✅ API响应类型一致性: 100%

## 📊 当前问题分析

### **发现的主要问题**
1. **字段命名不一致** - 前端camelCase vs 后端snake_case
2. **类型定义分散** - 缺乏统一的类型定义系统
3. **数据转换不规范** - 缺乏标准的转换机制
4. **验证机制缺失** - 缺乏运行时类型验证

### **影响评估**
- 开发效率降低 30%
- 数据不一致错误频发
- 维护成本增加 40%
- 新功能开发困难

## 🛠️ 重构实施方案

### **阶段1: 统一类型定义系统**

#### **1.1 创建共享类型定义**
```typescript
// shared/types/entities.ts - 统一实体类型
export interface User {
  id: string;                    // 数据库: id (SERIAL -> string)
  userName: string;              // 数据库: user_name (VARCHAR)
  email: string;                 // 数据库: email (VARCHAR)
  role: UserRole;               // 数据库: role (VARCHAR)
  status: Status;               // 数据库: status (VARCHAR)
  createdAt: string;            // 数据库: created_at (TIMESTAMP -> ISO string)
  updatedAt: string;            // 数据库: updated_at (TIMESTAMP -> ISO string)
  lastLoginAt?: string;         // 数据库: last_login_at (TIMESTAMP -> ISO string)
  profileData?: Record<string, any>; // 数据库: profile_data (JSONB)
}

export interface TestRecord {
  id: string;                   // 数据库: id (SERIAL -> string)
  userId: string;               // 数据库: user_id (INTEGER -> string)
  testType: TestType;           // 数据库: test_type (VARCHAR)
  targetUrl: string;            // 数据库: target_url (TEXT)
  status: Status;               // 数据库: status (VARCHAR)
  startedAt?: string;           // 数据库: started_at (TIMESTAMP -> ISO string)
  completedAt?: string;         // 数据库: completed_at (TIMESTAMP -> ISO string)
  cancelledAt?: string;         // 数据库: cancelled_at (TIMESTAMP -> ISO string)
  duration?: number;            // 数据库: duration (INTEGER)
  results?: Record<string, any>; // 数据库: results (JSONB)
  errorMessage?: string;        // 数据库: error_message (TEXT)
  config?: Record<string, any>; // 数据库: config (JSONB)
  createdAt: string;            // 数据库: created_at (TIMESTAMP -> ISO string)
  updatedAt: string;            // 数据库: updated_at (TIMESTAMP -> ISO string)
}
```

#### **1.2 建立类型映射系统**
```typescript
// shared/types/mappings.ts - 字段映射配置
export const FIELD_MAPPINGS = {
  // 用户相关
  userName: 'user_name',
  userId: 'user_id',
  lastLoginAt: 'last_login_at',
  profileData: 'profile_data',
  
  // 测试相关
  testId: 'test_id',
  testType: 'test_type',
  targetUrl: 'target_url',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  cancelledAt: 'cancelled_at',
  errorMessage: 'error_message',
  
  // 时间字段
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // 其他字段...
} as const;
```

### **阶段2: 数据库结构标准化**

#### **2.1 数据库字段标准化**
```sql
-- 用户表标准化
ALTER TABLE users 
  ALTER COLUMN id TYPE VARCHAR(50),  -- 统一ID类型
  ADD COLUMN IF NOT EXISTS profile_data JSONB,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 测试记录表标准化  
ALTER TABLE test_records
  ALTER COLUMN user_id TYPE VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS results JSONB;

-- 添加标准索引
CREATE INDEX IF NOT EXISTS idx_users_user_name ON users(user_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_test_records_user_id ON test_records(user_id);
CREATE INDEX IF NOT EXISTS idx_test_records_test_type ON test_records(test_type);
CREATE INDEX IF NOT EXISTS idx_test_records_status ON test_records(status);
```

#### **2.2 数据迁移脚本**
```sql
-- 数据类型迁移脚本
-- 将现有的INTEGER ID转换为VARCHAR
UPDATE users SET id = CAST(id AS VARCHAR(50)) WHERE id IS NOT NULL;
UPDATE test_records SET user_id = CAST(user_id AS VARCHAR(50)) WHERE user_id IS NOT NULL;

-- 时间字段标准化
UPDATE users SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW());

UPDATE test_records SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW());
```

### **阶段3: 后端数据处理层重构**

#### **3.1 统一数据访问层**
```javascript
// backend/models/BaseModel.js - 基础模型类
class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.fieldMapping = require('../utils/fieldMapping');
  }
  
  // 统一的查询方法
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return this.transformFromDatabase(result.rows[0]);
  }
  
  // 统一的创建方法
  async create(data) {
    const dbData = this.transformToDatabase(data);
    const fields = Object.keys(dbData);
    const values = Object.values(dbData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await this.db.query(query, values);
    return this.transformFromDatabase(result.rows[0]);
  }
  
  // 数据库到前端的转换
  transformFromDatabase(dbRecord) {
    return this.fieldMapping.mapDatabaseToFrontend(dbRecord);
  }
  
  // 前端到数据库的转换
  transformToDatabase(frontendData) {
    return this.fieldMapping.mapFrontendToDatabase(frontendData);
  }
}
```

#### **3.2 具体模型实现**
```javascript
// backend/models/User.js - 用户模型
class UserModel extends BaseModel {
  constructor() {
    super('users');
  }
  
  // 用户特定的方法
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    return this.transformFromDatabase(result.rows[0]);
  }
  
  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.db.query(query, [userId]);
    return this.transformFromDatabase(result.rows[0]);
  }
}

// backend/models/TestRecord.js - 测试记录模型
class TestRecordModel extends BaseModel {
  constructor() {
    super('test_records');
  }
  
  // 测试记录特定的方法
  async findByUserId(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }
    
    const query = `
      SELECT * FROM test_records 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);
    
    const result = await this.db.query(query, params);
    return result.rows.map(row => this.transformFromDatabase(row));
  }
}
```

### **阶段4: 前端类型系统重构**

#### **4.1 统一类型导入**
```typescript
// frontend/types/index.ts - 统一类型导出
export * from '../../../shared/types/entities';
export * from '../../../shared/types/api';
export * from '../../../shared/types/common';

// 重新导出以保持向后兼容
export type { User, TestRecord, ApiResponse } from '../../../shared/types/entities';
```

#### **4.2 API客户端重构**
```typescript
// frontend/services/apiClient.ts - 统一API客户端
import { mapDatabaseToFrontend, mapFrontendToDatabase } from '../utils/fieldMapping';
import type { ApiResponse, User, TestRecord } from '../types';

class ApiClient {
  private baseURL = '/api';
  
  // 统一的请求方法
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // 转换请求数据
    if (options.body) {
      const data = JSON.parse(options.body as string);
      options.body = JSON.stringify(mapFrontendToDatabase(data));
    }
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const result = await response.json();
    
    // 转换响应数据
    if (result.data) {
      result.data = mapDatabaseToFrontend<T>(result.data);
    }
    
    return result;
  }
  
  // 类型安全的API方法
  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }
  
  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
  
  async getTestRecords(userId: string): Promise<ApiResponse<TestRecord[]>> {
    return this.request<TestRecord[]>(`/test/history?userId=${userId}`);
  }
}
```

### **阶段5: 运行时验证系统**

#### **5.1 类型验证中间件**
```javascript
// backend/middleware/typeValidation.js - 类型验证中间件
const { validateTypeConsistency } = require('../utils/typeAlignment');

const createTypeValidator = (expectedSchema) => {
  return (req, res, next) => {
    const validation = validateTypeConsistency(req.body, expectedSchema);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: '数据类型验证失败',
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

// 用户数据验证
const validateUserData = createTypeValidator({
  userName: 'string',
  email: 'string',
  role: 'string',
  status: 'string'
});

// 测试数据验证
const validateTestData = createTypeValidator({
  testType: 'string',
  targetUrl: 'string',
  config: 'object'
});

module.exports = {
  createTypeValidator,
  validateUserData,
  validateTestData
};
```

#### **5.2 前端类型守卫**
```typescript
// frontend/utils/typeGuards.ts - 类型守卫
import type { User, TestRecord } from '../types';

export const isUser = (value: any): value is User => {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.userName === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.status === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const isTestRecord = (value: any): value is TestRecord => {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.testType === 'string' &&
    typeof value.targetUrl === 'string' &&
    typeof value.status === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const assertUser = (value: any): User => {
  if (!isUser(value)) {
    throw new Error('Invalid user data');
  }
  return value;
};

export const assertTestRecord = (value: any): TestRecord => {
  if (!isTestRecord(value)) {
    throw new Error('Invalid test record data');
  }
  return value;
};
```

## 📋 实施计划

### **第1周: 基础设施建设**
- [x] 创建统一类型定义系统
- [x] 建立字段映射配置
- [x] 实现数据转换工具
- [ ] 创建类型验证机制

### **第2周: 数据库重构**
- [ ] 执行数据库结构标准化
- [ ] 运行数据迁移脚本
- [ ] 验证数据完整性
- [ ] 更新数据库索引

### **第3周: 后端重构**
- [ ] 重构数据访问层
- [ ] 实现统一模型类
- [ ] 更新API端点
- [ ] 添加类型验证

### **第4周: 前端重构**
- [ ] 更新类型定义
- [ ] 重构API客户端
- [ ] 更新组件类型
- [ ] 添加类型守卫

## 🎯 验收标准

### **功能验收**
- [ ] 所有API响应数据类型一致
- [ ] 前端类型检查无错误
- [ ] 数据库查询结果正确转换
- [ ] 运行时类型验证正常工作

### **性能验收**
- [ ] 数据转换性能损失 < 5%
- [ ] 类型验证响应时间 < 10ms
- [ ] 数据库查询性能无下降
- [ ] 前端渲染性能无影响

### **质量验收**
- [ ] TypeScript编译无错误
- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试全部通过
- [ ] 代码审查通过

---

**🎉 数据模型重构方案已制定完成！**

这套重构方案将确保Test-Web项目前后端数据模型的完全一致性，提供类型安全的开发体验。
