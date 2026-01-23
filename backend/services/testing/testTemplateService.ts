/**
 * 测试模板服务
 * 负责 test_templates 表的读写
 */

import { query } from '../../config/database';

export interface TestTemplateInput {
  name: string;
  description?: string;
  engineType: string;
  config: Record<string, unknown>;
  isPublic?: boolean;
  isDefault?: boolean;
  workspaceId?: string;
}

export interface TestTemplateRecord {
  id: string;
  user_id: string | null;
  workspace_id?: string | null;
  engine_type: string;
  template_name: string;
  description?: string | null;
  config: Record<string, unknown>;
  is_public: boolean;
  is_default: boolean;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

class TestTemplateService {
  async getTemplateForUser(
    userId: string,
    templateId: string,
    workspaceId?: string
  ): Promise<TestTemplateRecord> {
    const result = await query('SELECT * FROM test_templates WHERE id = $1', [templateId]);
    const template = result.rows[0] as TestTemplateRecord | undefined;
    if (!template) {
      throw new Error('模板不存在');
    }
    const isOwner = String(template.user_id) === String(userId);
    const isWorkspaceMatch = Boolean(
      workspaceId && String(template.workspace_id) === String(workspaceId)
    );
    if (!template.is_public && !isOwner && !isWorkspaceMatch) {
      throw new Error('无权访问此模板');
    }
    return {
      ...template,
      config: this.parseJsonValue(template.config, {} as Record<string, unknown>),
    };
  }

  async getDefaultTemplate(
    userId: string,
    engineType: string,
    workspaceId?: string
  ): Promise<TestTemplateRecord | null> {
    const scopeClause = workspaceId
      ? 'AND (user_id = $1 OR is_public = true OR workspace_id = $3)'
      : 'AND (user_id = $1 OR is_public = true)';
    const result = await query(
      `SELECT * FROM test_templates
       WHERE engine_type = $2 AND is_default = true ${scopeClause}
       ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END, updated_at DESC
       LIMIT 1`,
      workspaceId ? [userId, engineType, workspaceId] : [userId, engineType]
    );
    const template = result.rows[0] as TestTemplateRecord | undefined;
    if (!template) {
      return null;
    }
    return {
      ...template,
      config: this.parseJsonValue(template.config, {} as Record<string, unknown>),
    };
  }

  async listTemplates(
    userId: string,
    engineType?: string,
    workspaceId?: string
  ): Promise<TestTemplateRecord[]> {
    const params: Array<string | number> = [userId];
    let whereClause = '(is_public = true OR user_id = $1)';

    if (workspaceId) {
      params.push(workspaceId);
      whereClause = `(${whereClause} OR workspace_id = $${params.length})`;
    }

    if (engineType) {
      params.push(engineType);
      whereClause += ` AND engine_type = $${params.length}`;
    }

    const result = await query(
      `SELECT * FROM test_templates
       WHERE ${whereClause}
       ORDER BY updated_at DESC`,
      params
    );

    return result.rows as TestTemplateRecord[];
  }

  async createTemplate(userId: string, input: TestTemplateInput): Promise<string> {
    if (input.isDefault) {
      await query(
        `UPDATE test_templates
         SET is_default = false
         WHERE user_id = $1 AND engine_type = $2 AND is_default = true`,
        [userId, input.engineType]
      );
    }

    const result = await query(
      `INSERT INTO test_templates
        (user_id, workspace_id, engine_type, template_name, description, config, is_public, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        input.workspaceId ?? null,
        input.engineType,
        input.name,
        input.description || null,
        JSON.stringify(input.config || {}),
        Boolean(input.isPublic),
        Boolean(input.isDefault),
      ]
    );

    return result.rows[0].id as string;
  }

  async updateTemplate(
    userId: string,
    templateId: string,
    updates: Partial<TestTemplateInput>,
    workspaceId?: string
  ): Promise<void> {
    const existing = await query(
      'SELECT id, user_id, workspace_id FROM test_templates WHERE id = $1',
      [templateId]
    );
    const template = existing.rows[0] as
      | { id: string; user_id: string | null; workspace_id?: string | null }
      | undefined;
    if (!template) {
      throw new Error('模板不存在');
    }
    const isOwner = String(template.user_id) === String(userId);
    const isWorkspaceMatch = Boolean(
      workspaceId && String(template.workspace_id) === String(workspaceId)
    );
    if (!isOwner && !isWorkspaceMatch) {
      throw new Error('无权更新此模板');
    }

    const nextConfig = updates.config ? JSON.stringify(updates.config) : undefined;

    if (updates.isDefault) {
      const engineType = updates.engineType ?? null;
      if (engineType) {
        await query(
          `UPDATE test_templates
           SET is_default = false
           WHERE user_id = $1 AND engine_type = $2 AND is_default = true AND id <> $3`,
          [userId, engineType, templateId]
        );
      }
    }

    await query(
      `UPDATE test_templates
       SET template_name = COALESCE($1, template_name),
           description = COALESCE($2, description),
           engine_type = COALESCE($3, engine_type),
           config = COALESCE($4, config),
           is_public = COALESCE($5, is_public),
           is_default = COALESCE($6, is_default),
           workspace_id = COALESCE($7, workspace_id),
           updated_at = NOW()
       WHERE id = $8`,
      [
        updates.name ?? null,
        updates.description ?? null,
        updates.engineType ?? null,
        nextConfig ?? null,
        updates.isPublic ?? null,
        updates.isDefault ?? null,
        updates.workspaceId ?? null,
        templateId,
      ]
    );
  }

  async deleteTemplate(userId: string, templateId: string, workspaceId?: string): Promise<void> {
    const existing = await query(
      'SELECT id, user_id, workspace_id FROM test_templates WHERE id = $1',
      [templateId]
    );
    const template = existing.rows[0] as
      | { id: string; user_id: string | null; workspace_id?: string | null }
      | undefined;
    if (!template) {
      throw new Error('模板不存在');
    }
    const isOwner = String(template.user_id) === String(userId);
    const isWorkspaceMatch = Boolean(
      workspaceId && String(template.workspace_id) === String(workspaceId)
    );
    if (!isOwner && !isWorkspaceMatch) {
      throw new Error('无权删除此模板');
    }

    await query('DELETE FROM test_templates WHERE id = $1', [templateId]);
  }

  async incrementUsage(templateId: string): Promise<void> {
    await query(
      `UPDATE test_templates
       SET usage_count = usage_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [templateId]
    );
  }

  private parseJsonValue<T>(value: unknown, fallback: T): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    if (value !== null && value !== undefined) {
      return value as T;
    }
    return fallback;
  }
}

export default new TestTemplateService();
