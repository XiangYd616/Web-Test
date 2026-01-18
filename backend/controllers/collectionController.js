const { models } = require('../database/sequelize');
const CollectionManager = require('../services/collections/CollectionManager');
const { hasWorkspacePermission } = require('../utils/workspacePermissions');

const collectionManager = new CollectionManager({ models });

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const ensureWorkspaceMember = async (workspaceId, userId) => {
  const { WorkspaceMember } = models;
  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: userId, status: 'active' }
  });
};

const ensureWorkspacePermission = async (workspaceId, userId, action) => {
  const member = await ensureWorkspaceMember(workspaceId, userId);
  if (!member) {
    return { error: '没有权限访问该工作空间集合' };
  }
  if (!hasWorkspacePermission(member.role, action)) {
    return { error: '当前角色无此操作权限' };
  }
  return { member };
};

const ensureCollectionAccess = async (collectionId, userId) => {
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

const validateCollectionInput = (data, res) => {
  const errors = [];
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

const validateRequestInput = (data, res) => {
  const errors = [];
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
  } else if (typeof data.url === 'object' && !data.url.raw) {
    errors.push({ field: 'url', message: 'url.raw 不能为空' });
  }

  if (data?.headers) {
    if (!Array.isArray(data.headers) && typeof data.headers !== 'object') {
      errors.push({ field: 'headers', message: 'headers 必须是数组或对象' });
    }
    if (Array.isArray(data.headers)) {
      data.headers.forEach((header, index) => {
        if (header.key && String(header.key).length > 256) {
          errors.push({ field: `headers[${index}].key`, message: 'header.key 长度不能超过256' });
        }
      });
    }
  }

  if (data?.auth) {
    if (typeof data.auth !== 'object') {
      errors.push({ field: 'auth', message: 'auth 必须是对象' });
    } else if (data.auth.type && String(data.auth.type).length > 50) {
      errors.push({ field: 'auth.type', message: 'auth.type 长度不能超过50' });
    }
  }

  if (data?.body) {
    if (typeof data.body !== 'object') {
      errors.push({ field: 'body', message: 'body 必须是对象' });
    } else if (data.body.mode) {
      const allowedModes = ['raw', 'urlencoded', 'formdata', 'file', 'graphql', 'none'];
      if (!allowedModes.includes(data.body.mode)) {
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

const listCollections = async (req, res) => {
  const workspaceId = req.query.workspaceId;
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const { Collection, CollectionItem } = models;
  const { page, limit, offset } = parsePagination(req);
  const { count, rows } = await Collection.findAndCountAll({
    where: { workspace_id: workspaceId },
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  const results = [];
  for (const collection of rows) {
    const itemCount = await CollectionItem.count({ where: { collection_id: collection.id } });
    results.push({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt?.toISOString?.() || collection.created_at,
      updatedAt: collection.updatedAt?.toISOString?.() || collection.updated_at,
      itemCount,
      isPublic: collection.metadata?.isPublic || false,
      tags: collection.metadata?.tags || []
    });
  }

  return res.paginated(results, page, limit, count, '获取集合列表成功');
};

const createCollection = async (req, res) => {
  const { workspaceId } = req.body || {};
  if (!workspaceId) {
    return res.validationError([{ field: 'workspaceId', message: 'workspaceId 不能为空' }]);
  }
  if (!validateCollectionInput(req.body, res)) {
    return;
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
  if (permission.error) {
    return res.forbidden(permission.error);
  }

  const collection = await collectionManager.createCollection({
    ...req.body,
    workspaceId,
    createdBy: req.user.id
  });

  return res.created(collection, '创建集合成功');
};

const getCollection = async (req, res) => {
  const access = await ensureCollectionAccess(req.params.collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'read')) {
    return res.forbidden('当前角色无读取权限');
  }
  const collection = await collectionManager.getCollection(req.params.collectionId);
  return res.success(collection, '获取集合成功');
};

const deleteCollection = async (req, res) => {
  const access = await ensureCollectionAccess(req.params.collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'delete')) {
    return res.forbidden('当前角色无删除权限');
  }
  await collectionManager.deleteCollection(req.params.collectionId);
  return res.success(null, '删除集合成功');
};

const addFolder = async (req, res) => {
  if (!req.body?.name || req.body.name.length > 255) {
    return res.validationError([{ field: 'name', message: '文件夹名称不能为空且长度不超过255' }]);
  }
  if (req.body?.description && req.body.description.length > 2000) {
    return res.validationError([{ field: 'description', message: '描述长度不能超过2000' }]);
  }
  const access = await ensureCollectionAccess(req.params.collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'write')) {
    return res.forbidden('当前角色无写入权限');
  }
  const folder = await collectionManager.createFolder(req.params.collectionId, req.body || {});
  return res.created(folder, '创建文件夹成功');
};

const addRequest = async (req, res) => {
  if (!validateRequestInput(req.body, res)) {
    return;
  }
  const access = await ensureCollectionAccess(req.params.collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'write')) {
    return res.forbidden('当前角色无写入权限');
  }
  const request = await collectionManager.addRequest(
    req.params.collectionId,
    req.body || {},
    req.body?.parentFolderId || null
  );
  return res.created(request, '创建请求成功');
};

const importPostmanCollection = async (req, res) => {
  const { workspaceId, collection } = req.body || {};
  if (!workspaceId || !collection) {
    return res.validationError([
      { field: 'workspaceId', message: 'workspaceId 不能为空' },
      { field: 'collection', message: 'collection 不能为空' }
    ]);
  }
  if (!collection.info?.name || String(collection.info.name).length > 255) {
    return res.validationError([{ field: 'collection.info.name', message: '集合名称不能为空且长度不超过255' }]);
  }
  const permission = await ensureWorkspacePermission(workspaceId, req.user.id, 'write');
  if (permission.error) {
    return res.forbidden(permission.error);
  }
  const result = await collectionManager.importPostmanCollection(collection, {
    workspaceId,
    createdBy: req.user.id
  });
  return res.created(result, '导入集合成功');
};

const exportCollection = async (req, res) => {
  const format = req.query.format || 'postman';
  if (format !== 'postman') {
    return res.validationError([{ field: 'format', message: '仅支持 postman 格式' }]);
  }
  const access = await ensureCollectionAccess(req.params.collectionId, req.user.id);
  if (access.error) {
    return access.error === '集合不存在' ? res.notFound(access.error) : res.forbidden(access.error);
  }
  if (!hasWorkspacePermission(access.member.role, 'read')) {
    return res.forbidden('当前角色无导出权限');
  }
  const collection = await collectionManager.exportToPostman(req.params.collectionId);
  return res.success(collection, '导出集合成功');
};

module.exports = {
  listCollections,
  createCollection,
  getCollection,
  deleteCollection,
  addFolder,
  addRequest,
  importPostmanCollection,
  exportCollection
};
