#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class EmergencyCoreFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
  }

  async execute() {
    console.log('🚨 紧急修复核心文件...\n');

    // 只修复最关键的启动文件
    const criticalFiles = [
      'main.tsx',
      'App.tsx',
      'config/ConfigManager.ts',
      'services/errorService.ts',
      'utils/performanceMonitor.ts'
    ];

    for (const filePath of criticalFiles) {
      await this.fixCriticalFile(path.join(this.frontendRoot, filePath));
    }

    console.log('\n📊 紧急修复报告:');
    console.log(`   修复文件: ${this.fixedFiles.length}`);
    this.fixedFiles.forEach(file => console.log(`   ✅ ${file}`));
  }

  async fixCriticalFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // 应用紧急修复规则
      content = this.emergencyStringFix(content);
      content = this.emergencyTemplateFix(content);
      content = this.emergencyConsoleFix(content);
      content = this.emergencyObjectFix(content);
      content = this.emergencyFunctionFix(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(path.relative(this.projectRoot, filePath));
        console.log(`✅ 紧急修复: ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      console.log(`❌ 错误: ${path.relative(this.projectRoot, filePath)} - ${error.message}`);
    }
  }

  emergencyStringFix(content) {
    // 修复最常见的字符串问题
    
    // 1. 修复未终止的字符串字面量
    content = content.replace(/console\.log\('([^']*$)/gm, "console.log('$1');");
    content = content.replace(/console\.error\('([^']*$)/gm, "console.error('$1');");
    content = content.replace(/console\.warn\('([^']*$)/gm, "console.warn('$1');");
    
    // 2. 修复常见的字符串错误
    content = content.replace(/console\.log\('🚀 初始化前端架构系统\.\.\.\);/g, 
      "console.log('🚀 初始化前端架构系统...');");
    
    content = content.replace(/console\.log\('✅ 前端架构系统初始化完成\);/g,
      "console.log('✅ 前端架构系统初始化完成');");
    
    content = content.replace(/console\.error\('❌ 前端架构系统初始化失败:\, error\);/g,
      "console.error('❌ 前端架构系统初始化失败:', error);");

    // 3. 修复Service Worker注册
    content = content.replace(/console\.log\("Service Worker registration failed: ", error\);/g,
      'console.log("Service Worker registration failed: ", error);');

    return content;
  }

  emergencyTemplateFix(content) {
    // 修复模板字符串问题
    
    // 1. 修复未终止的模板字符串
    content = content.replace(/`([^`]*$)/gm, '`$1`');
    
    // 2. 修复常见的模板字符串错误
    content = content.replace(/const endMark = `\$\{name"\}-end`;\`/g,
      "const endMark = `${name}-end`;");

    return content;
  }

  emergencyConsoleFix(content) {
    // 修复console语句
    
    // 1. 修复console.log中的语法错误
    content = content.replace(/console\.log\(([^)]*), error\);/g, 
      "console.log($1, error);");
    
    // 2. 修复console.error中的语法错误
    content = content.replace(/console\.error\(([^)]*), error\);/g,
      "console.error($1, error);");
    
    // 3. 修复console.warn中的语法错误
    content = content.replace(/console\.warn\(([^)]*), error\);/g,
      "console.warn($1, error);");

    return content;
  }

  emergencyObjectFix(content) {
    // 修复对象和属性问题
    
    // 1. 修复对象属性的分号错误
    content = content.replace(/(\w+):\s*(['"`][^'"`]*['"`]);/g, '$1: $2,');
    
    // 2. 修复方法声明
    content = content.replace(/private readonly storageKey = 'enhanced-app-config',/g,
      "private readonly storageKey = 'enhanced-app-config';");
    
    content = content.replace(/private readonly remoteConfigUrl = '\/api\/config\/frontend',/g,
      "private readonly remoteConfigUrl = '/api/config/frontend';");

    return content;
  }

  emergencyFunctionFix(content) {
    // 修复函数相关问题
    
    // 1. 修复事件监听器
    content = content.replace(/enhancedConfigManager\.on\('configChanged, \(event\) => \{/g,
      "enhancedConfigManager.on('configChanged', (event) => {");
    
    content = content.replace(/enhancedConfigManager\.on\('themeChanged, \(theme\) => \{/g,
      "enhancedConfigManager.on('themeChanged', (theme) => {");
    
    // 2. 修复条件语句
    content = content.replace(/if \(this\.config\.ui\.theme === 'auto\) \{/g,
      "if (this.config.ui.theme === 'auto') {");

    return content;
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new EmergencyCoreFixer();
  fixer.execute().catch(error => {
    console.error('❌ 紧急修复失败:', error);
    process.exit(1);
  });
}

module.exports = EmergencyCoreFixer;
