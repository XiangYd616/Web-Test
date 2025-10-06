# 🔄 Git 提交和分支管理指南

**当前状态**：
- **分支**：feature/frontend-ui-dev
- **修改文件**：85个文件
- **新增文件**：26个文档和脚本

---

## 📋 当前修改概览

### 主要修改类型

1. **API 路径更新** (192处)
   - 移除了所有 `/api` 前缀
   - 影响：hooks, services, components, pages

2. **配置修复**
   - `vite.config.ts` - 添加 historyApiFallback
   - `frontend/index.html` - UTF-8 BOM 编码

3. **新增文档**
   - API 迁移文档
   - 编码修复指南
   - 开发环境指南

---

## 🎯 推荐的提交策略

### 方案 1：按功能分批提交（推荐）

```bash
# 1. 提交 API 路径更改
git add frontend/hooks/
git add frontend/services/
git add frontend/contexts/
git commit -m "fix(api): 移除 /api 前缀 - 更新所有前端 API 调用路径

- 更新 hooks: useTest, useAuth, useMonitoring, usePermissions
- 更新 services: apiService, backgroundTestManager, userService
- 更新 contexts: AuthContext
- 影响 192 处 API 调用
- 详细文档: docs/FRONTEND_API_CHANGES.md"

# 2. 提交组件更新
git add frontend/components/
git commit -m "fix(components): 更新组件中的 API 调用路径

- AlertManager, ReportGenerator, DataExporter
- TestExecutor, TestConfigForm
- 删除废弃组件: UniversalTestPage"

# 3. 提交页面更新
git add frontend/pages/
git commit -m "fix(pages): 更新页面组件中的 API 路径

- APITest, SecurityTest, ContentTest 等
- 删除废弃页面: TestPage, UnifiedTestPage"

# 4. 提交测试文件
git add frontend/tests/
git commit -m "fix(tests): 更新测试文件中的 API 路径"

# 5. 提交工具函数更新
git add frontend/utils/
git commit -m "fix(utils): 更新工具函数中的 API 路径"

# 6. 提交配置修复
git add vite.config.ts frontend/index.html
git commit -m "fix(config): 修复 Vite 配置和字符编码

- 添加 historyApiFallback 支持 SPA 路由
- index.html 添加 UTF-8 BOM 防止乱码"

# 7. 提交脚本和工具
git add scripts/
git commit -m "chore(scripts): 添加开发辅助脚本

- remove-api-prefix.ps1: API 路径自动迁移
- fix-encoding-all.ps1: 编码修复工具
- 其他开发辅助脚本"

# 8. 提交文档
git add docs/ .dev/ *.md
git commit -m "docs: 添加 API 迁移和开发环境文档

- FRONTEND_API_CHANGES.md: 完整迁移指南
- API_MIGRATION_COMPLETION_REPORT.md: 迁移完成报告
- MIME_TYPE_FIX.md, ENCODING_FIX_GUIDE.md: 问题修复指南
- .dev/: 窗口开发环境参考文档"
```

---

### 方案 2：单次提交（快速）

```bash
# 一次性提交所有更改
git add .
git commit -m "feat: API 路径重构 - 移除 /api 前缀

重大更新：
- 移除所有前端 API 调用的 /api 前缀 (192处)
- 修复 Vite 配置支持 SPA 路由
- 修复字符编码问题
- 添加完整的迁移文档和辅助工具

影响范围：
- hooks: 11个文件
- services: 20个文件  
- components: 8个文件
- pages: 9个文件
- tests: 4个文件

详细文档：
- docs/FRONTEND_API_CHANGES.md
- API_MIGRATION_COMPLETION_REPORT.md

Breaking Change: 需要后端同步移除 /api 前缀"
```

---

## 🌿 分支管理

### 当前分支结构

```
main (生产分支)
├─ feature/frontend-ui-dev (你在这里) ← 窗口1
├─ feature/backend-api-dev ← 窗口2  
├─ feature/electron-integration ← 窗口3
└─ test/integration-testing ← 窗口4
```

### 推荐工作流程

#### 步骤 1：提交当前分支的更改

```bash
# 在 feature/frontend-ui-dev 分支
git add .
git commit -m "feat: API 路径重构和问题修复"
```

#### 步骤 2：推送到远程

```bash
# 首次推送（如果远程分支不存在）
git push -u origin feature/frontend-ui-dev

# 后续推送
git push
```

#### 步骤 3：切换到后端分支（如果需要）

