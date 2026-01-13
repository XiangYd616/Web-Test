# 版本管理规范

## 概述

本项目采用统一的版本管理策略,通过 `versions.json`
集中管理所有依赖版本,确保多个 package 之间的依赖版本一致性。

## 文件结构

```
Test-Web/
├── versions.json                 # 版本配置文件(核心)
├── package.json                  # 根项目配置
├── frontend/package.json         # 前端配置
├── backend/package.json          # 后端配置
├── shared/package.json           # 共享模块配置
└── (已移除脚本工具)
```

## 核心配置: versions.json

这是项目版本管理的**唯一真实来源**,所有依赖版本必须在此文件中定义:

```json
{
  "project": {
    "version": "1.0.0",
    "description": "项目版本配置"
  },
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.1.12"
  }
}
```

## 使用方法

### 1. 检查版本冲突

在修改依赖之前,先检查是否存在版本冲突:

```bash
对照检查 versions.json 与各 package.json 中的依赖版本是否一致
```

输出示例:

```
⚠️  发现 2 个版本冲突:

  pg:
    - root: ^8.11.3
    - backend: ^8.16.2
```

### 2. 预览版本同步

查看将要进行的版本更新,但不实际修改文件:

```bash
对照修改 versions.json 与各 package.json（root/frontend/backend/shared）
```

### 3. 执行版本同步

将 `versions.json` 中的版本同步到所有 package.json:

```bash
手动将 versions.json 中的版本更新到各 package.json
```

同步后需要重新安装依赖:

```bash
npm install
```

### 4. 生成版本报告

生成详细的版本分析报告:

```bash
如需报告，建议使用自定义脚本或在 CI 中生成（当前仓库不再内置版本报告脚本）
```

## 工作流程

### 添加新依赖

1. **在 versions.json 中添加版本定义**

   ```json
   {
     "dependencies": {
       "new-package": "^1.0.0"
     }
   }
   ```

2. **在对应的 package.json 中添加依赖**

   ```bash
   cd frontend
   npm install new-package
   ```

3. **运行版本同步确保一致性** 统一在 `versions.json`
   中定义版本，并手动同步到各 workspace 的 `package.json`。

### 更新依赖版本

1. **修改 versions.json 中的版本号**

   ```json
   {
     "dependencies": {
       "axios": "^1.12.0" // 从 ^1.11.0 升级
     }
   }
   ```

2. **同步到所有 package**

   更新 `versions.json` 后，将变更手动同步到各 workspace 的
   `package.json`，再执行 `npm install`。

3. **测试更新后的代码**
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```

### 解决版本冲突

1. **检测冲突**

   对照检查 `versions.json` 与各 workspace 的 `package.json`，确认依赖版本一致。

2. **在 versions.json 中统一版本**
   - 选择最高版本(如果向后兼容)
   - 或选择经过测试的稳定版本

3. **同步并验证** 同步后执行 `npm install`，并运行 `npm run type-check`
   做基础验证。

## 最佳实践

### ✅ 推荐做法

1. **集中管理**: 所有共享依赖必须在 `versions.json` 中定义
2. **定期检查**: 每次 PR 前对照检查依赖版本一致性
3. **原子更新**: 一次只更新一个依赖,便于回滚
4. **充分测试**: 版本更新后运行完整的测试套件
5. **文档更新**: 重大版本升级时更新 CHANGELOG

### ❌ 避免事项

1. **直接修改 package.json**: 始终通过 versions.json 管理
2. **跳过同步**: 修改 `versions.json` 后必须同步更新各 workspace 的
   `package.json`
3. **忽略冲突**: 发现冲突必须立即解决
4. **批量升级**: 避免一次性升级多个主版本依赖

## 特殊情况处理

### Workspace 特定依赖

某些依赖只在特定 workspace 中使用,不需要在 versions.json 中定义:

```json
// backend/package.json
{
  "dependencies": {
    "sequelize": "^6.37.5", // 仅后端使用
    "pg-hstore": "^2.3.4"
  }
}
```

### 可选依赖

平台特定的可选依赖:

```json
// versions.json
{
  "optionalDependencies": {
    "@esbuild/win32-x64": "^0.25.5"
  }
}
```

### 版本锁定

需要精确版本的依赖使用完整版本号:

```json
{
  "dependencies": {
    "critical-package": "1.2.3" // 不使用 ^ 或 ~
  }
}
```

## 持续集成

在 CI/CD 流程中集成版本检查:

```yaml
# .github/workflows/version-check.yml
name: Version Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run:
          echo "Check versions.json vs workspace package.json files for
          consistency"
```

## 故障排除

### 同步失败

```bash
# 重置 node_modules
npm run clean:all
npm install
```

### 依赖冲突无法解决

```bash
对照检查 versions.json 与各 workspace 的 package.json，定位冲突来源并统一版本
```

### 安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除锁文件重新安装
rm -rf package-lock.json node_modules
npm install
```

## 版本号规范

遵循 [Semantic Versioning 2.0.0](https://semver.org/):

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向后兼容的功能新增
- **修订号 (Patch)**: 向后兼容的问题修正

版本范围语法:

- `^1.2.3`: >= 1.2.3 < 2.0.0 (推荐)
- `~1.2.3`: >= 1.2.3 < 1.3.0 (保守)
- `1.2.3`: 精确版本 (关键依赖)
- `>=1.2.3 <2.0.0`: 明确范围

## 维护计划

- **每周**: 对照检查 `versions.json` 与各 workspace 的 `package.json` 是否一致
- **每月**: 审查依赖更新,更新非破坏性版本
- **每季度**: 评估主版本升级,制定迁移计划
- **每次发布前**: 记录版本变更并更新 CHANGELOG

## 相关资源

- [npm Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [Semantic Versioning](https://semver.org/)
- [package.json 规范](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
