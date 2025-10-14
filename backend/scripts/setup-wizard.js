#!/usr/bin/env node
/**
 * Test-Web-backend 快速启动配置向导
 * 帮助用户完成初始配置
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

// 询问问题的辅助函数
const question = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

// 生成随机密钥
const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

// 检查PostgreSQL是否安装
const checkPostgreSQL = async () => {
  try {
    await execPromise('psql --version');
    return true;
  } catch (error) {
    return false;
  }
};

// 检查数据库是否存在
const checkDatabase = async (config) => {
  try {
    const command = `psql -U ${config.DB_USER} -h ${config.DB_HOST} -p ${config.DB_PORT} -lqt | cut -d \\| -f 1 | grep -qw ${config.DB_NAME}`;
    await execPromise(command);
    return true;
  } catch (error) {
    return false;
  }
};

// 创建数据库
const createDatabase = async (config) => {
  try {
    const command = `psql -U ${config.DB_USER} -h ${config.DB_HOST} -p ${config.DB_PORT} -c "CREATE DATABASE ${config.DB_NAME};"`;
    await execPromise(command);
    return true;
  } catch (error) {
    log.error(`创建数据库失败: ${error.message}`);
    return false;
  }
};

// 主配置向导
const runWizard = async () => {
  console.clear();
  log.section('🚀 Test-Web-backend 快速启动配置向导');
  log.info('此向导将帮助您完成初始配置\n');

  const config = {};

  // 1. 基本配置
  log.section('📋 步骤 1/7: 基本配置');
  
  const nodeEnv = await question('运行环境 (development/production) [development]: ');
  config.NODE_ENV = nodeEnv || 'development';
  
  const port = await question('服务器端口 [3001]: ');
  config.PORT = port || '3001';
  
  const host = await question('服务器主机 [localhost]: ');
  config.HOST = host || 'localhost';

  // 2. 数据库配置
  log.section('🗄️  步骤 2/7: 数据库配置');
  
  const hasPostgres = await checkPostgreSQL();
  if (!hasPostgres) {
    log.warning('未检测到PostgreSQL，请确保已安装并运行');
    log.info('下载地址: https://www.postgresql.org/download/');
  }
  
  const dbHost = await question('数据库主机 [localhost]: ');
  config.DB_HOST = dbHost || 'localhost';
  
  const dbPort = await question('数据库端口 [5432]: ');
  config.DB_PORT = dbPort || '5432';
  
  const dbName = await question(`数据库名称 [testweb_${config.NODE_ENV}]: `);
  config.DB_NAME = dbName || `testweb_${config.NODE_ENV}`;
  
  const dbUser = await question('数据库用户 [postgres]: ');
  config.DB_USER = dbUser || 'postgres';
  
  const dbPassword = await question('数据库密码: ');
  config.DB_PASSWORD = dbPassword || 'postgres';

  // 3. JWT配置
  log.section('🔐 步骤 3/7: JWT认证配置');
  
  const useRandomSecret = await question('是否自动生成JWT密钥? (y/n) [y]: ');
  if (useRandomSecret.toLowerCase() !== 'n') {
    config.JWT_SECRET = generateSecret();
    log.success('已生成随机JWT密钥');
  } else {
    const jwtSecret = await question('JWT密钥 (建议至少32位): ');
    config.JWT_SECRET = jwtSecret || generateSecret();
  }
  
  const jwtExpires = await question('Access Token过期时间 [24h]: ');
  config.JWT_EXPIRES_IN = jwtExpires || '24h';
  
  const jwtRefreshExpires = await question('Refresh Token过期时间 [7d]: ');
  config.JWT_REFRESH_EXPIRES_IN = jwtRefreshExpires || '7d';

  // 4. CORS配置
  log.section('🌐 步骤 4/7: CORS跨域配置');
  
  const corsOrigin = await question('允许的前端地址 (多个用逗号分隔) [http://localhost:5174]: ');
  config.CORS_ORIGIN = corsOrigin || 'http://localhost:5174,http://localhost:3000';

  // 5. 安全配置
  log.section('🔒 步骤 5/7: 安全配置');
  
  const bcryptRounds = await question('密码加密强度 (10-15) [12]: ');
  config.BCRYPT_ROUNDS = bcryptRounds || '12';
  
  const maxLoginAttempts = await question('最大登录尝试次数 [5]: ');
  config.MAX_LOGIN_ATTEMPTS = maxLoginAttempts || '5';
  
  const lockoutDuration = await question('账户锁定时长(秒) [900]: ');
  config.LOCKOUT_DURATION = lockoutDuration || '900000';

  // 6. 可选服务
  log.section('⚙️  步骤 6/7: 可选服务配置');
  
  const useRedis = await question('是否使用Redis缓存? (y/n) [n]: ');
  if (useRedis.toLowerCase() === 'y') {
    const redisHost = await question('Redis主机 [localhost]: ');
    config.REDIS_HOST = redisHost || 'localhost';
    
    const redisPort = await question('Redis端口 [6379]: ');
    config.REDIS_PORT = redisPort || '6379';
  }
  
  const useSMTP = await question('是否配置SMTP邮件服务? (y/n) [n]: ');
  if (useSMTP.toLowerCase() === 'y') {
    config.SMTP_HOST = await question('SMTP主机: ');
    config.SMTP_PORT = await question('SMTP端口 [587]: ') || '587';
    config.SMTP_USER = await question('SMTP用户: ');
    config.SMTP_PASS = await question('SMTP密码: ');
  }

  // 7. 确认配置
  log.section('✅ 步骤 7/7: 确认配置');
  
  console.log('\n配置摘要:');
  console.log(`  环境: ${config.NODE_ENV}`);
  console.log(`  服务器: http://${config.HOST}:${config.PORT}`);
  console.log(`  数据库: ${config.DB_USER}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`);
  console.log(`  CORS: ${config.CORS_ORIGIN}`);
  console.log(`  Redis: ${config.REDIS_HOST ? '已配置' : '未配置'}`);
  console.log(`  SMTP: ${config.SMTP_HOST ? '已配置' : '未配置'}\n`);
  
  const confirm = await question('确认以上配置并继续? (y/n) [y]: ');
  if (confirm.toLowerCase() === 'n') {
    log.warning('配置已取消');
    rl.close();
    return;
  }

  // 生成.env文件
  log.section('📝 生成配置文件');
  
  const envPath = path.join(__dirname, '../.env');
  let envContent = `# ==========================================
# Test-Web-backend 环境配置
# 由配置向导自动生成于 ${new Date().toISOString()}
# ==========================================

# 基本配置
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}
HOST=${config.HOST}

# 数据库配置
DB_HOST=${config.DB_HOST}
DB_PORT=${config.DB_PORT}
DB_NAME=${config.DB_NAME}
DB_USER=${config.DB_USER}
DB_PASSWORD=${config.DB_PASSWORD}

# JWT配置
JWT_SECRET=${config.JWT_SECRET}
JWT_EXPIRES_IN=${config.JWT_EXPIRES_IN}
JWT_REFRESH_EXPIRES_IN=${config.JWT_REFRESH_EXPIRES_IN}

# CORS配置
CORS_ORIGIN=${config.CORS_ORIGIN}

# 安全配置
BCRYPT_ROUNDS=${config.BCRYPT_ROUNDS}
MAX_LOGIN_ATTEMPTS=${config.MAX_LOGIN_ATTEMPTS}
LOCKOUT_DURATION=${config.LOCKOUT_DURATION}

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
`;

  if (config.REDIS_HOST) {
    envContent += `\n# Redis配置
REDIS_HOST=${config.REDIS_HOST}
REDIS_PORT=${config.REDIS_PORT}
REDIS_PASSWORD=
REDIS_DB=0
`;
  }

  if (config.SMTP_HOST) {
    envContent += `\n# SMTP邮件配置
SMTP_HOST=${config.SMTP_HOST}
SMTP_PORT=${config.SMTP_PORT}
SMTP_USER=${config.SMTP_USER}
SMTP_PASS=${config.SMTP_PASS}
SMTP_SECURE=false
EMAIL_FROM=noreply@testweb.com
`;
  }

  try {
    fs.writeFileSync(envPath, envContent);
    log.success(`配置文件已生成: ${envPath}`);
  } catch (error) {
    log.error(`生成配置文件失败: ${error.message}`);
    rl.close();
    return;
  }

  // 初始化数据库
  log.section('🗄️  初始化数据库');
  
  const initDB = await question('是否立即初始化数据库? (y/n) [y]: ');
  if (initDB.toLowerCase() !== 'n') {
    log.info('检查数据库是否存在...');
    const dbExists = await checkDatabase(config);
    
    if (!dbExists) {
      log.info(`创建数据库 ${config.DB_NAME}...`);
      const created = await createDatabase(config);
      if (!created) {
        log.warning('数据库创建失败，请手动创建数据库后运行: npm run db:init');
      }
    } else {
      log.success('数据库已存在');
    }
    
    log.info('初始化数据库表结构...');
    try {
      await execPromise('npm run db:init', { cwd: path.join(__dirname, '..') });
      log.success('数据库初始化完成');
    } catch (error) {
      log.error('数据库初始化失败，请手动运行: npm run db:init');
    }
  }

  // 完成
  log.section('🎉 配置完成!');
  
  console.log('\n下一步:');
  console.log(`  1. 启动服务: ${colors.cyan}npm run dev${colors.reset}`);
  console.log(`  2. 访问API: ${colors.cyan}http://${config.HOST}:${config.PORT}${colors.reset}`);
  console.log(`  3. 查看文档: ${colors.cyan}http://${config.HOST}:${config.PORT}/api-docs${colors.reset}`);
  console.log(`  4. 运行测试: ${colors.cyan}npm test${colors.reset}\n`);
  
  log.info('更多信息请查看: PROJECT_READINESS_ASSESSMENT.md');
  
  rl.close();
};

// 错误处理
process.on('SIGINT', () => {
  console.log('\n\n配置已取消');
  rl.close();
  process.exit(0);
});

// 运行向导
runWizard().catch(error => {
  log.error(`配置失败: ${error.message}`);
  rl.close();
  process.exit(1);
});

