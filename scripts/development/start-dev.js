/**
 * 开发环境启动脚本
 * 自动初始化数据库、启动前后端服务
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 项目根目录
const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

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

function log(message, color = 'reset') {
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(50)}`, 'cyan');
}

/**
 * 检查Node.js和npm版本
 */
async function checkPrerequisites() {
  logSection('检查系统环境');
  
  return new Promise((resolve) => {
    exec('node --version', (error, stdout) => {
      if (error) {
        log('❌ Node.js 未安装', 'red');
        process.exit(1);
      } else {
        log(`✅ Node.js 版本: ${stdout.trim()}`, 'green');
      }
    });

    exec('npm --version', (error, stdout) => {
      if (error) {
        log('❌ npm 未安装', 'red');
        process.exit(1);
      } else {
        log(`✅ npm 版本: ${stdout.trim()}`, 'green');
        resolve();
      }
    });
  });
}

/**
 * 安装依赖
 */
async function installDependencies() {
  logSection('安装项目依赖');

  // 安装根目录依赖
  log('📦 安装根目录依赖...', 'yellow');
  await runCommand('npm install', rootDir);

  // 安装后端依赖
  log('📦 安装后端依赖...', 'yellow');
  await runCommand('npm install', backendDir);

  // 安装前端依赖
  log('📦 安装前端依赖...', 'yellow');
  await runCommand('npm install', frontendDir);

  log('✅ 所有依赖安装完成', 'green');
}

/**
 * 初始化数据库
 */
async function initializeDatabase() {
  logSection('初始化数据库');
  
  try {
    log('🗄️ 正在初始化数据库...', 'yellow');
    await runCommand('node scripts/initDatabase.js', backendDir);
    log('✅ 数据库初始化完成', 'green');
  } catch (error) {
    log('❌ 数据库初始化失败', 'red');
    console.error(error);
  }
}

/**
 * 启动开发服务器
 */
async function startDevelopmentServers() {
  logSection('启动开发服务器');

  // 启动后端服务器
  log('🚀 启动后端服务器...', 'yellow');
  const backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    log(`[后端] ${data.toString().trim()}`, 'blue');
  });

  backendProcess.stderr.on('data', (data) => {
    log(`[后端错误] ${data.toString().trim()}`, 'red');
  });

  // 等待后端启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 启动前端服务器
  log('🚀 启动前端服务器...', 'yellow');
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  frontendProcess.stdout.on('data', (data) => {
    log(`[前端] ${data.toString().trim()}`, 'magenta');
  });

  frontendProcess.stderr.on('data', (data) => {
    log(`[前端错误] ${data.toString().trim()}`, 'red');
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    log('\n🛑 正在关闭服务器...', 'yellow');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });

  // 显示启动信息
  setTimeout(() => {
    logSection('服务器启动完成');
    log('🎉 开发环境已启动!', 'green');
    log('', 'reset');
    log('📱 前端地址: http://localhost:5174', 'cyan');
    log('🔧 后端地址: http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}', 'cyan');
    log('📊 API文档: http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api-docs', 'cyan');
    log('', 'reset');
    log('按 Ctrl+C 停止服务器', 'yellow');
  }, 5000);
}

/**
 * 运行命令
 */
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        if (stdout) log(stdout.trim(), 'reset');
        if (stderr) log(stderr.trim(), 'yellow');
        resolve();
      }
    });
  });
}

/**
 * 检查端口是否被占用
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // 端口可用
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // 端口被占用
    });
  });
}

/**
 * 检查必要的端口
 */
async function checkPorts() {
  logSection('检查端口可用性');
  
  const ports = [3001, 5174];
  
  for (const port of ports) {
    const available = await checkPort(port);
    if (available) {
      log(`✅ 端口 ${port} 可用`, 'green');
    } else {
      log(`⚠️ 端口 ${port} 被占用`, 'yellow');
    }
  }
}

/**
 * 创建必要的目录
 */
function createDirectories() {
  logSection('创建必要目录');
  
  const directories = [
    path.join(backendDir, 'data'),
    path.join(backendDir, 'logs'),
    path.join(backendDir, 'uploads'),
    path.join(rootDir, 'reports'),
    path.join(rootDir, 'backup')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ 创建目录: ${dir}`, 'green');
    } else {
      log(`📁 目录已存在: ${dir}`, 'blue');
    }
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    log('🚀 Test-Web 开发环境启动器', 'cyan');
    log('', 'reset');

    await checkPrerequisites();
    await checkPorts();
    createDirectories();
    
    // 检查是否需要安装依赖
    const needInstall = !fs.existsSync(path.join(backendDir, 'node_modules')) || 
                       !fs.existsSync(path.join(frontendDir, 'node_modules'));
    
    if (needInstall) {
      await installDependencies();
    } else {
      log('✅ 依赖已安装，跳过安装步骤', 'green');
    }

    await initializeDatabase();
    await startDevelopmentServers();

  } catch (error) {
    log('❌ 启动失败:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkPrerequisites,
  installDependencies,
  initializeDatabase,
  startDevelopmentServers
};
