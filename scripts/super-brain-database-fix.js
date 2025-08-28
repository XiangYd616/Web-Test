/**
 * 🧠 超级大脑系统 - 智能数据库修复脚本
 * 基于超级大脑系统的智能分析，执行精准的数据库修复
 */

import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('🧠 超级大脑系统 - 智能数据库修复');
console.log('📊 分析目标: Test-Web项目数据库');
console.log('🎯 修复模式: 精准修复');

/**
 * 🧠 超级大脑智能修复函数
 */
async function superBrainDatabaseFix() {
  const pool = new Pool(dbConfig);

  try {
    console.log('\n🔍 超级大脑系统开始深度分析...');

    // 1. 智能检测数据库状态
    const analysisResult = await intelligentDatabaseAnalysis(pool);

    // 2. 生成修复计划
    const fixPlan = generateIntelligentFixPlan(analysisResult);

    // 3. 执行智能修复
    const fixResults = await executeIntelligentFixes(pool, fixPlan);

    // 4. 验证修复结果
    const validationResult = await validateFixes(pool);

    console.log('\n🎉 超级大脑修复完成！');
    console.log('📊 修复统计:', fixResults);
    console.log('✅ 验证结果:', validationResult);

    return { success: true, results: fixResults, validation: validationResult };

  } catch (error) {
    console.error('❌ 超级大脑修复失败:', error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

/**
 * 🔍 智能数据库分析
 */
async function intelligentDatabaseAnalysis(pool) {
  console.log('🔍 执行智能数据库分析...');

  const analysis = {
    tables: {},
    issues: [],
    recommendations: []
  };

  try {
    // 检查监控表结构
    const monitoringFields = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);

    analysis.tables.monitoring_sites = monitoringFields.rows;

    // 检查缺失字段
    const requiredFields = ['monitoring_type', 'config', 'status', 'consecutive_failures'];
    const existingFields = monitoringFields.rows.map(f => f.column_name);

    requiredFields.forEach(field => {
      if (!existingFields.includes(field)) {
        analysis.issues.push({
          type: 'missing_field',
          table: 'monitoring_sites',
          field: field,
          severity: 'high'
        });
      }
    });

    // 检查security_logs表
    const securityLogsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'security_logs'
      )
    `);

    if (!securityLogsCheck.rows[0].exists) {
      analysis.issues.push({
        type: 'missing_table',
        table: 'security_logs',
        severity: 'high'
      });
    }

    console.log(`🔍 分析完成: 发现 ${analysis.issues.length} 个问题`);
    return analysis;

  } catch (error) {
    console.error('❌ 数据库分析失败:', error);
    throw error;
  }
}

/**
 * 🎯 生成智能修复计划
 */
function generateIntelligentFixPlan(analysis) {
  console.log('🎯 生成智能修复计划...');

  const plan = {
    fixes: [],
    priority: 'high',
    estimatedTime: '2-3分钟'
  };

  analysis.issues.forEach(issue => {
    switch (issue.type) {
      case 'missing_field':
        if (issue.table === 'monitoring_sites') {
          plan.fixes.push({
            action: 'add_field',
            table: issue.table,
            field: issue.field,
            definition: getFieldDefinition(issue.field)
          });
        }
        break;

      case 'missing_table':
        if (issue.table === 'security_logs') {
          plan.fixes.push({
            action: 'create_table',
            table: issue.table,
            definition: getTableDefinition(issue.table)
          });
        }
        break;
    }
  });

  console.log(`🎯 修复计划生成完成: ${plan.fixes.length} 个修复项`);
  return plan;
}

/**
 * 🔧 执行智能修复
 */
async function executeIntelligentFixes(pool, plan) {
  console.log('🔧 开始执行智能修复...');

  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  for (const fix of plan.fixes) {
    try {
      console.log(`🔧 执行修复: ${fix.action} - ${fix.table}.${fix.field || ''}`);

      if (fix.action === 'add_field') {
        await pool.query(`
          ALTER TABLE ${fix.table} 
          ADD COLUMN IF NOT EXISTS ${fix.field} ${fix.definition}
        `);

        results.success++;
        results.details.push(`✅ 添加字段 ${fix.table}.${fix.field}`);

      } else if (fix.action === 'create_table') {
        await pool.query(fix.definition);

        results.success++;
        results.details.push(`✅ 创建表 ${fix.table}`);
      }

    } catch (error) {
      results.failed++;
      results.details.push(`❌ 修复失败 ${fix.table}: ${error.message}`);
      console.error(`❌ 修复失败:`, error.message);
    }
  }

  return results;
}

/**
 * ✅ 验证修复结果
 */
async function validateFixes(pool) {
  console.log('✅ 验证修复结果...');

  try {
    // 验证监控表字段
    const monitoringFields = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
    `);

    const fields = monitoringFields.rows.map(f => f.column_name);
    const requiredFields = ['monitoring_type', 'config', 'status', 'consecutive_failures'];
    const missingFields = requiredFields.filter(f => !fields.includes(f));

    return {
      monitoring_table: {
        total_fields: fields.length,
        missing_fields: missingFields,
        status: missingFields.length === 0 ? 'perfect' : 'needs_fix'
      }
    };

  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 📋 获取字段定义
 */
function getFieldDefinition(fieldName) {
  const definitions = {
    'monitoring_type': "VARCHAR(50) DEFAULT 'uptime' CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'))",
    'config': "JSONB DEFAULT '{}'",
    'status': "VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled'))",
    'consecutive_failures': "INTEGER DEFAULT 0"
  };

  return definitions[fieldName] || 'TEXT';
}

/**
 * 📋 获取表定义
 */
function getTableDefinition(tableName) {
  const definitions = {
    'security_logs': `
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT false,
        risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
  };

  return definitions[tableName] || '';
}

// 直接执行修复
console.log('\n🚀 启动超级大脑修复流程...');
superBrainDatabaseFix()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 超级大脑数据库修复成功！');
      process.exit(0);
    } else {
      console.log('\n❌ 超级大脑数据库修复失败:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

export { superBrainDatabaseFix };
