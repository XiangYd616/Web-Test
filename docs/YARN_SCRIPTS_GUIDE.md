# 📚 Yarn 脚本使用指南

## 🚀 快速开始

### 首次设置
```bash
# 1. 安装依赖
yarn install

# 2. 初始化数据库
yarn db:init

# 3. 启动开发环境
yarn dev
```

## 📋 脚本分类说明

### 🚀 主要启动命令

#### `yarn start`
启动完整应用（前端 + 后端）
- 前端: http://localhost:5174
- 后端: http://localhost:3001

#### `yarn dev`
启动开发环境（带热重载）
- 前端开发服务器 + 后端开发服务器
- 文件变化时自动重启

#### `yarn frontend`
仅启动前端开发服务器
- 端口: 5174
- 支持热重载

#### `yarn backend`
仅启动后端生产服务器

#### `yarn backend:dev`
仅启动后端开发服务器（带热重载）

### 📦 构建相关

#### `yarn build`
构建前端生产版本
- 输出目录: `dist/`
- 优化和压缩代码

#### `yarn build:check`
构建前进行类型检查
- 先运行TypeScript类型检查
- 然后执行构建

#### `yarn preview`
预览构建后的应用

#### `yarn type-check`
仅运行TypeScript类型检查

### 🗄️ 数据库管理

#### `yarn db:init`
初始化数据库
- 创建数据库表结构
- 插入初始数据

#### `yarn db:migrate`
运行数据库迁移
- 应用数据库结构变更

#### `yarn db:status`
检查数据库连接和状态

#### `yarn db:backup`
备份数据库数据

### 🧪 测试相关

#### `yarn test`
运行前端测试（Vitest）
- 交互式测试模式

#### `yarn test:run`
运行所有测试（一次性）

#### `yarn test:coverage`
运行测试并生成覆盖率报告

#### `yarn e2e`
运行端到端测试（Playwright）

#### `yarn e2e:ui`
运行E2E测试UI界面

#### `yarn e2e:headed`
运行有头模式的E2E测试

#### `yarn e2e:debug`
调试模式运行E2E测试

### ⚡ Electron应用

#### `yarn electron:start`
启动Electron应用

#### `yarn electron:dev`
启动Electron开发环境
- 前端开发服务器 + Electron窗口

#### `yarn electron:build`
构建Electron应用
- 生成可执行文件

#### `yarn electron:dist`
构建并打包Electron应用

### 🔧 项目维护

#### `yarn lint`
代码风格检查
- 检查TypeScript/JavaScript代码

#### `yarn lint:fix`
自动修复代码风格问题

#### `yarn format`
格式化代码
- 使用Prettier格式化

#### `yarn format:check`
检查代码格式

#### `yarn ci:check`
CI/CD检查
- 类型检查 + 代码检查 + 构建

#### `yarn deps:update`
更新依赖包到最新版本

### 🧹 清理操作

#### `yarn clean`
清理构建缓存
- 删除dist、node_modules/.cache等

#### `yarn clean:all`
完全清理
- 删除所有构建产物和node_modules

### 🔧 实用工具

#### `yarn fix:imports`
修复导入和命名问题

#### `yarn fix:imports:precise`
精确修复导入问题

#### `yarn fix:imports:duplicate`
修复重复导入

#### `yarn fix:naming:unified`
统一命名规范

#### `yarn fix:all`
运行所有修复工具

#### `yarn scripts:validate`
验证脚本配置

## 🎯 常用工作流

### 日常开发流程
```bash
# 1. 启动开发环境
yarn dev

# 2. 代码开发...

# 3. 运行测试
yarn test

# 4. 代码检查和格式化
yarn lint:fix
yarn format

# 5. 提交代码前检查
yarn ci:check
```

### 数据库操作流程
```bash
# 检查数据库状态
yarn db:status

# 如果需要重新初始化
yarn db:init

# 运行迁移（如果有新的迁移文件）
yarn db:migrate

# 备份数据库（重要操作前）
yarn db:backup
```

### 构建和部署流程
```bash
# 1. 运行完整检查
yarn ci:check

# 2. 构建前端
yarn build

# 3. 预览构建结果
yarn preview

# 4. 构建Electron应用（如果需要）
yarn electron:build
```

### 问题排查流程
```bash
# 1. 检查数据库连接
yarn db:status

# 2. 检查后端健康状态
cd backend && yarn health:check

# 3. 检查Redis连接
cd backend && yarn redis:check

# 4. 查看缓存统计
cd backend && yarn cache:stats

# 5. 清理并重新安装（最后手段）
yarn clean:all
yarn install
```

## ⚡ Yarn 特有功能

### 工作区支持
```bash
# 查看工作区信息
yarn workspaces info

# 在特定工作区运行命令
yarn workspace backend run dev
yarn workspace frontend run build
```

### 全局包管理
```bash
# 安装全局包
yarn global add <package>

# 查看全局包
yarn global list

# 移除全局包
yarn global remove <package>
```

### 缓存管理
```bash
# 查看缓存目录
yarn cache dir

# 清理缓存
yarn cache clean

# 验证缓存完整性
yarn cache verify
```

### 依赖分析
```bash
# 分析包大小
yarn why <package>

# 检查过时的依赖
yarn outdated

# 升级交互式选择
yarn upgrade-interactive
```

## 🔍 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   yarn cache clean
   rm -rf node_modules yarn.lock
   yarn install
   ```

2. **构建错误**
   ```bash
   yarn clean
   yarn install
   yarn build
   ```

3. **类型错误**
   ```bash
   yarn type-check
   yarn fix:imports
   ```

4. **格式问题**
   ```bash
   yarn lint:fix
   yarn format
   ```

### 性能优化

1. **使用离线模式**
   ```bash
   yarn install --offline
   ```

2. **跳过可选依赖**
   ```bash
   yarn install --ignore-optional
   ```

3. **并行安装**
   ```bash
   yarn install --network-concurrency 8
   ```

## 📝 最佳实践

1. **始终使用yarn.lock**
   - 确保所有环境使用相同的依赖版本
   - 不要手动编辑yarn.lock文件

2. **定期更新依赖**
   ```bash
   yarn outdated
   yarn upgrade-interactive
   ```

3. **使用脚本别名**
   - 为常用命令创建简短别名
   - 提高开发效率

4. **监控包大小**
   ```bash
   yarn why <package>
   # 分析包的依赖链
   ```

5. **安全审计**
   ```bash
   yarn audit
   yarn audit --fix
   ```

## 🎓 从 npm 迁移说明

如果你之前使用npm，以下是主要命令对照：

| npm 命令 | yarn 命令 | 说明 |
|---------|----------|------|
| `npm install` | `yarn` 或 `yarn install` | 安装所有依赖 |
| `npm install <pkg>` | `yarn add <pkg>` | 添加依赖 |
| `npm install <pkg> --save-dev` | `yarn add <pkg> --dev` | 添加开发依赖 |
| `npm uninstall <pkg>` | `yarn remove <pkg>` | 移除依赖 |
| `npm update` | `yarn upgrade` | 更新依赖 |
| `npm run <script>` | `yarn <script>` | 运行脚本 |
| `npx <command>` | `yarn dlx <command>` | 执行包命令 |

---

💡 **提示**: 本项目已完全迁移到yarn，所有脚本和CI/CD都已更新。更多详细信息请查看 [YARN_MIGRATION_GUIDE.md](YARN_MIGRATION_GUIDE.md)
