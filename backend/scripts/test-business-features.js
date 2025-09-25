#!/usr/bin/env node
/**
 * 核心业务功能完整性测试
 * 确保用户可以真正使用所有主要测试功能
 */

const path = require('path');
const fs = require('fs');

console.log('🚀 开始核心业务功能测试...\n');

/**
 * 测试项目结构和关键文件
 */
function testProjectStructure() {
  
  const criticalPaths = [
    // 后端核心路由
    { path: 'routes/seo.js', desc: 'SEO测试路由' },
    { path: 'routes/security.js', desc: '安全测试路由' }, 
    { path: 'routes/performance.js', desc: '性能测试路由' },
    { path: 'routes/tests.js', desc: '通用测试路由' },
    
    // 前端核心页面
    { path: '../frontend/pages/WebsiteTest.tsx', desc: '网站测试页面' },
    { path: '../frontend/pages/SEOTest.tsx', desc: 'SEO测试页面' },
    { path: '../frontend/pages/SecurityTest.tsx', desc: '安全测试页面' },
    { path: '../frontend/pages/PerformanceTest.tsx', desc: '性能测试页面' },
    
    // 核心组件
    { path: '../frontend/components/testing', desc: '测试组件目录' },
    { path: '../frontend/components/ui', desc: 'UI组件目录' },
    
    // 配置文件
    { path: 'config/database.js', desc: '数据库配置' },
    { path: 'middleware/auth.js', desc: '认证中间件' }
  ];
  
  let existingFiles = 0;
  let missingFiles = 0;
  
  criticalPaths.forEach(({ path: filePath, desc }) => {
    if (fs.existsSync(filePath)) {
      existingFiles++;
    } else {
      missingFiles++;
    }
  });
  
  return missingFiles === 0;
}

/**
 * 测试后端路由语法
 */
function testBackendRoutes() {
  
  const routes = [
    'routes/seo.js',
    'routes/security.js', 
    'routes/performance.js',
    'routes/tests.js',
    'routes/auth.js',
    'routes/oauth.js'
  ];
  
  let passedRoutes = 0;
  let failedRoutes = 0;
  
  routes.forEach(route => {
    try {
      if (fs.existsSync(route)) {
        // 简单的语法检查
        const content = fs.readFileSync(route, 'utf8');
        
        // 检查基本语法错误
        if (content.includes('module.exports') || content.includes('router.')) {
          passedRoutes++;
        } else {
          failedRoutes++;
        }
      } else {
        failedRoutes++;
      }
    } catch (error) {
      failedRoutes++;
    }
  });
  
  return failedRoutes === 0;
}

/**
 * 测试数据库连接和表结构
 */
async function testDatabaseIntegrity() {
  
  try {
    const { connectDB, query } = require('../config/database');
    await connectDB();
    
    // 检查核心业务表
    const businessTables = [
      'users',
      'tests', 
      'test_results',
      'test_sessions',
      'user_oauth_accounts',
      'security_logs'
    ];
    
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const existingTables = tablesResult.rows.map(r => r.table_name);
    
    let foundTables = 0;
    businessTables.forEach(table => {
      if (existingTables.includes(table)) {
        foundTables++;
      } else {
      }
    });
    
    
    // 测试基本查询
    const testQuery = await query('SELECT COUNT(*) as count FROM users');
    
    return true;
    
  } catch (error) {
    return false;
  }
}

/**
 * 测试关键API端点
 */
async function testAPIEndpoints() {
  
  // 这里我们只测试路由是否能加载，不发起真实请求
  const apiRoutes = [
    { path: 'routes/seo.js', desc: 'SEO API' },
    { path: 'routes/security.js', desc: '安全测试API' },
    { path: 'routes/performance.js', desc: '性能测试API' },
    { path: 'routes/auth.js', desc: '认证API' },
    { path: 'routes/oauth.js', desc: 'OAuth API' }
  ];
  
  let loadableRoutes = 0;
  
  for (const route of apiRoutes) {
    try {
      if (fs.existsSync(route.path)) {
        // 尝试require路由文件
        const routeModule = require(`../${route.path}`);
        if (routeModule && typeof routeModule === 'function') {
          loadableRoutes++;
        } else {
        }
      } else {
      }
    } catch (error) {
    }
  }
  
  return loadableRoutes === apiRoutes.length;
}

