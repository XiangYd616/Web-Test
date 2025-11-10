#!/usr/bin/env node

/**
 * 架构规范检查工具
 * 检查项目是否符合统一架构规范
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 读取文件内容
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return '';
  }
}

/**
 * 递归搜索文件
 */
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findFiles(filePath, pattern, results);
    } else if (stat.isFile() && pattern.test(file)) {
      results.push(filePath);
    }
  });

  return results;
}

/**
 * 检查1: API客户端统一性
 */
function checkApiClientUnification() {
  log('\n📋 检查 API 客户端统一性...', 'cyan');
  
  const apiFiles = [
    path.join(FRONTEND_DIR, 'services', 'api.ts'),
    path.join(FRONTEND_DIR, 'services', 'api', 'apiService.ts'),
    path.join(FRONTEND_DIR, 'services', 'api', 'baseApiService.ts'),
    path.join(FRONTEND_DIR, 'services', 'api', 'client.ts')
  ];

  const existingFiles = apiFiles.filter(fileExists);
  const issues = [];

  if (existingFiles.length > 1) {
    issues.push({
      type: 'warning',
      message: `发现 ${existingFiles.length} 个 API 客户端文件,应该只有一个统一的客户端`,
      files: existingFiles,
      suggestion: '统一使用 services/api/client.ts 作为唯一的 API 客户端'
    });
  }

  if (!existingFiles.includes(path.join(FRONTEND_DIR, 'services', 'api', 'client.ts'))) {
    issues.push({
      type: 'error',
      message: '缺少统一的 API 客户端',
      suggestion: '创建 services/api/client.ts 作为唯一的 API 客户端'
    });
  }

  return { passed: issues.length === 0, issues };
}

/**
 * 检查2: 组件中的直接API调用
 */
function checkComponentApiCalls() {
  log('\n📋 检查组件中的直接 API 调用...', 'cyan');
  
  const componentFiles = findFiles(
    path.join(FRONTEND_DIR, 'components'),
    /\.(tsx|ts|jsx|js)$/
  );

  const issues = [];
  const badPatterns = [
    /fetch\s*\(/,
    /axios\.(get|post|put|delete|patch)/,
    /\.then\s*\(/,
    /\/api\//
  ];

  componentFiles.forEach(file => {
    const content = readFile(file);
    const relativePath = path.relative(FRONTEND_DIR, file);

    badPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push({
          type: 'warning',
          file: relativePath,
          message: '组件中发现直接的 API 调用',
          suggestion: '使用自定义 Hook 或 Service 层封装 API 调用'
        });
      }
    });
  });

  return { passed: issues.length === 0, issues };
}

/**
 * 检查3: Repository层是否存在
 */
function checkRepositoryLayer() {
  log('\n📋 检查 Repository 层...', 'cyan');
  
  const repositoryDir = path.join(FRONTEND_DIR, 'services', 'repository');
  const issues = [];

  if (!fs.existsSync(repositoryDir)) {
    issues.push({
      type: 'error',
      message: '缺少 Repository 层',
      suggestion: '创建 services/repository 目录并实现数据访问层'
    });
  } else {
    const repositories = fs.readdirSync(repositoryDir).filter(f => 
      f.endsWith('Repository.ts') || f.endsWith('Repository.js')
    );

    if (repositories.length === 0) {
      issues.push({
        type: 'warning',
        message: 'Repository 目录存在但没有 Repository 文件',
        suggestion: '为每个资源创建对应的 Repository'
      });
    }
  }

  return { passed: issues.length === 0, issues };
}

/**
 * 检查4: 业务服务层结构
 */
function checkBusinessServiceLayer() {
  log('\n📋 检查业务服务层...', 'cyan');
  
  const businessDir = path.join(FRONTEND_DIR, 'services', 'business');
  const servicesDir = path.join(FRONTEND_DIR, 'services');
  const issues = [];

  // 检查是否有 business 目录
  if (!fs.existsSync(businessDir)) {
    issues.push({
      type: 'warning',
      message: '缺少 services/business 目录',
      suggestion: '创建 business 目录来组织业务逻辑'
    });
  }

  // 检查 services 目录下是否有太多零散的服务文件
  if (fs.existsSync(servicesDir)) {
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => 
      f.endsWith('Service.ts') || f.endsWith('Service.js')
    );

    if (serviceFiles.length > 5) {
      issues.push({
        type: 'warning',
        message: `services 目录下有 ${serviceFiles.length} 个服务文件,建议归类`,
        files: serviceFiles.slice(0, 10),
        suggestion: '将服务文件按功能分类到 business、auth、data 等子目录'
      });
    }
  }

  return { passed: issues.length === 0, issues };
}

/**
 * 检查5: 后端路由规范
 */
function checkBackendRoutes() {
  log('\n📋 检查后端路由规范...', 'cyan');
  
  const routesDir = path.join(BACKEND_DIR, 'routes');
  const issues = [];

  if (!fs.existsSync(routesDir)) {
    issues.push({
      type: 'error',
      message: '缺少 routes 目录',
      suggestion: '创建统一的路由目录'
    });
    return { passed: false, issues };
  }

  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  // 检查是否有路由索引文件
  if (!routeFiles.includes('index.js')) {
    issues.push({
      type: 'warning',
      message: '缺少路由索引文件',
      suggestion: '创建 routes/index.js 统一管理所有路由'
    });
  }

  return { passed: issues.length === 0, issues };
}

/**
 * 检查6: 类型定义统一性
 */
function checkTypeDefinitions() {
  log('\n📋 检查类型定义统一性...', 'cyan');
  
  const typesDir = path.join(FRONTEND_DIR, 'types');
  const issues = [];

  if (!fs.existsSync(typesDir)) {
    issues.push({
      type: 'error',
      message: '缺少统一的 types 目录',
      suggestion: '创建 types 目录统一管理 TypeScript 类型定义'
    });
    return { passed: false, issues };
  }

  // 检查是否有重复的类型文件
  const typeFiles = findFiles(typesDir, /\.types\.ts$/);
  const unifiedDir = path.join(typesDir, 'unified');

  if (fs.existsSync(unifiedDir)) {
    const unifiedFiles = fs.readdirSync(unifiedDir);
    
    if (unifiedFiles.length > 0 && typeFiles.length > unifiedFiles.length) {
      issues.push({
        type: 'warning',
        message: '存在 unified 目录和零散的类型文件',
        suggestion: '统一类型定义,避免分散管理'
      });
    }
  }

  return { passed: issues.length === 0, issues };
}

/**
 * 生成报告
 */
function generateReport(results) {
  log('\n' + '='.repeat(80), 'cyan');
  log('📊 架构规范检查报告', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;

  Object.entries(results).forEach(([check, result]) => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    
    log(`${status} ${check}`, color);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        const issueColor = issue.type === 'error' ? 'red' : 'yellow';
        
        log(`  ${icon} ${issue.message}`, issueColor);
        
        if (issue.files) {
          issue.files.slice(0, 3).forEach(file => {
            log(`     - ${file}`, 'yellow');
          });
          if (issue.files.length > 3) {
            log(`     ... 还有 ${issue.files.length - 3} 个文件`, 'yellow');
          }
        }
        
        if (issue.file) {
          log(`     文件: ${issue.file}`, 'yellow');
        }
        
        log(`     💡 建议: ${issue.suggestion}`, 'blue');
        
        totalIssues++;
        if (issue.type === 'error') errorCount++;
        else warningCount++;
      });
    }
  });

  log('\n' + '='.repeat(80), 'cyan');
  log(`总计: ${errorCount} 个错误, ${warningCount} 个警告`, 
    errorCount > 0 ? 'red' : warningCount > 0 ? 'yellow' : 'green');
  
  if (totalIssues === 0) {
    log('\n🎉 项目架构符合规范!', 'green');
  } else {
    log('\n📝 请参考建议进行改进', 'yellow');
    log('详细文档: docs/ARCHITECTURE_STANDARDS.md', 'cyan');
  }

  return { totalIssues, errorCount, warningCount };
}

/**
 * 主函数
 */
function main() {
  log('\n' + '='.repeat(80), 'cyan');
  log('🔍 项目架构规范检查工具', 'cyan');
  log('='.repeat(80), 'cyan');

  const checks = {
    'API 客户端统一性': checkApiClientUnification(),
    '组件 API 调用检查': checkComponentApiCalls(),
    'Repository 层检查': checkRepositoryLayer(),
    '业务服务层检查': checkBusinessServiceLayer(),
    '后端路由规范': checkBackendRoutes(),
    '类型定义统一性': checkTypeDefinitions()
  };

  const summary = generateReport(checks);

  // 返回退出码
  process.exit(summary.errorCount > 0 ? 1 : 0);
}

main();
