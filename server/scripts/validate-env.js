/**
 * 环境变量验证脚本
 * 检查必要的环境变量是否正确配置
 */

// 加载后端环境变量配置
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

const recommendedVars = [
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'BCRYPT_ROUNDS',
  'LOG_LEVEL'
];

const securityChecks = [
  {
    name: 'JWT_SECRET',
    check: (value) => value && value.length >= 32,
    message: 'JWT_SECRET应该至少32个字符长度以确保安全性'
  },
  {
    name: 'DB_PASSWORD',
    check: (value) => value && value !== 'postgres' && value !== 'password',
    message: '数据库密码不应使用默认值，请设置强密码'
  },
  {
    name: 'NODE_ENV',
    check: (value) => ['development', 'production', 'test'].includes(value),
    message: 'NODE_ENV应该是development、production或test之一'
  }
];

function validateEnvironment() {
  console.log('🔍 验证环境变量配置...\n');

  let hasErrors = false;
  let hasWarnings = false;

  // 检查必需的环境变量
  console.log('📋 检查必需的环境变量:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: 已设置`);
    }
  });

  // 检查推荐的环境变量
  console.log('\n📋 检查推荐的环境变量:');
  recommendedVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`⚠️  ${varName}: 未设置 (使用默认值)`);
      hasWarnings = true;
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  });

  // 安全性检查
  console.log('\n🔒 安全性检查:');
  securityChecks.forEach(check => {
    const value = process.env[check.name];
    if (!check.check(value)) {
      console.log(`⚠️  ${check.name}: ${check.message}`);
      hasWarnings = true;
    } else {
      console.log(`✅ ${check.name}: 通过安全检查`);
    }
  });

  // 数据库连接测试
  console.log('\n🗄️  数据库配置:');
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER
  };

  Object.entries(dbConfig).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  // CORS配置检查
  console.log('\n🌐 CORS配置:');
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map(o => o.trim());
    console.log(`   允许的源: ${origins.join(', ')}`);
  } else {
    console.log('   使用默认CORS配置');
  }

  // 速率限制配置
  console.log('\n⏱️  速率限制配置:');
  console.log(`   通用限制: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100}请求/${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 60000}分钟`);
  console.log(`   登录限制: ${process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5}次/${(parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 900000) / 60000}分钟`);
  console.log(`   注册限制: ${process.env.REGISTER_RATE_LIMIT_MAX_ATTEMPTS || 3}次/${(parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS) || 3600000) / 60000}分钟`);

  // 文件上传配置
  console.log('\n📁 文件上传配置:');
  console.log(`   最大文件大小: ${process.env.MAX_FILE_SIZE || '50mb'}`);
  console.log(`   上传目录: ${process.env.UPLOAD_DIR || 'uploads'}`);
  console.log(`   临时目录: ${process.env.TEMP_DIR || 'temp'}`);

  // 日志配置
  console.log('\n📝 日志配置:');
  console.log(`   日志级别: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`   日志目录: ${process.env.LOG_DIR || 'logs'}`);

  // 总结
  console.log('\n📊 验证总结:');
  if (hasErrors) {
    console.log('❌ 发现错误: 有必需的环境变量未设置');
    console.log('请检查.env文件并设置所有必需的变量');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  发现警告: 建议检查并优化配置');
    console.log('应用可以运行，但建议完善配置以提高安全性');
  } else {
    console.log('✅ 所有检查通过: 环境配置良好');
  }

  console.log('\n💡 提示:');
  console.log('- 生产环境请确保使用强密码和安全的JWT密钥');
  console.log('- 定期检查和更新安全配置');
  console.log('- 监控日志文件以发现潜在问题');

  return !hasErrors;
}

// 如果直接运行此脚本
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };
