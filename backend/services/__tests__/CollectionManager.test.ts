/**
 * CollectionManager 单元测试
 */

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('axios', () =>
  jest.fn(async () => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { ok: true },
  }))
);

const CollectionManager = require('../collections/CollectionManager').default;

const createMockModels = () => {
  const collectionStore = new Map<string, any>();
  let idCounter = 0;

  const Collection = {
    create: jest.fn(async (data: any) => {
      const id = data.id || `col-${++idCounter}`;
      const record = {
        id,
        name: data.name,
        description: data.description,
        workspace_id: data.workspace_id,
        created_by: data.created_by,
        definition: data.definition || {},
        metadata: data.metadata || {},
        created_at: data.created_at || new Date(),
        updated_at: data.updated_at || new Date(),
      };
      collectionStore.set(id, record);
      return record;
    }),
    findByPk: jest.fn(async (id: string) => collectionStore.get(id) || null),
    update: jest.fn(async (data: any, options: any) => {
      const id = options.where.id;
      const existing = collectionStore.get(id);
      const updated = {
        ...existing,
        ...data,
      };
      collectionStore.set(id, updated);
      return [1, [updated]];
    }),
    destroy: jest.fn(async (options: any) => {
      const existed = collectionStore.delete(options.where.id);
      return existed ? 1 : 0;
    }),
    findAll: jest.fn(async () => Array.from(collectionStore.values())),
    findAndCountAll: jest.fn(async () => ({
      rows: Array.from(collectionStore.values()),
      count: collectionStore.size,
    })),
  };

  const Environment = {
    findByPk: jest.fn(async () => null),
  };

  const EnvironmentVariable = {
    findAll: jest.fn(async () => []),
  };

  const Run = {
    create: jest.fn(async (data: any) => ({ id: `run-${Date.now()}`, ...data })),
    update: jest.fn(async () => [1, []]),
    findByPk: jest.fn(async () => ({ id: 'run-1' })),
    findAll: jest.fn(async () => []),
  };

  const RunResult = {
    create: jest.fn(async (data: any) => ({ id: `result-${Date.now()}`, ...data })),
    findAll: jest.fn(async () => []),
  };

  return {
    models: {
      Collection,
      Environment,
      EnvironmentVariable,
      Run,
      RunResult,
    },
    collectionStore,
  };
};

describe('CollectionManager', () => {
  let manager: any;
  let mockModels: ReturnType<typeof createMockModels>['models'];

  beforeEach(() => {
    const mock = createMockModels();
    mockModels = mock.models;
    manager = new CollectionManager({ models: mockModels, storageDir: './tmp/collections' });
  });

  test('importPostmanCollection 应该解析并创建集合', async () => {
    const postmanData = {
      info: { name: 'Sample', description: 'Demo' },
      item: [
        {
          name: 'Get users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
            header: [{ key: 'X-Test', value: '1' }],
            body: { mode: 'raw', raw: '{"ok":true}' },
          },
        },
      ],
    };

    await manager.importPostmanCollection(postmanData, 'workspace-1', 'user-1');

    expect(mockModels.Collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'workspace-1',
        name: 'Sample',
        definition: expect.objectContaining({
          requests: expect.arrayContaining([
            expect.objectContaining({
              name: 'Get users',
              url: 'https://api.example.com/users',
            }),
          ]),
        }),
      })
    );
  });

  test('addRequestToCollection 应该追加请求', async () => {
    const collection = await manager.createCollection(
      {
        workspaceId: 'workspace-1',
        name: 'Test Collection',
        description: 'desc',
        requests: [],
        variables: {},
        tags: [],
        metadata: {},
      },
      'user-1'
    );

    const updated = await manager.addRequestToCollection(collection.id, {
      name: 'Ping',
      method: 'GET',
      url: 'https://api.example.com/ping',
      metadata: { source: 'unit' },
    });

    expect(updated.requests).toHaveLength(1);
    expect(updated.requests[0].name).toBe('Ping');
  });

  test('createFolder 应该创建文件夹并绑定集合', async () => {
    const collection = await manager.createCollection(
      {
        workspaceId: 'workspace-2',
        name: 'Folder Collection',
        description: 'desc',
        requests: [],
        variables: {},
        tags: [],
        metadata: {},
      },
      'user-2'
    );

    const folder = await manager.createFolder({
      name: 'Root Folder',
      description: 'root',
      collectionId: collection.id,
      createdBy: 'user-2',
    });

    expect(folder.collections).toContain(collection.id);
    expect(mockModels.Collection.update).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ folderId: folder.id }) }),
      expect.any(Object)
    );
  });

  test('exportCollection 应该包含关联环境', async () => {
    const collection = await manager.createCollection(
      {
        workspaceId: 'workspace-3',
        name: 'Export Collection',
        description: 'desc',
        requests: [],
        variables: {},
        tags: [],
        metadata: {},
      },
      'user-3'
    );

    await manager.createEnvironment({
      name: 'prod',
      values: { BASE_URL: 'https://api.example.com' },
      variables: [],
      createdBy: 'user-3',
    });

    const exportData = await manager.exportCollection(collection.id);
    expect(exportData.environments).toHaveLength(1);
    expect(exportData.collection.id).toBe(collection.id);
  });
});
