# 👨‍💻 Test-Web 开发者指南

**版本**: v2.0  
**最后更新**: 2026-01-14

---

## 🎯 快速开始

### 环境要求

```
Node.js: >= 18.0.0
npm: >= 9.0.0
Git: 最新版本
操作系统: Windows/macOS/Linux
```

### 首次设置

```bash
# 1. 克隆项目
git clone <repository-url>
cd Test-Web

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 4. 启动开发服务器
npm run dev
```

### 验证安装

```bash
# 检查TypeScript
npm run type-check

# 运行测试
npm run test

# 构建项目
npm run build
```

---

## 📁 项目结构

### 根目录结构

```
Test-Web/
├── frontend/              # 前端应用
├── backend/              # 后端服务
├── shared/               # 共享代码
├── docs/                 # 项目文档
├── tests/                # 测试文件
├── tools/                # 开发工具
├── config/               # 配置文件
└── deploy/               # 部署相关
```

### 前端结构

```
frontend/
├── components/           # UI组件
│   ├── ui/              # 基础UI组件
│   ├── business/        # 业务组件
│   └── layout/          # 布局组件
├── pages/               # 页面组件
├── services/            # 服务层
│   ├── api/            # API客户端
│   ├── business/       # 业务服务
│   └── cache/          # 缓存服务
├── hooks/               # 自定义Hooks
├── types/               # TypeScript类型
├── utils/               # 工具函数
└── styles/              # 样式文件
```

### 后端结构

```
backend/
├── api/                 # API层
│   ├── controllers/    # 控制器
│   ├── routes/         # 路由
│   └── middleware/     # 中间件
├── services/            # 业务服务
├── engines/             # 测试引擎
│   ├── shared/         # 共享服务
│   └── [specific]/     # 特定引擎
├── models/              # 数据模型
├── utils/               # 工具函数
└── config/              # 配置文件
```

---

## 🛠️ 开发工作流

### 分支策略

```
main                    # 主分支，生产环境
├── develop            # 开发分支
│   ├── feature/*      # 功能分支
│   ├── refactor/*     # 重构分支
│   ├── fix/*          # 修复分支
│   └── docs/*         # 文档分支
```

### 开发流程

1. **创建分支**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **开发功能**
   - 编写代码
   - 编写测试
   - 运行测试
   - 修复问题

3. **提交代码**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **推送分支**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建PR**
   - 在GitHub创建Pull Request
   - 等待代码审查
   - 根据反馈修改
   - 合并到develop

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新功能
fix: Bug修复
refactor: 重构
docs: 文档更新
test: 测试相关
chore: 构建/工具相关
style: 代码格式
perf: 性能优化
```

**示例**:

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
git commit -m "refactor: unify API services"
git commit -m "docs: update developer guide"
```

---

## 💻 常见开发任务

### 添加新页面

1. **创建页面组件**

   ```typescript
   // frontend/pages/NewPage.tsx
   import React from 'react';

   export const NewPage: React.FC = () => {
     return <div>New Page</div>;
   };
   ```

2. **添加路由**

   ```typescript
   // frontend/App.tsx
   import { NewPage } from './pages/NewPage';

   <Route path="/new-page" element={<NewPage />} />
   ```

3. **添加导航**
   ```typescript
   // 在导航组件中添加链接
   <Link to="/new-page">New Page</Link>
   ```

### 添加新API

1. **后端：创建路由**

   ```javascript
   // backend/routes/api/v1/newResource.js
   const express = require('express');
   const router = express.Router();

   router.get('/', async (req, res) => {
     // 处理逻辑
   });

   module.exports = router;
   ```

2. **后端：注册路由**

   ```javascript
   // backend/routes/api/v1/index.js
   const newResourceRoutes = require('./newResource');
   router.use('/new-resource', newResourceRoutes);
   ```

3. **前端：调用API**

   ```typescript
   // frontend/services/api/repositories/newResourceRepository.ts
   import { apiClient } from '../client';

   export class NewResourceRepository {
     async getAll() {
       return apiClient.get('/api/v1/new-resource');
     }
   }
   ```

### 添加新组件

