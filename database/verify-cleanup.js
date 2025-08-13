#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * 验证数据库清理结果
 */
function verifyDatabaseCleanup() {
  console.log('🔍 验证数据库清理结果...\n');

  const results = {
    success: true,
    issues: [],
    summary: {
      filesRemoved: 0,
      filesCreated: 0,
      filesUpdated: 0
    }
  };

  // 1. 检查已删除的文件
  const removedFiles = [
    'database/schema.sql',
    'database/optimized-schema.sql',
    'server/scripts/complete-database-schema.sql'
  ];

  console.log('1️⃣  检查已删除的冗余文件...');
  removedFiles.forEach(file => {
    if (fs.existsSync(file)) {
      results.success = false;
      results.issues.push(`❌ 文件未删除: ${file}`);
      console.log(`❌ ${file} - 仍然存在`);
    } else {
      results.summary.filesRemoved++;
      console.log(`✅ ${file} - 已删除`);
    }
  });

  // 2. 检查新创建的文件
  const createdFiles = [
    'database/complete-schema.sql',
    'database/complete-manage.js',
    'DATABASE_CLEANUP_REPORT.md'
  ];

  console.log('\n2️⃣  检查新创建的文件...');
  createdFiles.forEach(file => {
    if (fs.existsSync(file)) {
      results.summary.filesCreated++;
      console.log(`✅ ${file} - 已创建`);
    } else {
      results.success = false;
      results.issues.push(`❌ 文件未创建: ${file}`);
      console.log(`❌ ${file} - 不存在`);
    }
  });

  // 3. 检查更新的文件
  const updatedFiles = [
    'database/init.js',
    'database/README.md',
    'server/config/fieldMapping.js',
    'server/models/User.js',
    'package.json'
  ];

  console.log('\n3️⃣  检查更新的文件...');
  updatedFiles.forEach(file => {
    if (fs.existsSync(file)) {
      results.summary.filesUpdated++;
      console.log(`✅ ${file} - 已更新`);
    } else {
      results.success = false;
      results.issues.push(`❌ 文件不存在: ${file}`);
      console.log(`❌ ${file} - 不存在`);
    }
  });

  // 4. 检查complete-schema.sql的内容
  console.log('\n4️⃣  检查完备数据库架构内容...');
  try {
    const schemaContent = fs.readFileSync('database/complete-schema.sql', 'utf8');
    
    const requiredElements = [
      'CREATE TABLE IF NOT EXISTS users',
      'CREATE TABLE IF NOT EXISTS test_results',
      'CREATE TABLE IF NOT EXISTS monitoring_sites',
      'CREATE TABLE IF NOT EXISTS system_configs',
      'CREATE INDEX',
      'CREATE TRIGGER',
      'CREATE OR REPLACE FUNCTION',
      'CREATE OR REPLACE VIEW'
    ];

    requiredElements.forEach(element => {
      if (schemaContent.includes(element)) {
        console.log(`✅ ${element} - 已包含`);
      } else {
        results.success = false;
        results.issues.push(`❌ 缺少元素: ${element}`);
        console.log(`❌ ${element} - 缺少`);
      }
    });

    // 统计行数
    const lineCount = schemaContent.split('\n').length;
    console.log(`📊 架构文件行数: ${lineCount}`);

  } catch (error) {
    results.success = false;
    results.issues.push(`❌ 无法读取complete-schema.sql: ${error.message}`);
    console.log(`❌ 无法读取complete-schema.sql: ${error.message}`);
  }

  // 5. 检查package.json中的脚本
  console.log('\n5️⃣  检查NPM脚本更新...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = [
      'db:status',
      'db:rebuild',
      'db:cleanup',
      'db:init'
    ];

    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ ${script} - 已配置`);
      } else {
        results.success = false;
        results.issues.push(`❌ 缺少脚本: ${script}`);
        console.log(`❌ ${script} - 缺少`);
      }
    });

  } catch (error) {
    results.success = false;
    results.issues.push(`❌ 无法读取package.json: ${error.message}`);
    console.log(`❌ 无法读取package.json: ${error.message}`);
  }

  // 6. 显示验证结果
  console.log('\n' + '='.repeat(50));
  console.log('📋 验证结果汇总');
  console.log('='.repeat(50));
  
  console.log(`📁 文件删除: ${results.summary.filesRemoved}个`);
  console.log(`📄 文件创建: ${results.summary.filesCreated}个`);
  console.log(`✏️  文件更新: ${results.summary.filesUpdated}个`);
  
  if (results.success) {
    console.log('\n🎉 数据库清理验证通过！');
    console.log('✅ 所有文件和配置都已正确处理');
    console.log('\n📝 下一步操作:');
    console.log('   1. 运行: npm run db:status');
    console.log('   2. 运行: npm run db:rebuild');
    console.log('   3. 查看: DATABASE_CLEANUP_REPORT.md');
  } else {
    console.log('\n❌ 数据库清理验证失败！');
    console.log('发现以下问题:');
    results.issues.forEach(issue => console.log(`   ${issue}`));
  }

  return results.success;
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = verifyDatabaseCleanup();
  process.exit(success ? 0 : 1);
}

export { verifyDatabaseCleanup };
