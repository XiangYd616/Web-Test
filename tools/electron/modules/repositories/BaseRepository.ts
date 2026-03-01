/**
 * BaseRepository — Repository 模式基类
 * 封装 SQLite CRUD 通用操作，子类只需定义表名和字段映射
 */

import { query as localQuery } from '../localDbAdapter';

export type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount?: number;
  lastInsertRowid?: number;
};

export abstract class BaseRepository<T extends Record<string, unknown>> {
  protected abstract readonly tableName: string;

  // ─── 基础查询 ───

  async findById(id: string): Promise<T | null> {
    const { rows } = await this.rawQuery(`SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`, [
      id,
    ]);
    return (rows[0] as T) || null;
  }

  async findAll(options?: {
    where?: string;
    params?: unknown[];
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: unknown[] = options?.params || [];

    if (options?.where) {
      sql += ` WHERE ${options.where}`;
    }
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    if (options?.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }
    if (options?.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const { rows } = await this.rawQuery(sql, params);
    return rows as T[];
  }

  async count(where?: string, params?: unknown[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (where) {
      sql += ` WHERE ${where}`;
    }
    const { rows } = await this.rawQuery(sql, params || []);
    return Number((rows[0] as Record<string, unknown>)?.count) || 0;
  }

  async exists(id: string): Promise<boolean> {
    const { rows } = await this.rawQuery(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`, [
      id,
    ]);
    return rows.length > 0;
  }

  // ─── 写操作 ───

  async insert(data: Partial<T> & { id: string }): Promise<T> {
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    const cols = entries.map(([k]) => k);
    const vals = entries.map(([, v]) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );
    const placeholders = cols.map(() => '?').join(', ');

    await this.rawQuery(
      `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
      vals
    );
    return (await this.findById(data.id)) as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const entries = Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'id');
    if (entries.length === 0) return this.findById(id);

    const setClauses = entries.map(([k]) => `${k} = ?`);
    const values = entries.map(([, v]) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );

    // 自动更新 updated_at
    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.rawQuery(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.rawQuery(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteWhere(where: string, params: unknown[]): Promise<number> {
    const result = await this.rawQuery(`DELETE FROM ${this.tableName} WHERE ${where}`, params);
    return result.rowCount ?? 0;
  }

  // ─── 底层 ───

  protected async rawQuery(sql: string, params: unknown[] = []): Promise<QueryResult> {
    return localQuery(sql, params);
  }
}
