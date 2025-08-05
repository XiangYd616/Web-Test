#!/usr/bin/env node

/**
 * 环境变量配置检查工具
 * 检查项目中的环境变量使用是否规范
 */

const fs = require('fs');
const path = require('path');

class EnvConfigChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
  }

  /**
   * 检查所有环境变量配置
   */
  async checkAll() {
    console.log('🔍 环境变量配置检查');
    console.log('='.repeat(50));

    // 检查 .env 文件分布
    this.checkEnvFiles();

    // 检查 dotenv 使用
    this.checkDotenvUsage();

    // 检查前端环境变量使用
    this.checkFrontendEnvUsage();

    // 检查配置重复
    this.checkDuplicateConfigs();

    // 检查 package.json 配置
    this.checkPackageJsonConfig();

    // 生成报告
    this.generateReport();
  }

  /**
   * 检查 .env 文件分布
   */
  checkEnvFiles() {
    console.log('📁 检查 .env 文件分布...');

    const envFiles = [
      { path: '.env', purpose: '前端和全局配置' },
      { path: 'server/.env', purpose: '后端专用配置' },
      { path: '.env.example', purpose: '配置模板' },
      { path: 'server/.env.example', purpose: '后端配置模板' }
    ];

    envFiles.forEach(({ path: filePath, purpose }) => {
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${filePath} - ${purpose}`);
      } else {
        this.warnings.push(`⚠️  ${filePath} 不存在 - ${purpose}`);
      }
    });

    // 检查多余的 .env 文件
    const extraEnvFiles = [
      '.env.cloud',
      '.env.frontend.example',
      '.env.local',
      '.env.development',
      '.env.production'
    ];

    extraEnvFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.issues.push(`❌ 发现多余的配置文件: ${filePath}`);
        this.fixes.push(`建议重命名为 ${filePath}.example 或删除`);
      }
    });
  }

  /**
   * 检查 dotenv 使用
   */
  checkDotenvUsage() {
    console.log('\n🔧 检查 dotenv 使用...');

    const filesToCheck = [
      'server/app.js',
      'server/scripts/validate-env.js',
      'server/scripts/init-database.js',
      'server/scripts/check-database.js',
      'server/scripts/test-network.js',
      'server/services/geoUpdateService.js'
    ];

    filesToCheck.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // 检查是否使用了正确的路径
        if (content.includes("require('dotenv').config()")) {
          this.issues.push(`❌ ${filePath}: 使用默认 dotenv 路径`);
          this.fixes.push(`修复: 使用 require('dotenv').config({ path: path.join(__dirname, '../.env') })`);
        } else if (content.includes("require('dotenv').config({ path:")) {
          console.log(`✅ ${filePath}: 使用正确的 dotenv 路径`);
        }
      }
    });
  }

  /**
   * 检查前端环境变量使用
   */
  checkFrontendEnvUsage() {
    console.log('\n🌐 检查前端环境变量使用...');

    const frontendFiles = this.scanDirectory('src', ['.ts', '.tsx', '.js', '.jsx']);

    frontendFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');

      // 检查是否错误使用了 process.env
      if (content.includes('process.env') && !filePath.includes('environment.ts')) {
        this.issues.push(`❌ ${filePath}: 前端代码中使用 process.env`);
        this.fixes.push(`修复: 使用 import.meta.env 替代 process.env`);
      }

      // 检查是否正确使用了 import.meta.env
      if (content.includes('import.meta.env.VITE_')) {
        console.log(`✅ ${filePath}: 正确使用 import.meta.env`);
      }
    });
  }

  /**
   * 检查 package.json 配置
   */
  checkPackageJsonConfig() {
    console.log('\n📦 检查 package.json 配置...');

    // 检查根目录 package.json
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      // 检查是否有不必要的 dotenv 依赖
      if (packageJson.dependencies && packageJson.dependencies.dotenv) {
        this.issues.push('❌ 根目录 package.json 包含不必要的 dotenv 依赖');
        this.fixes.push('移除根目录的 dotenv 依赖，只在 server/package.json 中保留');
      }

      // 检查脚本是否使用了环境变量
      const scripts = packageJson.scripts || {};
      Object.entries(scripts).forEach(([name, command]) => {
        if (command.includes('vite') && !command.includes('cross-env')) {
          this.warnings.push(`⚠️  脚本 ${name} 可能需要环境变量设置`);
        }
      });
    }

    // 检查 server/package.json
    if (fs.existsSync('server/package.json')) {
      const serverPackageJson = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));

      // 检查 nodemon 配置中的环境变量
      if (serverPackageJson.nodemonConfig && serverPackageJson.nodemonConfig.env) {
        this.issues.push('❌ server/package.json 中硬编码了环境变量');
        this.fixes.push('移除 nodemonConfig.env，使用 .env 文件管理环境变量');
      }
    }
  }

  /**
   * 检查配置重复
   */
  checkDuplicateConfigs() {
    console.log('\n🔄 检查配置重复...');

    const rootEnv = this.parseEnvFile('.env');
    const serverEnv = this.parseEnvFile('server/.env');

    if (rootEnv && serverEnv) {
      const rootKeys = Object.keys(rootEnv);
      const serverKeys = Object.keys(serverEnv);

      const duplicates = rootKeys.filter(key => serverKeys.includes(key));

      if (duplicates.length > 0) {
        this.issues.push(`❌ 发现重复配置: ${duplicates.join(', ')}`);
        this.fixes.push('移除重复的环境变量，确保每个变量只在一个文件中');
      } else {
        console.log('✅ 无重复配置');
      }
    }
  }

  /**
   * 解析 .env 文件
   */
  parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};

    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match) {
        env[match[1]] = true;
      }
    });

    return env;
  }

  /**
   * 扫描目录
   */
  scanDirectory(dir, extensions) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      });
    };

    scan(dir);
    return files;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 检查报告');
    console.log('='.repeat(50));

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('✅ 环境变量配置完全正确！');
      return;
    }

    if (this.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      this.issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.fixes.length > 0) {
      console.log('\n🔧 建议的修复:');
      this.fixes.forEach(fix => console.log(`   ${fix}`));
    }

    console.log('\n💡 配置规范:');
    console.log('   • 前端配置 → 根目录 .env');
    console.log('   • 后端配置 → server/.env');
    console.log('   • 前端代码使用 import.meta.env');
    console.log('   • 后端代码使用 process.env');
    console.log('   • 避免配置重复');
  }
}

// 运行检查
if (require.main === module) {
  const checker = new EnvConfigChecker();
  checker.checkAll().then(() => {
    console.log('\n🏁 检查完成');
  }).catch(error => {
    console.error('❌ 检查失败:', error);
  });
}

module.exports = EnvConfigChecker;
