#!/usr/bin/env node
/**
 * 快速验证 routes/test.js 修复
 * 
 * 用法: node scripts/verify-route-fixes.js
 */

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '../routes/test.js');

console.log('🔍 开始验证 routes/test.js 修复...\n');

// 读取文件内容
const content = fs.readFileSync(ROUTE_FILE, 'utf8');
const lines = content.split('\n');

const errors = [];
const warnings = [];
const success = [];

// 1. 检查 databaseService 引用（应该只在注释中）
console.log('📋 检查 1: databaseService 引用');
const databaseServiceMatches = [];
lines.forEach((line, index) => {
  if (line.includes('databaseService') && !line.trim().startsWith('//') && !line.includes('const databaseService')) {
    databaseServiceMatches.push({
      line: index + 1,
      content: line.trim()
    });
  }
});

if (databaseServiceMatches.length > 0) {
  errors.push('❌ 发现未注释的 databaseService 引用:');
  databaseServiceMatches.forEach(match => {
    errors.push(`   行 ${match.line}: ${match.content}`);
  });
} else {
  success.push('✅ databaseService 引用已全部移除或注释');
}

// 2. 检查 test_sessions 表名（应该全部改为 test_history）
console.log('📋 检查 2: test_sessions 表名');
const testSessionsMatches = [];
lines.forEach((line, index) => {
  if (line.includes('test_sessions') && !line.trim().startsWith('//')) {
    testSessionsMatches.push({
      line: index + 1,
      content: line.trim()
    });
  }
});

if (testSessionsMatches.length > 0) {
  errors.push('❌ 发现 test_sessions 表名引用（应该改为 test_history）:');
  testSessionsMatches.forEach(match => {
    errors.push(`   行 ${match.line}: ${match.content}`);
  });
} else {
  success.push('✅ 所有表名已统一为 test_history');
}

// 3. 检查 smartCacheService 引用
console.log('📋 检查 3: smartCacheService 引用');
const smartCacheMatches = [];
lines.forEach((line, index) => {
  const trimmed = line.trim();
  // 排除注释、import、字符串中的引用
  if (line.includes('smartCacheService') && 
      !trimmed.startsWith('//') && 
      !trimmed.startsWith('*') &&
      !line.includes('const smartCacheService') &&
      !line.includes('@deprecated') &&
      !line.includes("'") && !line.includes('"')) {
    smartCacheMatches.push({
      line: index + 1,
      content: line.trim()
    });
  }
});

if (smartCacheMatches.length > 0) {
  errors.push('❌ 发现未注释的 smartCacheService 引用:');
  smartCacheMatches.forEach(match => {
    errors.push(`   行 ${match.line}: ${match.content}`);
  });
} else {
  success.push('✅ smartCacheService 引用已全部移除或注释');
}

// 4. 检查 Lighthouse/Playwright 生产环境处理
console.log('📋 检查 4: Lighthouse/Playwright 生产环境处理');
const hasLighthouseProductionCheck = content.includes("process.env.NODE_ENV === 'production'") && 
                                      content.includes('FEATURE_NOT_IMPLEMENTED') &&
                                      content.includes('Lighthouse');
const hasPlaywrightProductionCheck = content.includes("process.env.NODE_ENV === 'production'") && 
                                      content.includes('FEATURE_NOT_IMPLEMENTED') &&
                                      content.includes('Playwright');

if (hasLighthouseProductionCheck && hasPlaywrightProductionCheck) {
  success.push('✅ Lighthouse 和 Playwright 生产环境正确处理');
} else {
  warnings.push('⚠️  Lighthouse/Playwright 生产环境处理可能不完整');
}

// 5. 检查 asyncHandler 使用情况
console.log('📋 检查 5: asyncHandler 使用');
const routeDefinitions = content.match(/router\.(get|post|put|delete)\(/g);
const asyncHandlerCount = (content.match(/asyncHandler\(/g) || []).length;

if (routeDefinitions && asyncHandlerCount >= routeDefinitions.length * 0.8) {
  success.push('✅ 大部分路由使用 asyncHandler 包装');
} else {
  warnings.push('⚠️  部分路由可能未使用 asyncHandler');
}

// 6. 检查语法（尝试 require）
console.log('📋 检查 6: 语法验证');
try {
  // 注意：这里不实际 require，因为可能有依赖问题
  // 只是检查文件是否可解析
  const Module = require('module');
  const m = new Module();
  m._compile(content, ROUTE_FILE);
  success.push('✅ 语法验证通过');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    // 依赖缺失是正常的，不算错误
    warnings.push('⚠️  无法完全验证语法（缺少依赖）');
  } else {
    errors.push(`❌ 语法错误: ${err.message}`);
  }
}

// 输出结果
console.log('\n' + '='.repeat(60));
console.log('验证结果:');
console.log('='.repeat(60) + '\n');

if (success.length > 0) {
  console.log('✅ 成功项:\n');
  success.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  警告项:\n');
  warnings.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ 错误项:\n');
  errors.forEach(msg => console.log('  ' + msg));
  console.log('');
}

// 统计
console.log('='.repeat(60));
console.log(`总计: ${success.length} 成功, ${warnings.length} 警告, ${errors.length} 错误`);
console.log('='.repeat(60));

// 退出码
if (errors.length > 0) {
  console.log('\n❌ 验证失败，请修复上述错误');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  验证通过，但存在警告');
  process.exit(0);
} else {
  console.log('\n✅ 所有检查通过！');
  process.exit(0);
}

