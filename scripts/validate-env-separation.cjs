#!/usr/bin/env node

/**
 * 环境变量分离验证工具
 * 检查 .env 文件中的配置是否正确分离
 */

const fs = require('fs');
const path = require('path');

class EnvSeparationValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * 验证环境变量分离
   */
  validate() {
    console.log('🔍 环境变量分离验证');
    console.log('=' .repeat(50));

    // 解析配置文件
    const rootEnv = this.parseEnvFile('.env');
    const serverEnv = this.parseEnvFile('server/.env');

    if (!rootEnv || !serverEnv) {
      console.log('❌ 无法读取环境变量文件');
      return;
    }

    // 检查重复配置
    this.checkDuplicates(rootEnv, serverEnv);
    
    // 检查配置分类
    this.checkConfigCategories(rootEnv, serverEnv);
    
    // 检查前端配置
    this.checkFrontendConfig(rootEnv, serverEnv);
    
    // 检查后端配置
    this.checkBackendConfig(rootEnv, serverEnv);
    
    // 生成报告
    this.generateReport();
  }

  /**
   * 解析 .env 文件
   */
  parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const config = {};
    
    content.split('\n').forEach((line, index) => {
      line = line.trim();
      
      // 跳过注释和空行
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        config[key] = {
          value: value.replace(/^["']|["']$/g, ''), // 移除引号
          line: index + 1,
          file: filePath
        };
      }
    });
    
    return config;
  }

  /**
   * 检查重复配置
   */
  checkDuplicates(rootEnv, serverEnv) {
    console.log('🔄 检查重复配置...');
    
    const rootKeys = Object.keys(rootEnv);
    const serverKeys = Object.keys(serverEnv);
    const duplicates = rootKeys.filter(key => serverKeys.includes(key));
    
    if (duplicates.length > 0) {
      duplicates.forEach(key => {
        this.issues.push(`❌ 重复配置: ${key}`);
        this.issues.push(`   根目录: ${rootEnv[key].value} (第${rootEnv[key].line}行)`);
        this.issues.push(`   server: ${serverEnv[key].value} (第${serverEnv[key].line}行)`);
      });
      this.suggestions.push('移除重复的环境变量，确保每个变量只在一个文件中');
    } else {
      console.log('✅ 无重复配置');
    }
  }

  /**
   * 检查配置分类
   */
  checkConfigCategories(rootEnv, serverEnv) {
    console.log('\n📋 检查配置分类...');
    
    // 应该在根目录的配置
    const frontendConfigs = [
      'VITE_', 'REACT_APP_', 'FRONTEND_', 'VITE_DEV_PORT'
    ];
    
    // 应该在 server 目录的配置
    const backendConfigs = [
      'JWT_', 'BCRYPT_', 'SESSION_', 'SMTP_', 'MAXMIND_', 'GEO_'
    ];
    
    // 检查前端配置是否在后端文件中
    Object.keys(serverEnv).forEach(key => {
      if (frontendConfigs.some(prefix => key.startsWith(prefix))) {
        this.issues.push(`❌ 前端配置在后端文件中: ${key} (server/.env:${serverEnv[key].line})`);
      }
    });
    
    // 检查后端配置是否在前端文件中
    Object.keys(rootEnv).forEach(key => {
      if (backendConfigs.some(prefix => key.startsWith(prefix))) {
        this.issues.push(`❌ 后端配置在前端文件中: ${key} (.env:${rootEnv[key].line})`);
      }
    });
  }

  /**
   * 检查前端配置
   */
  checkFrontendConfig(rootEnv, serverEnv) {
    console.log('\n🌐 检查前端配置...');
    
    // 必需的前端配置
    const requiredFrontend = ['VITE_API_URL', 'VITE_DEV_PORT'];
    
    requiredFrontend.forEach(key => {
      if (!rootEnv[key]) {
        this.warnings.push(`⚠️  缺少前端配置: ${key}`);
      } else {
        console.log(`✅ ${key}: ${rootEnv[key].value}`);
      }
    });
    
    // 检查前端配置是否在后端文件中
    Object.keys(serverEnv).forEach(key => {
      if (key.startsWith('VITE_') || key.startsWith('REACT_APP_')) {
        this.issues.push(`❌ 前端配置在后端文件中: ${key}`);
      }
    });
  }

  /**
   * 检查后端配置
   */
  checkBackendConfig(rootEnv, serverEnv) {
    console.log('\n🔧 检查后端配置...');
    
    // 必需的后端配置
    const requiredBackend = ['JWT_SECRET', 'PORT'];
    
    requiredBackend.forEach(key => {
      if (!serverEnv[key]) {
        this.warnings.push(`⚠️  缺少后端配置: ${key}`);
      } else {
        console.log(`✅ ${key}: ${serverEnv[key].value.substring(0, 10)}...`);
      }
    });
    
    // 检查敏感配置是否在前端文件中
    const sensitiveConfigs = ['JWT_SECRET', 'SESSION_SECRET', 'BCRYPT_ROUNDS'];
    
    sensitiveConfigs.forEach(key => {
      if (rootEnv[key]) {
        this.issues.push(`❌ 敏感配置在前端文件中: ${key}`);
      }
    });
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 验证报告');
    console.log('=' .repeat(50));
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('✅ 环境变量分离完全正确！');
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
    
    if (this.suggestions.length > 0) {
      console.log('\n💡 建议:');
      this.suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    }
    
    console.log('\n📋 配置分离规范:');
    console.log('   根目录 .env:');
    console.log('     • 前端配置 (VITE_*, REACT_APP_*)');
    console.log('     • 数据库连接 (DATABASE_URL, DB_*)');
    console.log('     • 全局配置 (PORT, CORS_ORIGIN)');
    console.log('     • API配置 (GOOGLE_*, GTMETRIX_*)');
    console.log('');
    console.log('   server/.env:');
    console.log('     • 后端专用配置 (JWT_*, SESSION_*)');
    console.log('     • 安全配置 (BCRYPT_*, MAXMIND_*)');
    console.log('     • 邮件配置 (SMTP_*)');
    console.log('     • 服务配置 (GEO_*, RATE_LIMIT_*)');
  }
}

// 运行验证
if (require.main === module) {
  const validator = new EnvSeparationValidator();
  validator.validate();
}

module.exports = EnvSeparationValidator;
