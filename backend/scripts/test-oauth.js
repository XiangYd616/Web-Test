#!/usr/bin/env node
/**
 * OAuth2 集成测试脚本
 * 测试OAuth配置、路由和服务功能
 */

const axios = require('axios');
const oauthService = require('../src/services/OAuthService');

// 模拟请求对象
const mockReq = {
  ip: '127.0.0.1',
  get: (header) => {
    const headers = {
      'User-Agent': 'OAuth-Test/1.0',
      'Accept': 'application/json'
    };
    return headers[header] || null;
  }
};

/**
 * 测试OAuth提供商配置
 */
function testProviderConfigurations() {
  console.log('🔧 测试OAuth提供商配置...');
  
  const providers = oauthService.getAvailableProviders();
  console.log(`📊 找到 ${providers.length} 个已配置的OAuth提供商:`);
  
  if (providers.length === 0) {
    console.log('⚠️  没有配置任何OAuth提供商');
    console.log('💡 请检查环境变量配置，参考 .env.oauth.example');
    return false;
  }
  
  providers.forEach(provider => {
    console.log(`  ✅ ${provider.name} (${provider.id}) - 已配置`);
  });
  
  return true;
}

/**
 * 测试授权URL生成
 */
function testAuthUrlGeneration() {
  console.log('\n🔗 测试授权URL生成...');
  
  const providers = oauthService.getAvailableProviders();
  
  if (providers.length === 0) {
    console.log('⚠️  跳过授权URL测试 - 没有配置提供商');
    return false;
  }
  
  let success = true;
  
  providers.forEach(provider => {
    try {
      const result = oauthService.generateAuthUrl(provider.id, mockReq);
      
      if (result.authUrl && result.state) {
        console.log(`  ✅ ${provider.name}: 授权URL生成成功`);
        console.log(`     URL: ${result.authUrl.substring(0, 80)}...`);
      } else {
        console.log(`  ❌ ${provider.name}: 授权URL生成失败`);
        success = false;
      }
    } catch (error) {
      console.log(`  ❌ ${provider.name}: ${error.message}`);
      success = false;
    }
  });
  
  return success;
}

/**
 * 测试State参数验证
 */
function testStateValidation() {
  console.log('\n🔐 测试State参数验证...');
  
  const providers = oauthService.getAvailableProviders();
  
  if (providers.length === 0) {
    console.log('⚠️  跳过State验证测试 - 没有配置提供商');
    return false;
  }
  
  let success = true;
  const testProvider = providers[0].id;
  
  try {
    // 生成state
    const state = oauthService.generateState(testProvider, mockReq);
    console.log(`  ✅ State生成成功 (长度: ${state.length})`);
    
    // 验证state
    const isValid = oauthService.validateState(state, testProvider, mockReq);
    if (isValid) {
      console.log('  ✅ State验证成功');
    } else {
      console.log('  ❌ State验证失败');
      success = false;
    }
    
    // 测试无效state
    const invalidState = 'invalid_state';
    const isInvalid = oauthService.validateState(invalidState, testProvider, mockReq);
    if (!isInvalid) {
      console.log('  ✅ 无效State正确拒绝');
    } else {
      console.log('  ❌ 无效State未被拒绝');
      success = false;
    }
    
  } catch (error) {
    console.log(`  ❌ State测试失败: ${error.message}`);
    success = false;
  }
  
  return success;
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  console.log('\n🗄️  测试数据库连接...');
  
  try {
    const { connectDB, query } = require('../config/database');
    await connectDB();
    
    // 检查OAuth表是否存在
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_oauth_accounts', 'oauth_applications', 'oauth_sessions')
      ORDER BY table_name;
    `);
    
    console.log(`  ✅ 数据库连接成功`);
    console.log(`  📊 找到 ${tablesResult.rows.length}/3 个OAuth表:`);
    
    const expectedTables = ['oauth_applications', 'oauth_sessions', 'user_oauth_accounts'];
    const foundTables = tablesResult.rows.map(r => r.table_name);
    
    expectedTables.forEach(table => {
      if (foundTables.includes(table)) {
        console.log(`    ✅ ${table} - 存在`);
      } else {
        console.log(`    ❌ ${table} - 缺失`);
      }
    });
    
    return foundTables.length === expectedTables.length;
    
  } catch (error) {
    console.log(`  ❌ 数据库测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试用户名生成
 */
async function testUsernameGeneration() {
  console.log('\n👤 测试用户名生成...');
  
  try {
    // 测试基于名称的用户名生成
    const username1 = await oauthService.generateUniqueUsername('John Doe', 'john@example.com');
    console.log(`  ✅ 基于姓名生成: ${username1}`);
    
    // 测试基于邮箱的用户名生成
    const username2 = await oauthService.generateUniqueUsername(null, 'test.user@domain.com');
    console.log(`  ✅ 基于邮箱生成: ${username2}`);
    
    // 测试特殊字符处理
    const username3 = await oauthService.generateUniqueUsername('张三@#$', 'zhangsan@example.com');
    console.log(`  ✅ 特殊字符处理: ${username3}`);
    
    return true;
    
  } catch (error) {
    console.log(`  ❌ 用户名生成测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📋 OAuth2 集成测试报告');
  console.log('='.repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过测试: ${passedTests}`);
  console.log(`失败测试: ${failedTests}`);
  
  console.log('\n详细结果:');
  Object.entries(results).forEach(([testName, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${testName}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过! OAuth2集成准备就绪');
    console.log('\n下一步:');
    console.log('  1. 配置OAuth2提供商密钥 (.env 文件)');
    console.log('  2. 创建前端OAuth登录组件');
    console.log('  3. 测试完整的OAuth登录流程');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置和实现');
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始OAuth2集成测试...\n');
  
  const results = {};
  
  // 运行各项测试
  results['提供商配置'] = testProviderConfigurations();
  results['授权URL生成'] = testAuthUrlGeneration();
  results['State参数验证'] = testStateValidation();
  results['数据库连接'] = await testDatabaseConnection();
  results['用户名生成'] = await testUsernameGeneration();
  
  // 生成报告
  generateTestReport(results);
  
  process.exit(Object.values(results).every(Boolean) ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
