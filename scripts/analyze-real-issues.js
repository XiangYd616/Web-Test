#!/usr/bin/env node
/**
 * Test-Web 真实问题分析脚本
 * 过滤误报，找出真正需要修复的问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Test-Web 真实问题分析');
console.log('=' .repeat(60));

// 读取之前的报告
const reportPath = path.join(__dirname, '..', 'docs', 'error-check-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// 真实问题收集
const realIssues = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  improvements: []
};

/**
 * 验证是否真的包含硬编码敏感信息
 */
function validateSensitiveInfo(filePath) {
  const fullPath = path.join(__dirname, '..', filePath.replace(/\\/g, path.sep));
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // 真正的敏感信息模式（排除枚举和类型定义）
  const realSensitivePatterns = [
    /(?:api[_-]?key|apiKey)\s*[:=]\s*["'][\w\d]{20,}["']/gi,  // 真实的API密钥
    /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{6,}["']/gi,    // 真实的密码
    /(?:secret|private[_-]?key)\s*[:=]\s*["'][\w\d]{30,}["']/gi, // 真实的密钥
    /Bearer\s+["'][\w\d]{20,}["']/gi,                           // Bearer token
    /mongodb:\/\/[^@]+:[^@]+@/gi,                               // 数据库连接字符串
    /mysql:\/\/[^@]+:[^@]+@/gi,
    /postgresql:\/\/[^@]+:[^@]+@/gi
  ];
  
  for (const pattern of realSensitivePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      // 排除测试文件中的模拟数据
      if (!filePath.includes('test') && !filePath.includes('spec') && !filePath.includes('mock')) {
        return {
          found: true,
          type: '真实敏感信息',
          matches: matches.slice(0, 3) // 只返回前3个匹配
        };
      }
    }
  }
  
  return false;
}

/**
 * 分析TODO/FIXME的优先级
 */
function analyzeTodosPriority(todos) {
  const prioritized = {
    high: [],    // 影响功能的TODO
    medium: [],  // 功能增强的TODO
    low: []      // 代码优化的TODO
  };
  
  todos.forEach(todo => {
    const content = todo.content.toLowerCase();
    
    // 高优先级关键词
    if (content.includes('实现') || content.includes('implement') || 
        content.includes('fix') || content.includes('bug') ||
        content.includes('broken') || content.includes('错误')) {
      prioritized.high.push(todo);
    }
    // 中优先级关键词
    else if (content.includes('优化') || content.includes('optimize') ||
             content.includes('improve') || content.includes('enhance')) {
      prioritized.medium.push(todo);
    }
    // 低优先级
    else {
      prioritized.low.push(todo);
    }
  });
  
  return prioritized;
}

/**
 * 分析文件大小问题
 */
function analyzeFileSizes() {
  const oversizedFiles = [];
  const emptyFiles = [];
  
  // 扫描前端和后端目录
  ['frontend', 'backend'].forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      scanDirectory(dirPath, (filePath) => {
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(path.join(__dirname, '..'), filePath);
        
        // 超大文件（>200KB）
        if (stat.size > 200000) {
          oversizedFiles.push({
            file: relativePath,
            size: Math.round(stat.size / 1024),
            recommendation: '建议拆分为更小的模块'
          });
        }
        
        // 空文件（<10 bytes，排除index文件）
        if (stat.size < 10 && !filePath.includes('index') && !filePath.includes('.gitkeep')) {
          emptyFiles.push({
            file: relativePath,
            size: stat.size,
            recommendation: '空文件，建议删除或实现'
          });
        }
      });
    }
  });
  
  return { oversizedFiles, emptyFiles };
}

function scanDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        scanDirectory(filePath, callback);
      }
    } else if (['.js', '.jsx', '.ts', '.tsx'].some(ext => file.endsWith(ext))) {
      callback(filePath);
    }
  });
}

/**
 * 检查实际的路由和引擎匹配
 */
function checkRouteEngineSync() {
  const issues = [];
  const routesDir = path.join(__dirname, '..', 'backend', 'routes');
  const enginesDir = path.join(__dirname, '..', 'backend', 'engines');
  
  // 主要测试类型映射
  const testTypeMapping = {
    'performance': { route: 'performance.js', engine: 'performance' },
    'security': { route: 'security.js', engine: 'security' },
    'seo': { route: 'seo.js', engine: 'seo' },
    'api': { route: 'test.js', engine: 'api' },  // 特殊映射
    'stress': { route: 'stress.js', engine: 'stress' },
    'database': { route: 'database.js', engine: 'database' },
    'network': { route: 'network.js', engine: 'network' }
  };
  
  Object.entries(testTypeMapping).forEach(([type, mapping]) => {
    const routeFile = path.join(routesDir, mapping.route);
    const engineDir = path.join(enginesDir, mapping.engine);
    
    if (!fs.existsSync(routeFile) && fs.existsSync(engineDir)) {
      issues.push({
        type,
        issue: `缺少路由文件: backend/routes/${mapping.route}`,
        severity: 'medium'
      });
    }
  });
  
  return issues;
}

/**
 * 生成优化报告
 */
