/**
 * Electron 桌面模式下的本地数据库访问工具
 * 通过 IPC 调用 Electron 主进程的 SQLite 数据库
 * 仅在 isDesktop() 为 true 时可用
 */

import { isDesktop } from './environment';

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount?: number;
};

const DEFAULT_WORKSPACE_ID = 'local-workspace';
const DEFAULT_USER_ID = 'local';

/**
 * 执行本地数据库查询
 */
export const localQuery = async <T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> => {
  if (!isDesktop() || !window.electronAPI?.database) {
    throw new Error('localQuery 仅在 Electron 桌面模式下可用');
  }
  const result = await window.electronAPI.database.query(sql, params);
  const res = result as QueryResult<T>;
  return {
    rows: Array.isArray(res.rows) ? res.rows : Array.isArray(result) ? (result as T[]) : [],
    rowCount: res.rowCount,
  };
};

/**
 * 生成 UUID（简易版，用于本地 ID 生成）
 */
export const generateLocalId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export { DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID };
