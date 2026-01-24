import { query } from '../config/database';

type FindOptions = {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  order?: Array<[string, 'ASC' | 'DESC']>;
  include?: Array<Record<string, unknown>>;
};

type UpdateOptions = {
  where?: Record<string, unknown>;
  returning?: boolean;
};

type DestroyOptions = {
  where?: Record<string, unknown>;
};

type CountOptions = {
  where?: Record<string, unknown>;
};

type FindAndCountOptions = FindOptions;

type BulkCreateOptions = {
  returning?: boolean;
};

const buildWhereClause = (where: Record<string, unknown> = {}) => {
  const clauses: string[] = [];
  const values: unknown[] = [];

  Object.entries(where).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (value === null) {
      clauses.push(`${key} IS NULL`);
      return;
    }
    if (typeof value === 'object' && value) {
      const ilikeValue = (value as { ilike?: unknown; $ilike?: unknown }).ilike;
      const dollarIlikeValue = (value as { ilike?: unknown; $ilike?: unknown }).$ilike;
      const searchValue = ilikeValue ?? dollarIlikeValue;
      if (searchValue !== undefined) {
        values.push(searchValue);
        clauses.push(`${key} ILIKE $${values.length}`);
        return;
      }
    }
    values.push(value);
    clauses.push(`${key} = $${values.length}`);
  });

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const buildOrderClause = (order?: Array<[string, 'ASC' | 'DESC']>) => {
  if (!order || order.length === 0) {
    return '';
  }
  const parts = order.map(([field, direction]) => `${field} ${direction}`);
  return `ORDER BY ${parts.join(', ')}`;
};

const createModel = (table: string, primaryKey = 'id') => {
  const modelApi: Record<string, unknown> = {};

  const attachRow = (row: Record<string, unknown> | null) => {
    if (!row || (row as { __pgModelAttached?: boolean }).__pgModelAttached) {
      return row;
    }
    const update = async (data: Record<string, unknown>) => {
      const [, rows] = (await (modelApi as { update: Function }).update(data, {
        where: { [primaryKey]: row[primaryKey] },
        returning: true,
      })) as [number, Record<string, unknown>[]];
      const updated = rows?.[0];
      if (updated) {
        Object.assign(row, updated);
      }
      return updated;
    };
    const destroy = async () => {
      await (modelApi as { destroy: Function }).destroy({
        where: { [primaryKey]: row[primaryKey] },
      });
    };
    const save = async () => {
      const { [primaryKey]: _id, ...rest } = row as Record<string, unknown>;
      return update(rest);
    };
    return Object.assign(row, { update, destroy, save, __pgModelAttached: true });
  };

  Object.assign(modelApi, {
    async findByPk(id: string) {
      const result = await query(`SELECT * FROM ${table} WHERE ${primaryKey} = $1`, [id]);
      return attachRow(result.rows[0] || null);
    },

    async findOne(options: FindOptions = {}) {
      const { clause, values } = buildWhereClause(options.where);
      const orderClause = buildOrderClause(options.order);
      const limitClause = 'LIMIT 1';
      const result = await query(
        `SELECT * FROM ${table} ${clause} ${orderClause} ${limitClause}`,
        values
      );
      return attachRow(result.rows[0] || null);
    },

    async findAll(options: FindOptions = {}) {
      const { clause, values } = buildWhereClause(options.where);
      const orderClause = buildOrderClause(options.order);
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      if (table === 'workspace_members') {
        const includeWorkspace = options.include?.some(
          include =>
            include.association === 'workspace' ||
            include.as === 'workspace' ||
            include.model === 'Workspace'
        );
        if (includeWorkspace) {
          const result = await query(
            `SELECT wm.*, row_to_json(w) as workspace
             FROM workspace_members wm
             JOIN workspaces w ON w.id = wm.workspace_id
             ${clause}
             ${orderClause}
             ${limitClause}
             ${offsetClause}`,
            values
          );
          return result.rows.map(row => attachRow(row)) as Record<string, unknown>[];
        }
      }

      const result = await query(
        `SELECT * FROM ${table} ${clause} ${orderClause} ${limitClause} ${offsetClause}`,
        values
      );
      return result.rows.map(row => attachRow(row)) as Record<string, unknown>[];
    },

    async findAndCountAll(options: FindAndCountOptions = {}) {
      const { clause, values } = buildWhereClause(options.where);
      const orderClause = buildOrderClause(options.order);
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      if (table === 'workspace_members') {
        const includeWorkspace = options.include?.some(
          include =>
            include.association === 'workspace' ||
            include.as === 'workspace' ||
            include.model === 'Workspace'
        );
        if (includeWorkspace) {
          const countResult = await query(
            `SELECT COUNT(*) as count FROM workspace_members ${clause}`,
            values
          );
          const rowsResult = await query(
            `SELECT wm.*, row_to_json(w) as workspace
             FROM workspace_members wm
             JOIN workspaces w ON w.id = wm.workspace_id
             ${clause}
             ${orderClause}
             ${limitClause}
             ${offsetClause}`,
            values
          );
          return {
            rows: rowsResult.rows.map(row => attachRow(row)) as Record<string, unknown>[],
            count: Number(countResult.rows[0]?.count || 0),
          };
        }
      }

      const countResult = await query(`SELECT COUNT(*) as count FROM ${table} ${clause}`, values);
      const rowsResult = await query(
        `SELECT * FROM ${table} ${clause} ${orderClause} ${limitClause} ${offsetClause}`,
        values
      );
      return {
        rows: rowsResult.rows.map(row => attachRow(row)) as Record<string, unknown>[],
        count: Number(countResult.rows[0]?.count || 0),
      };
    },

    async create(data: Record<string, unknown>) {
      const keys = Object.keys(data || {});
      if (keys.length === 0) {
        return { constructor: modelApi } as unknown;
      }
      const columns = keys.join(', ');
      const values = keys.map((_, index) => `$${index + 1}`).join(', ');
      const params = keys.map(key => data[key]);
      const result = await query(
        `INSERT INTO ${table} (${columns}) VALUES (${values}) RETURNING *`,
        params
      );
      return attachRow(result.rows[0] || null);
    },

    async bulkCreate(rows: Array<Record<string, unknown>>, options: BulkCreateOptions = {}) {
      if (!rows.length) {
        return [];
      }
      const columns = Object.keys(rows[0]);
      const values: string[] = [];
      const params: unknown[] = [];
      rows.forEach((row, rowIndex) => {
        const placeholders = columns.map(
          (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`
        );
        values.push(`(${placeholders.join(', ')})`);
        columns.forEach(column => params.push(row[column]));
      });
      const returningClause = options.returning ? 'RETURNING *' : '';
      const result = await query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')} ${returningClause}`,
        params
      );
      return result.rows.map(row => attachRow(row)) as Record<string, unknown>[];
    },

    async update(data: Record<string, unknown>, options: UpdateOptions = {}) {
      const keys = Object.keys(data || {});
      if (keys.length === 0) {
        return [0, []];
      }
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      const params = keys.map(key => data[key]);
      const { clause, values } = buildWhereClause(options.where);
      const returningClause = options.returning ? 'RETURNING *' : '';
      const result = await query(`UPDATE ${table} SET ${setClause} ${clause} ${returningClause}`, [
        ...params,
        ...values,
      ]);
      return [result.rowCount || 0, (result.rows || []).map(row => attachRow(row))];
    },

    async destroy(options: DestroyOptions = {}) {
      const { clause, values } = buildWhereClause(options.where);
      const result = await query(`DELETE FROM ${table} ${clause}`, values);
      return result.rowCount || 0;
    },

    async count(options: CountOptions = {}) {
      const { clause, values } = buildWhereClause(options.where);
      const result = await query(`SELECT COUNT(*) as count FROM ${table} ${clause}`, values);
      return Number(result.rows[0]?.count || 0);
    },
  });

  (modelApi as unknown as { sequelize?: { query: typeof query } }).sequelize = { query };

  return modelApi;
};

const createWorkspaceModel = () => {
  const model = createModel('workspaces');
  return model;
};

const createWorkspaceMemberModel = () => {
  const model = createModel('workspace_members');
  return model;
};

const createCollectionModel = () => {
  const model = createModel('collections');
  return model;
};

const createEnvironmentModel = () => {
  const model = createModel('environments');
  return model;
};

const createEnvironmentVariableModel = () => {
  const model = createModel('environment_variables');
  return model;
};

const createGlobalVariableModel = () => {
  const model = createModel('global_variables');
  return model;
};

const createRunModel = () => {
  const model = createModel('runs');
  return model;
};

const createRunResultModel = () => {
  const model = createModel('run_results');
  return model;
};

const createScheduledRunModel = () => {
  const model = createModel('scheduled_runs');
  return model;
};

const createScheduledRunResultModel = () => {
  const model = createModel('scheduled_run_results');
  return model;
};

const createUserModel = () => {
  const model = createModel('users');
  return model;
};

const models = {
  Workspace: createWorkspaceModel(),
  WorkspaceMember: createWorkspaceMemberModel(),
  Collection: createCollectionModel(),
  Environment: createEnvironmentModel(),
  EnvironmentVariable: createEnvironmentVariableModel(),
  GlobalVariable: createGlobalVariableModel(),
  Run: createRunModel(),
  RunResult: createRunResultModel(),
  ScheduledRun: createScheduledRunModel(),
  ScheduledRunResult: createScheduledRunResultModel(),
  User: createUserModel(),
};

module.exports = { models };
export { models };
