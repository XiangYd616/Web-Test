/**
 * Swagger API 文档配置 - 模块化聚合入口
 * @description 从各模块导入 paths 和 schemas，合并生成完整的 OpenAPI 规范
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { adminPaths } from './paths/admin';
import { authPaths } from './paths/auth';
import { ciPaths } from './paths/ci';
import { collectionsPaths } from './paths/collections';
import { comparisonPaths } from './paths/comparison';
import { dataPaths } from './paths/data';
import { environmentsPaths } from './paths/environments';
import { historyPaths } from './paths/history';
import { schedulesPaths } from './paths/schedules';
import { systemPaths } from './paths/system';
import { testPaths } from './paths/test';
import { testplansPaths } from './paths/testplans';
import { usersPaths } from './paths/users';
import { workspacesPaths } from './paths/workspaces';
import { commonSchemas } from './schemas';

type SwaggerDefinition = Record<string, unknown>;

type SwaggerOptions = {
  definition: SwaggerDefinition;
  apis: string[];
};

// ==================== API 文档基本信息 ====================
const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Test Web App API',
    version: '1.0.0',
    description: `
# 🚀 Test Web App API 文档

企业级网站测试平台的完整API文档。

## 🌟 主要特性

- **RESTful API设计** - 遵循REST最佳实践
- **JWT认证** - 安全的身份验证机制
- **实时通信** - WebSocket支持实时数据推送
- **批量操作** - 支持批量测试和数据处理
- **错误处理** - 统一的错误响应格式
- **速率限制** - API调用频率控制

## 🔐 认证方式

API支持两种认证方式：

1. **Bearer Token (JWT)**
   - 在请求头中添加: \`Authorization: Bearer {token}\`
   - Token通过登录接口获取

2. **API Key**
   - 在请求头中添加: \`X-API-Key: {apiKey}\`
   - API Key可在用户设置中生成

## 📊 响应格式

所有API响应采用统一的JSON格式：

### 成功响应
\`\`\`json
{
  "success": true,
  "data": {...},
  "message": "操作成功",
  "timestamp": "2025-01-19T10:00:00.000Z"
}
\`\`\`

### 错误响应
\`\`\`json
{
  "success": false,
  "error": {
    "message": "错误描述",
    "type": "ERROR_TYPE",
    "errorId": "ERR-1234567890-ABCDEF",
    "timestamp": "2025-01-19T10:00:00.000Z"
  }
}
\`\`\`

## 🚦 状态码说明

- \`200\` - 成功
- \`201\` - 创建成功
- \`400\` - 请求参数错误
- \`401\` - 未认证
- \`403\` - 无权限
- \`404\` - 资源不存在
- \`409\` - 资源冲突
- \`429\` - 请求过于频繁
- \`500\` - 服务器错误

## 📝 分页参数

支持分页的接口使用以下参数：
- \`page\` - 页码（从1开始）
- \`limit\` - 每页数量（默认20，最大100）
- \`sort\` - 排序字段
- \`order\` - 排序方向（asc/desc）
    `,
    contact: {
      name: 'API Support',
      email: 'api@testweb.com',
      url: 'https://testweb.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`,
      description: '开发环境',
    },
    {
      url: 'https://api.testweb.com/api',
      description: '生产环境',
    },
  ],
  tags: [
    { name: '认证', description: '用户认证相关接口' },
    { name: '测试执行', description: '各类测试执行接口' },
    { name: '测试历史', description: '测试历史和结果管理' },
    { name: '测试计划', description: '测试计划管理和执行' },
    { name: '报告分析', description: '测试报告和数据分析' },
    { name: '数据管理', description: '数据导入导出和管理' },
    { name: '用户管理', description: '用户信息和设置' },
    { name: '工作空间', description: '工作空间管理' },
    { name: '集合管理', description: 'API 集合管理' },
    { name: '环境管理', description: '环境变量管理' },
    { name: '定时任务', description: '定时测试任务管理' },
    { name: '系统管理', description: '系统配置和监控' },
    { name: '集成', description: '第三方集成和CI/CD' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT认证令牌',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API密钥认证',
      },
    },
    schemas: commonSchemas,
  },
};

// ==================== 合并所有模块的 paths ====================
const allPathModules: Record<string, unknown>[] = [
  authPaths,
  comparisonPaths,
  testPaths,
  historyPaths,
  dataPaths,
  systemPaths,
  usersPaths,
  adminPaths,
  workspacesPaths,
  collectionsPaths,
  environmentsPaths,
  schedulesPaths,
  testplansPaths,
  ciPaths,
];

const mergedPaths: Record<string, unknown> = {};
for (const pathModule of allPathModules) {
  Object.assign(mergedPaths, pathModule);
}

// 按模块分区排序
const apiPathGroups = [
  '/auth',
  '/comparison',
  '/test',
  '/data',
  '/system',
  '/users',
  '/admin',
  '/workspaces',
  '/collections',
  '/environments',
  '/schedules',
  '/test-plans',
  '/ci',
];

const resolveGroupIndex = (pathKey: string) => {
  const foundIndex = apiPathGroups.findIndex(prefix => pathKey.startsWith(prefix));
  return foundIndex === -1 ? apiPathGroups.length : foundIndex;
};

const orderedPaths = Object.keys(mergedPaths)
  .sort((a, b) => {
    const groupA = resolveGroupIndex(a);
    const groupB = resolveGroupIndex(b);
    if (groupA !== groupB) return groupA - groupB;
    return a.localeCompare(b);
  })
  .reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = mergedPaths[key];
    return acc;
  }, {});

swaggerDefinition.paths = orderedPaths;

// ==================== Swagger 配置 ====================
const options: SwaggerOptions = {
  definition: swaggerDefinition,
  apis: ['./modules/**/routes/**/*.{ts,js}', './modules/**/routes.{ts,js}'],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 40px }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Test Web App API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * 设置Swagger文档路由
 */
function setupSwaggerDocs(app: import('express').Application) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  app.get(
    '/api/docs.json',
    (
      req: unknown,
      res: { setHeader: (name: string, value: string) => void; send: (data: unknown) => void }
    ) => {
      void req;
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    }
  );
}

export { setupSwaggerDocs, swaggerSpec };
