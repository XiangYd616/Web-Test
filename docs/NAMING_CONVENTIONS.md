# 📋 Test-Web项目命名规范

本文档定义了Test-Web项目的文件命名和目录结构规范，确保代码库的一致性和可维护性。

## 🎯 总体原则

1. **一致性**: 同类型文件使用相同的命名规范
2. **可读性**: 文件名应该清晰表达其功能和用途
3. **可维护性**: 便于搜索、排序和组织
4. **跨平台兼容**: 避免大小写敏感问题

## 📁 目录结构规范

### 标准目录结构
```
frontend/
├── components/          # React组件
│   ├── ui/             # 基础UI组件
│   ├── layout/         # 布局组件
│   ├── testing/        # 测试相关组件
│   └── shared/         # 共享组件
├── hooks/              # 自定义Hooks
├── services/           # 服务层
│   ├── api/           # API相关服务
│   ├── auth/          # 认证服务
│   └── utils/         # 服务工具
├── types/              # TypeScript类型定义
│   ├── api/           # API相关类型
│   ├── components/    # 组件相关类型
│   └── common/        # 通用类型
├── utils/              # 工具函数
├── styles/             # 样式文件
├── pages/              # 页面组件
└── __tests__/          # 测试文件
```

### 目录命名规范
- **格式**: camelCase 或 kebab-case
- **原则**: 使用描述性名称，避免缩写
- **示例**: `components`, `testingUtils`, `api-clients`

## 📄 文件命名规范

### 1. React组件文件

#### **格式**: PascalCase.tsx
```
✅ 正确示例:
- TestConfigPanel.tsx
- UnifiedIcons.tsx
- UserProfileCard.tsx
- APITestResults.tsx

❌ 错误示例:
- testConfigPanel.tsx
- unified-icons.tsx
- userprofilecard.tsx
- apiTestResults.tsx
```

#### **命名原则**:
- 使用PascalCase（每个单词首字母大写）
- 名称应该描述组件的功能
- 避免使用缩写，除非是广泛认知的（如API、UI、UX）
- 组件名与文件名保持一致

### 2. Hook文件

#### **格式**: use + PascalCase.ts
```
✅ 正确示例:
- useAPITestState.ts
- useNetworkTestState.ts
- useAuthenticationStatus.ts
- useLocalStorage.ts

❌ 错误示例:
- apiTestState.ts
- use-network-test.ts
- useauthstatus.ts
- UseLocalStorage.ts
```

#### **命名原则**:
- 必须以"use"开头
- 后面跟PascalCase格式的描述性名称
- 清楚表达Hook的功能和用途

### 3. 服务类文件

#### **格式**: camelCase.ts
```
✅ 正确示例:
- unifiedTestApiClient.ts
- testApiServiceAdapter.ts
- backgroundTestManager.ts
- userAuthenticationService.ts

❌ 错误示例:
- UnifiedTestApiClient.ts
- test-api-service.ts
- backgroundtestmanager.ts
- UserAuthService.ts
```

#### **命名原则**:
- 使用camelCase格式
- 名称应该描述服务的功能
- 可以使用常见的后缀如Service、Manager、Client、Adapter

### 4. 类型定义文件

#### **格式**: camelCase.types.ts
```
✅ 正确示例:
- apiClient.types.ts
- testState.types.ts
- userModels.types.ts
- commonInterfaces.types.ts

❌ 错误示例:
- ApiClient.types.ts
- test-state-types.ts
- usermodels.ts
- CommonTypes.ts
```

#### **命名原则**:
- 使用camelCase格式
- 必须以".types.ts"结尾
- 名称应该描述类型的用途或领域

### 5. 工具函数文件

#### **格式**: camelCase.ts 或 camelCase.utils.ts
```
✅ 正确示例:
- dateFormatter.ts
- apiUtils.ts
- testHelpers.utils.ts
- stringManipulation.ts

❌ 错误示例:
- DateFormatter.ts
- api-utils.ts
- test_helpers.ts
- StringUtils.ts
```

### 6. 样式文件

