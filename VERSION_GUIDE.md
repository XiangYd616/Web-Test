# 版本管理快速指南

## 🎯 目标
统一管理项目所有依赖版本,解决多版本混乱问题

## 📁 核心文件
- **versions.json** - 版本配置(唯一真实来源)
- **scripts/sync-versions.cjs** - 版本同步工具
- **docs/VERSION_MANAGEMENT.md** - 完整文档

## 🚀 快速使用

### 日常检查
```bash
npm run version:check
```

### 同步版本
```bash
# 预览模式(不修改文件)
npm run version:sync:dry

# 执行同步
npm run version:sync
npm install
```

### 生成报告
```bash
npm run version:report
```

## 📝 常见场景

### 1. 添加新依赖
```bash
# 1. 先在 versions.json 中定义版本
# 2. 在对应子项目安装
cd frontend
npm install new-package

# 3. 同步确保一致
npm run version:sync
```

### 2. 更新依赖
```bash
# 1. 修改 versions.json 中的版本号
# 2. 执行同步
npm run version:sync
npm install

# 3. 验证
npm run type-check
npm test
```

### 3. 发现冲突
```bash
# 1. 检查冲突
npm run version:check

# 2. 在 versions.json 中统一版本
# 3. 同步并重新安装
npm run version:sync
npm install
```

## ✅ 验证成功

运行 `npm run version:check` 应该看到:
```
✅ 未发现版本冲突
```

## 📊 当前状态

✅ 已解决的冲突:
- pg: 统一为 ^8.16.2
- ws: 统一为 ^8.18.3
- eslint: 统一为 ^9.38.0
- postcss: 统一为 ^8.5.6
- typescript: 统一为 ^5.9.3

## 🔗 更多信息
详见: [docs/VERSION_MANAGEMENT.md](docs/VERSION_MANAGEMENT.md)
