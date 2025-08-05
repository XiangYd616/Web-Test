#!/usr/bin/env node

/**
 * 环境变量使用情况报告工具
 * 生成完整的环境变量使用和配置报告
 */

const fs = require('fs');
const path = require('path');

class EnvUsageReporter {
  constructor() {
    this.rootEnv = {};
    this.serverEnv = {};
    this.frontendUsage = [];
    this.backendUsage = [];
  }

  /**
   * 生成完整报告
   */
  async generateReport() {
    console.log('📊 环境变量使用情况报告');
    console.log('=' .repeat(60));

    // 解析配置文件
    this.parseEnvFiles();
    
    // 扫描代码使用情况
    this.scanCodeUsage();
    
    // 生成功能区分报告
    this.generateFunctionReport();
    
    // 生成使用情况报告
    this.generateUsageReport();
    
    // 生成建议
    this.generateRecommendations();
  }

  /**
   * 解析环境变量文件
   */
  parseEnvFiles() {
    console.log('📁 解析环境变量文件...');
    
    // 解析根目录 .env
    if (fs.existsSync('.env')) {
      this.rootEnv = this.parseEnvFile('.env');
      console.log(`✅ 根目录 .env: ${Object.keys(this.rootEnv).length} 个变量`);
    }
    
    // 解析 server/.env
    if (fs.existsSync('server/.env')) {
      this.serverEnv = this.parseEnvFile('server/.env');
      console.log(`✅ server/.env: ${Object.keys(this.serverEnv).length} 个变量`);
    }
  }

