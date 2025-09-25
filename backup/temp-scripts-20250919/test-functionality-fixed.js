#!/usr/bin/env node
/**
 * Test-Web 功能完整性测试脚本（修正版）
 * 正确检查测试引擎和功能实现
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 测试结果收集
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * 检查文件是否存在并分析内容
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 检查是否包含实际实现代码
    const hasRealImplementation = 
      content.length > 500 && 
      !content.includes('// TODO: 实现') &&
      !content.includes('正在开发中') &&
      (content.includes('function') || content.includes('class') || content.includes('export'));
    
    if (hasRealImplementation) {
      testResults.passed.push(`✅ ${description}: 已实现 (${stats.size} bytes)`);
      return true;
    } else if (stats.size > 100) {
      testResults.warnings.push(`⚠️ ${description}: 部分实现 (${stats.size} bytes)`);
      return true;
    } else {
      testResults.warnings.push(`⚠️ ${description}: 可能是占位符实现`);
      return false;
    }
  } else {
    testResults.failed.push(`❌ ${description}: 文件不存在`);
    return false;
  }
}

/**
 * 测试核心测试引擎（修正路径）
 */
function testEngines() {
  
  const engines = [
    { file: 'backend/engines/api/apiTestEngine.js', name: 'API测试引擎' },
    { file: 'backend/engines/performance/PerformanceTestEngine.js', name: '性能测试引擎' },
    { file: 'backend/engines/security/securityTestEngine.js', name: '安全测试引擎' },
    { file: 'backend/engines/seo/SEOTestEngine.js', name: 'SEO测试引擎' },
    { file: 'backend/engines/compatibility/compatibilityTestEngine.js', name: '兼容性测试引擎' },
    { file: 'backend/engines/network/EnhancedNetworkTestEngine.js', name: '网络测试引擎' },
    { file: 'backend/engines/database/EnhancedDatabaseTestEngine.js', name: '数据库测试引擎' },
    { file: 'backend/engines/stress/stressTestEngine.js', name: '压力测试引擎' },
    { file: 'backend/engines/ux/UXTestEngine.js', name: 'UX测试引擎' },
    { file: 'backend/engines/website/websiteTestEngine.js', name: '网站测试引擎' },
    { file: 'backend/engines/core/UnifiedTestEngine.js', name: '统一测试引擎' },
    { file: 'backend/engines/infrastructure/InfrastructureTestEngine.js', name: '基础设施测试引擎' },
    { file: 'backend/engines/content/contentDetectionEngine.js', name: '内容检测引擎' }
  ];
  
  let implementedCount = 0;
  engines.forEach(engine => {
    if (checkFileExists(engine.file, engine.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: engines.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / engines.length) * 100)
  };
}

/**
 * 测试分析器组件
 */
function testAnalyzers() {
  
  const analyzers = [
    { file: 'backend/engines/api/APIAnalyzer.js', name: 'API分析器' },
    { file: 'backend/engines/security/SecurityAnalyzer.js', name: '安全分析器' },
    { file: 'backend/engines/seo/SEOAnalyzer.js', name: 'SEO分析器' },
    { file: 'backend/engines/compatibility/CompatibilityAnalyzer.js', name: '兼容性分析器' },
    { file: 'backend/engines/stress/StressAnalyzer.js', name: '压力分析器' },
    { file: 'backend/engines/performance/analyzers/PerformanceAnalyzer.js', name: '性能分析器' },
    { file: 'backend/engines/seo/analyzers/ContentAnalyzer.js', name: '内容分析器' },
    { file: 'backend/engines/security/analyzers/XSSAnalyzer.js', name: 'XSS分析器' },
    { file: 'backend/engines/security/analyzers/SQLInjectionAnalyzer.js', name: 'SQL注入分析器' }
  ];
  
  let implementedCount = 0;
  analyzers.forEach(analyzer => {
    if (checkFileExists(analyzer.file, analyzer.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: analyzers.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / analyzers.length) * 100)
  };
}

/**
 * 测试核心服务
 */
function testCoreServices() {
  
  const services = [
    { file: 'backend/engines/core/services/AnalysisCore.js', name: '分析核心服务' },
    { file: 'backend/engines/core/services/HTTPTestCore.js', name: 'HTTP测试核心' },
    { file: 'backend/engines/core/services/PerformanceTestCore.js', name: '性能测试核心' },
    { file: 'backend/engines/core/services/SecurityTestCore.js', name: '安全测试核心' },
    { file: 'backend/engines/services/ValidationCore.js', name: '验证核心服务' },
    { file: 'backend/engines/core/TestEngineManager.js', name: '测试引擎管理器' }
  ];
  
  let implementedCount = 0;
  services.forEach(service => {
    if (checkFileExists(service.file, service.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: services.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / services.length) * 100)
  };
}

/**
 * 测试优化器和工具
 */
function testOptimizersAndUtils() {
  
  const tools = [
    { file: 'backend/engines/performance/optimizers/PerformanceOptimizationEngine.js', name: '性能优化引擎' },
    { file: 'backend/engines/seo/utils/optimizationEngine.js', name: 'SEO优化引擎' },
    { file: 'backend/engines/seo/utils/RecommendationEngine.js', name: '推荐引擎' },
    { file: 'backend/engines/seo/utils/ReportGenerator.js', name: '报告生成器' },
    { file: 'backend/engines/stress/generators/LoadGenerator.js', name: '负载生成器' },
    { file: 'backend/engines/security/utils/SecurityRiskAssessment.js', name: '安全风险评估' }
  ];
  
  let implementedCount = 0;
  tools.forEach(tool => {
    if (checkFileExists(tool.file, tool.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: tools.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / tools.length) * 100)
  };
}

/**
 * 测试核心测试工具页面
 */
function testCoreTestPages() {
  
  const corePages = [
    { file: 'frontend/pages/WebsiteTest.tsx', name: '网站综合测试' },
    { file: 'frontend/pages/PerformanceTest.tsx', name: '性能测试' },
    { file: 'frontend/pages/SecurityTest.tsx', name: '安全测试' },
    { file: 'frontend/pages/SEOTest.tsx', name: 'SEO测试' },
    { file: 'frontend/pages/APITest.tsx', name: 'API测试' },
    { file: 'frontend/pages/NetworkTest.tsx', name: '网络测试' },
    { file: 'frontend/pages/DatabaseTest.tsx', name: '数据库测试' },
    { file: 'frontend/pages/UnifiedStressTest.tsx', name: '压力测试' },
    { file: 'frontend/pages/CompatibilityTest.tsx', name: '兼容性测试' },
    { file: 'frontend/pages/UXTest.tsx', name: 'UX测试' },
    { file: 'frontend/pages/InfrastructureTest.tsx', name: '基础设施测试' },
    { file: 'frontend/pages/ContentTest.tsx', name: '内容测试' }
  ];
  
  let implementedCount = 0;
  corePages.forEach(page => {
    if (checkFileExists(page.file, page.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: corePages.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / corePages.length) * 100)
  };
}

/**
 * 测试后端API路由
 */
function testBackendAPIs() {
  
  const apiRoutes = [
    { file: 'backend/routes/auth.js', name: '认证API' },
    { file: 'backend/routes/test.js', name: '测试API' },
    { file: 'backend/routes/testHistory.js', name: '测试历史API' },
    { file: 'backend/routes/seo.js', name: 'SEO测试API' },
    { file: 'backend/routes/security.js', name: '安全测试API' },
    { file: 'backend/routes/performance.js', name: '性能测试API' },
    { file: 'backend/routes/data.js', name: '数据管理API' },
    { file: 'backend/routes/batch.js', name: '批量操作API' }
  ];
  
  let implementedCount = 0;
  apiRoutes.forEach(route => {
    if (checkFileExists(route.file, route.name)) {
      implementedCount++;
    }
  });
  
  return {
    total: apiRoutes.length,
    implemented: implementedCount,
    percentage: Math.round((implementedCount / apiRoutes.length) * 100)
  };
}

/**
 * 生成测试报告
 */
function generateReport(results) {
  console.log('📊 功能完整性测试报告（修正版）');
  
  // 计算总体完整度
  const totalItems = results.reduce((sum, r) => sum + r.total, 0);
  const implementedItems = results.reduce((sum, r) => sum + r.implemented, 0);
  const overallPercentage = Math.round((implementedItems / totalItems) * 100);
  
  results.forEach(result => {
    const status = result.percentage >= 80 ? '🟢' : result.percentage >= 60 ? '🟡' : '🔴';
  });
  
  console.log(`✅ 通过测试: ${testResults.passed.length}`);
  console.log(`⚠️  警告: ${testResults.warnings.length}`);
  console.log(`❌ 失败: ${testResults.failed.length}`);
  
  
  if (overallPercentage >= 90) {
  } else if (overallPercentage >= 75) {
  } else if (overallPercentage >= 60) {
  } else {
    console.log('⚠️  警告：许多功能尚未实现');
  }
  
  // 显示具体问题
  if (testResults.failed.length > 0) {
    testResults.failed.slice(0, 10).forEach(item => );
    if (testResults.failed.length > 10) {
    }
  }
  
  if (testResults.warnings.length > 0) {
    testResults.warnings.slice(0, 10).forEach(item => );
    if (testResults.warnings.length > 10) {
    }
  }
  
  return overallPercentage;
}

/**
 * 主测试函数
 */
async function runTests() {
  
  const results = [];
  
  // 1. 测试测试引擎
  const engineResults = testEngines();
  results.push({ name: '测试引擎', ...engineResults });
  
  // 2. 测试分析器
  const analyzerResults = testAnalyzers();
  results.push({ name: '分析器组件', ...analyzerResults });
  
  // 3. 测试核心服务
  const serviceResults = testCoreServices();
  results.push({ name: '核心服务', ...serviceResults });
  
  // 4. 测试优化器和工具
  const toolResults = testOptimizersAndUtils();
  results.push({ name: '优化器和工具', ...toolResults });
  
  // 5. 测试核心页面
  const pageResults = testCoreTestPages();
  results.push({ name: '核心测试页面', ...pageResults });
  
  // 6. 测试后端API
  const apiResults = testBackendAPIs();
  results.push({ name: '后端API', ...apiResults });
  
  // 生成报告
  const overallScore = generateReport(results);
  
  // 返回测试结果
  return {
    success: overallScore >= 75,
    score: overallScore,
    details: results
  };
}

// 执行测试
runTests().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

export { runTests };
