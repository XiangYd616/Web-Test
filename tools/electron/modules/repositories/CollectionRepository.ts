/**
 * CollectionRepository — 集合仓储
 */

import { generateId } from '../localDbAdapter';
import { BaseRepository } from './BaseRepository';

export interface CollectionRow {
  [key: string]: unknown;
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  default_environment_id?: string;
  metadata: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sync_id?: string;
  sync_version?: number;
  sync_status?: string;
}

export interface CollectionFolderRow {
  [key: string]: unknown;
  id: string;
  collection_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  sort_order: number;
  created_by?: string;
  created_at: string;
}

export interface CollectionRequestRow {
  [key: string]: unknown;
  id: string;
  collection_id: string;
  folder_id: string | null;
  name: string;
  description: string;
  method: string;
  url: string;
  headers: string;
  params: string;
  body: string;
  auth?: string;
  tests: string;
  timeout?: number;
  sort_order: number;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export class CollectionRepository extends BaseRepository<CollectionRow> {
  protected readonly tableName = 'collections';

  async findByWorkspace(workspaceId: string): Promise<CollectionRow[]> {
    return this.findAll({
      where: 'workspace_id = ?',
      params: [workspaceId],
      orderBy: 'updated_at DESC',
    });
  }

  async createCollection(data: {
    name: string;
    description?: string;
    workspace_id: string;
    created_by?: string;
    default_environment_id?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CollectionRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO collections (id, workspace_id, name, description, default_environment_id, metadata, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.workspace_id,
        data.name,
        data.description || '',
        data.default_environment_id || null,
        JSON.stringify(data.metadata || {}),
        data.created_by || null,
        now,
        now,
      ]
    );

    const result = await this.findById(id);
    if (!result) throw new Error(`集合创建失败: ${id}`);
    return result;
  }

  async deleteWithCascade(collectionId: string): Promise<void> {
    await this.rawQuery('DELETE FROM collection_requests WHERE collection_id = ?', [collectionId]);
    await this.rawQuery('DELETE FROM collection_folders WHERE collection_id = ?', [collectionId]);
    await this.rawQuery('DELETE FROM collections WHERE id = ?', [collectionId]);
  }

  // ─── 文件夹操作 ───

  async findFolders(collectionId: string): Promise<CollectionFolderRow[]> {
    const { rows } = await this.rawQuery(
      `SELECT * FROM collection_folders WHERE collection_id = ? ORDER BY sort_order ASC`,
      [collectionId]
    );
    return rows as CollectionFolderRow[];
  }

  async createFolder(data: {
    collection_id: string;
    parent_id?: string;
    name: string;
    description?: string;
    sort_order?: number;
    created_by?: string;
  }): Promise<CollectionFolderRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO collection_folders (id, collection_id, parent_id, name, description, sort_order, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.collection_id,
        data.parent_id || null,
        data.name,
        data.description || '',
        data.sort_order ?? 0,
        data.created_by || null,
        now,
      ]
    );

    const { rows } = await this.rawQuery('SELECT * FROM collection_folders WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (rows.length === 0) throw new Error(`文件夹创建失败: ${id}`);
    return rows[0] as CollectionFolderRow;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.rawQuery('DELETE FROM collection_requests WHERE folder_id = ?', [folderId]);
    await this.rawQuery('DELETE FROM collection_folders WHERE id = ?', [folderId]);
  }

  // ─── 请求操作 ───

  async findRequests(collectionId: string, folderId?: string): Promise<CollectionRequestRow[]> {
    if (folderId) {
      const { rows } = await this.rawQuery(
        `SELECT * FROM collection_requests WHERE collection_id = ? AND folder_id = ? ORDER BY sort_order ASC`,
        [collectionId, folderId]
      );
      return rows as CollectionRequestRow[];
    }
    const { rows } = await this.rawQuery(
      `SELECT * FROM collection_requests WHERE collection_id = ? ORDER BY sort_order ASC`,
      [collectionId]
    );
    return rows as CollectionRequestRow[];
  }

  async createRequest(data: {
    collection_id: string;
    folder_id?: string;
    name: string;
    method?: string;
    url: string;
    headers?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    auth?: string;
    tests?: unknown[];
    sort_order?: number;
    metadata?: Record<string, unknown>;
  }): Promise<CollectionRequestRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO collection_requests (id, collection_id, folder_id, name, method, url, headers, params, body, auth, tests, sort_order, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.collection_id,
        data.folder_id || null,
        data.name,
        data.method || 'GET',
        data.url,
        JSON.stringify(data.headers || {}),
        JSON.stringify(data.params || {}),
        JSON.stringify(data.body || {}),
        data.auth || null,
        JSON.stringify(data.tests || []),
        data.sort_order ?? 0,
        JSON.stringify(data.metadata || {}),
        now,
        now,
      ]
    );

    const { rows } = await this.rawQuery('SELECT * FROM collection_requests WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (rows.length === 0) throw new Error(`请求创建失败: ${id}`);
    return rows[0] as CollectionRequestRow;
  }

  async deleteRequest(requestId: string): Promise<void> {
    await this.rawQuery('DELETE FROM collection_requests WHERE id = ?', [requestId]);
  }
}
