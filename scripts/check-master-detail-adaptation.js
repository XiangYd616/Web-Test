#!/usr/bin/env node

/**
 * 主从数据库适配检查脚本
 * 检查项目是否已完全适配主从数据库架构
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'testweb_dev',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function checkMasterDetailAdaptation() {
  const pool = new Pool(dbConfig);

  try {
    console.log('🔍 检查主从数据库适配情况...\n');

    // 1. 检查数据库表结构
    await checkDatabaseTables(pool);

    // 2. 检查视图
    await checkViews(pool);

    // 3. 检查函数
    await checkFunctions(pool);

    // 4. 检查代码中的旧表引用
    await checkCodeReferences();

    // 5. 检查数据完整性
    await checkDataIntegrity(pool);

    console.log('\n🎉 主从数据库适配检查完成！');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function checkDatabaseTables(pool) {
  console.log('1️⃣ 检查数据库表结构...');

  // 检查主表
  const mainTable = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'test_sessions' 
    ORDER BY ordinal_position
  `);

  if (mainTable.rows.length === 0) {
    console.log('   ❌ test_sessions 主表不存在');
    return false;
  } else {
    console.log('   ✅ test_sessions 主表存在');
  }

  // 检查详情表
  const detailTables = [
    'stress_test_details',
    'security_test_details',
    'api_test_details',
    'seo_test_details',
    'accessibility_test_details',
    'compatibility_test_details',
    'performance_test_details'
  ];

  for (const table of detailTables) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = $1
    `, [table]);

    if (result.rows[0].count > 0) {
      console.log(`   ✅ ${table} 详情表存在`);
    } else {
      console.log(`   ❌ ${table} 详情表不存在`);
    }
  }

  // 检查是否还有旧表
  const oldTables = ['test_history', 'test_results'];
  for (const table of oldTables) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = $1
    `, [table]);

    if (result.rows[0].count > 0) {
      console.log(`   ⚠️ 发现旧表: ${table} (建议清理)`);
    } else {
      console.log(`   ✅ 旧表 ${table} 已清理`);
    }
  }
}

async function checkViews(pool) {
  console.log('\n2️⃣ 检查历史视图...');

  const expectedViews = [
    'stress_test_history',
    'security_test_history',
    'api_test_history',
    'seo_test_history',
    'accessibility_test_history',
    'compatibility_test_history',
    'performance_test_history'
  ];

  for (const view of expectedViews) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_name = $1
    `, [view]);

    if (result.rows[0].count > 0) {
      console.log(`   ✅ ${view} 视图存在`);
    } else {
      console.log(`   ❌ ${view} 视图不存在`);
    }
  }
}

async function checkFunctions(pool) {
  console.log('\n3️⃣ 检查数据库函数...');

  const expectedFunctions = [
    'soft_delete_test_session',
    'batch_soft_delete_test_sessions',
    'insert_stress_test_result'
  ];

  for (const func of expectedFunctions) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pg_proc 
      WHERE proname = $1
    `, [func]);

    if (result.rows[0].count > 0) {
      console.log(`   ✅ ${func} 函数存在`);
    } else {
      console.log(`   ❌ ${func} 函数不存在`);
    }
  }
}

async function checkCodeReferences() {
  console.log('\n4️⃣ 检查代码中的旧表引用...');

  const filesToCheck = [
    'server/services/dataManagement/dataImportService.js',
    'server/services/dataManagement/dataExportService.js',
    'scripts/check-database.cjs',
    'scripts/check-table-structure.cjs'
  ];

  const oldTableReferences = ['test_history', 'test_results'];

  for (const filePath of filesToCheck) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      let hasOldReferences = false;

      for (const oldTable of oldTableReferences) {
        if (content.includes(oldTable)) {
          console.log(`   ⚠️ ${filePath} 中发现 ${oldTable} 引用`);
          hasOldReferences = true;
        }
      }

      if (!hasOldReferences) {
        console.log(`   ✅ ${filePath} 已适配`);
      }
    } catch (error) {
      console.log(`   ❓ ${filePath} 文件不存在或无法读取`);
    }
  }
}

async function checkDataIntegrity(pool) {
  console.log('\n5️⃣ 检查数据完整性...');

  try {
    // 检查主表数据
    const sessionCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM test_sessions 
      WHERE deleted_at IS NULL
    `);
    console.log(`   📊 test_sessions 记录数: ${sessionCount.rows[0].count}`);

    // 检查各测试类型分布
    const typeDistribution = await pool.query(`
      SELECT test_type, COUNT(*) as count 
      FROM test_sessions 
      WHERE deleted_at IS NULL 
      GROUP BY test_type 
      ORDER BY count DESC
    `);

    if (typeDistribution.rows.length > 0) {
      console.log('   📈 测试类型分布:');
      typeDistribution.rows.forEach(row => {
        console.log(`      - ${row.test_type}: ${row.count} 条`);
      });
    }

    // 检查详情表关联完整性
    const integrityCheck = await pool.query(`
      SELECT 
        ts.test_type,
        COUNT(ts.id) as session_count,
        COUNT(std.session_id) as stress_details_count,
        COUNT(sed.session_id) as security_details_count
      FROM test_sessions ts
      LEFT JOIN stress_test_details std ON ts.id = std.session_id
      LEFT JOIN security_test_details sed ON ts.id = sed.session_id
      WHERE ts.deleted_at IS NULL
      GROUP BY ts.test_type
    `);

    if (integrityCheck.rows.length > 0) {
      console.log('   🔗 主从表关联检查:');
      integrityCheck.rows.forEach(row => {
        console.log(`      - ${row.test_type}: 主表 ${row.session_count} 条`);
      });
    }

  } catch (error) {
    console.log(`   ❌ 数据完整性检查失败: ${error.message}`);
  }
}

// 执行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMasterDetailAdaptation().catch(error => {
    console.error('❌ 检查脚本执行失败:', error);
    process.exit(1);
  });
}

export { checkMasterDetailAdaptation };
