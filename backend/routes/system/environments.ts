/**
 * 环境变量管理API路由
 * 提供类似Postman Environment的功能接口
 */

import express from 'express';
import EnvironmentManager from '../../services/environments/EnvironmentManager';

interface Environment {
  id: string;
  name: string;
  description?: string;
  variables: Record<
    string,
    {
      value: string;
      type: 'string' | 'number' | 'boolean' | 'object';
      description?: string;
      enabled: boolean;
      secret?: boolean;
    }
  >;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  tags: string[];
  scope: 'global' | 'workspace' | 'project';
  isActive: boolean;
}

interface EnvironmentVariable {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
  enabled: boolean;
  secret?: boolean;
}

interface CreateEnvironmentRequest {
  name: string;
  description?: string;
  variables?: Record<string, EnvironmentVariable>;
  tags?: string[];
  scope?: 'global' | 'workspace' | 'project';
}

interface UpdateEnvironmentRequest {
  name?: string;
  description?: string;
  variables?: Record<string, EnvironmentVariable>;
  tags?: string[];
  isActive?: boolean;
}

interface EnvironmentExport {
  name: string;
  description?: string;
  variables: Record<string, EnvironmentVariable>;
  tags: string[];
  exportedAt: Date;
  exportedBy: string;
}

const router = express.Router();

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
  };
}

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 初始化环境管理器
let environmentManager: EnvironmentManager;
try {
  environmentManager = new EnvironmentManager({
    storageDir: './data/environments',
    encryptionKey: process.env.ENVIRONMENT_ENCRYPTION_KEY,
  });
} catch (error) {
  console.error('环境管理器初始化失败:', error);
}

