# 包管理器规范说明

本项目当前统一使用 npm 作为包管理器。请勿混用 yarn/pnpm，以避免锁文件冲突和不可重复的依赖安装结果。

## 现状
- 已存在 package-lock.json（npm 锁文件）
- 不使用 yarn.lock / pnpm-lock.yaml
- .gitignore 已配置忽略 yarn.lock / pnpm-lock.yaml
- .npmrc 已配置规范 npm 行为

## 常用命令（npm）

- 安装依赖（工作区支持）
  ```bash
  npm install
  ```

- 启动前端
  ```bash
  npm run dev
  ```

- 启动后端
  ```bash
  npm run backend:dev
  ```

- 更新依赖（替代 yarn upgrade）
  ```bash
  npm update
  ```

- 安全审计
  ```bash
  npm audit
  npm audit fix
  ```

## 如需切换到 yarn（不推荐，需全队达成一致）
1. 删除 package-lock.json 和 node_modules
2. 运行 `yarn install`
3. 更新 .gitignore 允许 yarn.lock 并提交

请保持团队一致使用 npm，以获得一致、可重复的依赖安装结果。

