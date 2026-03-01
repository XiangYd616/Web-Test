import { ipcMain } from 'electron';
import {
  getLocalDb,
  initLocalDb,
  query as localQuery,
  transaction as localTransaction,
} from '../modules/localDbAdapter';

interface DatabaseInterface {
  backup(path: string): Promise<unknown>;
  restore(path: string): Promise<unknown>;
  export(format: string, path: string): Promise<unknown>;
  getStats(): Promise<unknown>;
  listBackups(): Promise<Array<{ name: string; path: string; size: number; date: string }>>;
}

/**
 * 数据库相关 IPC handlers
 */
export function registerDatabaseIpc(): void {
  ipcMain.handle('db-init', async () => {
    await initLocalDb();
    return { success: true };
  });

  ipcMain.handle('db-query', async (_event, sql: string, params?: unknown[]) => {
    return await localQuery(sql, params);
  });

  ipcMain.handle(
    'db-transaction',
    async (_event, statements: Array<{ sql: string; params?: unknown[] }>) => {
      if (!Array.isArray(statements) || statements.length === 0) {
        throw new Error('事务语句不能为空');
      }
      return await localTransaction(async client => {
        const results: Array<{ rows?: Record<string, unknown>[]; rowCount?: number }> = [];
        for (const statement of statements) {
          const result = await client.query(statement.sql, statement.params ?? []);
          results.push({ rows: result.rows, rowCount: result.rowCount });
        }
        return { results };
      });
    }
  );

  ipcMain.handle('db-backup', async (_event, backupPath: string) => {
    const localDB = getLocalDb() as unknown as DatabaseInterface | null;
    if (!localDB) throw new Error('Database not initialized');
    return await localDB.backup(backupPath);
  });

  ipcMain.handle('db-restore', async (_event, backupPath: string) => {
    const localDB = getLocalDb() as unknown as DatabaseInterface | null;
    if (!localDB) throw new Error('Database not initialized');
    return await localDB.restore(backupPath);
  });

  ipcMain.handle('db-export', async (_event, format: string, exportPath: string) => {
    const localDB = getLocalDb() as unknown as DatabaseInterface | null;
    if (!localDB) throw new Error('Database not initialized');
    return await localDB.export(format, exportPath);
  });

  ipcMain.handle('db-stats', async () => {
    const localDB = getLocalDb() as unknown as DatabaseInterface | null;
    if (!localDB) throw new Error('Database not initialized');
    return await localDB.getStats();
  });

  ipcMain.handle('db-list-backups', async () => {
    const localDB = getLocalDb() as unknown as DatabaseInterface | null;
    if (!localDB) throw new Error('Database not initialized');
    return await localDB.listBackups();
  });
}