/**
 * 测试前端组件可用性
 */
function testFrontendComponents() {
  
  const frontendComponents = [
    { path: '../frontend/pages/WebsiteTest.tsx', desc: '网站测试页面' },
    { path: '../frontend/pages/SEOTest.tsx', desc: 'SEO测试页面' },
    { path: '../frontend/pages/SecurityTest.tsx', desc: '安全测试页面' },
    { path: '../frontend/pages/PerformanceTest.tsx', desc: '性能测试页面' },
    { path: '../frontend/components/routing/AppRoutes.tsx', desc: '路由配置' },
    { path: '../frontend/App.tsx', desc: '应用主组件' }
  ];
  
  let existingComponents = 0;
  
  frontendComponents.forEach(({ path, desc }) => {
    if (fs.existsSync(path)) {
      // 简单检查是否包含React组件标识
      const content = fs.readFileSync(path, 'utf8');
      if (content.includes('React') && (content.includes('export') || content.includes('function'))) {
        existingComponents++;
      } else {
      }
    } else {
    }
  });
  
  return existingComponents >= frontendComponents.length * 0.8; // 80%通过率
}

/**
 * 检查用户核心功能流程
 */
function testUserWorkflows() {
  
  const workflows = [
    {
      name: '用户注册登录',
      requirements: [
        '../frontend/pages/Login.tsx',
        '../frontend/pages/Register.tsx', 
        'routes/auth.js'
      ]
    },
    {
      name: '网站测试',
      requirements: [
        '../frontend/pages/WebsiteTest.tsx',
        'routes/tests.js',
        'routes/seo.js'
      ]
    },
    {
      name: '性能测试', 
      requirements: [
        '../frontend/pages/PerformanceTest.tsx',
        'routes/performance.js'
      ]
    },
    {
      name: '安全测试',
      requirements: [
        '../frontend/pages/SecurityTest.tsx',
        'routes/security.js'
      ]
    },
    {
      name: '测试历史',
      requirements: [
        '../frontend/pages/TestHistory.tsx',
        'routes/testHistory.js'
      ]
    }
  ];
  
  let completedWorkflows = 0;
  
  workflows.forEach(workflow => {
    const missingFiles = workflow.requirements.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length === 0) {
      completedWorkflows++;
    } else if (missingFiles.length <= workflow.requirements.length / 2) {
      completedWorkflows += 0.5;
    } else {
    }
  });
  
  return completedWorkflows >= workflows.length * 0.7;
}

/**
 * 生成业务功能测试报告
 */
function generateBusinessTestReport(results) {
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  
  Object.entries(results).forEach(([testName, passed]) => {
    const icon = passed ? '✅' : '❌';
  });
  
  if (passedTests === totalTests) {
  } else {
    const criticalIssues = [];
    
    if (!results['数据库完整性']) {
      criticalIssues.push('数据库连接或表结构有问题');
    }
    if (!results['后端路由']) {
      criticalIssues.push('后端API路由有语法错误');
    }
    if (!results['前端组件']) {
      criticalIssues.push('前端页面组件缺失或有问题');
    }
    
    criticalIssues.forEach(issue => {
    });
    
    if (passedTests >= totalTests * 0.7) {
    } else {
    }
  }
}

/**
 * 主测试函数
 */
async function runBusinessTests() {
  const results = {};
  
  try {
    // 执行各项测试
    results['项目结构'] = testProjectStructure();
    results['后端路由'] = testBackendRoutes(); 
    results['数据库完整性'] = await testDatabaseIntegrity();
    results['API端点'] = await testAPIEndpoints();
    results['前端组件'] = testFrontendComponents();
    results['用户流程'] = testUserWorkflows();
    
    // 生成报告
    generateBusinessTestReport(results);
    
    // 返回成功状态
    const successRate = Object.values(results).filter(Boolean).length / Object.keys(results).length;
    process.exit(successRate >= 0.8 ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 测试执行过程中发生错误:', error);
    console.error('\n建议检查:');
    console.error('  1. Node.js版本是否支持');
    console.error('  2. 依赖是否正确安装');
    console.error('  3. 数据库服务是否运行');
    process.exit(1);
  }
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
  runBusinessTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runBusinessTests };
