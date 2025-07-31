/**
 * 数据库操作工具类
 * 
 * 提供统一的数据库操作接口，包括事务管理、连接池管理、查询优化等
 */

const { getPool, query } = require('../config/database');
const Logger = require('./logger');

/**
 * 数据库工具类
 */
class DatabaseUtils {
  /**
   * 执行带事务的操作
   * @param {Function} operations - 要执行的操作函数
   * @param {string} operationName - 操作名称（用于日志）
   * @returns {Promise<any>} 操作结果
   */
  static async withTransaction(operations, operationName = 'database operation') {
    const pool = getPool();
    const client = await pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      Logger.debug(`开始事务: ${operationName}`);

      const result = await operations(client);

      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      Logger.db('TRANSACTION', operationName, duration, { status: 'committed' });

      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      Logger.error(`事务回滚: ${operationName}`, error, { duration });
      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * 执行单个查询（带性能监控）
   * @param {string} sql - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {string} operationName - 操作名称
   * @returns {Promise<any>} 查询结果
   */
  static async query(sql, params = [], operationName = 'query') {
    const startTime = Date.now();

    try {
      const result = await query(sql, params);
      const duration = Date.now() - startTime;
      
      Logger.db('QUERY', operationName, duration, {
        rowCount: result.rowCount,
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : '')
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`查询失败: ${operationName}`, error, {
        duration,
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params
      });
      throw error;
    }
  }

  /**
   * 批量插入数据
   * @param {string} tableName - 表名
   * @param {Array} columns - 列名数组
   * @param {Array} rows - 数据行数组
   * @param {string} conflictAction - 冲突处理方式 ('IGNORE', 'UPDATE', 'REPLACE')
   * @returns {Promise<any>} 插入结果
   */
  static async batchInsert(tableName, columns, rows, conflictAction = 'IGNORE') {
    if (!rows || rows.length === 0) {
      return { rowCount: 0 };
    }

    const operationName = `batch_insert_${tableName}`;
    const startTime = Date.now();

    try {
      // 构建批量插入SQL
      const placeholders = rows.map((_, rowIndex) => {
        const rowPlaceholders = columns.map((_, colIndex) => {
          return `$${rowIndex * columns.length + colIndex + 1}`;
        }).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');

      const columnNames = columns.join(', ');
      let sql = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders}`;

      // 处理冲突
      if (conflictAction === 'IGNORE') {
        sql += ' ON CONFLICT DO NOTHING';
      } else if (conflictAction === 'UPDATE') {
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
        sql += ` ON CONFLICT DO UPDATE SET ${updateSet}`;
      }

      // 展平参数数组
      const params = rows.flat();

      const result = await this.query(sql, params, operationName);
      const duration = Date.now() - startTime;

      Logger.info(`批量插入完成: ${tableName}`, {
        rowCount: result.rowCount,
        totalRows: rows.length,
        duration
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`批量插入失败: ${tableName}`, error, {
        rowCount: rows.length,
        duration
      });
      throw error;
    }
  }

  /**
   * 分页查询
   * @param {string} baseQuery - 基础查询SQL
   * @param {Array} baseParams - 基础查询参数
   * @param {number} page - 页码（从1开始）
   * @param {number} limit - 每页数量
   * @param {string} orderBy - 排序字段
   * @param {string} orderDirection - 排序方向 ('ASC', 'DESC')
   * @returns {Promise<Object>} 分页结果
   */
  static async paginate(baseQuery, baseParams = [], page = 1, limit = 20, orderBy = 'id', orderDirection = 'DESC') {
    const offset = (page - 1) * limit;
    const operationName = 'paginated_query';

    try {
      // 构建分页查询
      const paginatedQuery = `
        ${baseQuery}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
      `;
      const paginatedParams = [...baseParams, limit, offset];

      // 构建计数查询
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;

      // 并行执行查询和计数
      const [dataResult, countResult] = await Promise.all([
        this.query(paginatedQuery, paginatedParams, `${operationName}_data`),
        this.query(countQuery, baseParams, `${operationName}_count`)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      Logger.error(`分页查询失败: ${operationName}`, error, {
        page,
        limit,
        orderBy,
        orderDirection
      });
      throw error;
    }
  }

  /**
   * 软删除记录
   * @param {string} tableName - 表名
   * @param {string} whereClause - WHERE条件
   * @param {Array} params - 查询参数
   * @returns {Promise<any>} 删除结果
   */
  static async softDelete(tableName, whereClause, params = []) {
    const sql = `
      UPDATE ${tableName} 
      SET deleted_at = NOW(), updated_at = NOW() 
      WHERE ${whereClause} AND deleted_at IS NULL
    `;
    
    return this.query(sql, params, `soft_delete_${tableName}`);
  }

  /**
   * 恢复软删除的记录
   * @param {string} tableName - 表名
   * @param {string} whereClause - WHERE条件
   * @param {Array} params - 查询参数
   * @returns {Promise<any>} 恢复结果
   */
  static async restore(tableName, whereClause, params = []) {
    const sql = `
      UPDATE ${tableName} 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE ${whereClause} AND deleted_at IS NOT NULL
    `;
    
    return this.query(sql, params, `restore_${tableName}`);
  }

  /**
   * 检查表是否存在
   * @param {string} tableName - 表名
   * @returns {Promise<boolean>} 是否存在
   */
  static async tableExists(tableName) {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    
    const result = await this.query(sql, [tableName], 'check_table_exists');
    return result.rows[0].exists;
  }

  /**
   * 获取表的列信息
   * @param {string} tableName - 表名
   * @returns {Promise<Array>} 列信息数组
   */
  static async getTableColumns(tableName) {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `;
    
    const result = await this.query(sql, [tableName], 'get_table_columns');
    return result.rows;
  }

  /**
   * 执行健康检查
   * @returns {Promise<Object>} 健康状态
   */
  static async healthCheck() {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1 as health_check', [], 'health_check');
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('数据库健康检查失败', error, { duration });
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = DatabaseUtils;
