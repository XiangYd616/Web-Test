# 测试配置指南

本文档说明了Test-Web项目中各种测试的配置和使用方式。

## 📊 测试架构概览

```
Test-Web/
├── frontend/tests/          # 前端测试
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── setup/              # 测试配置
├── backend/tests/          # 后端测试
│   ├── unit/               # 单元测试
│   └── integration/        # 集成测试
├── e2e/                    # 端到端测试
├── tests/                  # 共享测试资源
└── config/testing/         # 测试配置文件
```

## 🔧 测试框架

### 前端测试 - Vitest
- **框架**: Vitest + React Testing Library
- **配置**: `vite.config.ts`
- **运行环境**: jsdom
- **覆盖率目标**: 75%

**常用命令**:
```bash
# 运行所有前端测试
yarn test

# 运行测试并观察文件变化
yarn test:watch

# 运行测试 UI
yarn test:ui

# 生成覆盖率报告
yarn test:coverage
```

### 后端测试 - Jest
- **框架**: Jest + Supertest
- **配置**: `backend/package.json`
- **运行环境**: Node.js
- **覆盖率目标**: 75%

**常用命令**:
```bash
# 进入后端目录
cd backend

# 运行所有后端测试
yarn test

# 观察模式运行测试
yarn test:watch

# 生成覆盖率报告
yarn test:coverage
```

### E2E测试 - Playwright
- **框架**: Playwright
- **配置**: `config/testing/playwright.config.ts`
- **测试目录**: `e2e/`
- **支持浏览器**: Chrome, Firefox, Safari, Edge

**常用命令**:
```bash
# 运行所有E2E测试
yarn e2e

# 运行测试 UI
yarn e2e:ui

# 有头模式运行测试
yarn e2e:headed

# 调试模式
yarn e2e:debug
```

## 📁 测试文件组织

### 命名约定
- **单元测试**: `*.test.ts|tsx`
- **集成测试**: `*.integration.test.ts|tsx`
- **E2E测试**: `*.spec.ts`

### 文件位置
- **组件测试**: 与组件文件同目录的 `__tests__` 文件夹
- **服务测试**: `frontend/tests/unit/` 或 `backend/tests/unit/`
- **集成测试**: `*/tests/integration/`
- **E2E测试**: `e2e/`

## ⚙️ 配置详解

### Vitest 配置
```typescript
// vite.config.ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./frontend/tests/setup/setup.ts'],
  coverage: {
    provider: 'v8',
    thresholds: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
}
```

### Jest 配置
```json
{
  "testEnvironment": "node",
  "coverageThreshold": {
    "global": {
      "branches": 75,
      "functions": 75,
      "lines": 75,
      "statements": 75
    }
  }
}
```

### Playwright 配置
```typescript
// config/testing/playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:5174',
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:5174'
  }
});
```

## 🚀 快速开始

### 1. 安装依赖
```bash
yarn install
```

### 2. 运行开发服务器
```bash
yarn dev
```

### 3. 运行所有测试
```bash
# 单元测试和集成测试
yarn test

# E2E测试
yarn e2e
```

## 📝 最佳实践

### 1. 测试文件编写
- 每个测试文件应该专注于测试一个模块或功能
- 使用描述性的测试名称
- 遵循 AAA 模式：Arrange, Act, Assert

### 2. Mock 和存根
- 在单元测试中模拟外部依赖
- 使用测试数据工厂创建测试数据
- 避免在测试中使用真实的API调用

### 3. 覆盖率目标
- 保持75%以上的代码覆盖率
- 重点关注分支覆盖率
- 不要为了覆盖率而写无意义的测试

### 4. E2E测试
- 专注于核心用户流程
- 使用Page Object模式
- 确保测试的独立性和可重复性

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   - 确保开发服务器运行在5174端口
   - 检查其他服务是否占用了端口

2. **测试文件找不到**
   - 检查文件路径是否正确
   - 确保文件名符合命名约定

3. **覆盖率不足**
   - 检查是否有未测试的分支
   - 添加边界情况测试

4. **E2E测试失败**
   - 确保开发服务器正在运行
   - 检查页面元素是否发生变化

## 📞 支持

如有问题，请联系开发团队或在项目Issues中提出。

---

*最后更新：2025-09-19*
