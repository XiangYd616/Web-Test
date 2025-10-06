# 🤖 如何在Warp窗口中与AI助手协作

## 📋 概述

每个Warp窗口都有一个 `.warp-context.md` 文件，用于告诉AI助手当前窗口的角色和职责。

---

## 🪟 四个窗口的上下文文件位置

| 窗口 | 位置 | 文件路径 |
|-----|------|---------|
| 窗口1 - 前端 | `D:\myproject\Test-Web` | `.warp-context.md` |
| 窗口2 - 后端 | `D:\myproject\Test-Web-backend` | `.warp-context.md` |
| 窗口3 - Electron | `D:\myproject\Test-Web-electron` | `.warp-context.md` |
| 窗口4 - 测试 | `D:\myproject\Test-Web-testing` | `.warp-context.md` |

---

## 💬 如何告诉AI助手开始工作

### 方法1：简单描述（推荐）

在每个Warp窗口中，直接告诉AI：

#### 窗口1 - 前端
```
我是窗口1，负责前端UI开发。
查看 .warp-context.md 了解我的职责，然后开始工作。
```

#### 窗口2 - 后端
```
我是窗口2，负责后端API开发。
查看 .warp-context.md 了解我的职责，然后帮我启动后端服务。
```

#### 窗口3 - Electron
```
我是窗口3，负责Electron集成。
查看 .warp-context.md，然后帮我开始Electron开发。
```

#### 窗口4 - 测试
```
我是窗口4，负责测试和维护。
查看 .warp-context.md，然后帮我运行测试。
```

---

### 方法2：详细说明

或者更详细地告诉AI：

```
我在 D:\myproject\Test-Web-backend 目录，
这是窗口2 - 后端API开发环境。

我的主要职责是：
- 开发后端API端点
- 数据库操作
- 业务逻辑实现

请查看 .warp-context.md 文件了解完整信息，
然后帮我启动后端开发服务器。
```

---

## 🎯 上下文文件内容说明

每个 `.warp-context.md` 文件包含：

### 1. 基本信息
- 当前工作目录
- Git分支
- 主要职责

### 2. 工作目标
- 5个核心任务
- 重点关注领域

### 3. 快速启动命令
- 启动开发服务器
- 常用命令
- 端口信息

### 4. 项目结构
- 目录布局
- 主要文件说明

### 5. 常用命令
- 开发命令
- 测试命令
- 构建命令
- 维护命令

### 6. 与其他窗口的关系
- 如何协作
- 接口说明
- 依赖关系

### 7. 故障排查
- 常见问题
- 解决方案
- 调试技巧

### 8. 相关文档
- 本地文档链接
- 外部资源
- Worktree文档

---

## 📝 示例对话

### 窗口1 - 前端开发

**您：**
```
我是窗口1，前端UI开发。
查看上下文文件，然后帮我启动前端服务。
```

**AI助手会：**
1. 读取 `.warp-context.md`
2. 了解您的职责是前端开发
3. 知道启动命令是 `npm run frontend`
4. 知道端口是 5174
5. 执行启动命令

---

### 窗口2 - 后端开发

**您：**
```
窗口2 - 后端开发。
参考上下文，帮我创建一个新的API端点。
```

**AI助手会：**
1. 读取 `.warp-context.md`
2. 了解您负责后端API
3. 知道API结构和规范
4. 知道测试和提交流程
5. 帮您创建API端点并编写测试

---

### 窗口3 - Electron

**您：**
```
Electron窗口。
看看上下文，帮我添加系统托盘功能。
```

**AI助手会：**
1. 读取 `.warp-context.md`
2. 了解您负责Electron集成
3. 知道主进程和IPC通信
4. 知道代码规范和安全要求
5. 帮您实现托盘功能

---

### 窗口4 - 测试

**您：**
```
测试窗口。
根据上下文，帮我运行单元测试并查看覆盖率。
```

**AI助手会：**
1. 读取 `.warp-context.md`
2. 了解您负责测试
3. 知道测试命令和框架
4. 运行测试
5. 分析结果

---

## 🔍 查看上下文文件

随时可以查看上下文：

```bash
# 查看当前窗口的上下文
cat .warp-context.md

# 或用编辑器打开
code .warp-context.md
```

---

## 💡 使用技巧

### 1. 明确角色
开始对话时先说明窗口角色：
```
"我是窗口2 - 后端开发"
```

### 2. 引用上下文
让AI查看上下文文件：
```
"查看 .warp-context.md"
"根据上下文文件"
"参考我的职责说明"
```

### 3. 具体任务
结合上下文说明具体任务：
```
"根据我的职责，帮我优化API性能"
"作为前端窗口，我想改进这个组件"
```

### 4. 跨窗口协作
说明与其他窗口的关系：
```
"我是后端窗口，需要为窗口1的前端提供API"
"我是测试窗口，要测试窗口2的API端点"
```

---

## 🎯 快速开始模板

### 复制粘贴使用

#### 窗口1
```
我是窗口1 - 前端UI开发（D:\myproject\Test-Web）
分支: feature/frontend-ui-dev
职责: React组件开发、UI设计、前端路由

查看 .warp-context.md 了解详情。
启动命令: npm run frontend (端口 5174)

[您的具体任务]
```

#### 窗口2
```
我是窗口2 - 后端API开发（D:\myproject\Test-Web-backend）
分支: feature/backend-api-dev
职责: API端点、数据库、业务逻辑

查看 .warp-context.md 了解详情。
启动命令: npm run backend:dev (端口 3001)

[您的具体任务]
```

#### 窗口3
```
我是窗口3 - Electron集成（D:\myproject\Test-Web-electron）
分支: feature/electron-integration
职责: Electron主进程、IPC通信、系统集成

查看 .warp-context.md 了解详情。
启动命令: npm run dev

[您的具体任务]
```

#### 窗口4
```
我是窗口4 - 测试与维护（D:\myproject\Test-Web-testing）
分支: test/integration-testing
职责: 单元测试、E2E测试、代码质量、Bug修复

查看 .warp-context.md 了解详情。
启动命令: npm run test:watch

[您的具体任务]
```

---

## 📚 相关文档

- [多窗口开发指南](../docs/MULTI_WINDOW_DEVELOPMENT_GUIDE.md)
- [快速启动参考](./QUICK_START_REFERENCE.md)
- [Worktree合并指南](./WORKTREE_MERGE_GUIDE.md)
- [共享仓库说明](./WORKTREE_SHARED_REPO_DEMO.md)

---

## 🎊 总结

通过 `.warp-context.md` 文件：

✅ AI助手能快速了解窗口职责
✅ 提供针对性的帮助
✅ 遵循项目规范
✅ 使用正确的命令和工具
✅ 理解与其他窗口的关系

**只需简单一句话，AI就能开始工作！** 🚀

---

**最后更新**: 2025-10-06  
**创建者**: Test Web App Team

