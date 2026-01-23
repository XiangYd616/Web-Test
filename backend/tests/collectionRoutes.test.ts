/**
 * collections 路由集成测试
 */

const request = require('supertest');
const express = require('express');

const mockManager = {
  getCollections: jest.fn(),
  createCollection: jest.fn(),
  importPostmanCollection: jest.fn(),
  exportCollection: jest.fn(),
  addRequestToCollection: jest.fn(),
  createFolder: jest.fn(),
};

const workspaceMemberModel = {
  findOne: jest.fn(),
};

const collectionModel = {
  findByPk: jest.fn(),
};

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: () => void) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../middleware/logger', () => ({
  requestLogger: (_req: any, _res: any, next: () => void) => next(),
  performanceMonitor: (_req: any, _res: any, next: () => void) => next(),
  apiStats: (_req: any, _res: any, next: () => void) => next(),
}));

jest.mock('../database/sequelize', () => ({
  models: {
    WorkspaceMember: workspaceMemberModel,
    Collection: collectionModel,
  },
}));

jest.mock('../services/collections/CollectionManager', () => {
  return jest.fn().mockImplementation(() => mockManager);
});

jest.mock('../services/auth/sessionManager', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock(
  '../routes/mfa',
  () => {
    const express = require('express');
    return express.Router();
  },
  { virtual: true }
);

const { responseFormatter } = require('../middleware/responseFormatter');
const collectionsRouter = require('../routes/collections').default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseFormatter);
  app.use('/api/collections', collectionsRouter);
  return app;
};

describe('collections 路由', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    workspaceMemberModel.findOne.mockResolvedValue({ role: 'owner' });
    app = createApp();
  });

  test('GET /api/collections 返回集合列表', async () => {
    mockManager.getCollections.mockResolvedValue({
      collections: [{ id: 'col-1', name: 'Demo' }],
      total: 1,
    });

    const response = await request(app).get('/api/collections?workspaceId=ws-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockManager.getCollections).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      limit: 20,
      offset: 0,
    });
  });

  test('POST /api/collections 创建集合', async () => {
    mockManager.createCollection.mockResolvedValue({ id: 'col-2', name: 'New' });

    const response = await request(app)
      .post('/api/collections')
      .send({ name: 'New', description: 'desc', workspaceId: 'ws-1' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockManager.createCollection).toHaveBeenCalled();
  });

  test('POST /api/collections/import 导入集合', async () => {
    mockManager.importPostmanCollection.mockResolvedValue({ id: 'col-3', name: 'Imported' });

    const response = await request(app)
      .post('/api/collections/import')
      .send({
        workspaceId: 'ws-1',
        info: { name: 'Imported' },
        item: [{ name: 'Ping', request: { method: 'GET', url: 'https://api.example.com' } }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockManager.importPostmanCollection).toHaveBeenCalled();
  });

  test('GET /api/collections/:collectionId/export 导出集合', async () => {
    collectionModel.findByPk.mockResolvedValue({ id: 'col-4', workspace_id: 'ws-1' });
    mockManager.exportCollection.mockResolvedValue({
      collection: { id: 'col-4' },
      environments: [],
    });

    const response = await request(app).get('/api/collections/col-4/export');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockManager.exportCollection).toHaveBeenCalledWith('col-4');
  });

  test('POST /api/collections/:collectionId/requests 添加请求', async () => {
    collectionModel.findByPk.mockResolvedValue({ id: 'col-5', workspace_id: 'ws-1' });
    mockManager.addRequestToCollection.mockResolvedValue({
      id: 'col-5',
      requests: [{ id: 'req-1' }],
    });

    const response = await request(app).post('/api/collections/col-5/requests').send({
      name: 'Ping',
      method: 'GET',
      url: 'https://api.example.com/ping',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockManager.addRequestToCollection).toHaveBeenCalled();
  });

  test('POST /api/collections/:collectionId/folders 添加文件夹', async () => {
    collectionModel.findByPk.mockResolvedValue({ id: 'col-6', workspace_id: 'ws-1' });
    mockManager.createFolder.mockResolvedValue({ id: 'folder-1', name: 'Root' });

    const response = await request(app)
      .post('/api/collections/col-6/folders')
      .send({ name: 'Root' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockManager.createFolder).toHaveBeenCalled();
  });
});
