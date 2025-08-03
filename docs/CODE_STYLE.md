# 代码规范

## 📋 总体原则

- 代码应该清晰、简洁、易于理解
- 优先使用TypeScript进行类型安全开发
- 遵循一致的命名约定和格式规范
- 编写有意义的注释和文档

## 🎯 命名规范

### 文件命名
- **组件文件**: PascalCase (如: `UserProfile.tsx`)
- **工具文件**: camelCase (如: `apiUtils.ts`)
- **常量文件**: UPPER_SNAKE_CASE (如: `API_CONSTANTS.ts`)
- **样式文件**: kebab-case (如: `user-profile.css`)

### 变量和函数命名
- **变量**: camelCase (如: `userName`, `isLoading`)
- **函数**: camelCase (如: `getUserData`, `handleClick`)
- **常量**: UPPER_SNAKE_CASE (如: `MAX_RETRY_COUNT`)
- **类型/接口**: PascalCase (如: `UserData`, `ApiResponse`)

### 组件命名
- **React组件**: PascalCase (如: `UserProfile`, `LoadingSpinner`)
- **Hook**: camelCase with 'use' prefix (如: `useUserData`, `useApi`)

## 🔧 代码格式

### 缩进和空格
- 使用2个空格进行缩进
- 行尾不留空格
- 文件末尾保留一个空行

### 导入语句顺序
1. React相关导入
2. 第三方库导入
3. 本地组件导入
4. 工具函数导入
5. 类型定义导入

```typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import { UserProfile } from './components/UserProfile';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import { apiUtils } from './utils/apiUtils';
import { formatDate } from './utils/dateUtils';

import type { User, ApiResponse } from './types';
```

## 📝 注释规范

### 函数注释
```typescript
/**
 * 获取用户数据
 * @param userId - 用户ID
 * @param options - 请求选项
 * @returns Promise<User> 用户数据
 */
async function getUserData(userId: string, options?: RequestOptions): Promise<User> {
  // 实现代码
}
```

### 组件注释
```typescript
/**
 * 用户资料组件
 * 显示用户的基本信息和操作按钮
 */
interface UserProfileProps {
  /** 用户数据 */
  user: User;
  /** 是否显示编辑按钮 */
  showEditButton?: boolean;
  /** 编辑按钮点击回调 */
  onEdit?: () => void;
}
```

## 🧪 测试规范

- 每个组件都应该有对应的测试文件
- 测试文件命名: `ComponentName.test.tsx`
- 测试覆盖率应该保持在80%以上
- 使用描述性的测试用例名称

## 🚀 性能优化

- 使用React.memo优化组件渲染
- 合理使用useMemo和useCallback
- 避免在render中创建新对象
- 图片使用适当的格式和大小

## 🔒 安全规范

- 不在代码中硬编码敏感信息
- 使用环境变量管理配置
- 对用户输入进行验证和清理
- 使用HTTPS进行数据传输

## 📚 文档要求

- 复杂的业务逻辑需要添加注释
- 公共API需要完整的JSDoc注释
- README文件需要保持更新
- 重要变更需要更新CHANGELOG
