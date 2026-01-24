import type { Request, Response } from 'express';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';

const { models } = require('../database/pgModels');
const CollectionManager = require('../services/collections/CollectionManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');
const Logger = require('../utils/logger');

const collectionManager = new CollectionManager({ models });

type ApiResponse = Response & {
  validationError: (errors: ValidationError[]) => Response;
  success: (data?: unknown, message?: string) => Response;
  created: (data?: unknown, message?: string) => Response;
  error: (code: string, message?: string, details?: unknown, statusCode?: number) => Response;
  notFound: (message?: string) => Response;
  forbidden: (message?: string) => Response;
};

const resolveWorkspaceId = (req: Request) => {
  return (
    (req.params as { workspaceId?: string }).workspaceId ||
    (req.body as { workspaceId?: string }).workspaceId ||
    (req.query as { workspaceId?: string }).workspaceId
  );
};

type AuthRequest = Request & { user: { id: string; role?: string } };

type ValidationError = { field: string; message: string };

type CollectionData = {
  name: string;
  description?: string;
  workspaceId: string;
};

type RequestData = {
  name: string;
  method?: string;
  url: string | { raw: string };
  headers?: unknown[] | Record<string, unknown>;
  auth?: { type?: string };
  body?: { mode?: string };
  proxy?: Record<string, unknown>;
};

const parsePagination = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' },
  });
};

const ensureWorkspacePermission = async (workspaceId: string, userId: string, action: string) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间集合' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureCollectionAccess = async (collectionId: string, userId: string) => {
  const { Collection } = models;
  const collection = await Collection.findByPk(collectionId);
  if (!collection) {
    return { error: '集合不存在' };
  }
  const member = await ensureWorkspaceMember(collection.workspace_id, userId);
  if (!member) {
    return { error: '没有权限访问该集合' };
  }
  return { collection, member };
};

const validateCollectionInput = (data: CollectionData, res: ApiResponse) => {
  const errors: ValidationError[] = [];
  const name = data?.name || '';
  if (!name || name.length > 255) {
    errors.push({ field: 'name', message: '集合名称不能为空且长度不超过255' });
  }
  if (data?.description && data.description.length > 2000) {
    errors.push({ field: 'description', message: '描述长度不能超过2000' });
  }
  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const _validateRequestInput = (data: RequestData, res: ApiResponse) => {
  const errors: ValidationError[] = [];
  const name = data?.name || '';
  if (!name || name.length > 255) {
    errors.push({ field: 'name', message: '请求名称不能为空且长度不超过255' });
  }

  if (data?.method) {
    const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!allowed.includes(String(data.method).toUpperCase())) {
      errors.push({ field: 'method', message: 'method 不合法' });
    }
  }

  if (!data?.url) {
    errors.push({ field: 'url', message: 'url 不能为空' });
  } else if (typeof data.url === 'string' && data.url.trim().length === 0) {
    errors.push({ field: 'url', message: 'url 不能为空' });
  } else if (typeof data.url === 'object' && !(data.url as Record<string, unknown>).raw) {
    errors.push({ field: 'url', message: 'url.raw 不能为空' });
  }

  if (data?.headers) {
    if (!Array.isArray(data.headers) && typeof data.headers !== 'object') {
      errors.push({ field: 'headers', message: 'headers 必须是数组或对象' });
    }
    if (Array.isArray(data.headers)) {
      data.headers.forEach((header: unknown, index: number) => {
        const headerObj = header as Record<string, unknown>;
        if (headerObj.key && String(headerObj.key).length > 256) {
          errors.push({ field: `headers[${index}].key`, message: 'header.key 长度不能超过256' });
        }
      });
    }
  }

  if (data?.auth) {
    if (typeof data.auth !== 'object') {
      errors.push({ field: 'auth', message: 'auth 必须是对象' });
    } else if (
      (data.auth as Record<string, unknown>).type &&
      String((data.auth as Record<string, unknown>).type).length > 50
    ) {
      errors.push({ field: 'auth.type', message: 'auth.type 长度不能超过50' });
    }
  }

  if (data?.body) {
    if (typeof data.body !== 'object') {
      errors.push({ field: 'body', message: 'body 必须是对象' });
    } else if ((data.body as Record<string, unknown>).mode) {
      const allowedModes = ['raw', 'urlencoded', 'formdata', 'file', 'graphql', 'none'];
      if (!allowedModes.includes((data.body as Record<string, unknown>).mode as string)) {
        errors.push({ field: 'body.mode', message: 'body.mode 不合法' });
      }
    }
  }

  if (data?.proxy && typeof data.proxy !== 'object') {
    errors.push({ field: 'proxy', message: 'proxy 必须是对象' });
  }

  if (errors.length > 0) {
    res.validationError(errors);
    return false;
  }
  return true;
};

const listCollections = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const { page, limit, offset } = parsePagination(req);

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const { collections, total } = await collectionManager.getCollections({
      workspaceId,
      limit,
      offset,
    });

    return res.success({
      collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    Logger.error('获取集合列表失败', error, { userId: req.user.id });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集合列表失败', undefined, 500);
  }
};

const createCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }
    const collectionData = { ...req.body, workspaceId };

    if (!validateCollectionInput(collectionData, res)) {
      return;
    }

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const collection = await collectionManager.createCollection(collectionData, req.user.id);

    return res.created(collection, '集合创建成功');
  } catch (error) {
    Logger.error('创建集合失败', error, { userId: req.user.id });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建集合失败', undefined, 500);
  }
};

const getCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    const collection = await collectionManager.getCollection(collectionId);

    return res.success(collection);
  } catch (error) {
    Logger.error('获取集合详情失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集合详情失败', undefined, 500);
  }
};

const updateCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无写入权限');
    }

    if (!validateCollectionInput(req.body, res)) {
      return;
    }

    const collection = await collectionManager.updateCollection(collectionId, req.body);

    return res.success(collection, '集合更新成功');
  } catch (error) {
    Logger.error('更新集合失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '更新集合失败', undefined, 500);
  }
};

const deleteCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'delete')) {
      return res.forbidden('当前角色无删除权限');
    }

    await collectionManager.deleteCollection(collectionId);

    return res.success(null, '集合删除成功');
  } catch (error) {
    Logger.error('删除集合失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '删除集合失败', undefined, 500);
  }
};

const importPostmanCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
    }

    const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
    if (permission.error) {
      return res.forbidden(permission.error);
    }

    const postmanData = req.body as {
      info?: { name?: string; description?: string };
      item?: unknown[];
    };
    if (!postmanData || !Array.isArray(postmanData.item)) {
      return res.validationError([{ field: 'item', message: 'Postman collection 数据不完整' }]);
    }

    const collection = await collectionManager.importPostmanCollection(
      postmanData,
      workspaceId,
      req.user.id
    );

    return res.created(collection, '导入集合成功');
  } catch (error) {
    Logger.error('导入集合失败', error, { userId: req.user.id });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '导入集合失败', undefined, 500);
  }
};

const exportCollection = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;
    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    const exportData = await collectionManager.exportCollection(collectionId);
    return res.success(exportData, '集合导出成功');
  } catch (error) {
    Logger.error('导出集合失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '导出集合失败', undefined, 500);
  }
};

const addFolder = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;
    const { name, description, parentId } = req.body as {
      name?: string;
      description?: string;
      parentId?: string;
    };

    if (!name || name.trim().length === 0) {
      return res.validationError([{ field: 'name', message: '文件夹名称不能为空' }]);
    }

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无写入权限');
    }

    const folder = await collectionManager.createFolder({
      name,
      description,
      parentId,
      collectionId,
      createdBy: req.user.id,
    });

    return res.created(folder, '文件夹创建成功');
  } catch (error) {
    Logger.error('创建文件夹失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建文件夹失败', undefined, 500);
  }
};

const addRequest = async (req: AuthRequest, res: ApiResponse) => {
  try {
    const { collectionId } = req.params;

    if (!_validateRequestInput(req.body, res)) {
      return;
    }

    const access = await ensureCollectionAccess(collectionId, req.user.id);
    if (access.error) {
      return access.error === '集合不存在'
        ? res.notFound('集合不存在')
        : res.forbidden(access.error);
    }

    if (!hasWorkspacePermission(access.member.role, 'write')) {
      return res.forbidden('当前角色无写入权限');
    }

    const requestData = req.body as RequestData & {
      description?: string;
      params?: Record<string, string>;
      tests?: string[];
      timeout?: number;
    };

    const normalizedUrl =
      typeof requestData.url === 'string' ? requestData.url : String(requestData.url.raw || '');
    const headers = Array.isArray(requestData.headers)
      ? requestData.headers.reduce<Record<string, string>>((acc, header) => {
          const headerObj = header as { key?: string; value?: string };
          if (headerObj.key) {
            acc[headerObj.key] = headerObj.value || '';
          }
          return acc;
        }, {})
      : (requestData.headers as Record<string, string> | undefined);

    const updated = await collectionManager.addRequestToCollection(collectionId, {
      name: requestData.name,
      description: requestData.description || '',
      method: (requestData.method || 'GET') as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE'
        | 'HEAD'
        | 'OPTIONS',
      url: normalizedUrl,
      headers,
      params: requestData.params,
      body: requestData.body,
      tests: requestData.tests,
      timeout: requestData.timeout,
      auth: requestData.auth ? { type: requestData.auth.type || 'none' } : undefined,
      metadata: {
        createdBy: req.user.id,
      },
    });

    return res.success(updated, '请求添加成功');
  } catch (error) {
    Logger.error('添加请求失败', error, {
      userId: req.user.id,
      collectionId: req.params.collectionId,
    });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '添加请求失败', undefined, 500);
  }
};

export {
  addFolder,
  addRequest,
  createCollection,
  deleteCollection,
  exportCollection,
  getCollection,
  importPostmanCollection,
  listCollections,
  updateCollection,
};

module.exports = {
  addFolder,
  addRequest,
  listCollections,
  createCollection,
  importPostmanCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  exportCollection,
};
