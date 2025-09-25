#!/usr/bin/env node
/**
 * Test-Web 综合错误和问题检查脚本
 * 检查各种潜在的错误、不一致性和问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};


// 收集所有发现的问题
const issues = {
  critical: [],    // 严重错误
  errors: [],      // 一般错误
  warnings: [],    // 警告
  todos: [],       // TODO/FIXME标记
  inconsistencies: [], // 不一致性
  improvements: [] // 改进建议
};

/**
 * 递归扫描文件
 */
function scanFiles(dir, callback, extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // 跳过 node_modules 和其他不需要检查的目录
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        scanFiles(filePath, callback, extensions);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      callback(filePath);
    }
  });
}

/**
 * 检查TODO和FIXME标记
 */
function checkTodoAndFixme(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  lines.forEach((line, index) => {
    // 检查 TODO
    if (line.match(/\/\/\s*TODO|\/\*\s*TODO|\bTODO\b/i)) {
      issues.todos.push({
        file: relativePath,
        line: index + 1,
        content: line.trim(),
        type: 'TODO'
      });
    }
    
    // 检查 FIXME
    if (line.match(/\/\/\s*FIXME|\/\*\s*FIXME|\bFIXME\b/i)) {
      issues.todos.push({
        file: relativePath,
        line: index + 1,
        content: line.trim(),
        type: 'FIXME'
      });
    }
    
    // 检查中文的待办标记
    if (line.match(/待实现|待完成|未完成|开发中|正在开发|占位符/)) {
      issues.todos.push({
        file: relativePath,
        line: index + 1,
        content: line.trim(),
        type: '中文标记'
      });
    }
  });
}

/**
 * 检查潜在的错误模式
 */
function checkErrorPatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  // 检查 console.log（生产环境不应该有）
  const consoleMatches = content.match(/console\.(log|debug|info)/g);
  if (consoleMatches && consoleMatches.length > 3) {
    issues.warnings.push({
      file: relativePath,
      issue: `过多的console语句 (${consoleMatches.length}个)`,
      severity: 'warning'
    });
  }
  
  // 检查未处理的 Promise
  if (content.includes('.then(') && !content.includes('.catch(')) {
    const thenCount = (content.match(/\.then\(/g) || []).length;
    const catchCount = (content.match(/\.catch\(/g) || []).length;
    if (thenCount > catchCount + 2) {
      issues.warnings.push({
        file: relativePath,
        issue: `可能存在未处理的Promise错误 (${thenCount} then vs ${catchCount} catch)`,
        severity: 'warning'
      });
    }
  }
  
  // 检查硬编码的敏感信息
  const sensitivePatterns = [
    /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi
  ];
  
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.critical.push({
        file: relativePath,
        issue: '可能包含硬编码的敏感信息',
        severity: 'critical'
      });
    }
  });
  
  // 检查未使用的变量（简单检查）
  const varDeclarations = content.match(/(?:const|let|var)\s+(\w+)\s*=/g) || [];
  varDeclarations.forEach(declaration => {
    const varName = declaration.match(/(?:const|let|var)\s+(\w+)/)[1];
    const uses = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
    if (uses === 1) {
      issues.warnings.push({
        file: relativePath,
        issue: `可能未使用的变量: ${varName}`,
        severity: 'low'
      });
    }
  });
}

/**
 * 检查导入路径一致性
 */
