# 快速开始 - 项目重构

> 🚀 **5 分钟快速清理项目重复文件和混乱结构**

---

## 🎯 目标

- 删除重复的 JS/TS 文件
- 更新导入路径
- 验证项目可正常运行

---

## ⚡ 快速执行（5 步）

### 1️⃣ 备份当前代码

```powershell
git checkout -b backup/$(Get-Date -Format 'yyyyMMdd')
git push origin backup/$(Get-Date -Format 'yyyyMMdd')
git checkout -b refactor/cleanup
```

### 2️⃣ 分析项目结构

```powershell
.\scripts\cleanup\analyze-structure.ps1
```

**预期输出**:

```
总文件数: 1500+
发现 5 组 JS/TS 重复文件
```

### 3️⃣ 清理重复文件（预演）

```powershell
# 先预演，查看将要删除什么
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun
```

**预期输出**:

```
[DRY RUN] 将删除: shared\index.js
[DRY RUN] 将删除: shared\types\index.js
[DRY RUN] 将删除: shared\utils\apiResponseBuilder.js
...
```

### 4️⃣ 执行清理

```powershell
# 确认无误后，执行实际删除
.\scripts\cleanup\cleanup-duplicates.ps1

# 更新导入路径
.\scripts\cleanup\update-imports.ps1
```

### 5️⃣ 验证

```powershell
# 类型检查
npm run type-check

# 测试
npm test

# 启动开发服务器
npm run dev
```

---

## ✅ 成功标志

如果看到以下输出，说明清理成功:

```
✓ TypeScript 检查通过
✓ 所有测试通过
✓ 开发服务器启动成功
```

---

## ⚠️ 如果出现问题

### 问题 1: 导入错误

```
Error: Cannot find module 'shared/index.js'
```

**解决**:

```powershell
.\scripts\cleanup\update-imports.ps1
```

### 问题 2: 类型错误

```
Error: Type 'X' is not assignable to type 'Y'
```

**解决**:

```powershell
npm run clean
npm install
npm run type-check
```

### 问题 3: 需要回滚

```powershell
git checkout backup/$(Get-Date -Format 'yyyyMMdd')
```

---

## 📊 清理效果

**之前**:

- ❌ 5+ 组重复文件
- ❌ JS/TS 混用
- ❌ 导入路径混乱

**之后**:

- ✅ 统一使用 TypeScript
- ✅ 清晰的导入路径
- ✅ 减少 30% 文件数量

---

## 🔗 相关文档

- 详细迁移指南: `MIGRATION_GUIDE.md`
- 完整重构计划: `RESTRUCTURE_PLAN.md`
- 问题分析报告: `PROJECT_RESTRUCTURE_ANALYSIS.md`

---

## 💡 提示

1. **始终先运行 -DryRun 模式**
2. **每步完成后都要验证**
3. **遇到问题及时回滚**
4. **保持与团队沟通**

---

**预计时间**: 5-10 分钟  
**难度**: ⭐⭐☆☆☆  
**风险**: 低（有备份和回滚方案）
