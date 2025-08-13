#!/usr/bin/env node

/**
 * 真实测试页面验证脚本
 * 验证新创建的真实测试页面是否正常工作
 */

import fs from 'fs';

console.log('🔍 验证真实测试页面实现...\n');

const results = {
  success: true,
  issues: [],
  summary: {
    pagesCreated: 0,
    pagesUpdated: 0,
    routesAdded: 0,
    backendRoutes: 0
  }
};

// 1. 检查新创建的真实测试页面
const realTestPages = [
  'src/pages/RealSEOTest.tsx',
  'src/pages/RealPerformanceTest.tsx',
  'src/pages/RealAPITest.tsx'
];

console.log('1️⃣  检查新创建的真实测试页面...');
realTestPages.forEach(page => {
  if (fs.existsSync(page)) {
    results.summary.pagesCreated++;
    console.log(`✅ ${page} - 已创建`);

    // 检查页面内容
    const content = fs.readFileSync(page, 'utf8');

    // 检查是否使用了BaseTestPage
    if (content.includes('BaseTestPage')) {
      console.log(`   ✓ 使用BaseTestPage组件`);
    } else {
      results.issues.push(`${page} 未使用BaseTestPage组件`);
    }

    // 检查是否有真实API调用
    if (content.includes('apiService.post')) {
      console.log(`   ✓ 包含真实API调用`);
    } else {
      results.issues.push(`${page} 缺少真实API调用`);
    }

    // 检查是否有错误处理
    if (content.includes('try') && content.includes('catch')) {
      console.log(`   ✓ 包含错误处理`);
    } else {
      results.issues.push(`${page} 缺少错误处理`);
    }

  } else {
    results.success = false;
    results.issues.push(`${page} 文件不存在`);
    console.log(`❌ ${page} - 不存在`);
  }
});

// 2. 检查BaseTestPage组件
console.log('\n2️⃣  检查BaseTestPage组件...');
const baseTestPagePath = 'src/components/testing/BaseTestPage.tsx';
if (fs.existsSync(baseTestPagePath)) {
  console.log(`✅ ${baseTestPagePath} - 已创建`);

  const content = fs.readFileSync(baseTestPagePath, 'utf8');

  // 检查必要的props
  const requiredProps = ['testType', 'title', 'description', 'icon', 'children'];
  requiredProps.forEach(prop => {
    if (content.includes(prop)) {
      console.log(`   ✓ 包含${prop}属性`);
    } else {
      results.issues.push(`BaseTestPage缺少${prop}属性`);
    }
  });

} else {
  results.success = false;
  results.issues.push('BaseTestPage组件不存在');
  console.log(`❌ ${baseTestPagePath} - 不存在`);
}

// 3. 检查已删除的组件
console.log('\n3️⃣  检查已删除的组件...');
const deletedComponents = [
  'src/components/testing/TestPageLayout.tsx',
  'src/components/testing/UnifiedTestPageLayout.tsx'
];

deletedComponents.forEach(component => {
  if (!fs.existsSync(component)) {
    console.log(`✅ ${component} - 已删除`);
  } else {
    results.issues.push(`${component} 应该被删除但仍然存在`);
    console.log(`❌ ${component} - 仍然存在`);
  }
});

// 4. 检查更新的测试页面
console.log('\n4️⃣  检查更新的测试页面...');
const updatedPages = [
  'src/pages/SEOTest.tsx',
  'src/pages/SecurityTest.tsx',
  'src/pages/APITest.tsx',
  'src/pages/CompatibilityTest.tsx'
];

updatedPages.forEach(page => {
  if (fs.existsSync(page)) {
    results.summary.pagesUpdated++;
    console.log(`✅ ${page} - 已更新`);

    const content = fs.readFileSync(page, 'utf8');

    // 检查是否使用了BaseTestPage
    if (content.includes('BaseTestPage')) {
      console.log(`   ✓ 已更新为使用BaseTestPage`);
    } else {
      results.issues.push(`${page} 未更新为使用BaseTestPage`);
    }

  } else {
    results.issues.push(`${page} 文件不存在`);
    console.log(`❌ ${page} - 不存在`);
  }
});

