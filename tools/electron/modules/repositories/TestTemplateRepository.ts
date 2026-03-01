/**
 * TestTemplateRepository — 测试模板仓储
 */

import { generateId } from '../localDbAdapter';
import { BaseRepository } from './BaseRepository';

export interface TestTemplateRow {
  [key: string]: unknown;
  id: string;
  user_id?: string;
  workspace_id?: string;
  engine_type: string;
  name: string;
  template_name?: string;
  description?: string;
  config: string;
  is_public: number;
  is_default: number;
  usage_count: number;
  tags: string;
  created_at: string;
  updated_at: string;
  sync_id?: string;
  sync_version?: number;
  sync_status?: string;
}

export class TestTemplateRepository extends BaseRepository<TestTemplateRow> {
  protected readonly tableName = 'test_templates';

  async findByEngineType(engineType: string): Promise<TestTemplateRow[]> {
    return this.findAll({
      where: 'engine_type = ?',
      params: [engineType],
      orderBy: 'created_at DESC',
    });
  }

  async findByUser(userId: string): Promise<TestTemplateRow[]> {
    return this.findAll({
      where: 'user_id = ?',
      params: [userId],
      orderBy: 'created_at DESC',
    });
  }

  async findPublicTemplates(): Promise<TestTemplateRow[]> {
    return this.findAll({
      where: 'is_public = 1',
      orderBy: 'usage_count DESC',
    });
  }

  async createTemplate(data: {
    user_id?: string;
    workspace_id?: string;
    engine_type: string;
    name: string;
    description?: string;
    config: Record<string, unknown>;
    is_public?: boolean;
    is_default?: boolean;
  }): Promise<TestTemplateRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.rawQuery(
      `INSERT INTO test_templates (id, user_id, workspace_id, engine_type, name, description, config, is_public, is_default, usage_count, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '[]', ?, ?)`,
      [
        id,
        data.user_id || null,
        data.workspace_id || null,
        data.engine_type,
        data.name,
        data.description || '',
        JSON.stringify(data.config),
        data.is_public ? 1 : 0,
        data.is_default ? 1 : 0,
        now,
        now,
      ]
    );

    const result = await this.findById(id);
    if (!result) throw new Error(`模板创建失败: ${id}`);
    return result;
  }

  async incrementUsageCount(templateId: string): Promise<void> {
    await this.rawQuery(
      `UPDATE test_templates SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), templateId]
    );
  }
}
