# 🪟 窗口1 - 前端开发快速启动

**当前时间**: 2025-10-06  
**工作目录**: D:\myproject\Test-Web  
**分支**: feature/frontend-ui-dev  
**Node版本**: v22.16.0  
**npm版本**: 11.4.1  

---

## ⚠️ 重要提醒：API 路径已更新

刚刚完成了**破坏性更新** - 所有 API 路径已移除 `/api` 前缀：

```typescript
// ❌ 旧的写法
fetch('http://localhost:3001/api/auth/login')

// ✅ 新的写法
fetch('http://localhost:3001/auth/login')
```

**详细文档**: `docs/FRONTEND_API_CHANGES.md`

---

## 🚀 立即开始

### 1. 启动前端开发服务器

```bash
# 方式1：仅前端（推荐用于UI开发）
npm run frontend

# 方式2：前端+后端一起启动
npm run dev

# 方式3：自定义端口
cross-env VITE_DEV_PORT=5175 npm run frontend
```

**访问地址**: http://localhost:5174

---

## 📋 当前待处理的更改

你有 **85个修改的文件**，主要是 API 路径更新：

### 核心文件（需要验证）
- `frontend/hooks/useAuth.ts` - 认证相关
- `frontend/hooks/useTest.ts` - 测试相关
- `frontend/hooks/useMonitoring.ts` - 监控相关
- `frontend/services/api/apiService.ts` - API 服务层
- `frontend/contexts/AuthContext.tsx` - 认证上下文

### 推荐操作流程

```bash
# 1. 先查看具体改动
git diff frontend/hooks/useAuth.ts

# 2. 启动开发服务器测试
npm run frontend

# 3. 如果测试通过，提交改动
git add frontend/
git commit -m "feat(api): 移除 /api 前缀，更新所有前端 API 调用"

# 4. 推送到远程
git push origin feature/frontend-ui-dev
```

---

## 🧪 测试 API 更改

### 快速验证

启动开发服务器后，在浏览器控制台测试：

```javascript
// 1. 测试认证 API
fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test123' })
})
.then(res => res.json())
.then(data => console.log('✅ 登录API响应:', data))
.catch(err => console.error('❌ 登录API错误:', err));

// 2. 测试测试启动 API
fetch('http://localhost:3001/test/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com', type: 'seo' })
})
.then(res => res.json())
.then(data => console.log('✅ 测试启动API响应:', data))
.catch(err => console.error('❌ 测试启动API错误:', err));
```

---

## 🎨 常用开发任务

### 创建新组件

```bash
# 1. 创建组件文件
# frontend/components/your-feature/YourComponent.tsx

# 2. 组件模板
```

```typescript
import React from 'react';
import { Button } from 'antd';

interface YourComponentProps {
  title: string;
  onAction: () => void;
}

export const YourComponent: React.FC<YourComponentProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <Button type="primary" onClick={onAction}>
        执行操作
      </Button>
    </div>
  );
};

export default YourComponent;
```

### 创建自定义 Hook

```typescript
// frontend/hooks/useYourFeature.ts
import { useState, useCallback } from 'react';

export const useYourFeature = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/your-endpoint');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
};
```

### 添加新页面

```typescript
// frontend/pages/YourPage.tsx
import React from 'react';
import { Layout } from '../components/layout/Layout';
import { YourComponent } from '../components/your-feature/YourComponent';

export const YourPage: React.FC = () => {
  const handleAction = () => {
    console.log('执行操作');
  };

  return (
    <Layout title="您的页面">
      <YourComponent title="功能标题" onAction={handleAction} />
    </Layout>
  );
};

export default YourPage;
```

```typescript
// frontend/components/routing/AppRoutes.tsx
// 添加路由配置
{
  path: '/your-page',
  element: <YourPage />,
}
```

---

## 🔍 调试技巧

### React DevTools

```bash
# 1. 安装 Chrome 扩展
# React Developer Tools

# 2. 在浏览器中打开
# F12 -> React tab
```

### Vite 调试

```typescript
// vite.config.ts 中已配置
server: {
  port: 5174,
  open: true, // 自动打开浏览器
  hmr: true,  // 热模块替换
}
```

### 网络请求调试

```bash
# 浏览器开发工具
F12 -> Network tab

# 查看所有 API 请求
# 筛选 XHR/Fetch 请求
```

---

## 📦 常用依赖

### UI 组件

```typescript
// Ant Design
import { Button, Form, Input, Modal, Table } from 'antd';

// Material-UI
import { Button, TextField, Dialog } from '@mui/material';

// TailwindCSS (直接在 className 中使用)
<div className="flex items-center justify-center p-4 bg-blue-500">
```

### 状态管理

```typescript
// React Hooks
import { useState, useEffect, useCallback, useMemo } from 'react';

// ahooks
import { useRequest, useMount, useToggle } from 'ahooks';

// Context
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../hooks/useAuth';
```

### 数据可视化

```typescript
// Chart.js
import { Line, Bar, Pie } from 'react-chartjs-2';

// Recharts
import { LineChart, BarChart, PieChart } from 'recharts';
```

---

## 🎯 今天的开发建议

### 优先级 1：验证 API 更改

```bash
# 1. 启动开发服务器
npm run frontend

# 2. 测试关键功能
# - 用户登录/注册
# - 测试执行
# - 数据加载

# 3. 检查浏览器控制台是否有错误
```

### 优先级 2：提交更改

```bash
# 1. 查看所有更改
git diff --stat

# 2. 分批提交
git add frontend/hooks/
git commit -m "fix(hooks): 更新 API 路径，移除 /api 前缀"

git add frontend/services/
git commit -m "fix(services): 更新 API 路径，移除 /api 前缀"

git add frontend/components/
git commit -m "fix(components): 更新 API 路径，移除 /api 前缀"

git add frontend/pages/
git commit -m "fix(pages): 更新 API 路径，移除 /api 前缀"
```

### 优先级 3：开发新功能

根据项目需求，可以：
- 优化现有组件的 UI
- 添加新的测试类型页面
- 改进数据可视化
- 增强用户体验

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查找占用进程
netstat -ano | findstr :5174

# 结束进程
taskkill /PID <PID> /F

# 或使用其他端口
cross-env VITE_DEV_PORT=5175 npm run frontend
```

### 2. API 请求失败（404）

**原因**: 后端可能还没有移除 `/api` 前缀

**临时解决方案**: 
```typescript
// 在 API 服务中临时添加前缀
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api' // 临时保留
});
```

### 3. 热更新不工作

```bash
# 重启开发服务器
# Ctrl+C 停止
npm run frontend
```

### 4. TypeScript 类型错误

```bash
# 检查类型
npm run type-check

# 生成类型
npm run build:types
```

---

## 📚 相关文档

- **API 迁移文档**: `docs/FRONTEND_API_CHANGES.md`
- **完成报告**: `API_MIGRATION_COMPLETION_REPORT.md`
- **Worktree 指南**: `.dev/WORKTREE_MERGE_GUIDE.md`
- **快速参考**: `.dev/QUICK_START_REFERENCE.md`

---

## 🎊 开始工作！

```bash
# 立即启动开发服务器
npm run frontend
```

浏览器将自动打开 http://localhost:5174

**开发愉快！** 🚀

---

**提示**: 
- 保存文件自动刷新浏览器
- 使用 React DevTools 调试组件
- 查看 Network tab 监控 API 请求
- 遇到问题随时查看文档或询问团队