// 5. 检查路由配置
console.log('\n5️⃣  检查路由配置...');
const routesPath = 'src/components/routing/AppRoutes.tsx';
if (fs.existsSync(routesPath)) {
  console.log(`✅ ${routesPath} - 存在`);

  const content = fs.readFileSync(routesPath, 'utf8');

  // 检查新的路由导入
  const newImports = ['RealSEOTest', 'RealPerformanceTest'];
  newImports.forEach(importName => {
    if (content.includes(importName)) {
      console.log(`   ✓ 包含${importName}导入`);
      results.summary.routesAdded++;
    } else {
      results.issues.push(`路由配置缺少${importName}导入`);
    }
  });

  // 检查新的路由定义
  if (content.includes('seo-test-legacy') && content.includes('performance-test-legacy')) {
    console.log(`   ✓ 包含兼容性路由`);
  } else {
    results.issues.push('路由配置缺少兼容性路由');
  }

} else {
  results.success = false;
  results.issues.push('路由配置文件不存在');
  console.log(`❌ ${routesPath} - 不存在`);
}

// 6. 检查后端路由
console.log('\n6️⃣  检查后端路由...');
const backendRoutePath = 'server/routes/realTest.js';
if (fs.existsSync(backendRoutePath)) {
  console.log(`✅ ${backendRoutePath} - 已创建`);
  results.summary.backendRoutes++;

  const content = fs.readFileSync(backendRoutePath, 'utf8');

  // 检查API端点
  const endpoints = ['/seo', '/performance', '/security', '/api', '/comprehensive'];
  endpoints.forEach(endpoint => {
    if (content.includes(`router.post('${endpoint}'`)) {
      console.log(`   ✓ 包含${endpoint}端点`);
    } else {
      results.issues.push(`后端路由缺少${endpoint}端点`);
    }
  });

} else {
  results.success = false;
  results.issues.push('后端路由文件不存在');
  console.log(`❌ ${backendRoutePath} - 不存在`);
}

// 7. 检查app.js中的路由注册
console.log('\n7️⃣  检查app.js路由注册...');
const appPath = 'server/app.js';
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');

  if (content.includes("app.use('/api/test/real'")) {
    console.log(`✅ app.js - 真实测试路由已注册`);
  } else {
    results.issues.push('app.js中未注册真实测试路由');
    console.log(`❌ app.js - 真实测试路由未注册`);
  }
} else {
  results.success = false;
  results.issues.push('app.js文件不存在');
}

// 8. 显示验证结果
console.log('\n' + '='.repeat(50));
console.log('📋 验证结果汇总');
console.log('='.repeat(50));

console.log(`📄 新页面创建: ${results.summary.pagesCreated}个`);
console.log(`✏️  页面更新: ${results.summary.pagesUpdated}个`);
console.log(`🛣️  路由添加: ${results.summary.routesAdded}个`);
console.log(`🔧 后端路由: ${results.summary.backendRoutes}个`);

if (results.success && results.issues.length === 0) {
  console.log('\n🎉 真实测试页面验证通过！');
  console.log('✅ 所有组件和配置都已正确实现');
  console.log('\n📝 下一步操作:');
  console.log('   1. 启动开发服务器: npm run dev');
  console.log('   2. 访问新的测试页面验证功能');
  console.log('   3. 测试真实API调用是否正常');
  console.log('   4. 检查页面样式和交互');
} else {
  console.log('\n❌ 真实测试页面验证发现问题！');
  if (results.issues.length > 0) {
    console.log('发现以下问题:');
    results.issues.forEach(issue => console.log(`   ${issue}`));
  }
}

// 9. 生成验证报告
const reportPath = 'REAL_TEST_VERIFICATION_REPORT.md';
const reportContent = `# 真实测试页面验证报告

## 验证时间
${new Date().toISOString()}

## 验证结果
- 状态: ${results.success && results.issues.length === 0 ? '✅ 通过' : '❌ 失败'}
- 新页面创建: ${results.summary.pagesCreated}个
- 页面更新: ${results.summary.pagesUpdated}个
- 路由添加: ${results.summary.routesAdded}个
- 后端路由: ${results.summary.backendRoutes}个

## 发现的问题
${results.issues.length === 0 ? '无问题发现' : results.issues.map(issue => `- ${issue}`).join('\n')}

## 建议
${results.success && results.issues.length === 0 ?
    '所有验证项目都已通过，可以开始测试新功能。' :
    '请修复上述问题后重新验证。'}
`;

fs.writeFileSync(reportPath, reportContent);
console.log(`\n📊 验证报告已生成: ${reportPath}`);

process.exit(results.success && results.issues.length === 0 ? 0 : 1);
