# 🪟 窗口1 - 前端UI开发快速参考

> **当前分支**: `feature/frontend-ui-dev`  
> **开发服务器**: http://localhost:5174/  
> **最后更新**: 2025-10-06

---

## 🎯 当前工作区状态

### ✅ 已完成
- [x] 创建前端开发分支 (feature/frontend-ui-dev)
- [x] 启动Vite开发服务器 (端口 5174)
- [x] 设置多窗口开发环境
- [x] 提交初始更改

### 📋 项目结构
```
frontend/
├── components/        # React组件
│   ├── admin/        # 管理员组件
│   ├── analysis/     # 分析组件
│   ├── analytics/    # 数据分析
│   ├── auth/         # 认证相关
│   ├── business/     # 业务组件
│   ├── charts/       # 图表组件
│   ├── common/       # 通用组件
│   │   ├── ErrorDisplay.tsx
│   │   └── TestHistory/
│   ├── seo/          # SEO组件
│   ├── stress/       # 压力测试
│   │   └── StressTestHistory/  # 已重构
│   ├── testing/      # 测试组件
│   └── ui/           # UI基础组件
│       └── GridWrapper.tsx
├── pages/            # 页面组件
├── types/            # TypeScript类型
├── hooks/            # 自定义Hooks
├── utils/            # 工具函数
└── styles/           # 样式文件
```

---

## ⚡ 常用命令速查

### 🔧 开发命令
```bash
# 前端开发服务器（已运行）
npm run frontend          # 端口 5174

# 自定义端口
cross-env VITE_DEV_PORT=5175 npm run frontend

# 热更新已启用，保存文件即可查看效果
```

### 📝 代码质量
```bash
# 代码检查
npm run lint              # ESLint检查
npm run lint:fix          # 自动修复问题

# 代码格式化
npm run format            # 格式化所有文件
npm run format:check      # 仅检查格式

# TypeScript类型检查
npm run type-check        # 检查类型错误
```

### 🧪 测试
```bash
# 单元测试
npm run test              # 运行所有测试
npm run test:watch        # 监听模式
npm run test:ui           # UI界面
npm run test:coverage     # 测试覆盖率

# E2E测试
npm run e2e               # 运行E2E
npm run e2e:ui            # UI模式
npm run e2e:debug         # 调试模式
```

### 📦 构建
```bash
# 构建前端
npm run build             # 生产环境构建
npm run build:check       # 构建前检查
npm run preview           # 预览构建结果
```

---

## 🎨 前端技术栈

### 核心库
- **React 18.2** - UI框架
- **TypeScript** - 类型系统
- **Vite 4.5** - 构建工具

### UI组件库
- **Ant Design 5.27** - 企业级UI组件
- **Material-UI 7.3** - Material Design组件
- **TailwindCSS 3.3** - 实用优先CSS框架

### 状态管理
- **React Hooks** - 状态和副作用
- **ahooks 3.9** - React Hooks库
- **Context API** - 全局状态

### 图表可视化
- **Chart.js 4.5** - 图表库
- **react-chartjs-2** - React封装
- **Recharts 2.15** - 图表组件

### 其他工具
- **Axios** - HTTP客户端
- **React Router 6** - 路由管理
- **date-fns** - 日期处理
- **clsx** - 类名工具

---

## 🔥 重点开发区域

### 1️⃣ 最近重构的组件
```
✅ StressTestHistory - 压力测试历史
  - 已拆分为模块化结构
  - 提取7个自定义Hooks
  - 添加单元测试
  - 位置: frontend/components/stress/StressTestHistory/
```

### 2️⃣ 新增通用组件
```
✅ ErrorDisplay - 错误显示组件
  位置: frontend/components/common/ErrorDisplay.tsx

✅ GridWrapper - Grid布局包装器
  位置: frontend/components/ui/GridWrapper.tsx

✅ TestHistory - 通用测试历史
  位置: frontend/components/common/TestHistory/
```

### 3️⃣ 需要关注的文件
```
⚠️ 有未提交的更改:
  - BusinessAnalyticsDashboard.tsx
  - SEOReportGenerator.tsx
  - TestPageLayout.tsx
  - DataManagement.tsx
  - WebsiteTest.tsx
  - types/enums.ts
```

---

## 🐛 调试技巧

### 浏览器开发工具
```
F12 或 Ctrl+Shift+I - 打开开发者工具
Ctrl+Shift+C       - 元素选择器
Ctrl+Shift+J       - 控制台
```

### React DevTools
- 安装: Chrome/Edge扩展商店搜索 "React Developer Tools"
- 查看组件树、Props、State
- 性能分析

