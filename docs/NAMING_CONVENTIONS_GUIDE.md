# 命名规范指南

## 🎯 概述

本指南定义了Web测试平台项目的统一命名规范，确保代码的一致性、可读性和可维护性。

## 📋 命名规范总览

### **基本原则**
1. **一致性**: 整个项目使用统一的命名风格
2. **描述性**: 名称应清晰表达其用途和功能
3. **简洁性**: 避免不必要的冗长和复杂
4. **现代化**: 使用现代JavaScript/TypeScript约定

### **禁止使用的命名模式**
- ❌ 版本化前缀 (Enhanced, Advanced, Modern, Smart等)
- ❌ 匈牙利命名法 (str, int, bool, obj等前缀)
- ❌ 下划线命名 (在JavaScript中应避免)
- ❌ 过时的方法和语法

## 🏗️ 具体命名规范

### **1. 类命名 (PascalCase)**

#### **✅ 正确示例**
```javascript
class TestEngineManager { }
class DataService { }
class UserController { }
class ApiClient { }
class ConfigManager { }
```

#### **❌ 错误示例**
```javascript
class EnhancedTestEngineManager { }  // 版本化前缀
class ITestEngine { }                // 匈牙利命名法
class testenginemanager { }          // 不符合PascalCase
class test_engine_manager { }        // 下划线命名
```

### **2. 变量和函数命名 (camelCase)**

#### **✅ 正确示例**
```javascript
// 变量
const testResult = getTestResult();
const userConfig = loadConfig();
const apiResponse = await fetchData();

// 函数
function executeTest() { }
function generateReport() { }
function validateInput() { }
```

#### **❌ 错误示例**
```javascript
// 变量
const AdvancedTestResult = getTestResult();  // 版本化前缀
const strUserName = 'john';                  // 匈牙利命名法
const test_result = getTestResult();         // 下划线命名

// 函数
function EnhancedExecuteTest() { }    // 版本化前缀
function exec_test() { }              // 下划线命名
function ExecTest() { }               // 不符合camelCase
```

### **3. 常量命名 (UPPER_SNAKE_CASE)**

#### **✅ 正确示例**
```javascript
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;
const API_BASE_URL = 'https://api.example.com';
const TEST_TYPES = ['performance', 'security', 'seo'];
```

#### **❌ 错误示例**
```javascript
const maxRetryCount = 3;              // 应该用常量命名
const ENHANCED_TIMEOUT = 5000;        // 版本化前缀
const apiBaseUrl = 'https://api.example.com';  // 应该用常量命名
```

### **4. 接口和类型命名 (PascalCase)**

#### **✅ 正确示例**
```typescript
interface TestResult {
  score: number;
  issues: Issue[];
}

type TestConfig = {
  url: string;
  timeout: number;
};

interface ApiResponse<T> {
  data: T;
  success: boolean;
}
```

#### **❌ 错误示例**
```typescript
interface ITestResult { }             // 匈牙利命名法
interface EnhancedTestConfig { }      // 版本化前缀
interface test_result { }             // 下划线命名
```

### **5. 文件命名**

#### **组件文件 (PascalCase.tsx/jsx)**
```
✅ TestPage.tsx
✅ UserProfile.tsx
✅ DataManager.tsx

❌ testPage.tsx
❌ EnhancedTestPage.tsx
❌ test_page.tsx
```

#### **服务文件 (camelCase.ts/js)**
```
✅ apiService.ts
✅ dataService.ts
✅ authManager.ts

❌ ApiService.ts
❌ advancedApiService.ts
❌ api_service.ts
```

#### **工具文件 (camelCase.ts/js)**
```
✅ errorHandler.ts
✅ dateUtils.ts
✅ configLoader.ts

❌ ErrorHandler.ts
❌ enhancedErrorHandler.ts
❌ error_handler.ts
```

## 🔧 工具和检查

### **自动化工具**

#### **命名检查**
```bash
# 快速检查命名规范
npm run lint:naming

# 全面检查（包含文件命名）
npm run lint:naming:full

# 自动修复命名问题
npm run fix:naming
```