  /**
   * 解析单个 .env 文件
   */
  parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach((line, index) => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key] = {
          value: value.replace(/^["']|["']$/g, ''),
          line: index + 1,
          file: filePath
        };
      }
    });
    
    return env;
  }

  /**
   * 扫描代码使用情况
   */
  scanCodeUsage() {
    console.log('\n🔍 扫描代码使用情况...');
    
    // 扫描前端代码
    this.scanFrontendUsage();
    
    // 扫描后端代码
    this.scanBackendUsage();
  }

  /**
   * 扫描前端环境变量使用
   */
  scanFrontendUsage() {
    const frontendFiles = this.scanDirectory('src', ['.ts', '.tsx', '.js', '.jsx']);
    
    frontendFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 查找 import.meta.env 使用
      const metaEnvMatches = content.match(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g);
      if (metaEnvMatches) {
        metaEnvMatches.forEach(match => {
          const envVar = match.replace('import.meta.env.', '');
          this.frontendUsage.push({
            file: filePath,
            variable: envVar,
            type: 'import.meta.env',
            line: this.getLineNumber(content, match)
          });
        });
      }
      
      // 查找 process.env 使用（应该避免）
      const processEnvMatches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
      if (processEnvMatches) {
        processEnvMatches.forEach(match => {
          const envVar = match.replace('process.env.', '');
          this.frontendUsage.push({
            file: filePath,
            variable: envVar,
            type: 'process.env',
            line: this.getLineNumber(content, match),
            warning: '前端代码不应使用 process.env'
          });
        });
      }
    });
    
    console.log(`✅ 前端使用: ${this.frontendUsage.length} 处`);
  }

  /**
   * 扫描后端环境变量使用
   */
  scanBackendUsage() {
    const backendFiles = this.scanDirectory('server', ['.js', '.ts']);
    
    backendFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 查找 process.env 使用
      const processEnvMatches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
      if (processEnvMatches) {
        processEnvMatches.forEach(match => {
          const envVar = match.replace('process.env.', '');
          this.backendUsage.push({
            file: filePath,
            variable: envVar,
            type: 'process.env',
            line: this.getLineNumber(content, match)
          });
        });
      }
    });
    
    console.log(`✅ 后端使用: ${this.backendUsage.length} 处`);
  }

  /**
   * 生成功能区分报告
   */
  generateFunctionReport() {
    console.log('\n📋 功能区分报告');
    console.log('=' .repeat(60));
    
    // 根目录 .env 功能分类
    console.log('📁 根目录 .env (前端和全局配置):');
    this.categorizeVariables(this.rootEnv, [
      { name: '前端配置', pattern: /^(VITE_|REACT_APP_)/ },
      { name: '数据库配置', pattern: /^(DATABASE_|DB_)/ },
      { name: '外部API配置', pattern: /^(GOOGLE_|GTMETRIX_|PAGESPEED_)/ },
      { name: '缓存配置', pattern: /^(REDIS_|CACHE_)/ },
      { name: '全局配置', pattern: /^(PORT|CORS_|NODE_ENV)$/ }
    ]);
    
    console.log('\n📁 server/.env (后端专用配置):');
    this.categorizeVariables(this.serverEnv, [
      { name: '认证安全', pattern: /^(JWT_|SESSION_|BCRYPT_)/ },
      { name: '地理位置服务', pattern: /^(MAXMIND_|GEO_)/ },
      { name: '邮件配置', pattern: /^(SMTP_|MAIL_)/ },
      { name: '服务配置', pattern: /^(RATE_LIMIT_|UPLOAD_|LOG_)/ },
      { name: '服务器配置', pattern: /^(HOST|APP_|API_)/ }
    ]);
  }

  /**
   * 分类显示变量
   */
  categorizeVariables(envVars, categories) {
    const categorized = {};
    const uncategorized = [];
    
    // 初始化分类
    categories.forEach(cat => {
      categorized[cat.name] = [];
    });
    
    // 分类变量
    Object.keys(envVars).forEach(key => {
      let found = false;
      for (const category of categories) {
        if (category.pattern.test(key)) {
          categorized[category.name].push(key);
          found = true;
          break;
        }
      }
      if (!found) {
        uncategorized.push(key);
      }
    });
    
    // 显示分类结果
    categories.forEach(category => {
      if (categorized[category.name].length > 0) {
        console.log(`   ${category.name}:`);
        categorized[category.name].forEach(key => {
          console.log(`     • ${key}`);
        });
      }
    });
    
    if (uncategorized.length > 0) {
      console.log('   其他配置:');
      uncategorized.forEach(key => {
        console.log(`     • ${key}`);
      });
    }
  }

  /**
   * 生成使用情况报告
   */
  generateUsageReport() {
    console.log('\n📊 使用情况报告');
    console.log('=' .repeat(60));
    
    // 前端使用情况
    console.log('🌐 前端环境变量使用:');
    const frontendVars = [...new Set(this.frontendUsage.map(u => u.variable))];
    frontendVars.forEach(varName => {
      const usages = this.frontendUsage.filter(u => u.variable === varName);
      const hasWarning = usages.some(u => u.warning);
      const icon = hasWarning ? '⚠️' : '✅';
      console.log(`   ${icon} ${varName}: ${usages.length} 处使用`);
      
      if (hasWarning) {
        console.log(`      警告: ${usages[0].warning}`);
      }
    });
    
    // 后端使用情况
    console.log('\n🔧 后端环境变量使用:');
    const backendVars = [...new Set(this.backendUsage.map(u => u.variable))];
    backendVars.forEach(varName => {
      const usages = this.backendUsage.filter(u => u.variable === varName);
      console.log(`   ✅ ${varName}: ${usages.length} 处使用`);
    });
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    console.log('\n💡 配置建议');
    console.log('=' .repeat(60));
    
    // 检查未使用的变量
    const allDefinedVars = new Set([...Object.keys(this.rootEnv), ...Object.keys(this.serverEnv)]);
    const allUsedVars = new Set([
      ...this.frontendUsage.map(u => u.variable),
      ...this.backendUsage.map(u => u.variable)
    ]);
    
    const unusedVars = [...allDefinedVars].filter(v => !allUsedVars.has(v));
    if (unusedVars.length > 0) {
      console.log('🗑️  未使用的环境变量:');
      unusedVars.forEach(varName => {
        const location = this.rootEnv[varName] ? '根目录' : 'server';
        console.log(`   • ${varName} (${location}/.env)`);
      });
    }
    
    // 检查缺失的变量
    const frontendVarsInCode = this.frontendUsage.map(u => u.variable);
    const missingFrontendVars = frontendVarsInCode.filter(v => !this.rootEnv[v]);
    if (missingFrontendVars.length > 0) {
      console.log('\n❌ 前端代码中使用但未定义的变量:');
      [...new Set(missingFrontendVars)].forEach(varName => {
        console.log(`   • ${varName} (应在根目录/.env中定义)`);
      });
    }
    
    const backendVarsInCode = this.backendUsage.map(u => u.variable);
    const missingBackendVars = backendVarsInCode.filter(v => !this.serverEnv[v] && !this.rootEnv[v]);
    if (missingBackendVars.length > 0) {
      console.log('\n❌ 后端代码中使用但未定义的变量:');
      [...new Set(missingBackendVars)].forEach(varName => {
        console.log(`   • ${varName} (应在server/.env中定义)`);
      });
    }
    
    console.log('\n✅ 配置规范总结:');
    console.log('   • 前端配置使用 import.meta.env');
    console.log('   • 后端配置使用 process.env');
    console.log('   • 敏感配置只在 server/.env');
    console.log('   • 前端配置在根目录 .env');
  }

  /**
   * 获取行号
   */
  getLineNumber(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 0;
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
}

// 运行报告
if (require.main === module) {
  const reporter = new EnvUsageReporter();
  reporter.generateReport().then(() => {
    console.log('\n🏁 报告生成完成');
  }).catch(error => {
    console.error('❌ 报告生成失败:', error);
  });
}

module.exports = EnvUsageReporter;
