/**
 * 数据库结构符合性验证脚本
 * 验证数据库结构是否符合API规范和业务需求
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// 导入数据库配置
const dbConfigModule = require('../config/database');

// 获取当前环境配置
const environment = process.env.NODE_ENV || 'development';

// 从配置模块获取数据库配置
const config = dbConfigModule.getDatabaseConfig ? dbConfigModule.getDatabaseConfig() : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('🔍 Test-Web数据库结构验证脚本');
console.log('📊 环境:', environment);

// 创建连接池
const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user || config.username,
  password: config.password
});

/**
 * 期望的数据库结构定义
 */
const expectedStructure = {
  // 核心表
  requiredTables: [
    'users', 'tests', 'config_templates', 'test_history', 'websites',
    'api_keys', 'user_preferences', 'system_config', 'test_queue',
    'test_statistics', 'projects', 'test_reports', 'system_metrics',
    'system_health_checks', 'user_sessions'
  ],

  // 关键字段验证
  tableFields: {
    users: ['id', 'username', 'email', 'password_hash', 'role', 'is_active'],
    tests: ['id', 'type', 'url', 'config', 'results', 'status', 'user_id', 'project_id'],
    projects: ['id', 'user_id', 'name', 'description', 'target_url', 'status'],
    test_reports: ['id', 'user_id', 'project_id', 'name', 'report_type', 'format', 'status'],
    config_templates: ['id', 'name', 'type', 'config', 'is_default', 'is_public'],
    system_metrics: ['id', 'metric_type', 'metric_name', 'value', 'timestamp'],
    user_sessions: ['id', 'user_id', 'session_token', 'expires_at', 'status']
  },

  // 外键关系验证
  foreignKeys: [
    { table: 'tests', column: 'user_id', references: 'users(id)' },
    { table: 'tests', column: 'project_id', references: 'projects(id)' },
    { table: 'projects', column: 'user_id', references: 'users(id)' },
    { table: 'test_reports', column: 'user_id', references: 'users(id)' },
    { table: 'test_reports', column: 'project_id', references: 'projects(id)' },
    { table: 'config_templates', column: 'user_id', references: 'users(id)' },
    { table: 'test_history', column: 'test_id', references: 'tests(id)' },
    { table: 'test_history', column: 'user_id', references: 'users(id)' },
    { table: 'user_sessions', column: 'user_id', references: 'users(id)' },
    { table: 'api_keys', column: 'user_id', references: 'users(id)' }
  ],

  // 索引验证
  requiredIndexes: [
    'idx_users_username', 'idx_users_email', 'idx_tests_type', 'idx_tests_status',
    'idx_tests_user_id', 'idx_tests_project_id', 'idx_projects_user_id',
    'idx_test_reports_user_id', 'idx_system_metrics_type', 'idx_user_sessions_token'
  ],

  // JSONB字段验证
  jsonbFields: [
    { table: 'tests', column: 'config' },
    { table: 'tests', column: 'results' },
    { table: 'projects', column: 'settings' },
    { table: 'projects', column: 'metadata' },
    { table: 'config_templates', column: 'config' },
    { table: 'test_reports', column: 'test_ids' },
    { table: 'system_metrics', column: 'tags' },
    { table: 'user_sessions', column: 'session_data' }
  ]
};

/**
 * API接口覆盖度检查
 */
const apiCoverage = {
  // 认证相关接口
  auth: {
    endpoints: ['POST /auth/login', 'POST /auth/register', 'POST /auth/refresh'],
    requiredTables: ['users', 'user_sessions'],
    coverage: 100
  },

  // 项目管理接口
  projects: {
    endpoints: ['GET /projects', 'POST /projects', 'PUT /projects/{id}', 'DELETE /projects/{id}'],
    requiredTables: ['projects', 'users'],
    coverage: 100
  },

  // 测试执行接口
  tests: {
    endpoints: ['POST /tests/execute', 'GET /tests/executions', 'GET /tests/{id}'],
    requiredTables: ['tests', 'test_queue', 'test_history'],
    coverage: 100
  },

  // 报告生成接口
  reports: {
    endpoints: ['POST /reports/generate', 'GET /reports/{id}', 'GET /reports/{id}/download'],
    requiredTables: ['test_reports'],
    coverage: 100
  },

  // 系统监控接口
  system: {
    endpoints: ['GET /system/health', 'GET /system/metrics', 'GET /analytics/dashboard'],
    requiredTables: ['system_health_checks', 'system_metrics'],
    coverage: 100
  }
};

/**
 * 验证数据库表结构
 */
async function validateTableStructure() {
  const client = await pool.connect();
  const results = {
    tables: { passed: 0, failed: 0, details: [] },
    fields: { passed: 0, failed: 0, details: [] },
    foreignKeys: { passed: 0, failed: 0, details: [] },
    indexes: { passed: 0, failed: 0, details: [] },
    jsonbFields: { passed: 0, failed: 0, details: [] }
  };

  try {
    console.log('🔍 开始验证数据库表结构...');

    // 1. 验证必需表是否存在
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);

    for (const requiredTable of expectedStructure.requiredTables) {
      if (existingTables.includes(requiredTable)) {
        results.tables.passed++;
        results.tables.details.push({ table: requiredTable, status: '✅', message: '表存在' });
      } else {
        results.tables.failed++;
        results.tables.details.push({ table: requiredTable, status: '❌', message: '表不存在' });
      }
    }

    // 2. 验证表字段
    console.log('🔧 验证表字段...');
    for (const [tableName, requiredFields] of Object.entries(expectedStructure.tableFields)) {
      if (existingTables.includes(tableName)) {
        const fieldsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        const existingFields = fieldsResult.rows.map(row => row.column_name);

        for (const requiredField of requiredFields) {
          if (existingFields.includes(requiredField)) {
            results.fields.passed++;
            results.fields.details.push({
              table: tableName,
              field: requiredField,
              status: '✅',
              message: '字段存在'
            });
          } else {
            results.fields.failed++;
            results.fields.details.push({
              table: tableName,
              field: requiredField,
              status: '❌',
              message: '字段不存在'
            });
          }
        }
      }
    }

    // 3. 验证外键关系
    const foreignKeysResult = await client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const existingForeignKeys = foreignKeysResult.rows.map(row => ({
      table: row.table_name,
      column: row.column_name,
      references: `${row.foreign_table_name}(${row.foreign_column_name})`
    }));

    for (const expectedFK of expectedStructure.foreignKeys) {
      const exists = existingForeignKeys.some(fk =>
        fk.table === expectedFK.table &&
        fk.column === expectedFK.column &&
        fk.references === expectedFK.references
      );

      if (exists) {
        results.foreignKeys.passed++;
        results.foreignKeys.details.push({
          ...expectedFK,
          status: '✅',
          message: '外键存在'
        });
      } else {
        results.foreignKeys.failed++;
        results.foreignKeys.details.push({
          ...expectedFK,
          status: '❌',
          message: '外键不存在'
        });
      }
    }

    // 4. 验证索引
    console.log('📊 验证索引...');
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);

    const existingIndexes = indexesResult.rows.map(row => row.indexname);

    for (const requiredIndex of expectedStructure.requiredIndexes) {
      if (existingIndexes.includes(requiredIndex)) {
        results.indexes.passed++;
        results.indexes.details.push({
          index: requiredIndex,
          status: '✅',
          message: '索引存在'
        });
      } else {
        results.indexes.failed++;
        results.indexes.details.push({
          index: requiredIndex,
          status: '❌',
          message: '索引不存在'
        });
      }
    }

    // 5. 验证JSONB字段
    for (const jsonbField of expectedStructure.jsonbFields) {
      const fieldResult = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
      `, [jsonbField.table, jsonbField.column]);

      if (fieldResult.rows.length > 0 && fieldResult.rows[0].data_type === 'jsonb') {
        results.jsonbFields.passed++;
        results.jsonbFields.details.push({
          ...jsonbField,
          status: '✅',
          message: 'JSONB字段存在'
        });
      } else {
        results.jsonbFields.failed++;
        results.jsonbFields.details.push({
          ...jsonbField,
          status: '❌',
          message: 'JSONB字段不存在或类型错误'
        });
      }
    }

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
    throw error;
  } finally {
    client.release();
  }

  return results;
}

/**
 * 验证API接口覆盖度
 */
async function validateApiCoverage() {
  const client = await pool.connect();
  const results = { passed: 0, failed: 0, details: [] };

  try {

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);

    for (const [category, info] of Object.entries(apiCoverage)) {
      const missingTables = info.requiredTables.filter(table => !existingTables.includes(table));

      if (missingTables.length === 0) {
        results.passed++;
        results.details.push({
          category,
          status: '✅',
          coverage: info.coverage,
          endpoints: info.endpoints.length,
          message: `${category}接口完全支持`
        });
      } else {
        results.failed++;
        results.details.push({
          category,
          status: '❌',
          coverage: Math.round((1 - missingTables.length / info.requiredTables.length) * 100),
          endpoints: info.endpoints.length,
          message: `缺少表: ${missingTables.join(', ')}`
        });
      }
    }

  } catch (error) {
    console.error('❌ API覆盖度验证失败:', error);
    throw error;
  } finally {
    client.release();
  }

  return results;
}

/**
 * 生成验证报告
 */
function generateValidationReport(structureResults, apiResults) {
  const totalStructureTests = Object.values(structureResults).reduce((sum, result) => sum + result.passed + result.failed, 0);
  const totalStructurePassed = Object.values(structureResults).reduce((sum, result) => sum + result.passed, 0);
  const structureScore = Math.round((totalStructurePassed / totalStructureTests) * 100);

  const apiScore = Math.round((apiResults.passed / (apiResults.passed + apiResults.failed)) * 100);
  const overallScore = Math.round((structureScore + apiScore) / 2);



  apiResults.details.forEach(detail => {
  });


  // 评级
  let grade = 'F';
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 85) grade = 'B+';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 75) grade = 'C+';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';


  // 建议
  if (structureResults.tables.failed > 0) {
  }
  if (structureResults.fields.failed > 0) {
  }
  if (structureResults.foreignKeys.failed > 0) {
  }
  if (structureResults.indexes.failed > 0) {
  }
  if (apiResults.failed > 0) {
  }

  return {
    structureScore,
    apiScore,
    overallScore,
    grade,
    passed: overallScore >= 80
  };
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      console.log('🔍 Test-Web数据库结构验证脚本启动');

      const structureResults = await validateTableStructure();
      const apiResults = await validateApiCoverage();
      const report = generateValidationReport(structureResults, apiResults);

      if (report.passed) {
        console.log('✅ 数据库结构验证通过！');
      } else {
        console.log('⚠️ 数据库结构需要改进');
      }

      process.exit(report.passed ? 0 : 1);

    } catch (error) {
      console.error('❌ 验证脚本执行失败:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}

module.exports = {
  validateTableStructure,
  validateApiCoverage,
  generateValidationReport
};