1. **创建组件文件**

   ```typescript
   // frontend/components/ui/NewComponent.tsx
   import React from 'react';

   interface NewComponentProps {
     title: string;
   }

   export const NewComponent: React.FC<NewComponentProps> = ({ title }) => {
     return <div>{title}</div>;
   };
   ```

2. **添加样式**

   ```typescript
   // 使用TailwindCSS
   <div className="p-4 bg-white rounded-lg shadow">
     {title}
   </div>
   ```

3. **导出组件**
   ```typescript
   // frontend/components/ui/index.ts
   export { NewComponent } from './NewComponent';
   ```

### 添加新测试

1. **单元测试**

   ```typescript
   // frontend/components/ui/__tests__/NewComponent.test.tsx
   import { render, screen } from '@testing-library/react';
   import { NewComponent } from '../NewComponent';

   describe('NewComponent', () => {
     it('renders title', () => {
       render(<NewComponent title="Test" />);
       expect(screen.getByText('Test')).toBeInTheDocument();
     });
   });
   ```

2. **运行测试**
   ```bash
   npm run test
   npm run test:watch  # 监听模式
   npm run test:coverage  # 覆盖率
   ```

---

## 🔧 调试技巧

### 前端调试

1. **使用React DevTools**
   - 安装浏览器扩展
   - 检查组件树
   - 查看Props和State

2. **使用Console**

   ```typescript
   console.log('Debug:', data);
   console.table(array);
   console.error('Error:', error);
   ```

3. **使用Debugger**

   ```typescript
   debugger; // 在代码中设置断点
   ```

4. **网络请求调试**
   - 使用浏览器开发者工具
   - 检查Network标签
   - 查看请求/响应

### 后端调试

1. **使用日志**

   ```javascript
   const logger = require('./utils/logger');
   logger.info('Info message');
   logger.error('Error message', error);
   ```

2. **使用Node.js调试器**

   ```bash
   node --inspect backend/server.js
   # 在Chrome中打开 chrome://inspect
   ```

3. **使用Postman测试API**
   - 导入API集合
   - 测试各个端点
   - 检查响应

---

## 📝 代码规范

### TypeScript规范

```typescript
// ✅ 好的做法
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`/users/${id}`);
}

// ❌ 避免
function getUser(id: any): any {
  return apiClient.get(`/users/${id}`);
}
```

### React规范

```typescript
// ✅ 好的做法
export const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 副作用逻辑
  }, []);

  return <div>{user.name}</div>;
};

// ❌ 避免
export default function UserCard(props) {
  // 缺少类型定义
  // 使用default export
}
```

### 命名规范

```typescript
// 组件: PascalCase
export const UserProfile: React.FC = () => {};

// 函数: camelCase
function getUserData() {}

// 常量: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://api.example.com';

// 类型/接口: PascalCase
interface UserData {}
type UserId = string;

// 文件名:
// - 组件: PascalCase (UserProfile.tsx)
// - 其他: camelCase (userService.ts)
```

---

## 🧪 测试指南

### 测试策略

```
单元测试: 80%+ 覆盖率
集成测试: 关键业务流程
E2E测试: 核心用户路径
```

### 编写测试

```typescript
// 单元测试示例
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user data', async () => {
      const user = await userService.getUser('123');
      expect(user).toBeDefined();
      expect(user.id).toBe('123');
    });

    it('should throw error for invalid id', async () => {
      await expect(userService.getUser('')).rejects.toThrow();
    });
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# E2E测试
npm run e2e
```

---

## 🚀 部署流程

### 开发环境

```bash
npm run dev
```

### 测试环境

```bash
npm run build
npm run preview
```

### 生产环境

```bash
# 构建
npm run build

# 部署
npm run deploy
```

---

## 📚 学习资源

### 官方文档

- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/)
- [Node.js文档](https://nodejs.org/)

### 项目文档

- [架构标准](ARCHITECTURE_STANDARDS.md)
- [API文档](API.md)
- [故障排除](TROUBLESHOOTING.md)

---

## 🆘 获取帮助

### 遇到问题？

1. 查看[故障排除文档](TROUBLESHOOTING.md)
2. 搜索GitHub Issues
3. 在团队群组提问
4. 创建新的Issue

### 贡献代码

查看[贡献指南](CONTRIBUTING.md)了解如何贡献代码。

---

**祝你开发愉快！** 🎉