```bash
# 查看所有 worktree
git worktree list

# 切换到后端目录
cd D:\myproject\Test-Web-backend

# 查看后端的修改
git status
```

#### 步骤 4：合并到主分支（准备好时）

```bash
# 切换到 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 合并前端分支
git merge feature/frontend-ui-dev

# 解决冲突（如果有）
# ... 编辑冲突文件 ...
git add .
git commit -m "Merge: 合并前端 UI 开发分支"

# 推送到远程
git push origin main
```

---

## 🔍 查看修改详情

### 查看统计信息

```bash
# 查看修改统计
git diff --stat

# 查看具体文件的修改
git diff frontend/hooks/useTest.ts

# 查看所有 API 路径相关的修改
git diff | grep -E "api\/|/api/"
```

### 查看提交历史

```bash
# 查看最近的提交
git log --oneline -10

# 查看当前分支的所有提交
git log --oneline feature/frontend-ui-dev

# 图形化查看分支
git log --graph --oneline --all
```

---

## 🚀 推荐的操作顺序

### 立即执行（5分钟）

```bash
# 1. 查看修改摘要
git diff --stat | head -20

# 2. 提交所有更改
git add .
git commit -m "feat: API 路径重构 - 移除 /api 前缀

- 更新所有前端 API 调用路径 (192处)
- 修复 Vite 配置和字符编码
- 添加迁移文档和辅助工具

Breaking Change: 需要后端同步更新"

# 3. 推送到远程
git push -u origin feature/frontend-ui-dev
```

---

## 📝 提交消息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链

### 示例

```bash
feat(api): 添加用户认证 API
fix(ui): 修复按钮点击问题
docs: 更新 README
refactor(hooks): 重构 useAuth hook
chore: 更新依赖版本
```

---

## 🔐 提交前检查清单

### ✅ 代码质量

- [ ] 代码能够正常编译
- [ ] 没有 TypeScript 错误
- [ ] 没有 ESLint 警告

```bash
# 检查类型
npm run type-check

# 检查代码风格
npm run lint

# 运行测试
npm run test
```

### ✅ 功能验证

- [ ] 开发服务器能够正常启动
- [ ] 页面没有 MIME 错误
- [ ] 中文显示正常
- [ ] API 调用正常工作

### ✅ Git 状态

- [ ] 没有多余的调试代码
- [ ] 没有敏感信息（密钥、密码）
- [ ] `.gitignore` 正确配置

```bash
# 检查是否有不应该提交的文件
git status

# 查看即将提交的内容
git diff --cached
```

---

## 🆘 常见问题

### Q1: 如何撤销还未提交的修改？

```bash
# 撤销单个文件
git restore frontend/hooks/useTest.ts

# 撤销所有修改
git restore .

# 删除新增的未跟踪文件
git clean -fd
```

### Q2: 如何修改最后一次提交？

```bash
# 修改提交信息
git commit --amend -m "新的提交信息"

# 添加遗漏的文件到最后一次提交
git add forgotten-file.ts
git commit --amend --no-edit
```

### Q3: 如何查看和后端分支的差异？

```bash
# 查看分支差异
git diff feature/frontend-ui-dev..feature/backend-api-dev

# 查看文件列表
git diff --name-only feature/frontend-ui-dev..feature/backend-api-dev
```

### Q4: 如何处理 worktree 的提交？

```bash
# 在每个 worktree 目录分别提交
cd D:\myproject\Test-Web  # 窗口1 - 前端
git add .
git commit -m "前端修改"

cd D:\myproject\Test-Web-backend  # 窗口2 - 后端
git add .
git commit -m "后端修改"
```

---

## 📚 相关文档

- [Git Worktree 指南](.dev/WORKTREE_MERGE_GUIDE.md)
- [快速参考](.dev/QUICK_START_REFERENCE.md)
- [API 迁移文档](docs/FRONTEND_API_CHANGES.md)

---

## 🎯 快速命令参考

```bash
# 查看状态
git status

# 查看修改
git diff --stat

# 提交所有更改
git add . && git commit -m "你的提交信息"

# 推送
git push

# 查看分支
git branch -a

# 切换分支
git checkout branch-name

# 查看 worktree
git worktree list
```

---

**最后更新**: 2025-10-06  
**当前分支**: feature/frontend-ui-dev  
**修改文件**: 85个  
**新增文件**: 26个  
**建议操作**: 分批提交或单次提交

