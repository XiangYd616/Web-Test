# Backend 说明

本目录为后端服务代码，统一入口与模块化规范如下。

## 目录结构

```
backend/
├── modules/            # 领域模块（新增功能优先放这里）
├── core/               # 核心基础能力（注册、引擎、基础服务）
├── server.ts           # 服务入口
├── routes/             # 通用路由入口（legacy，逐步迁移）
├── controllers/        # 传统控制器（legacy，逐步迁移）
├── services/           # 传统服务（legacy，逐步迁移）
├── repositories/       # 数据访问层（legacy，逐步迁移）
└── middleware/         # 中间件（legacy，逐步迁移）
```

## 模块化规则

- 新功能优先放入 `modules/<domain>/`。
- 模块内部建议结构：`controllers/`、`services/`、`repositories/`、`routes.ts`。
- `server.ts` 仅加载模块路由入口（如 `modules/testing/routes.ts`）。

## 统一响应规范

- 使用 `backend/modules/middleware/responseFormatter.ts` 导出的 `response` 中间件。
- 控制器统一使用 `res.success / res.created / res.error`。

> 详细规范参考：`docs/ARCHITECTURE_STANDARDS.md`。
