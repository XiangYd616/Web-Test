# 环境配置指南

## NODE_ENV 配置说明

### ⚠️ 重要提示

**Vite 不支持在 `.env` 文件中设置 `NODE_ENV`**。如果在 `.env` 文件中设置 `NODE_ENV=production`，会出现以下警告：

```
NODE_ENV=production is not supported in the .env file. 
Only NODE_ENV=development is supported to create a development build of your project. 
If you need to set process.env.NODE_ENV, you can set it in the Vite config instead.
```

### ✅ 正确的配置方法

#### 1. 在构建脚本中设置 NODE_ENV

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production tsc --noEmit && cross-env NODE_ENV=production vite build",
    "build:dev": "tsc --noEmit && vite build",
    "dev": "vite --mode development"
  }
}
```

#### 2. 在 Vite 配置中使用 NODE_ENV

```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production'
  }
})
```

### 📁 环境文件结构

```
项目根目录/
├── .env                    # 前端和全局配置
├── .env.production         # 生产环境配置模板（不包含NODE_ENV）
├── .env.example           # 配置示例
└── server/
    ├── .env               # 后端专用配置
    ├── .env.example       # 后端配置示例
    └── .env.local         # 本地开发配置
```

### 🔧 环境变量分工

#### 根目录 `.env` (前端和全局)
- 前端配置 (`VITE_*`)
- 缓存配置 (`REDIS_*`)
- 外部API配置 (`GOOGLE_*`, `GTMETRIX_*`)

#### `server/.env` (后端专用)
- 数据库连接 (`DATABASE_URL`, `DB_*`)
- 认证安全 (`JWT_*`, `SESSION_*`)
- 邮件配置 (`SMTP_*`)
- 地理位置服务 (`MAXMIND_*`)

#### `.env.production` (生产环境模板)
- 生产环境的配置模板
- **不包含 `NODE_ENV`**（已注释）
- 包含生产环境的数据库、域名等配置

### 🚀 部署配置

#### 开发环境
```bash
npm run dev          # 自动使用 NODE_ENV=development
```

#### 生产构建
```bash
npm run build        # 使用 cross-env 设置 NODE_ENV=production
```

#### 生产部署
1. 复制 `.env.production` 为 `.env`
2. 修改其中的配置为实际生产环境值
3. 确保不包含 `NODE_ENV` 设置
4. 运行构建命令

### 🔍 故障排除

#### 问题：构建时出现 NODE_ENV 警告
**原因**：在 `.env` 文件中设置了 `NODE_ENV`

**解决方案**：
1. 从 `.env` 文件中移除 `NODE_ENV` 设置
2. 在构建脚本中使用 `cross-env NODE_ENV=production`

#### 问题：环境变量在前端无法访问
**原因**：前端只能访问 `VITE_` 开头的环境变量

**解决方案**：
1. 前端环境变量必须以 `VITE_` 开头
2. 敏感配置不要使用 `VITE_` 前缀

### 📋 最佳实践

1. **前端配置**：使用 `VITE_` 前缀
2. **后端配置**：放在 `server/.env`
3. **敏感信息**：只在后端配置
4. **NODE_ENV**：通过构建脚本设置
5. **生产环境**：使用独立的配置文件

### 🛠️ 验证工具

```bash
# 检查环境变量配置
npm run env:check

# 验证配置分离
npm run env:separation

# 生成使用情况报告
npm run env:report
```

这样配置确保了：
- ✅ 构建无警告
- ✅ 环境变量正确分离
- ✅ 生产环境安全
- ✅ 开发体验良好