### Vite HMR（热模块替换）
- 保存文件自动刷新
- 保留组件状态
- 错误覆盖层显示

### 常用调试代码
```typescript
// 查看Props
console.log('Props:', props);

// 查看State
console.log('State:', state);

// 性能追踪
console.time('render');
// ... 代码
console.timeEnd('render');

// React DevTools Profiler
// 在组件中使用 <React.Profiler>
```

---

## 📁 快速导航

### 常用组件路径
```bash
# 压力测试相关
frontend/components/stress/

# SEO相关
frontend/components/seo/

# 分析组件
frontend/components/analysis/

# 业务组件
frontend/components/business/

# 认证组件
frontend/components/auth/

# 管理后台
frontend/components/admin/
```

### 页面路由
```bash
frontend/pages/
├── Home.tsx              # 首页
├── WebsiteTest.tsx       # 网站测试
├── DataManagement.tsx    # 数据管理
├── Login.tsx             # 登录
└── ...
```

---

## 🔄 Git工作流

### 查看状态
```bash
git status                # 查看当前状态
git branch                # 查看分支
git log --oneline -5      # 最近5次提交
```

### 提交更改
```bash
# 添加文件
git add <file>            # 添加单个文件
git add .                 # 添加所有文件

# 提交
git commit -m "feat: 功能描述"
git commit -m "fix: 修复描述"
git commit -m "refactor: 重构描述"

# 提交规范
feat:     新功能
fix:      修复Bug
refactor: 重构代码
style:    样式调整
docs:     文档更新
test:     测试相关
chore:    构建/工具配置
```

### 同步代码
```bash
# 拉取更新
git fetch origin
git merge origin/main

# 或使用rebase
git rebase origin/main

# 推送到远程
git push origin feature/frontend-ui-dev
```

---

## 🎯 开发最佳实践

### 组件开发
```typescript
// ✅ 好的实践
import React from 'react';
import { Button } from 'antd';

interface Props {
  title: string;
  onClick: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onClick }) => {
  return <Button onClick={onClick}>{title}</Button>;
};

// ❌ 避免
// - 组件过大（超过200行）
// - 没有类型定义
// - 直接修改Props
// - 过度使用useEffect
```

### Hooks使用
```typescript
// ✅ 自定义Hook示例
import { useState, useEffect } from 'react';

export const useFetch = <T,>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
};
```

### 性能优化
```typescript
// 使用React.memo防止不必要的重渲染
export const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// 使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// 使用useCallback缓存函数
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

---

## 🔗 相关资源

### 文档
- [项目README](../README.md)
- [多窗口开发指南](../docs/MULTI_WINDOW_DEVELOPMENT_GUIDE.md)
- [快速启动指南](../docs/QUICK_START_MULTI_WINDOW.md)

### API文档
- 后端API: http://localhost:3001/api (窗口2启动后)
- Swagger文档: http://localhost:3001/api-docs

### 设计规范
- [Ant Design](https://ant.design/)
- [Material-UI](https://mui.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

## 🚨 注意事项

### 端口使用
- ✅ 前端: 5174 (当前)
- ✅ 后端: 3001 (窗口2)
- ❌ 避免端口冲突

### 热更新
- 保存文件自动刷新
- CSS更改无需刷新
- TypeScript错误会显示在浏览器

### 代码提交
- 提交前运行 `npm run lint:fix`
- 提交前运行 `npm run type-check`
- 使用规范的commit message

### 依赖管理
- 使用 `npm install` 安装依赖
- 不要直接修改 package-lock.json
- 添加新依赖前先讨论

---

## 💡 快捷键

### VS Code
```
Ctrl+P         - 快速打开文件
Ctrl+Shift+P   - 命令面板
Ctrl+B         - 切换侧边栏
Ctrl+`         - 切换终端
Ctrl+/         - 注释/取消注释
Alt+↑/↓        - 移动行
Shift+Alt+↑/↓  - 复制行
F2             - 重命名符号
Ctrl+D         - 选中下一个相同单词
```

### 浏览器
```
F5             - 刷新页面
Ctrl+F5        - 强制刷新
F12            - 开发者工具
Ctrl+Shift+C   - 元素选择器
Ctrl+Shift+J   - 控制台
```

---

## 📞 获取帮助

### 遇到问题？
1. 检查控制台错误信息
2. 查看 Vite 终端输出
3. 运行 `npm run type-check` 检查类型错误
4. 运行 `npm run lint` 检查代码问题

### 常见问题
```bash
# 端口被占用
netstat -ano | findstr :5174
taskkill /PID <PID> /F

# 依赖问题
npm install

# 缓存问题
npm run clean
npm install

# Git问题
git status
git branch
```

---

**快乐编码！** 🎉