function generateOptimizedReport() {
  console.log('\n🔍 开始分析真实问题...\n');
  
  // 1. 验证敏感信息
  console.log('检查敏感信息...');
  report.critical.forEach(issue => {
    if (issue.issue.includes('敏感信息')) {
      const validation = validateSensitiveInfo(issue.file);
      if (validation && validation.found) {
        realIssues.critical.push({
          ...issue,
          validation
        });
      }
    }
  });
  
  // 2. 分析TODO优先级
  console.log('分析TODO优先级...');
  const todoAnalysis = analyzeTodosPriority(report.todos);
  
  // 3. 分析文件大小
  console.log('分析文件大小问题...');
  const { oversizedFiles, emptyFiles } = analyzeFileSizes();
  
  // 4. 检查路由引擎同步
  console.log('检查路由引擎同步...');
  const routeIssues = checkRouteEngineSync();
  
  // 5. 生成报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 真实问题分析报告');
  console.log('='.repeat(60));
  
  // 严重问题
  console.log('\n🔴 严重问题:');
  if (realIssues.critical.length > 0) {
    realIssues.critical.forEach(issue => {
      console.log(`  ❌ ${issue.file}`);
      if (issue.validation && issue.validation.matches) {
        console.log(`     找到: ${issue.validation.matches.join(', ')}`);
      }
    });
  } else {
    console.log('  ✅ 没有发现真实的硬编码敏感信息');
  }
  
  // TODO分析
  console.log('\n📝 TODO/FIXME 分析:');
  console.log(`  高优先级 (影响功能): ${todoAnalysis.high.length} 个`);
  console.log(`  中优先级 (功能增强): ${todoAnalysis.medium.length} 个`);
  console.log(`  低优先级 (代码优化): ${todoAnalysis.low.length} 个`);
  
  if (todoAnalysis.high.length > 0) {
    console.log('\n  高优先级TODO示例:');
    todoAnalysis.high.slice(0, 3).forEach(todo => {
      console.log(`    - ${todo.file}:${todo.line}`);
      console.log(`      ${todo.content.substring(0, 60)}...`);
    });
  }
  
  // 文件大小问题
  console.log('\n📦 文件大小问题:');
  console.log(`  超大文件 (>200KB): ${oversizedFiles.length} 个`);
  console.log(`  空文件: ${emptyFiles.length} 个`);
  
  if (oversizedFiles.length > 0) {
    console.log('\n  超大文件:');
    oversizedFiles.slice(0, 5).forEach(file => {
      console.log(`    - ${file.file}: ${file.size}KB`);
    });
  }
  
  // 路由引擎同步问题
  if (routeIssues.length > 0) {
    console.log('\n🔄 路由引擎同步问题:');
    routeIssues.forEach(issue => {
      console.log(`  - ${issue.type}: ${issue.issue}`);
    });
  }
  
  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('🎯 问题总结和建议');
  console.log('='.repeat(60));
  
  const criticalCount = realIssues.critical.length;
  const highTodoCount = todoAnalysis.high.length;
  const totalRealIssues = criticalCount + highTodoCount + routeIssues.length;
  
  console.log('\n📊 真实问题统计:');
  console.log(`  🔴 需立即修复: ${criticalCount} 个`);
  console.log(`  🟡 需尽快处理: ${highTodoCount} 个`);
  console.log(`  🟢 建议优化: ${todoAnalysis.medium.length + oversizedFiles.length} 个`);
  
  console.log('\n✨ 优先级建议:');
  
  if (criticalCount > 0) {
    console.log('\n1️⃣ 立即处理（严重）:');
    console.log('   - 移除或替换硬编码的敏感信息');
    console.log('   - 使用环境变量管理配置');
  }
  
  if (routeIssues.length > 0) {
    console.log('\n2️⃣ 尽快处理（重要）:');
    console.log('   - 创建缺失的路由文件');
    console.log('   - 确保前后端API一致');
  }
  
  if (highTodoCount > 0) {
    console.log('\n3️⃣ 计划处理（中等）:');
    console.log('   - 完成影响功能的TODO项');
    console.log('   - 实现待完成的核心功能');
  }
  
  if (oversizedFiles.length > 0) {
    console.log('\n4️⃣ 优化建议（低）:');
    console.log('   - 拆分超大文件');
    console.log('   - 清理空文件');
    console.log('   - 优化代码结构');
  }
  
  // 整体评估
  console.log('\n' + '='.repeat(60));
  console.log('💡 整体评估:');
  
  if (totalRealIssues === 0) {
    console.log('🎉 优秀！项目代码质量很高，没有发现严重问题。');
  } else if (criticalCount === 0 && totalRealIssues < 10) {
    console.log('✅ 良好！项目整体健康，只有少量需要优化的地方。');
  } else if (criticalCount === 0) {
    console.log('👍 不错！没有严重问题，但有一些TODO需要完成。');
  } else {
    console.log('⚠️  需要关注！存在一些问题需要修复。');
  }
  
  // 保存精确报告
  const optimizedReport = {
    summary: {
      critical: criticalCount,
      highPriority: highTodoCount,
      mediumPriority: todoAnalysis.medium.length,
      lowPriority: todoAnalysis.low.length,
      oversizedFiles: oversizedFiles.length,
      emptyFiles: emptyFiles.length,
      routeIssues: routeIssues.length
    },
    details: {
      critical: realIssues.critical,
      todos: todoAnalysis,
      fileSizes: { oversizedFiles, emptyFiles },
      routeIssues
    },
    timestamp: new Date().toISOString()
  };
  
  const outputPath = path.join(__dirname, '..', 'docs', 'real-issues-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(optimizedReport, null, 2));
  console.log(`\n📄 详细报告已保存到: docs/real-issues-report.json`);
}

// 执行分析
generateOptimizedReport();