#### **手动检查**
```bash
# 精确检查器
node scripts/precise-naming-checker.cjs

# 全面检查器
node scripts/comprehensive-naming-checker.cjs

# 自动修复器
node scripts/auto-fix-naming.cjs --fix
```

### **IDE集成**

#### **VSCode设置**
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

#### **ESLint规则**
```json
{
  "rules": {
    "camelcase": ["error", { "properties": "always" }],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "class",
        "format": ["PascalCase"]
      },
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"]
      }
    ]
  }
}
```

## 📚 最佳实践

### **1. 描述性命名**
```javascript
// ✅ 好的命名
const isTestRunning = checkTestStatus();
const userAuthToken = generateToken();
const testExecutionResults = await runTests();

// ❌ 不好的命名
const flag = checkTestStatus();
const token = generateToken();
const results = await runTests();
```

### **2. 避免缩写**
```javascript
// ✅ 完整单词
const configuration = loadConfig();
const authentication = setupAuth();
const performance = measurePerf();

// ❌ 不清晰的缩写
const config = loadConfig();
const auth = setupAuth();
const perf = measurePerf();
```

### **3. 上下文相关命名**
```javascript
// ✅ 在测试上下文中
class TestRunner {
  executeTest() { }
  generateReport() { }
  validateResults() { }
}

// ✅ 在用户上下文中
class UserManager {
  authenticateUser() { }
  updateProfile() { }
  validatePermissions() { }
}
```

### **4. 布尔值命名**
```javascript
// ✅ 清晰的布尔值命名
const isTestComplete = true;
const hasErrors = false;
const canExecute = checkPermissions();
const shouldRetry = errorCount < MAX_RETRIES;

// ❌ 不清晰的布尔值命名
const test = true;
const errors = false;
const execute = checkPermissions();
```

## 🚫 常见错误和修复

### **版本化前缀**
```javascript
// ❌ 错误
const EnhancedAnalytics = new Analytics();
const ModernDashboard = new Dashboard();
const AdvancedChart = new Chart();

// ✅ 修复
const Analytics = new Analytics();
const Dashboard = new Dashboard();
const Chart = new Chart();
```

### **匈牙利命名法**
```javascript
// ❌ 错误
const strUserName = 'john';
const numScore = 85;
const boolIsActive = true;

// ✅ 修复
const userName = 'john';
const score = 85;
const isActive = true;
```

### **过时方法**
```javascript
// ❌ 错误
const id = Math.random().toString(36).substr(2, 9);
var testData = loadData();

// ✅ 修复
const id = Math.random().toString(36).substring(2, 11);
const testData = loadData();
```

## 📖 参考资源

### **官方指南**
- [JavaScript命名约定](https://developer.mozilla.org/en-US/docs/MDN/Guidelines/Code_guidelines/JavaScript#naming)
- [TypeScript编码指南](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
- [React命名约定](https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized)

### **团队资源**
- 📋 [命名规范检查清单](./NAMING_CHECKLIST.md)
- 🔧 [工具使用指南](./NAMING_TOOLS.md)
- 📊 [标准化报告](./NAMING_STANDARDIZATION_COMPLETE_REPORT.md)

## 🎯 检查清单

### **代码提交前检查**
- [ ] 运行 `npm run lint:naming` 检查命名规范
- [ ] 确保没有版本化前缀
- [ ] 确保没有匈牙利命名法
- [ ] 确保没有过时方法调用
- [ ] 确保文件命名符合规范

### **代码审查检查**
- [ ] 类名使用PascalCase
- [ ] 变量和函数使用camelCase
- [ ] 常量使用UPPER_SNAKE_CASE
- [ ] 命名具有描述性
- [ ] 避免不必要的缩写

### **新功能开发检查**
- [ ] 新增的类、函数、变量命名符合规范
- [ ] 新增的文件命名符合规范
- [ ] 没有引入版本化前缀
- [ ] 使用现代JavaScript语法

---

**遵循本指南，确保代码质量和团队协作效率！** 🚀