#### **格式**: kebab-case.css 或 kebab-case.scss
```
✅ 正确示例:
- unified-theme-variables.css
- component-styles.scss
- test-page-layout.css
- responsive-design.scss

❌ 错误示例:
- UnifiedThemeVariables.css
- component_styles.scss
- TestPageLayout.css
- responsiveDesign.scss
```

### 7. 测试文件

#### **格式**: 与被测试文件相同 + .test.ts/.test.tsx
```
✅ 正确示例:
- TestConfigPanel.test.tsx
- useAPITestState.test.ts
- unifiedTestApiClient.test.ts
- apiUtils.test.ts

❌ 错误示例:
- test-config-panel.test.tsx
- UseAPITestState.test.ts
- UnifiedTestApiClient.test.ts
- api-utils.test.ts
```

### 8. 文档文件

#### **格式**: UPPER_CASE.md 或 kebab-case.md
```
✅ 正确示例:
- README.md
- CHANGELOG.md
- api-usage-guide.md
- ui-optimization-guide.md

❌ 错误示例:
- readme.md
- ChangeLog.md
- API_Usage_Guide.md
- UIOptimizationGuide.md
```

#### **特殊文档**:
- `README.md` - 项目或目录说明（全大写）
- `CHANGELOG.md` - 变更日志（全大写）
- `LICENSE.md` - 许可证文件（全大写）
- 其他文档使用kebab-case

## 🏷️ 变量和函数命名

### JavaScript/TypeScript变量
```typescript
// ✅ 正确
const userApiClient = new ApiClient();
const testResultData = await fetchTestResults();
const isTestRunning = false;

// ❌ 错误
const UserApiClient = new ApiClient();
const test_result_data = await fetchTestResults();
const IsTestRunning = false;
```

### 函数命名
```typescript
// ✅ 正确
function calculateTestScore() { }
function handleUserLogin() { }
function validateApiResponse() { }

// ❌ 错误
function CalculateTestScore() { }
function handle_user_login() { }
function ValidateAPIResponse() { }
```

### 常量命名
```typescript
// ✅ 正确
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
const TEST_TIMEOUT_DURATION = 30000;

// ❌ 错误
const apiBaseUrl = 'https://api.example.com';
const maxRetryAttempts = 3;
const testTimeoutDuration = 30000;
```

### 类命名
```typescript
// ✅ 正确
class TestApiClient { }
class UserAuthenticationService { }
class BackgroundTestManager { }

// ❌ 错误
class testApiClient { }
class userAuthenticationService { }
class backgroundTestManager { }
```

## 📋 检查清单

### 新文件创建检查清单
- [ ] 文件名符合对应类型的命名规范
- [ ] 文件放置在正确的目录中
- [ ] 导出的类/函数/变量名与文件名一致
- [ ] 添加了适当的TypeScript类型定义
- [ ] 如果是组件，添加了对应的测试文件

### 代码审查检查清单
- [ ] 所有新文件遵循命名规范
- [ ] 导入路径正确且一致
- [ ] 变量和函数命名清晰且一致
- [ ] 类型定义完整且放置在正确位置
- [ ] 文档文件命名规范且内容完整

## 🔧 工具和自动化

### ESLint规则
```json
{
  "rules": {
    "camelcase": ["error", { "properties": "always" }],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variableLike",
        "format": ["camelCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ]
  }
}
```

### 文件命名检查脚本
```bash
# 检查文件命名规范
npm run check-naming

# 自动修复可修复的命名问题
npm run fix-naming
```

## 🚨 常见错误和解决方案

### 1. 大小写不一致
```
❌ 问题: TestConfigPanel.tsx 中导出 testConfigPanel
✅ 解决: 确保导出名与文件名一致
```

### 2. 导入路径错误
```
❌ 问题: import { TestPanel } from './testPanel'
✅ 解决: import { TestPanel } from './TestPanel'
```

### 3. 类型文件组织混乱
```
❌ 问题: 类型定义分散在各个文件中
✅ 解决: 统一放在 types/ 目录下的对应子目录
```

## 📞 支持和反馈

如果对命名规范有疑问或建议：

1. 查看现有代码中的类似示例
2. 参考本文档的规范说明
3. 在代码审查中讨论
4. 提出改进建议

**记住**: 一致性比完美更重要。当有疑问时，选择与现有代码库最一致的方案。
