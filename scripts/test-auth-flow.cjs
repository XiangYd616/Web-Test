#!/usr/bin/env node

/**
 * 测试认证流程脚本
 * 验证统一认证逻辑是否正常工作
 */

// 使用内置fetch或者导入
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (error) {
  console.log('⚠️ 无法加载fetch，将使用简化测试');
  fetch = null;
}

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5174';

async function testAuthFlow() {
  console.log('🚀 开始测试认证流程...\n');

  if (!fetch) {
    console.log('❌ fetch不可用，跳过网络测试');
    return;
  }

  try {
    // 1. 测试公开API端点
    console.log('📋 测试1: 公开API端点');
    await testPublicEndpoints();

    // 2. 测试可选认证API端点
    console.log('\n📋 测试2: 可选认证API端点');
    await testOptionalAuthEndpoints();

    // 3. 测试强制认证API端点
    console.log('\n📋 测试3: 强制认证API端点');
    await testRequiredAuthEndpoints();

    // 4. 测试登录流程
    console.log('\n📋 测试4: 登录流程');
    const authToken = await testLoginFlow();

    // 5. 测试已认证的API访问
    if (authToken) {
      console.log('\n📋 测试5: 已认证的API访问');
      await testAuthenticatedAccess(authToken);
    }

    console.log('\n🎉 认证流程测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function testPublicEndpoints() {
  const endpoints = [
    '/health',
    '/api/test',
    '/api/auth/verify' // 这个会返回401，但不应该崩溃
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`  ✅ ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`  ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function testOptionalAuthEndpoints() {
  const endpoints = [
    '/api/test/history',
    '/api/test/statistics',
    '/api/test/security/history'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      console.log(`  ✅ ${endpoint}: ${response.status} - ${data.success ? '成功' : data.message}`);
    } catch (error) {
      console.log(`  ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function testRequiredAuthEndpoints() {
  const endpoints = [
    '/api/user/profile',
    '/api/admin/stats',
    '/api/auth/me'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      console.log(`  ✅ ${endpoint}: ${response.status} - ${data.message || '需要认证'}`);
    } catch (error) {
      console.log(`  ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function testLoginFlow() {
  try {
    // 尝试登录（使用测试账户）
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok && loginData.success) {
      console.log('  ✅ 登录成功');
      return loginData.token;
    } else {
      console.log(`  ⚠️ 登录失败: ${loginData.message} (这是正常的，如果没有测试账户)`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ 登录测试失败: ${error.message}`);
    return null;
  }
}

async function testAuthenticatedAccess(token) {
  const endpoints = [
    '/api/auth/me',
    '/api/user/profile',
    '/api/test/history'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log(`  ✅ ${endpoint}: ${response.status} - ${data.success ? '成功' : data.message}`);
    } catch (error) {
      console.log(`  ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function testFrontendRoutes() {
  console.log('\n📋 测试前端路由访问');

  const routes = [
    '/',
    '/website-test',
    '/stress-test',
    '/test-history',
    '/dashboard',
    '/login'
  ];

  for (const route of routes) {
    try {
      const response = await fetch(`${FRONTEND_URL}${route}`);
      console.log(`  ✅ ${route}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`  ❌ ${route}: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  await testAuthFlow();
  await testFrontendRoutes();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAuthFlow };
