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
    return false;
  }
  
  providers.forEach(provider => {
  });
  
  return true;
}

/**
 * 测试授权URL生成
 */
function testAuthUrlGeneration() {
  
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
      } else {
        success = false;
      }
    } catch (error) {
      success = false;
    }
  });
  
  return success;
}

/**
 * 测试State参数验证
 */
function testStateValidation() {
  
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
    
    // 验证state
    const isValid = oauthService.validateState(state, testProvider, mockReq);
    if (isValid) {
    } else {
      success = false;
    }
    
    // 测试无效state
    const invalidState = 'invalid_state';
    const isInvalid = oauthService.validateState(invalidState, testProvider, mockReq);
    if (!isInvalid) {
    } else {
      success = false;
    }
    
  } catch (error) {
    success = false;
  }
  
  return success;
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  
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
    
    
    const expectedTables = ['oauth_applications', 'oauth_sessions', 'user_oauth_accounts'];
    const foundTables = tablesResult.rows.map(r => r.table_name);
    
    expectedTables.forEach(table => {
      if (foundTables.includes(table)) {
      } else {
      }
    });
    
    return foundTables.length === expectedTables.length;
    
  } catch (error) {
    return false;
  }
}

/**
 * 测试用户名生成
 */
async function testUsernameGeneration() {
  
  try {
    // 测试基于名称的用户名生成
    const username1 = await oauthService.generateUniqueUsername('John Doe', 'john@example.com');
    
    // 测试基于邮箱的用户名生成
    const username2 = await oauthService.generateUniqueUsername(null, 'test.user@domain.com');
    
    // 测试特殊字符处理
    const username3 = await oauthService.generateUniqueUsername('张三@#$', 'zhangsan@example.com');
    
    return true;
    
  } catch (error) {
    return false;
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(results) {
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  
  Object.entries(results).forEach(([testName, passed]) => {
    const icon = passed ? '✅' : '❌';
  });
  
  if (passedTests === totalTests) {
  } else {
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
