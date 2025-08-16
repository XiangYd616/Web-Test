#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class AsyncErrorHandlerFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
    this.totalFixes = 0;
    this.asyncPatterns = [];
  }

  /**
   * 执行异步错误处理修复
   */
  async execute() {
    console.log('🔧 开始修复异步操作错误处理...\n');

    try {
      // 1. 扫描所有需要修复的文件
      const files = this.getProjectFiles();
      
      // 2. 分析每个文件的异步操作
      for (const file of files) {
        await this.analyzeAndFixFile(file);
      }

      // 3. 创建统一的错误处理工具
      await this.createErrorHandlingUtils();

      // 4. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 异步错误处理修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 分析并修复单个文件
   */
  async analyzeAndFixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fixes = 0;

      // 检查是否有异步操作
      const hasAsyncOperations = this.hasAsyncOperations(content);
      if (!hasAsyncOperations) {
        return;
      }

      // 检查是否已有错误处理
      const hasErrorHandling = this.hasErrorHandling(content);
      if (hasErrorHandling) {
        return;
      }

      // 修复模式1: 未包装的async函数
      const asyncFunctionPattern = /async\s+function\s+(\w+)\s*\([^)]*\)\s*{([^}]+)}/g;
      newContent = newContent.replace(asyncFunctionPattern, (match, funcName, body) => {
        if (!body.includes('try') && !body.includes('catch')) {
          fixes++;
          return `async function ${funcName}() {
  try {${body}
  } catch (error) {
    console.error('Error in ${funcName}:', error);
    throw error;
  }
}`;
        }
        return match;
      });

      // 修复模式2: 未包装的箭头函数
      const asyncArrowPattern = /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*{([^}]+)}/g;
      newContent = newContent.replace(asyncArrowPattern, (match, funcName, body) => {
        if (!body.includes('try') && !body.includes('catch')) {
          fixes++;
          return `const ${funcName} = async () => {
  try {${body}
  } catch (error) {
    console.error('Error in ${funcName}:', error);
    throw error;
  }
}`;
        }
        return match;
      });

      // 修复模式3: 未处理的Promise
      const promisePattern = /(\w+)\.then\(([^)]+)\)(?!\s*\.catch)/g;
      newContent = newContent.replace(promisePattern, (match, promiseVar, thenCallback) => {
        fixes++;
        return `${promiseVar}.then(${thenCallback}).catch(error => {
  console.error('Promise error:', error);
  throw error;
})`;
      });

      // 修复模式4: 未处理的await调用
      const awaitPattern = /(?<!try\s*{\s*)await\s+([^;]+);/g;
      newContent = newContent.replace(awaitPattern, (match, awaitExpression) => {
        // 检查是否已经在try块中
        const beforeMatch = newContent.substring(0, newContent.indexOf(match));
        const lastTryIndex = beforeMatch.lastIndexOf('try {');
        const lastCatchIndex = beforeMatch.lastIndexOf('} catch');
        
        if (lastTryIndex > lastCatchIndex) {
          return match; // 已经在try块中
        }
        
        fixes++;
        return `try {
  await ${awaitExpression};
} catch (error) {
  console.error('Await error:', error);
  throw error;
}`;
      });

      // 如果有修复，写入文件
      if (fixes > 0) {
        // 添加错误处理工具导入
        if (!content.includes('errorHandler') && !content.includes('handleError')) {
          const importStatement = this.getErrorHandlerImport(filePath);
          newContent = importStatement + '\n' + newContent;
        }

        fs.writeFileSync(filePath, newContent);
        this.fixedFiles.push({
          file: path.relative(this.projectRoot, filePath),
          fixes,
          patterns: this.getAsyncPatterns(content)
        });
        this.totalFixes += fixes;
        console.log(`✅ 修复 ${path.relative(this.projectRoot, filePath)}: ${fixes} 处异步错误处理`);
      }

    } catch (error) {
      console.log(`❌ 修复文件失败: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 检查是否有异步操作
   */
  hasAsyncOperations(content) {
    return content.includes('async ') || 
           content.includes('await ') || 
           content.includes('.then(') || 
           content.includes('Promise') ||
           content.includes('setTimeout') ||
           content.includes('setInterval');
  }

  /**
   * 检查是否有错误处理
   */
  hasErrorHandling(content) {
    return content.includes('try {') || 
           content.includes('catch (') || 
           content.includes('.catch(') ||
           content.includes('handleError') ||
           content.includes('errorHandler');
  }

  /**
   * 获取异步模式
   */
  getAsyncPatterns(content) {
    const patterns = [];
    if (content.includes('async function')) patterns.push('async-function');
    if (content.includes('async (') || content.includes('async()')) patterns.push('async-arrow');
    if (content.includes('await ')) patterns.push('await');
    if (content.includes('.then(')) patterns.push('promise-then');
    if (content.includes('Promise.')) patterns.push('promise-static');
    if (content.includes('setTimeout')) patterns.push('timeout');
    return patterns;
  }

  /**
   * 获取错误处理工具导入语句
   */
  getErrorHandlerImport(filePath) {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isFrontend = filePath.includes('frontend');
    const isBackend = filePath.includes('backend');

    if (isFrontend) {
      return isTypeScript ? 
        "import { handleAsyncError } from '../utils/errorHandler';" :
        "const { handleAsyncError } = require('../utils/errorHandler');";
    } else if (isBackend) {
      return isTypeScript ?
        "import { handleAsyncError } from '../utils/errorHandler';" :
        "const { handleAsyncError } = require('../utils/errorHandler');";
    }
    
    return '';
  }

  /**
   * 创建统一的错误处理工具
   */
  async createErrorHandlingUtils() {
    console.log('🛠️ 创建统一的错误处理工具...');

    // 创建前端错误处理工具
    await this.createFrontendErrorHandler();
    
    // 创建后端错误处理工具
    await this.createBackendErrorHandler();

    console.log('   ✅ 错误处理工具创建完成\n');
  }

  /**
   * 创建前端错误处理工具
   */
  async createFrontendErrorHandler() {
    const frontendUtilsDir = path.join(this.projectRoot, 'frontend/utils');
    if (!fs.existsSync(frontendUtilsDir)) {
      fs.mkdirSync(frontendUtilsDir, { recursive: true });
    }

    const errorHandlerPath = path.join(frontendUtilsDir, 'errorHandler.ts');
    const errorHandlerContent = `/**
 * 前端统一异步错误处理工具
 * 版本: v2.0.0
 */

import { errorService } from '../services/errorService';

export interface AsyncErrorOptions {
  context?: string;
  showNotification?: boolean;
  logError?: boolean;
  retryable?: boolean;
}

/**
 * 包装异步操作，提供统一的错误处理
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  options: AsyncErrorOptions = {}
): Promise<T | null> {
  const {
    context = 'Unknown operation',
    showNotification = true,
    logError = true,
    retryable = false
  } = options;

  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (logError) {
      console.error(\`[\${context}] Error:\`, error);
    }

    // 使用错误服务处理
    errorService.handleError(error, { context, retryable });

    if (showNotification) {
      // 这里可以集成通知系统
      console.warn(\`操作失败: \${errorMessage}\`);
    }

    return null;
  }
}

/**
 * 创建带错误处理的异步函数装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: AsyncErrorOptions = {}
): T {
  return (async (...args: any[]) => {
    return handleAsyncError(() => fn(...args), options);
  }) as T;
}

/**
 * Promise错误处理包装器
 */
export function catchPromiseError<T>(
  promise: Promise<T>,
  context?: string
): Promise<T | null> {
  return promise.catch(error => {
    console.error(\`[\${context || 'Promise'}] Error:\`, error);
    errorService.handleError(error, { context });
    return null;
  });
}
`;

    fs.writeFileSync(errorHandlerPath, errorHandlerContent);
  }

  /**
   * 创建后端错误处理工具
   */
  async createBackendErrorHandler() {
    const backendUtilsDir = path.join(this.projectRoot, 'backend/utils');
    if (!fs.existsSync(backendUtilsDir)) {
      fs.mkdirSync(backendUtilsDir, { recursive: true });
    }

    const errorHandlerPath = path.join(backendUtilsDir, 'asyncErrorHandler.js');
    const errorHandlerContent = `/**
 * 后端统一异步错误处理工具
 * 版本: v2.0.0
 */

const { createErrorResponse, StandardErrorCode } = require('../../shared/utils/apiResponseBuilder.js');

/**
 * 包装异步操作，提供统一的错误处理
 */
async function handleAsyncError(operation, options = {}) {
  const {
    context = 'Unknown operation',
    logError = true,
    throwError = true
  } = options;

  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.error(\`[\${context}] Error:\`, error);
    }

    // 记录错误到日志系统
    // TODO: 集成日志系统

    if (throwError) {
      throw error;
    }

    return null;
  }
}

/**
 * Express路由错误处理包装器
 */
function asyncRouteHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Route handler error:', error);
      
      // 使用统一的错误响应格式
      if (!res.headersSent) {
        return res.error(
          StandardErrorCode.INTERNAL_SERVER_ERROR,
          error.message,
          { stack: error.stack }
        );
      }
      
      next(error);
    }
  };
}

/**
 * 数据库操作错误处理包装器
 */
async function handleDatabaseError(operation, context = 'Database operation') {
  try {
    return await operation();
  } catch (error) {
    console.error(\`[\${context}] Database error:\`, error);
    
    // 根据错误类型返回不同的错误代码
    if (error.code === '23505') {
      throw new Error('Duplicate entry');
    } else if (error.code === '23503') {
      throw new Error('Foreign key constraint violation');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Database connection failed');
    }
    
    throw error;
  }
}

module.exports = {
  handleAsyncError,
  asyncRouteHandler,
  handleDatabaseError
};
`;

    fs.writeFileSync(errorHandlerPath, errorHandlerContent);
  }

  /**
   * 获取所有项目文件
   */
  getProjectFiles() {
    const files = [];
    const dirs = [
      path.join(this.projectRoot, 'frontend'),
      path.join(this.projectRoot, 'backend')
    ];

    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        this.walkDir(dir, files);
      }
    }

    return files;
  }

  /**
   * 递归遍历目录
   */
  walkDir(dir, files) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (this.shouldSkipDirectory(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.walkDir(fullPath, files);
        } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup',
      'utils' // 跳过utils目录，避免修改我们刚创建的错误处理工具
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'async-error-handling-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.fixedFiles.length,
        totalFixes: this.totalFixes,
        categories: {
          async_functions: this.fixedFiles.filter(f => f.patterns.includes('async-function')).length,
          async_arrows: this.fixedFiles.filter(f => f.patterns.includes('async-arrow')).length,
          await_calls: this.fixedFiles.filter(f => f.patterns.includes('await')).length,
          promise_chains: this.fixedFiles.filter(f => f.patterns.includes('promise-then')).length,
          timeouts: this.fixedFiles.filter(f => f.patterns.includes('timeout')).length
        }
      },
      fixedFiles: this.fixedFiles,
      utilsCreated: [
        'frontend/utils/errorHandler.ts',
        'backend/utils/asyncErrorHandler.js'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 异步错误处理修复报告:');
    console.log(`   修复文件数: ${this.fixedFiles.length}`);
    console.log(`   总修复数: ${this.totalFixes}`);
    console.log(`   修复分类:`);
    console.log(`   - 异步函数: ${report.summary.categories.async_functions}`);
    console.log(`   - 箭头函数: ${report.summary.categories.async_arrows}`);
    console.log(`   - await调用: ${report.summary.categories.await_calls}`);
    console.log(`   - Promise链: ${report.summary.categories.promise_chains}`);
    console.log(`   - 定时器: ${report.summary.categories.timeouts}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.fixedFiles.length > 0) {
      console.log('📋 修复详情:');
      this.fixedFiles.forEach(({ file, fixes, patterns }) => {
        console.log(`   ${file}: ${fixes} 处修复 (${patterns.join(', ')})`);
      });
    }
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new AsyncErrorHandlerFixer();
  fixer.execute().catch(error => {
    console.error('❌ 异步错误处理修复失败:', error);
    process.exit(1);
  });
}

module.exports = AsyncErrorHandlerFixer;