// 模拟环境数据
const environments: Environment[] = [
  {
    id: '1',
    name: 'Development',
    description: '开发环境配置',
    variables: {
      API_BASE_URL: {
        value: 'http://localhost:3000',
        type: 'string',
        description: 'API基础URL',
        enabled: true,
      },
      DATABASE_URL: {
        value: 'postgresql://localhost:5432/devdb',
        type: 'string',
        description: '数据库连接字符串',
        enabled: true,
        secret: true,
      },
      DEBUG_MODE: {
        value: 'true',
        type: 'boolean',
        description: '调试模式',
        enabled: true,
      },
      TIMEOUT: {
        value: '30',
        type: 'number',
        description: '请求超时时间(秒)',
        enabled: true,
      },
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
    tags: ['development', 'local'],
    scope: 'workspace',
    isActive: true,
  },
  {
    id: '2',
    name: 'Production',
    description: '生产环境配置',
    variables: {
      API_BASE_URL: {
        value: 'https://api.testweb.com',
        type: 'string',
        description: 'API基础URL',
        enabled: true,
      },
      DATABASE_URL: {
        value: 'postgresql://prod-db:5432/proddb',
        type: 'string',
        description: '数据库连接字符串',
        enabled: true,
        secret: true,
      },
      DEBUG_MODE: {
        value: 'false',
        type: 'boolean',
        description: '调试模式',
        enabled: true,
      },
      TIMEOUT: {
        value: '15',
        type: 'number',
        description: '请求超时时间(秒)',
        enabled: true,
      },
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
    tags: ['production', 'live'],
    scope: 'global',
    isActive: false,
  },
];

/**
 * GET /api/system/environments
 * 获取所有环境列表
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { scope, tags, search } = req.query;
      const userId = getUserId(req);

      let filteredEnvironments = [...environments];

      // 按作用域过滤
      if (scope) {
        filteredEnvironments = filteredEnvironments.filter(env => env.scope === scope);
      }

      // 按标签过滤
      if (tags) {
        const tagArray = (tags as string).split(',');
        filteredEnvironments = filteredEnvironments.filter(env =>
          tagArray.some(tag => env.tags.includes(tag))
        );
      }

      // 搜索过滤
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredEnvironments = filteredEnvironments.filter(
          env =>
            env.name.toLowerCase().includes(searchLower) ||
            (env.description && env.description.toLowerCase().includes(searchLower))
        );
      }

      res.json({
        success: true,
        data: filteredEnvironments,
        total: filteredEnvironments.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取环境列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/environments/:id
 * 获取单个环境详情
 */
router.get(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const environment = environments.find(env => env.id === id);

      if (!environment) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      res.json({
        success: true,
        data: environment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取环境详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/environments
 * 创建环境
 */
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const environmentData: CreateEnvironmentRequest = req.body;

    if (!environmentData.name) {
      return res.status(400).json({
        success: false,
        message: '环境名称是必需的',
      });
    }

    try {
      const newEnvironment: Environment = {
        id: Date.now().toString(),
        name: environmentData.name,
        description: environmentData.description,
        variables: environmentData.variables || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        tags: environmentData.tags || [],
        scope: environmentData.scope || 'workspace',
        isActive: false,
      };

      environments.push(newEnvironment);

      res.status(201).json({
        success: true,
        message: '环境创建成功',
        data: newEnvironment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * PUT /api/system/environments/:id
 * 更新环境
 */
router.put(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const updateData: UpdateEnvironmentRequest = req.body;

    try {
      const environmentIndex = environments.findIndex(env => env.id === id);

      if (environmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      // 更新环境信息
      if (updateData.name) environments[environmentIndex].name = updateData.name;
      if (updateData.description)
        environments[environmentIndex].description = updateData.description;
      if (updateData.variables) environments[environmentIndex].variables = updateData.variables;
      if (updateData.tags) environments[environmentIndex].tags = updateData.tags;
      if (updateData.isActive !== undefined)
        environments[environmentIndex].isActive = updateData.isActive;

      environments[environmentIndex].updatedAt = new Date();
      environments[environmentIndex].updatedBy = userId;

      res.json({
        success: true,
        message: '环境更新成功',
        data: environments[environmentIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/environments/:id
 * 删除环境
 */
router.delete(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const environmentIndex = environments.findIndex(env => env.id === id);

      if (environmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      const deletedEnvironment = environments.splice(environmentIndex, 1)[0];

      res.json({
        success: true,
        message: '环境删除成功',
        data: deletedEnvironment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/environments/:id/activate
 * 激活环境
 */
router.post(
  '/:id/activate',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);

    try {
      // 先将所有环境设为非激活状态
      environments.forEach(env => (env.isActive = false));

      // 激活指定环境
      const environmentIndex = environments.findIndex(env => env.id === id);

      if (environmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      environments[environmentIndex].isActive = true;
      environments[environmentIndex].updatedAt = new Date();
      environments[environmentIndex].updatedBy = userId;

      res.json({
        success: true,
        message: '环境激活成功',
        data: environments[environmentIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '激活环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/environments/:id/variables
 * 获取环境变量
 */
router.get(
  '/:id/variables',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { includeDisabled = false, includeSecrets = false } = req.query;

    try {
      const environment = environments.find(env => env.id === id);

      if (!environment) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      let variables = { ...environment.variables };

      // 过滤禁用的变量
      if (includeDisabled !== 'true') {
        variables = Object.fromEntries(
          Object.entries(variables).filter(([_, varData]) => varData.enabled)
        );
      }

      // 过滤敏感变量
      if (includeSecrets !== 'true') {
        variables = Object.fromEntries(
          Object.entries(variables).map(([key, varData]) => [
            key,
            {
              ...varData,
              value: varData.secret ? '***SECRET***' : varData.value,
            },
          ])
        );
      }

      res.json({
        success: true,
        data: variables,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取环境变量失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/environments/:id/variables
 * 添加或更新环境变量
 */
router.post(
  '/:id/variables',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        success: false,
        message: '变量对象是必需的',
      });
    }

    try {
      const environmentIndex = environments.findIndex(env => env.id === id);

      if (environmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      // 合并变量
      environments[environmentIndex].variables = {
        ...environments[environmentIndex].variables,
        ...variables,
      };
      environments[environmentIndex].updatedAt = new Date();
      environments[environmentIndex].updatedBy = userId;

      res.json({
        success: true,
        message: '环境变量更新成功',
        data: environments[environmentIndex].variables,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新环境变量失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/environments/:id/variables/:key
 * 删除环境变量
 */
router.delete(
  '/:id/variables/:key',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id, key } = req.params;
    const userId = getUserId(req);

    try {
      const environmentIndex = environments.findIndex(env => env.id === id);

      if (environmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      if (!environments[environmentIndex].variables[key]) {
        return res.status(404).json({
          success: false,
          message: '环境变量不存在',
        });
      }

      delete environments[environmentIndex].variables[key];
      environments[environmentIndex].updatedAt = new Date();
      environments[environmentIndex].updatedBy = userId;

      res.json({
        success: true,
        message: '环境变量删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除环境变量失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/environments/:id/export
 * 导出环境
 */
router.post(
  '/:id/export',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { format = 'json', includeSecrets = false } = req.body;
    const userId = getUserId(req);

    try {
      const environment = environments.find(env => env.id === id);

      if (!environment) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      const exportData: EnvironmentExport = {
        name: environment.name,
        description: environment.description,
        variables: includeSecrets
          ? environment.variables
          : Object.fromEntries(
              Object.entries(environment.variables).map(([key, varData]) => [
                key,
                {
                  ...varData,
                  value: varData.secret ? '***SECRET***' : varData.value,
                },
              ])
            ),
        tags: environment.tags,
        exportedAt: new Date(),
        exportedBy: userId,
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${environment.name}_environment.json"`
        );
        res.json(exportData);
      } else {
        res.status(400).json({
          success: false,
          message: '不支持的导出格式',
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/environments/import
 * 导入环境
 */
router.post(
  '/import',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const { name, description, variables, tags } = req.body;

    if (!name || !variables) {
      return res.status(400).json({
        success: false,
        message: '名称和变量是必需的',
      });
    }

    try {
      const newEnvironment: Environment = {
        id: Date.now().toString(),
        name,
        description,
        variables,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        tags: tags || [],
        scope: 'workspace',
        isActive: false,
      };

      environments.push(newEnvironment);

      res.status(201).json({
        success: true,
        message: '环境导入成功',
        data: newEnvironment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导入环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/environments/active
 * 获取当前激活的环境
 */
router.get(
  '/active',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const activeEnvironment = environments.find(env => env.isActive);

      if (!activeEnvironment) {
        return res.json({
          success: true,
          data: null,
          message: '没有激活的环境',
        });
      }

      res.json({
        success: true,
        data: activeEnvironment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取激活环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
