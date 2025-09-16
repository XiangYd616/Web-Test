# Test-Web 项目命名规范

## 📝 文件命名规范

### TypeScript/JavaScript 文件

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| React组件 | PascalCase | `UserProfile.tsx`, `TestRunner.tsx` |
| 页面组件 | PascalCase | `LoginPage.tsx`, `DashboardPage.tsx` |
| 工具函数 | camelCase | `apiUtils.ts`, `dateHelpers.ts` |
| 服务文件 | camelCase + Service | `authService.ts`, `testApiService.ts` |
| Hook文件 | camelCase + use前缀 | `useAuth.ts`, `useTestState.ts` |
| 类型定义 | camelCase + .types | `api.types.ts`, `user.types.ts` |
| 常量文件 | UPPER_SNAKE_CASE | `API_CONSTANTS.ts` |
| 配置文件 | camelCase + .config | `test.config.ts`, `app.config.ts` |

### 目录命名

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 功能模块 | lowercase | `auth`, `testing`, `monitoring` |
| 组件目录 | lowercase | `components`, `pages`, `layouts` |
| 工具目录 | lowercase | `utils`, `helpers`, `services` |

## 🔤 代码命名规范

### 变量和函数

```typescript
// ✅ 正确
const userProfile = getUserProfile();
const isAuthenticated = checkAuth();
const maxRetryCount = 3;

// ❌ 错误
const user_profile = get_user_profile();
const IsAuthenticated = CheckAuth();
const MAX_RETRY_COUNT = 3; // 常量除外
```

### 常量

```typescript
// ✅ 正确
const API_BASE_URL = 'http://api.example.com';
const MAX_FILE_SIZE = 10485760;
const TEST_TYPES = ['api', 'security', 'performance'];

// ❌ 错误
const apiBaseUrl = 'http://api.example.com';
const maxFileSize = 10485760;
```

### React组件

```typescript
// ✅ 正确
const UserDashboard: React.FC = () => { };
const TestResultCard: React.FC<Props> = ({ data }) => { };

// ❌ 错误
const userDashboard: React.FC = () => { };
const test_result_card: React.FC = () => { };
```

### 接口和类型

```typescript
// ✅ 正确
interface UserProfile {
  id: string;
  userName: string;
  emailAddress: string;
}

type TestStatus = 'pending' | 'running' | 'completed';

// ❌ 错误
interface user_profile {
  ID: string;
  UserName: string;
  email_address: string;
}
```

### 枚举

```typescript
// ✅ 正确
enum TestType {
  API = 'api',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

// ❌ 错误
enum testType {
  api = 'API',
  Security = 'SECURITY',
  PERFORMANCE = 'Performance'
}
```

## 📁 文件组织规范

### 导入顺序

```typescript
// 1. React相关
import React, { useState, useEffect } from 'react';

// 2. 第三方库
import { toast } from 'react-hot-toast';
import axios from 'axios';

// 3. 共享模块
import { ApiResponse, User } from '@shared/types';

// 4. 本地组件
import { Layout } from '@/components/common/Layout';

// 5. 本地工具和服务
import { authService } from '@/services/authService';
import { formatDate } from '@/utils/dateHelpers';

// 6. 样式文件
import './styles.css';
```

### 导出规范

```typescript
// 具名导出（推荐用于工具函数和常量）
export const API_TIMEOUT = 30000;
export const formatDate = (date: Date) => { };
export interface UserProfile { }

// 默认导出（推荐用于React组件）
export default UserDashboard;
```

## 🎯 最佳实践

### 1. 描述性命名

```typescript
// ✅ 好的命名
const getUserAuthenticationStatus = () => { };
const isPasswordValid = checkPassword(password);
const testResultsWithMetadata = processTestResults(results);

// ❌ 不好的命名
const getStatus = () => { };
const valid = check(pwd);
const data = process(r);
```

### 2. 避免缩写

```typescript
// ✅ 正确
const configuration = loadConfiguration();
const temporaryFile = createTemporaryFile();
const maximumRetries = 3;

// ❌ 避免
const cfg = loadCfg();
const tmpFile = createTmpFile();
const maxRtrs = 3;
```

### 3. 布尔变量命名

```typescript
// ✅ 正确
const isLoading = true;
const hasError = false;
const canEdit = checkPermission();
const shouldRetry = attempts < maxAttempts;

// ❌ 错误
const loading = true;
const error = false;
const edit = checkPermission();
const retry = attempts < maxAttempts;
```

### 4. 数组和集合命名

```typescript
// ✅ 正确
const users: User[] = [];
const testResults: TestResult[] = [];
const errorMessages: string[] = [];

// ❌ 错误
const user: User[] = [];
const result: TestResult[] = [];
const message: string[] = [];
```

## 🔧 自动化工具配置

### ESLint 规则（推荐）

```json
{
  "rules": {
    "camelcase": ["error", { "properties": "never" }],
    "naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      },
      {
        "selector": "enum",
        "format": ["PascalCase"]
      }
    ]
  }
}
```

### Prettier 配置

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "always"
}
```

## 📋 检查清单

在提交代码前，请确保：

- [ ] 文件名符合命名规范
- [ ] 变量和函数使用camelCase
- [ ] 常量使用UPPER_SNAKE_CASE
- [ ] React组件使用PascalCase
- [ ] 接口和类型使用PascalCase
- [ ] 没有使用缩写或不清晰的命名
- [ ] 布尔变量有合适的前缀（is, has, can, should等）
- [ ] 导入语句按规定顺序组织
