/**
 * 配置中心迁移脚本
 * 将现有的硬编码配置迁移到统一配置中心
 */

const fs = require('fs');
const path = require('path');
const { configCenter } = require('../backend/config/ConfigCenter');

class ConfigMigrator {
  constructor() {
    this.migratedFiles = [];
    this.errors = [];
    this.warnings = [];
    this.backupDir = path.join(__dirname, '../backups/config-migration');
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    console.log('🚀 开始配置中心迁移...\n');

    try {
      // 创建备份目录
      this.createBackupDirectory();
      
      // 初始化配置中心
      await configCenter.initialize();
      
      // 迁移各个模块的配置
      await this.migrateAppConfig();
      await this.migrateDatabaseConfig();
      await this.migrateApiConfig();
      await this.migrateTestEngineConfig();
      await this.migrateSecurityConfig();
      await this.migrateStorageConfig();
      
      // 生成迁移报告
      this.generateMigrationReport();
      
      console.log('\n✅ 配置中心迁移完成！');
      
    } catch (error) {
      console.error('\n❌ 配置中心迁移失败:', error);
      throw error;
    }
  }

  /**
   * 创建备份目录
   */
  createBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}`);
    }
  }

  /**
   * 备份文件
   */
  backupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const fileName = path.basename(filePath);
        const backupPath = path.join(this.backupDir, `${fileName}.backup`);
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 备份文件: ${filePath} -> ${backupPath}`);
        return backupPath;
      }
    } catch (error) {
      this.warnings.push(`备份文件失败: ${filePath} - ${error.message}`);
    }
    return null;
  }

  /**
   * 迁移应用主配置
   */
  async migrateAppConfig() {
    console.log('🔧 迁移应用主配置...');
    
    const appPath = path.join(__dirname, '../backend/src/app.js');
    
    try {
      if (fs.existsSync(appPath)) {
        this.backupFile(appPath);
        
        let content = fs.readFileSync(appPath, 'utf8');
        
        // 替换硬编码的端口配置
        content = content.replace(
          /const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*\d+/g,
          "const PORT = configCenter.get('server.port')"
        );
        
        // 替换CORS配置
        content = content.replace(
          /const\s+corsOrigins\s*=\s*process\.env\.CORS_ORIGIN[\s\S]*?\];/g,
          "const corsOrigins = configCenter.get('security.corsOrigins');"
        );
        
        // 添加配置中心导入
        if (!content.includes('configCenter')) {
          const importLine = "const { configCenter } = require('../config/ConfigCenter');\n";
          content = content.replace(
            /(const\s+.*?require\(.*?\);?\n)/,
            `$1${importLine}`
          );
        }
        
        fs.writeFileSync(appPath, content);
        this.migratedFiles.push(appPath);
        console.log('✅ 应用主配置迁移完成');
      }
    } catch (error) {
      this.errors.push(`迁移应用配置失败: ${error.message}`);
    }
  }

  /**
   * 迁移数据库配置
   */
  async migrateDatabaseConfig() {
    console.log('🔧 迁移数据库配置...');
    
    const dbConfigPath = path.join(__dirname, '../backend/config/database.js');
    
    try {
      if (fs.existsSync(dbConfigPath)) {
        this.backupFile(dbConfigPath);
        
        const newDbConfig = `/**
 * 数据库配置 - 使用配置中心
 */

const { configCenter } = require('./ConfigCenter');

// 获取数据库配置
const getDatabaseConfig = () => {
  return {
    host: configCenter.get('database.host'),
    port: configCenter.get('database.port'),
    database: configCenter.get('database.name'),
    user: configCenter.get('database.user'),
    password: configCenter.get('database.password'),
    max: configCenter.get('database.maxConnections'),
    min: Math.floor(configCenter.get('database.maxConnections') / 4),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 60000,
    ssl: process.env.NODE_ENV === 'production'
  };
};

// 创建连接池
const { Pool } = require('pg');
let pool = null;

const createPool = () => {
  if (pool) {
    return pool;
  }

  const dbConfig = getDatabaseConfig();
  pool = new Pool(dbConfig);

  // 监听配置变更
  configCenter.watch('database.maxConnections', (newValue) => {
    console.log('🔄 数据库最大连接数配置已更新:', newValue);
    // 注意：连接池配置变更需要重新创建连接池
  });

  // 连接池事件监听
  pool.on('error', (err) => {
    console.error('❌ 数据库连接池错误:', err);
  });

  pool.on('connect', (client) => {
    if (configCenter.get('logging.level') === 'debug') {
      console.log('📥 获取数据库连接');
    }
  });

  pool.on('remove', (client) => {
    console.log('🔌 数据库连接已移除');
  });

  return pool;
};

/**
 * 连接数据库
 */
const connectDB = async () => {
  try {
    const dbPool = createPool();
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    const dbConfig = getDatabaseConfig();
    console.log(\`✅ 数据库连接成功: \${dbConfig.host}:\${dbConfig.port}/\${dbConfig.database}\`);

    return dbPool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
};

module.exports = {
  createPool,
  connectDB,
  getDatabaseConfig
};`;
        
        fs.writeFileSync(dbConfigPath, newDbConfig);
        this.migratedFiles.push(dbConfigPath);
        console.log('✅ 数据库配置迁移完成');
      }
    } catch (error) {
      this.errors.push(`迁移数据库配置失败: ${error.message}`);
    }
  }

  /**
   * 迁移前端API配置
   */
  async migrateApiConfig() {
    console.log('🔧 迁移前端API配置...');
    
    const apiConfigPath = path.join(__dirname, '../frontend/config/api.ts');
    
    try {
      if (fs.existsSync(apiConfigPath)) {
        this.backupFile(apiConfigPath);
        
        let content = fs.readFileSync(apiConfigPath, 'utf8');
        
        // 添加配置获取函数
        const configFunction = `
// 从后端获取配置
const getBackendConfig = async () => {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const data = await response.json();
      return data.data.configs;
    }
  } catch (error) {
    console.warn('获取后端配置失败，使用默认配置:', error);
  }
  return {};
};

// 缓存配置
let cachedConfig: any = null;

// 获取配置值
const getConfigValue = async (key: string, defaultValue: any) => {
  if (!cachedConfig) {
    cachedConfig = await getBackendConfig();
  }
  return cachedConfig[key] || defaultValue;
};
`;
        
        // 在文件开头添加配置函数
        content = configFunction + '\n' + content;
        
        fs.writeFileSync(apiConfigPath, content);
        this.migratedFiles.push(apiConfigPath);
        console.log('✅ 前端API配置迁移完成');
      }
    } catch (error) {
      this.errors.push(`迁移前端API配置失败: ${error.message}`);
    }
  }

  /**
   * 迁移测试引擎配置
   */
  async migrateTestEngineConfig() {
    console.log('🔧 迁移测试引擎配置...');
    
    const engineManagerPath = path.join(__dirname, '../backend/engines/core/EnhancedTestEngineManager.js');
    
    try {
      if (fs.existsSync(engineManagerPath)) {
        this.backupFile(engineManagerPath);
        
        let content = fs.readFileSync(engineManagerPath, 'utf8');
        
        // 添加配置中心导入
        if (!content.includes('configCenter')) {
          content = content.replace(
            /(const.*?require.*?;?\n)/,
            `$1const { configCenter } = require('../../config/ConfigCenter');\n`
          );
        }
        
        // 替换硬编码的配置
        content = content.replace(
          /maxConcurrentTests:\s*\d+/g,
          "maxConcurrentTests: configCenter.get('testEngine.maxConcurrentTests')"
        );
        
        content = content.replace(
          /defaultTimeout:\s*\d+/g,
          "defaultTimeout: configCenter.get('testEngine.defaultTimeout')"
        );
        
        fs.writeFileSync(engineManagerPath, content);
        this.migratedFiles.push(engineManagerPath);
        console.log('✅ 测试引擎配置迁移完成');
      }
    } catch (error) {
      this.errors.push(`迁移测试引擎配置失败: ${error.message}`);
    }
  }

  /**
   * 迁移安全配置
   */
  async migrateSecurityConfig() {
    console.log('🔧 迁移安全配置...');
    
    // 查找所有包含安全配置的文件
    const securityFiles = [
      '../backend/middleware/auth.js',
      '../backend/middleware/rateLimiter.js'
    ];
    
    for (const filePath of securityFiles) {
      const fullPath = path.join(__dirname, filePath);
      
      try {
        if (fs.existsSync(fullPath)) {
          this.backupFile(fullPath);
          
          let content = fs.readFileSync(fullPath, 'utf8');
          
          // 添加配置中心导入
          if (!content.includes('configCenter')) {
            content = content.replace(
              /(const.*?require.*?;?\n)/,
              `$1const { configCenter } = require('../config/ConfigCenter');\n`
            );
          }
          
          // 替换JWT密钥配置
          content = content.replace(
            /process\.env\.JWT_SECRET\s*\|\|\s*['"`][^'"`]*['"`]/g,
            "configCenter.get('auth.jwtSecret')"
          );
          
          // 替换速率限制配置
          content = content.replace(
            /windowMs:\s*\d+/g,
            "windowMs: configCenter.get('security.rateLimitWindow')"
          );
          
          content = content.replace(
            /max:\s*\d+/g,
            "max: configCenter.get('security.rateLimitMax')"
          );
          
          fs.writeFileSync(fullPath, content);
          this.migratedFiles.push(fullPath);
        }
      } catch (error) {
        this.errors.push(`迁移安全配置失败 [${filePath}]: ${error.message}`);
      }
    }
    
    console.log('✅ 安全配置迁移完成');
  }

  /**
   * 迁移存储配置
   */
  async migrateStorageConfig() {
    console.log('🔧 迁移存储配置...');
    
    const storageFiles = [
      '../backend/routes/files.js',
      '../backend/routes/dataExport.js',
      '../backend/routes/dataImport.js'
    ];
    
    for (const filePath of storageFiles) {
      const fullPath = path.join(__dirname, filePath);
      
      try {
        if (fs.existsSync(fullPath)) {
          this.backupFile(fullPath);
          
          let content = fs.readFileSync(fullPath, 'utf8');
          
          // 添加配置中心导入
          if (!content.includes('configCenter')) {
            content = content.replace(
              /(const.*?require.*?;?\n)/,
              `$1const { configCenter } = require('../config/ConfigCenter');\n`
            );
          }
          
          // 替换硬编码的目录路径
          content = content.replace(
            /['"`]\.\/uploads['"`]/g,
            "configCenter.get('storage.uploadsDir')"
          );
          
          content = content.replace(
            /['"`]\.\/exports['"`]/g,
            "configCenter.get('storage.exportsDir')"
          );
          
          // 替换文件大小限制
          content = content.replace(
            /maxFileSize:\s*\d+/g,
            "maxFileSize: configCenter.get('storage.maxFileSize')"
          );
          
          fs.writeFileSync(fullPath, content);
          this.migratedFiles.push(fullPath);
        }
      } catch (error) {
        this.warnings.push(`迁移存储配置失败 [${filePath}]: ${error.message}`);
      }
    }
    
    console.log('✅ 存储配置迁移完成');
  }

  /**
   * 生成迁移报告
   */
  generateMigrationReport() {
    const reportPath = path.join(this.backupDir, 'migration-report.md');
    
    const report = `# 配置中心迁移报告

## 迁移概述
- **迁移时间**: ${new Date().toISOString()}
- **迁移文件数**: ${this.migratedFiles.length}
- **错误数**: ${this.errors.length}
- **警告数**: ${this.warnings.length}

## 迁移的文件
${this.migratedFiles.map(file => `- ${file}`).join('\n')}

## 错误信息
${this.errors.length > 0 ? this.errors.map(error => `- ❌ ${error}`).join('\n') : '无错误'}

## 警告信息
${this.warnings.length > 0 ? this.warnings.map(warning => `- ⚠️ ${warning}`).join('\n') : '无警告'}

## 配置中心状态
${JSON.stringify(configCenter.getStatus(), null, 2)}

## 后续步骤
1. 检查所有迁移的文件是否正常工作
2. 测试配置热更新功能
3. 验证环境变量配置
4. 更新部署脚本以使用新的配置系统
5. 培训团队使用配置管理API

## 回滚说明
如果需要回滚，可以使用备份目录中的文件：
\`\`\`bash
# 回滚所有文件
cp ${this.backupDir}/*.backup ./
\`\`\`
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📊 迁移报告已生成: ${reportPath}`);
    
    // 在控制台显示摘要
    console.log('\n📊 迁移摘要:');
    console.log(`  ✅ 成功迁移: ${this.migratedFiles.length} 个文件`);
    console.log(`  ❌ 错误: ${this.errors.length} 个`);
    console.log(`  ⚠️ 警告: ${this.warnings.length} 个`);
    console.log(`  📁 备份目录: ${this.backupDir}`);
  }
}

// 运行迁移
if (require.main === module) {
  const migrator = new ConfigMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = ConfigMigrator;
