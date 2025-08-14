#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 用于数据库结构变更和数据迁移
 */

const { sequelize, models } = require('../database/sequelize');
const databaseService = require('../services/DatabaseService');

async function runMigrations() {
  console.log('🔄 开始数据库迁移...');

  try {
    // 连接数据库
    await databaseService.initialize();

    // 执行迁移
    await migrateFromMemoryToDatabase();

    console.log('✅ 数据库迁移完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

/**
 * 从内存存储迁移到数据库存储
 */
async function migrateFromMemoryToDatabase() {
  console.log('📦 迁移内存数据到数据库...');

  // 检查是否有全局内存数据需要迁移
  if (global.testStatusMap && global.testStatusMap.size > 0) {
    console.log(`发现 ${global.testStatusMap.size} 条测试状态记录需要迁移`);

    for (const [testId, status] of global.testStatusMap) {
      try {
        // 检查数据库中是否已存在
        const existing = await models.Test.findOne({
          where: { test_id: testId }
        });

        if (!existing) {
          // 创建测试记录
          await models.Test.create({
            test_id: testId,
            test_type: extractTestTypeFromId(testId),
            test_name: `迁移的测试 - ${testId}`,
            url: 'https://example.com', // 默认URL
            config: {},
            status: status.status,
            progress: status.progress || 0,
            started_at: status.startedAt ? new Date(status.startedAt) : new Date(),
            completed_at: status.completedAt ? new Date(status.completedAt) : null,
            error_message: status.message
          });

          console.log(`  ✅ 迁移测试状态: ${testId}`);
        }
      } catch (error) {
        console.error(`  ❌ 迁移测试状态失败 (${testId}):`, error.message);
      }
    }
  }

  if (global.testResultsMap && global.testResultsMap.size > 0) {
    console.log(`发现 ${global.testResultsMap.size} 条测试结果记录需要迁移`);

    for (const [testId, result] of global.testResultsMap) {
      try {
        // 更新测试结果
        const [updatedCount] = await models.Test.update({
          results: result,
          score: result.score || null,
          duration: result.duration || null
        }, {
          where: { test_id: testId }
        });

        if (updatedCount > 0) {
          console.log(`  ✅ 迁移测试结果: ${testId}`);
        }
      } catch (error) {
        console.error(`  ❌ 迁移测试结果失败 (${testId}):`, error.message);
      }
    }
  }

  // 清理内存数据
  if (global.testStatusMap) {
    global.testStatusMap.clear();
    console.log('🧹 清理内存状态数据');
  }

  if (global.testResultsMap) {
    global.testResultsMap.clear();
    console.log('🧹 清理内存结果数据');
  }
}

/**
 * 从测试ID中提取测试类型
 */
function extractTestTypeFromId(testId) {
  const parts = testId.split('_');
  if (parts.length > 0) {
    const type = parts[0].toLowerCase();
    const validTypes = ['api', 'security', 'stress', 'seo', 'compatibility', 'ux', 'website', 'infrastructure'];
    return validTypes.includes(type) ? type : 'api';
  }
  return 'api';
}

/**
 * 数据完整性检查
 */
async function checkDataIntegrity() {
  console.log('🔍 检查数据完整性...');

  try {
    // 检查测试记录
    const testCount = await models.Test.count();
    console.log(`📊 测试记录总数: ${testCount}`);

    // 检查配置模板
    const templateCount = await models.ConfigTemplate.count();
    console.log(`📋 配置模板总数: ${templateCount}`);

    // 检查用户记录
    const userCount = await models.User.count();
    console.log(`👤 用户记录总数: ${userCount}`);

    // 检查数据一致性
    const inconsistentTests = await models.Test.findAll({
      where: {
        status: 'completed',
        results: null
      }
    });

    if (inconsistentTests.length > 0) {
      console.warn(`⚠️ 发现 ${inconsistentTests.length} 条状态为完成但无结果的测试记录`);
    }

    console.log('✅ 数据完整性检查完成');

  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error);
  }
}

/**
 * 清理过期数据
 */
async function cleanupExpiredData() {
  console.log('🧹 清理过期数据...');

  try {
    const result = await databaseService.cleanupExpiredData(30); // 保留30天
    console.log(`✅ 清理完成: ${result.deletedTests}条测试记录, ${result.deletedMetrics}条系统指标`);
  } catch (error) {
    console.error('❌ 清理过期数据失败:', error);
  }
}

/**
 * 备份数据库
 */
async function backupDatabase() {
  console.log('💾 备份数据库...');

  try {
    const fs = require('fs');
    const path = require('path');
    
    // 创建备份目录
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 导出数据
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`);

    const data = {
      timestamp: new Date().toISOString(),
      tests: await models.Test.findAll(),
      configTemplates: await models.ConfigTemplate.findAll(),
      users: await models.User.findAll({
        attributes: { exclude: ['password_hash'] } // 排除密码
      })
    };

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`✅ 数据库备份完成: ${backupFile}`);

  } catch (error) {
    console.error('❌ 数据库备份失败:', error);
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigrations();
    break;
  case 'check':
    (async () => {
      await databaseService.initialize();
      await checkDataIntegrity();
      process.exit(0);
    })();
    break;
  case 'cleanup':
    (async () => {
      await databaseService.initialize();
      await cleanupExpiredData();
      process.exit(0);
    })();
    break;
  case 'backup':
    (async () => {
      await databaseService.initialize();
      await backupDatabase();
      process.exit(0);
    })();
    break;
  default:
    console.log(`
数据库迁移工具

用法:
  node migrate.js migrate  - 执行数据库迁移
  node migrate.js check    - 检查数据完整性
  node migrate.js cleanup  - 清理过期数据
  node migrate.js backup   - 备份数据库

示例:
  npm run db:migrate
  npm run db:check
  npm run db:cleanup
  npm run db:backup
    `);
    process.exit(0);
}

module.exports = {
  runMigrations,
  migrateFromMemoryToDatabase,
  checkDataIntegrity,
  cleanupExpiredData,
  backupDatabase
};
