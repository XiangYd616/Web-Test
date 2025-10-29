#!/usr/bin/env node

/**
 * 启动脚本 - 包含依赖检测
 * 在启动应用前检查所有依赖项
 */

const path = require('path');
const { spawn } = require('child_process');

// 设置环境
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  console.log('\n');
  log('━'.repeat(60), 'cyan');
  log('  Test-Web Backend 启动检查', 'bright');
  log('━'.repeat(60), 'cyan');
  console.log('\n');

  // 1. 加载依赖检测器
  let dependencyChecker;
  try {
    dependencyChecker = require('../utils/dependencyChecker');
  } catch (error) {
    log('⚠️  依赖检测器加载失败，跳过检查...', 'yellow');
    log(`   错误: ${error.message}`, 'yellow');
    console.log('\n');
  }

  // 2. 执行依赖检查
  let checkResults = { corePassed: true };
  if (dependencyChecker) {
    try {
      checkResults = await dependencyChecker.checkAll();
    } catch (error) {
      log('⚠️  依赖检查过程中发生错误', 'yellow');
      log(`   ${error.message}`, 'yellow');
      console.log('\n');
    }
  }

  // 3. 根据检查结果决定是否启动
  if (!checkResults.corePassed) {
    log('❌ 核心依赖检查未通过，无法启动应用', 'red');
    log('\n📚 请参考以下文档解决问题:', 'yellow');
    log('   - DEPENDENCIES.md - 依赖安装指南', 'yellow');
    log('   - deploy/README.md - Docker 快速启动', 'yellow');
    log('', 'reset');
    
    // 提供快速修复建议
    if (checkResults.errors && checkResults.errors.length > 0) {
      log('💡 快速修复建议:', 'cyan');
      checkResults.errors.forEach(err => {
        if (err.includes('PostgreSQL')) {
          log('   1. 启动 PostgreSQL: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine', 'cyan');
        }
        if (err.includes('npm')) {
          log('   2. 安装依赖: npm install', 'cyan');
        }
      });
      console.log('');
    }
    
    process.exit(1);
  }

  // 4. 启动应用
  console.log('');
  log('━'.repeat(60), 'green');
  log('  🚀 启动 Test-Web Backend API Server', 'green');
  log('━'.repeat(60), 'green');
  console.log('\n');

  // 根据环境选择启动方式
  const isDev = process.env.NODE_ENV === 'development';
  const appPath = path.join(__dirname, '../src/app.js');
  
  let child;
  if (isDev && hasNodemon()) {
    // 开发模式使用 nodemon
    log('使用 nodemon 启动（热重载）', 'cyan');
    child = spawn('nodemon', [appPath], {
      stdio: 'inherit',
      shell: true
    });
  } else {
    // 生产模式使用 node
    log('使用 node 启动', 'cyan');
    child = spawn('node', [appPath], {
      stdio: 'inherit'
    });
  }

  // 处理退出
  child.on('exit', (code) => {
    if (code !== 0) {
      log(`\n❌ 应用异常退出，退出码: ${code}`, 'red');
    }
    process.exit(code);
  });

  // 处理信号
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      log(`\n收到 ${signal} 信号，正在关闭...`, 'yellow');
      child.kill(signal);
    });
  });
}

/**
 * 检查 nodemon 是否可用
 */
function hasNodemon() {
  try {
    require.resolve('nodemon');
    return true;
  } catch {
    return false;
  }
}

// 执行主函数
main().catch(error => {
  console.error('\n❌ 启动失败:', error);
  process.exit(1);
});

