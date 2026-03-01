import { randomUUID } from 'crypto';
import LocalDatabaseCtor from './database';
type LocalDatabase = InstanceType<typeof LocalDatabaseCtor>;

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount?: number;
  lastInsertRowid?: number;
};

type QueryClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

let localDbInstance: LocalDatabase | null = null;

const getLocalDb = () => {
  if (!localDbInstance) {
    localDbInstance = new LocalDatabaseCtor();
  }
  return localDbInstance;
};

const initLocalDb = async () => {
  const db = getLocalDb();
  await db.init();
  return db;
};

const normalizeRows = <T>(rows: T[] | undefined | null): T[] => {
  if (Array.isArray(rows)) {
    return rows;
  }
  return [];
};

const query = async (sql: string, params: unknown[] = []): Promise<QueryResult> => {
  const db = getLocalDb();
  const result = await db.query(sql, params);
  if (sql.trim().toLowerCase().startsWith('select')) {
    return { rows: normalizeRows(result as Record<string, unknown>[]) };
  }
  return {
    rowCount:
      typeof (result as { changes?: number })?.changes === 'number'
        ? (result as { changes?: number }).changes
        : 0,
    rows: [],
    lastInsertRowid: (result as { lastInsertRowid?: number })?.lastInsertRowid,
  };
};

const transaction = async <T>(callback: (client: QueryClient) => Promise<T>): Promise<T> => {
  const db = getLocalDb();
  return db.transaction(async (client: { query: (sql: string, params?: unknown[]) => unknown }) => {
    const wrappedClient: QueryClient = {
      query: async (sql, params = []) => {
        const result = await client.query(sql, params);
        if (sql.trim().toLowerCase().startsWith('select')) {
          return { rows: normalizeRows(result as Record<string, unknown>[]) };
        }
        return {
          rowCount:
            typeof (result as { changes?: number })?.changes === 'number'
              ? (result as { changes?: number }).changes
              : 0,
          rows: [],
          lastInsertRowid: (result as { lastInsertRowid?: number })?.lastInsertRowid,
        };
      },
    };
    return callback(wrappedClient);
  });
};

const generateId = () => randomUUID();

export { generateId, getLocalDb, initLocalDb, query, transaction };