function checkImportConsistency(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && 
      !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  // 检查相对路径导入的一致性
  const relativeImports = content.match(/from\s+['"](\.|\.\.)[^'"]+['"]/g) || [];
  relativeImports.forEach(imp => {
    const importPath = imp.match(/from\s+['"](.*)['"]/)[1];
    
    // 检查路径是否过长
    if (importPath.includes('../../../..')) {
      issues.improvements.push({
        file: relativePath,
        issue: `导入路径过长，建议使用别名: ${importPath}`,
        severity: 'improvement'
      });
    }
  });
  
  // 检查是否混用了 require 和 import
  if (content.includes('require(') && content.includes('import ')) {
    issues.inconsistencies.push({
      file: relativePath,
      issue: '混用了 require 和 import 语句',
      severity: 'inconsistency'
    });
  }
}

/**
 * 检查文件大小
 */
function checkFileSize(filePath) {
  const stat = fs.statSync(filePath);
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  // 检查过大的文件
  if (stat.size > 100000) { // 100KB
    issues.warnings.push({
      file: relativePath,
      issue: `文件过大 (${Math.round(stat.size / 1024)}KB)，建议拆分`,
      severity: 'warning'
    });
  }
  
  // 检查空文件或过小的文件
  if (stat.size < 50 && !filePath.includes('index')) {
    issues.warnings.push({
      file: relativePath,
      issue: `文件过小 (${stat.size} bytes)，可能是占位符`,
      severity: 'warning'
    });
  }
}

/**
 * 检查API路由一致性
 */
function checkAPIConsistency() {
  
  const routesDir = path.join(__dirname, '..', 'backend', 'routes');
  const enginesDir = path.join(__dirname, '..', 'backend', 'engines');
  
  // 收集所有路由文件
  const routeFiles = [];
  if (fs.existsSync(routesDir)) {
    fs.readdirSync(routesDir).forEach(file => {
      if (file.endsWith('.js')) {
        routeFiles.push(file.replace('.js', ''));
      }
    });
  }
  
  // 收集所有引擎目录
  const engineDirs = [];
  if (fs.existsSync(enginesDir)) {
    fs.readdirSync(enginesDir).forEach(dir => {
      const dirPath = path.join(enginesDir, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        engineDirs.push(dir);
      }
    });
  }
  
  // 检查是否每个主要测试类型都有对应的路由和引擎
  const testTypes = ['api', 'performance', 'security', 'seo', 'database', 'network', 'stress'];
  
  testTypes.forEach(type => {
    const hasRoute = routeFiles.some(route => route.toLowerCase().includes(type));
    const hasEngine = engineDirs.some(engine => engine.toLowerCase().includes(type));
    
    if (!hasRoute && hasEngine) {
      issues.inconsistencies.push({
        type: 'API路由缺失',
        issue: `${type}测试有引擎但没有对应的路由文件`,
        severity: 'warning'
      });
    }
    
    if (hasRoute && !hasEngine) {
      issues.inconsistencies.push({
        type: 'Engine缺失',
        issue: `${type}测试有路由但没有对应的引擎目录`,
        severity: 'warning'
      });
    }
  });
}

/**
 * 检查前后端接口匹配
 */
function checkFrontBackendSync() {
  
  const apiServicePath = path.join(__dirname, '..', 'frontend', 'services', 'api.ts');
  if (fs.existsSync(apiServicePath)) {
    const apiContent = fs.readFileSync(apiServicePath, 'utf8');
    
    // 提取所有API端点
    const endpoints = apiContent.match(/['"`]\/api\/[^'"`]+/g) || [];
    const uniqueEndpoints = [...new Set(endpoints)];
    
    // 检查每个端点是否有对应的后端路由
    uniqueEndpoints.forEach(endpoint => {
      const cleanEndpoint = endpoint.replace(/['"`]/g, '');
      const routeType = cleanEndpoint.split('/')[2]; // 获取 /api/xxx 中的 xxx
      
      if (routeType) {
        const routeFile = path.join(__dirname, '..', 'backend', 'routes', `${routeType}.js`);
        if (!fs.existsSync(routeFile)) {
          issues.inconsistencies.push({
            type: '前后端不同步',
            issue: `前端调用的API ${cleanEndpoint} 可能没有对应的后端路由文件`,
            severity: 'warning'
          });
        }
      }
    });
  }
}

/**
 * 检查环境配置
 */
function checkEnvironmentConfig() {
  
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    issues.warnings.push({
      type: '环境配置',
      issue: '缺少 .env 文件',
      severity: 'warning'
    });
  }
  
  if (!fs.existsSync(envExamplePath)) {
    issues.improvements.push({
      type: '环境配置',
      issue: '建议添加 .env.example 文件作为配置模板',
      severity: 'improvement'
    });
  }
  
  // 检查 package.json 中的脚本
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const recommendedScripts = ['test', 'build', 'start', 'dev', 'lint'];
    recommendedScripts.forEach(script => {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        issues.improvements.push({
          type: 'Package配置',
          issue: `建议添加 npm script: ${script}`,
          severity: 'improvement'
        });
      }
    });
  }
}

/**
 * 生成报告
 */
function generateReport() {
  
  // 统计
  const totalIssues = 
    issues.critical.length + 
    issues.errors.length + 
    issues.warnings.length + 
    issues.todos.length + 
    issues.inconsistencies.length + 
    issues.improvements.length;
  
  
  // 显示严重问题
  if (issues.critical.length > 0) {
    issues.critical.slice(0, 5).forEach(issue => {
    });
  }
  
  // 显示错误
  if (issues.errors.length > 0) {
    issues.errors.slice(0, 5).forEach(issue => {
    });
  }
  
  // 显示警告
  if (issues.warnings.length > 0) {
    issues.warnings.slice(0, 5).forEach(issue => {
    });
    if (issues.warnings.length > 5) {
    }
  }
  
  // 显示TODO/FIXME
  if (issues.todos.length > 0) {
    
    // 按类型统计
    const todoCount = issues.todos.filter(t => t.type === 'TODO').length;
    const fixmeCount = issues.todos.filter(t => t.type === 'FIXME').length;
    const chineseCount = issues.todos.filter(t => t.type === '中文标记').length;
    
    
    // 显示前几个
    issues.todos.slice(0, 3).forEach(todo => {
    });
  }
  
  // 显示不一致性
  if (issues.inconsistencies.length > 0) {
    issues.inconsistencies.forEach(issue => {
    });
  }
  
  // 显示改进建议
  if (issues.improvements.length > 0) {
    issues.improvements.slice(0, 5).forEach(issue => {
    });
  }
  
  // 整体评估
  
  if (issues.critical.length > 0) {
  } else if (issues.errors.length > 0) {
  } else if (issues.warnings.length > 20) {
  } else {
  }
  
  return {
    total: totalIssues,
    critical: issues.critical.length,
    errors: issues.errors.length,
    warnings: issues.warnings.length
  };
}

/**
 * 主函数
 */
async function main() {
  
  // 1. 扫描所有源代码文件
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const backendDir = path.join(__dirname, '..', 'backend');
  
  let fileCount = 0;
  
  // 扫描前端文件
  if (fs.existsSync(frontendDir)) {
    scanFiles(frontendDir, (filePath) => {
      checkTodoAndFixme(filePath);
      checkErrorPatterns(filePath);
      checkImportConsistency(filePath);
      checkFileSize(filePath);
      fileCount++;
    });
  }
  
  // 扫描后端文件
  if (fs.existsSync(backendDir)) {
    scanFiles(backendDir, (filePath) => {
      checkTodoAndFixme(filePath);
      checkErrorPatterns(filePath);
      checkImportConsistency(filePath);
      checkFileSize(filePath);
      fileCount++;
    });
  }
  
  console.log(`✅ 扫描了 ${fileCount} 个文件`);
  
  // 2. 检查API一致性
  checkAPIConsistency();
  
  // 3. 检查前后端同步
  checkFrontBackendSync();
  
  // 4. 检查环境配置
  checkEnvironmentConfig();
  
  // 5. 生成报告
  const result = generateReport();
  
  // 6. 保存详细报告
  const reportPath = path.join(__dirname, '..', 'docs', 'error-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  
  // 返回退出码
  if (result.critical > 0 || result.errors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// 执行主函数
main().catch(console.error);
