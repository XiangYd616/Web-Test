/**
 * 环境变量管理API路由
 * 提供类似Postman Environment的功能接口
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { dataManagementService } from '../../services/data/DataManagementService';

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

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

const ENVIRONMENTS_TYPE = 'system_environments';

dataManagementService.initialize().catch(error => {
  console.error('环境数据服务初始化失败:', error);
});

const mapEnvironmentRecord = (record: { id: string; data: Record<string, unknown> }) =>
  ({
    ...(record.data as unknown as Environment),
    id: record.id,
  }) as Environment;

const fetchAllEnvironments = async () => {
  const { results } = await dataManagementService.queryData(ENVIRONMENTS_TYPE, {}, {});
  return results.map(record => mapEnvironmentRecord(record));
};

const fetchEnvironmentById = async (id: string) => {
  const record = await dataManagementService.readData(ENVIRONMENTS_TYPE, id);
  return mapEnvironmentRecord(record as { id: string; data: Record<string, unknown> });
};

/**
 * GET /api/system/environments
 * 获取所有环境列表
 */
router.get(
  '/',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { scope, tags, search } = req.query;
      getUserId(req);

      const { results } = await dataManagementService.queryData(
        ENVIRONMENTS_TYPE,
        {
          filters: scope ? { scope } : undefined,
          search: search as string,
        },
        {}
      );

      let filteredEnvironments = results.map(record => mapEnvironmentRecord(record));

      if (tags) {
        const tagArray = (tags as string).split(',');
        filteredEnvironments = filteredEnvironments.filter(env =>
          tagArray.some(tag => env.tags.includes(tag))
        );
      }

      return res.json({
        success: true,
        data: filteredEnvironments,
        total: filteredEnvironments.length,
      });
    } catch (error) {
      return res.status(500).json({
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
      const environment = await fetchEnvironmentById(id);

      return res.json({
        success: true,
        data: environment,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const environmentData: CreateEnvironmentRequest = req.body;

    if (!environmentData.name) {
      return res.status(400).json({
        success: false,
        message: '环境名称是必需的',
      });
    }

    try {
      const newEnvironmentData: Environment = {
        id: '',
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

      const { id } = await dataManagementService.createData(
        ENVIRONMENTS_TYPE,
        newEnvironmentData as unknown as Record<string, unknown>,
        { userId, source: 'environment' }
      );

      return res.status(201).json({
        success: true,
        message: '环境创建成功',
        data: { ...newEnvironmentData, id },
      });
    } catch (error) {
      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const updateData: UpdateEnvironmentRequest = req.body;

    try {
      await dataManagementService.readData(ENVIRONMENTS_TYPE, id);

      const updatedEnvironment = await dataManagementService.updateData(
        ENVIRONMENTS_TYPE,
        id,
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        { userId }
      );

      return res.json({
        success: true,
        message: '环境更新成功',
        data: mapEnvironmentRecord(
          updatedEnvironment as { id: string; data: Record<string, unknown> }
        ),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
      await dataManagementService.deleteData(ENVIRONMENTS_TYPE, id, { userId: getUserId(req) });

      return res.json({
        success: true,
        message: '环境删除成功',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);

    try {
      const environmentsList = await fetchAllEnvironments();

      await Promise.all(
        environmentsList.map(env =>
          dataManagementService.updateData(
            ENVIRONMENTS_TYPE,
            env.id,
            {
              isActive: env.id === id,
              updatedAt: new Date(),
              updatedBy: userId,
            },
            { userId }
          )
        )
      );

      const updatedEnvironment = await fetchEnvironmentById(id);

      return res.json({
        success: true,
        message: '环境激活成功',
        data: updatedEnvironment,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
      const environment = await fetchEnvironmentById(id);
      let variables = { ...environment.variables };

      // 过滤禁用的变量
      if (includeDisabled !== 'true') {
        variables = Object.fromEntries(
          Object.entries(variables).filter(
            ([_, varData]) => (varData as EnvironmentVariable).enabled
          )
        );
      }

      // 过滤敏感变量
      if (includeSecrets !== 'true') {
        variables = Object.fromEntries(
          Object.entries(variables).map(([key, varData]) => {
            const envVar = varData as EnvironmentVariable;
            return [
              key,
              {
                ...envVar,
                value: envVar.secret ? '***SECRET***' : envVar.value,
              },
            ];
          })
        );
      }

      return res.json({
        success: true,
        data: variables,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
      const environment = await fetchEnvironmentById(id);

      const updatedEnvironment = await dataManagementService.updateData(
        ENVIRONMENTS_TYPE,
        id,
        {
          variables: {
            ...environment.variables,
            ...variables,
          },
          updatedAt: new Date(),
          updatedBy: userId,
        },
        { userId }
      );

      return res.json({
        success: true,
        message: '环境变量更新成功',
        data: mapEnvironmentRecord(
          updatedEnvironment as { id: string; data: Record<string, unknown> }
        ).variables,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id, key } = req.params;
    const userId = getUserId(req);

    try {
      const environment = await fetchEnvironmentById(id);

      if (!environment.variables[key]) {
        return res.status(404).json({
          success: false,
          message: '环境变量不存在',
        });
      }

      const updatedVariables = { ...environment.variables };
      delete updatedVariables[key];

      await dataManagementService.updateData(
        ENVIRONMENTS_TYPE,
        id,
        {
          variables: updatedVariables,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        { userId }
      );

      return res.json({
        success: true,
        message: '环境变量删除成功',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { format = 'json', includeSecrets = false } = req.body;
    const userId = getUserId(req);

    try {
      const environment = await fetchEnvironmentById(id);

      const exportData: EnvironmentExport = {
        name: environment.name,
        description: environment.description,
        variables: Object.fromEntries(
          Object.entries(environment.variables).map(([key, varData]) => {
            const envVar = varData as EnvironmentVariable;
            return [
              key,
              {
                ...envVar,
                key,
                value: includeSecrets || !envVar.secret ? envVar.value : '***SECRET***',
              },
            ];
          })
        ) as Record<string, EnvironmentVariable>,
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
        return res.json(exportData);
      }

      return res.status(400).json({
        success: false,
        message: '不支持的导出格式',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '环境不存在',
        });
      }

      return res.status(500).json({
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { name, description, variables, tags } = req.body;

    if (!name || !variables) {
      return res.status(400).json({
        success: false,
        message: '名称和变量是必需的',
      });
    }

    try {
      const newEnvironmentData: Environment = {
        id: '',
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

      const { id } = await dataManagementService.createData(
        ENVIRONMENTS_TYPE,
        newEnvironmentData as unknown as Record<string, unknown>,
        { userId, source: 'environment' }
      );

      return res.status(201).json({
        success: true,
        message: '环境导入成功',
        data: { ...newEnvironmentData, id },
      });
    } catch (error) {
      return res.status(500).json({
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
      const { results } = await dataManagementService.queryData(
        ENVIRONMENTS_TYPE,
        { filters: { isActive: true } },
        {}
      );

      if (results.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: '没有激活的环境',
        });
      }

      return res.json({
        success: true,
        data: mapEnvironmentRecord(results[0] as { id: string; data: Record<string, unknown> }),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取激活环境失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
