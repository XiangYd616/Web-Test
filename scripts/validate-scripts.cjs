#!/usr/bin/env node

/**
 * 脚本验证工具
 * 检查package.json中所有脚本命令的有效性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ScriptValidator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.issues = [];
    this.validCommands = 0;
    this.totalCommands = 0;
  }

  /**
   * 验证所有package.json文件
   */
  async validateAll() {
    console.log('🔍 开始验证项目脚本...');
    console.log('=' .repeat(60));

    // 验证根目录package.json
    await this.validatePackageJson(path.join(this.rootDir, 'package.json'), '根目录');
    
    // 验证后端package.json
    const backendPackage = path.join(this.rootDir, 'backend', 'package.json');
    if (fs.existsSync(backendPackage)) {
      await this.validatePackageJson(backendPackage, '后端');
    }

    // 显示结果
    this.displayResults();
  }

  /**
   * 验证单个package.json文件
   */
  async validatePackageJson(packagePath, name) {
    console.log(`\n📦 验证${name}package.json...`);
    
    if (!fs.existsSync(packagePath)) {
      this.addIssue('error', `${name}package.json不存在: ${packagePath}`);
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      console.log(`   发现 ${Object.keys(scripts).length} 个脚本命令`);
      
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        this.totalCommands++;
        
        // 跳过注释行
        if (scriptName.startsWith('_comment')) {
          continue;
        }
        
        await this.validateScript(scriptName, scriptCommand, packagePath, name);
      }
      
    } catch (error) {
      this.addIssue('error', `解析${name}package.json失败: ${error.message}`);
    }
  }

  /**
   * 验证单个脚本命令
   */
  async validateScript(scriptName, scriptCommand, packagePath, packageName) {
    const packageDir = path.dirname(packagePath);
    
    // 解析命令
    const command = scriptCommand.trim();
    
    // 跳过一些特殊命令
    if (this.shouldSkipValidation(command)) {
      this.validCommands++;
      return;
    }
    
    // 检查文件路径
    if (command.startsWith('node ')) {
      const scriptPath = this.extractScriptPath(command);
      if (scriptPath) {
        const fullPath = path.resolve(packageDir, scriptPath);
        if (!fs.existsSync(fullPath)) {
          this.addIssue('error', `${packageName} - ${scriptName}: 脚本文件不存在 ${scriptPath}`);
          return;
        }
      }
    }
    
    // 检查cd命令的目录
    if (command.includes('cd ')) {
      const dir = this.extractCdDirectory(command);
      if (dir) {
        const fullPath = path.resolve(packageDir, dir);
        if (!fs.existsSync(fullPath)) {
          this.addIssue('error', `${packageName} - ${scriptName}: 目录不存在 ${dir}`);
          return;
        }
      }
    }
    
    // 检查curl命令的URL
    if (command.startsWith('curl ')) {
      const url = this.extractCurlUrl(command);
      if (url && !this.isValidUrl(url)) {
        this.addIssue('warning', `${packageName} - ${scriptName}: URL格式可能有误 ${url}`);
      }
    }
    
    this.validCommands++;
  }

  /**
   * 是否应该跳过验证
   */
  shouldSkipValidation(command) {
    const skipPatterns = [
      /^concurrently/,
      /^cross-env/,
      /^wait-on/,
      /^electron/,
      /^vite/,
      /^tsc/,
      /^vitest/,
      /^playwright/,
      /^eslint/,
      /^prettier/,
      /^rimraf/,
      /^jest/,
      /^nodemon/,
      /^npx/,
      /^docker/,
      /^npm update/,
      /^npm audit/
    ];
    
    return skipPatterns.some(pattern => pattern.test(command));
  }

  /**
   * 提取脚本路径
   */
  extractScriptPath(command) {
    const match = command.match(/node\s+([^\s]+)/);
    return match ? match[1] : null;
  }

  /**
   * 提取cd目录
   */
  extractCdDirectory(command) {
    const match = command.match(/cd\s+([^\s&]+)/);
    return match ? match[1] : null;
  }

  /**
   * 提取curl URL
   */
  extractCurlUrl(command) {
    const match = command.match(/curl\s+(?:-X\s+\w+\s+)?([^\s]+)/);
    return match ? match[1] : null;
  }

  /**
   * 验证URL格式
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return url.startsWith('http://') || url.startsWith('https://');
    }
  }

  /**
   * 添加问题
   */
  addIssue(type, message) {
    this.issues.push({ type, message });
  }

  /**
   * 显示验证结果
   */
  displayResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 验证结果汇总:');
    console.log(`   总命令数: ${this.totalCommands}`);
    console.log(`   有效命令: ${this.validCommands}`);
    console.log(`   发现问题: ${this.issues.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      
      const errors = this.issues.filter(issue => issue.type === 'error');
      const warnings = this.issues.filter(issue => issue.type === 'warning');
      
      if (errors.length > 0) {
        console.log(`\n🔴 错误 (${errors.length}个):`);
        errors.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.message}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log(`\n🟡 警告 (${warnings.length}个):`);
        warnings.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.message}`);
        });
      }
      
      // 生成修复建议
      this.generateFixSuggestions();
    } else {
      console.log('\n✅ 所有脚本命令都有效！');
    }
    
    // 计算健康度
    const healthScore = (this.validCommands / this.totalCommands * 100).toFixed(1);
    console.log(`\n🏥 脚本健康度: ${healthScore}%`);
    
    if (this.issues.filter(issue => issue.type === 'error').length > 0) {
      console.log('\n💡 建议: 修复上述错误以提高脚本可靠性');
      process.exit(1);
    }
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions() {
    console.log('\n🔧 修复建议:');
    
    const fileIssues = this.issues.filter(issue => issue.message.includes('文件不存在'));
    const dirIssues = this.issues.filter(issue => issue.message.includes('目录不存在'));
    const urlIssues = this.issues.filter(issue => issue.message.includes('URL格式'));
    
    if (fileIssues.length > 0) {
      console.log('\n📁 文件问题:');
      console.log('   - 检查脚本文件路径是否正确');
      console.log('   - 确保所有引用的脚本文件都存在');
      console.log('   - 考虑删除不再使用的脚本命令');
    }
    
    if (dirIssues.length > 0) {
      console.log('\n📂 目录问题:');
      console.log('   - 检查cd命令中的目录路径');
      console.log('   - 确保目录结构与脚本期望一致');
    }
    
    if (urlIssues.length > 0) {
      console.log('\n🌐 URL问题:');
      console.log('   - 检查curl命令中的URL格式');
      console.log('   - 确保协议和端口号正确');
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const validator = new ScriptValidator();
  
  try {
    await validator.validateAll();
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ScriptValidator };
