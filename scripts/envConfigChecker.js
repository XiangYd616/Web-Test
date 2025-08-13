#!/usr/bin/env node

/**
 * 环境配置检查工具
 * 检查环境变量配置的完整性和一致性
 */

const fs = require('fs');
const path = require('path');

class EnvConfigChecker {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.envFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.example'
    ];
    this.envConfigs = {};
    this.issues = [];
  }

  /**
   * 加载所有环境文件
   */
  loadEnvFiles() {
    console.log('📁 加载环境配置文件...\n');
    
    this.envFiles.forEach(filename => {
      const filepath = path.join(this.projectRoot, filename);
      
      if (fs.existsSync(filepath)) {
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          this.envConfigs[filename] = this.parseEnvFile(content);
          console.log(`✅ ${filename} - ${Object.keys(this.envConfigs[filename]).length} 个变量`);
        } catch (error) {
          console.log(`❌ ${filename} - 读取失败: ${error.message}`);
          this.issues.push({
            type: 'file_error',
            file: filename,
            message: `无法读取文件: ${error.message}`
          });
        }
      } else {
        console.log(`⚪ ${filename} - 不存在`);
      }
    });
  }

  /**
   * 解析环境文件内容
   */
  parseEnvFile(content) {
    const env = {};
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      line = line.trim();
      
      // 跳过空行和注释
      if (!line || line.startsWith('#')) return;
      
      // 解析键值对
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key] = {
          value: value.replace(/^["']|["']$/g, ''), // 移除引号
          line: index + 1,
          raw: line
        };
      } else {
        this.issues.push({
          type: 'parse_error',
          line: index + 1,
          content: line,
          message: '无法解析的环境变量格式'
        });
      }
    });
    
    return env;
  }

  /**
   * 检查环境变量一致性
   */
  checkConsistency() {
    console.log('\n🔍 检查环境变量一致性...\n');
    
    const allKeys = new Set();
    Object.values(this.envConfigs).forEach(config => {
      Object.keys(config).forEach(key => allKeys.add(key));
    });
    
    console.log(`📊 总共发现 ${allKeys.size} 个不同的环境变量`);
    
    // 检查每个变量在不同环境中的存在情况
    const missingVars = [];
    
    allKeys.forEach(key => {
      const existsIn = [];
      const missingIn = [];
      
      Object.keys(this.envConfigs).forEach(filename => {
        if (this.envConfigs[filename][key]) {
          existsIn.push(filename);
        } else {
          missingIn.push(filename);
        }
      });
      
      if (missingIn.length > 0 && existsIn.length > 0) {
        missingVars.push({
          key,
          existsIn,
          missingIn
        });
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`⚠️  发现 ${missingVars.length} 个变量在某些环境中缺失:`);
      missingVars.forEach(item => {
        console.log(`   ${item.key}:`);
        console.log(`     存在于: ${item.existsIn.join(', ')}`);
        console.log(`     缺失于: ${item.missingIn.join(', ')}`);
      });
    } else {
      console.log('✅ 所有环境变量在各环境中保持一致');
    }
    
    return missingVars;
  }

  /**
   * 检查敏感信息
   */
  checkSensitiveData() {
    console.log('\n🔒 检查敏感信息...\n');
    
    const sensitivePatterns = [
      { pattern: /password/i, type: '密码' },
      { pattern: /secret/i, type: '密钥' },
      { pattern: /key/i, type: '密钥' },
      { pattern: /token/i, type: '令牌' },
      { pattern: /api_key/i, type: 'API密钥' },
      { pattern: /private/i, type: '私有信息' }
    ];
    
    const sensitiveVars = [];
    
    Object.entries(this.envConfigs).forEach(([filename, config]) => {
      Object.entries(config).forEach(([key, data]) => {
        sensitivePatterns.forEach(({ pattern, type }) => {
          if (pattern.test(key)) {
            sensitiveVars.push({
              file: filename,
              key,
              type,
              hasValue: data.value.length > 0,
              isPlaceholder: data.value.includes('your_') || data.value.includes('YOUR_')
            });
          }
        });
      });
    });
    
    if (sensitiveVars.length > 0) {
      console.log(`🔍 发现 ${sensitiveVars.length} 个可能的敏感变量:`);
      sensitiveVars.forEach(item => {
        const status = item.hasValue ? 
          (item.isPlaceholder ? '📝 占位符' : '⚠️ 有值') : 
          '⚪ 空值';
        console.log(`   ${item.key} (${item.type}) - ${status} [${item.file}]`);
      });
    } else {
      console.log('✅ 未发现明显的敏感变量');
    }
    
    return sensitiveVars;
  }

  /**
   * 检查环境变量命名规范
   */
  checkNamingConvention() {
    console.log('\n📏 检查命名规范...\n');
    
    const namingIssues = [];
    
    Object.entries(this.envConfigs).forEach(([filename, config]) => {
      Object.keys(config).forEach(key => {
        // 检查是否符合大写下划线命名规范
        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
          namingIssues.push({
            file: filename,
            key,
            issue: '不符合大写下划线命名规范'
          });
        }
        
        // 检查是否过长
        if (key.length > 50) {
          namingIssues.push({
            file: filename,
            key,
            issue: '变量名过长'
          });
        }
        
        // 检查是否有连续下划线
        if (key.includes('__')) {
          namingIssues.push({
            file: filename,
            key,
            issue: '包含连续下划线'
          });
        }
      });
    });
    
    if (namingIssues.length > 0) {
      console.log(`⚠️  发现 ${namingIssues.length} 个命名问题:`);
      namingIssues.forEach(item => {
        console.log(`   ${item.key} [${item.file}] - ${item.issue}`);
      });
    } else {
      console.log('✅ 所有环境变量命名符合规范');
    }
    
    return namingIssues;
  }

  /**
   * 生成环境变量文档
   */
  generateDocumentation() {
    console.log('\n📚 生成环境变量文档...\n');
    
    const allKeys = new Set();
    Object.values(this.envConfigs).forEach(config => {
      Object.keys(config).forEach(key => allKeys.add(key));
    });
    
    const sortedKeys = Array.from(allKeys).sort();
    
    let doc = '# 环境变量配置文档\n\n';
    doc += `生成时间: ${new Date().toISOString()}\n\n`;
    doc += '## 环境变量列表\n\n';
    doc += '| 变量名 | 描述 | 默认值 | 必需 | 环境 |\n';
    doc += '|--------|------|--------|------|------|\n';
    
    sortedKeys.forEach(key => {
      const environments = [];
      let defaultValue = '';
      
      Object.entries(this.envConfigs).forEach(([filename, config]) => {
        if (config[key]) {
          environments.push(filename);
          if (filename === '.env.example') {
            defaultValue = config[key].value;
          }
        }
      });
      
      const description = this.guessDescription(key);
      const required = !defaultValue || defaultValue.includes('your_') ? '是' : '否';
      
      doc += `| ${key} | ${description} | ${defaultValue || '-'} | ${required} | ${environments.join(', ')} |\n`;
    });
    
    const docPath = path.join(this.projectRoot, 'ENV_VARIABLES.md');
    fs.writeFileSync(docPath, doc);
    console.log(`📄 文档已生成: ${docPath}`);
    
    return docPath;
  }

  /**
   * 猜测环境变量描述
   */
  guessDescription(key) {
    const descriptions = {
      'PORT': '服务器端口',
      'NODE_ENV': 'Node.js环境',
      'DATABASE_URL': '数据库连接URL',
      'REDIS_URL': 'Redis连接URL',
      'JWT_SECRET': 'JWT密钥',
      'API_KEY': 'API密钥',
      'CORS_ORIGIN': 'CORS允许的源',
      'LOG_LEVEL': '日志级别'
    };
    
    return descriptions[key] || '待补充描述';
  }

  /**
   * 运行完整检查
   */
  run() {
    console.log('🔧 开始环境配置检查...\n');
    
    this.loadEnvFiles();
    const missingVars = this.checkConsistency();
    const sensitiveVars = this.checkSensitiveData();
    const namingIssues = this.checkNamingConvention();
    
    // 生成文档
    this.generateDocumentation();
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📋 检查结果总结');
    console.log('='.repeat(50));
    console.log(`环境文件数量: ${Object.keys(this.envConfigs).length}`);
    console.log(`缺失变量: ${missingVars.length}`);
    console.log(`敏感变量: ${sensitiveVars.length}`);
    console.log(`命名问题: ${namingIssues.length}`);
    console.log(`解析错误: ${this.issues.length}`);
    
    const hasIssues = missingVars.length > 0 || namingIssues.length > 0 || this.issues.length > 0;
    
    if (hasIssues) {
      console.log('\n⚠️  发现问题，建议修复后重新检查');
    } else {
      console.log('\n✅ 环境配置检查通过！');
    }
    
    return {
      healthy: !hasIssues,
      issues: {
        missing: missingVars.length,
        sensitive: sensitiveVars.length,
        naming: namingIssues.length,
        parsing: this.issues.length
      }
    };
  }
}

// 运行检查
if (require.main === module) {
  const checker = new EnvConfigChecker();
  const result = checker.run();
  
  process.exit(result.healthy ? 0 : 1);
}

module.exports = EnvConfigChecker;
