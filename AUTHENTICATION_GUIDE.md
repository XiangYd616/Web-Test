# 🔐 认证系统统一指南

## 问题分析

你遇到的401错误是因为开发环境和生产环境使用了不同的认证系统：

### 🔄 当前存在的两套系统

#### 1. **完整版后端** (`server/app.js` + PostgreSQL)
- **启动命令**: `cd server && npm run dev` 或 `npm start`
- **端口**: 3001
- **数据库**: PostgreSQL (testweb_prod)
- **用户管理**: 完整的用户注册/登录系统
- **Token格式**: `{ token: "...", user: {...} }`
- **认证字段**: `identifier` (用户名或邮箱)

#### 2. **简化版后端** (`server/simple-start.js` + 内存存储)
- **启动命令**: `cd server && node simple-start.js`
- **端口**: 3001
- **数据库**: 内存存储 (Map)
- **用户管理**: 预设管理员账户
- **Token格式**: `{ tokens: { accessToken: "..." }, user: {...} }`
- **认证字段**: `identifier` (用户名或邮箱)

## 🎯 推荐解决方案

### 方案一：使用简化版后端（快速开发）⭐

**适用场景**: 快速开发、测试、演示

```bash
# 1. 停止当前后端
# 按 Ctrl+C 停止正在运行的服务

# 2. 启动简化版后端
cd server
node simple-start.js
```

**预设管理员账户**:
- **账户1**: `admin@test.com` / `admin123`
- **账户2**: `admin@testweb.com` / `admin123`
- **用户名登录**: `admin` / `admin123`

### 方案二：使用完整版后端（生产就绪）

**适用场景**: 生产环境、完整功能测试

```bash
# 1. 确保PostgreSQL运行
net start postgresql-x64-14

# 2. 检查.env配置
cd server
# 确保.env文件包含正确的数据库配置

# 3. 启动完整版后端
npm run dev
```

## 🔧 修复前端兼容性

我已经修复了前端代码，使其兼容两种后端：

### AuthContext.tsx 修复
```typescript
// 兼容两种token格式
if (result.token) {
  localStorage.setItem('auth_token', result.token);
} else if (result.tokens?.accessToken) {
  localStorage.setItem('auth_token', result.tokens.accessToken);
}
```

### DataManagement.tsx 修复
```typescript
// 兼容token获取
const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
```

## 🚀 立即解决401错误

### 步骤1: 停止当前后端
```bash
# 在运行后端的终端按 Ctrl+C
```

### 步骤2: 启动简化版后端
```bash
cd server
node simple-start.js
```

### 步骤3: 使用预设账户登录
- **用户名**: `admin`
- **密码**: `admin123`

或者

- **邮箱**: `admin@test.com`
- **密码**: `admin123`

## 📋 后端启动命令对比

| 命令 | 后端类型 | 数据库 | 用户系统 | 推荐场景 |
|------|----------|--------|----------|----------|
| `node simple-start.js` | 简化版 | 内存 | 预设账户 | 开发/测试 ⭐ |
| `npm run dev` | 完整版 | PostgreSQL | 完整注册 | 生产环境 |
| `npm start` | 完整版 | PostgreSQL | 完整注册 | 生产部署 |

## 🔍 如何确认后端类型

访问 `http://localhost:3001/api/info` 查看响应：

```json
// 简化版
{
  "mode": "simplified",
  "environment": "development"
}

// 完整版
{
  "mode": "production",
  "database": "connected"
}
```

## 💡 最佳实践建议

1. **开发阶段**: 使用 `simple-start.js` 快速开发
2. **测试阶段**: 使用完整版后端测试完整功能
3. **生产部署**: 使用完整版后端 + PostgreSQL

## 🐛 常见问题解决

### Q: 401 Unauthorized
**A**: 检查后端类型，使用对应的预设账户登录

### Q: 端口冲突
**A**: 确保只运行一个后端服务，检查端口3001占用

### Q: Token格式错误
**A**: 前端已修复兼容性，重新登录即可

---

**立即行动**: 使用 `node simple-start.js` 启动后端，然后用 `admin/admin123` 登录！
