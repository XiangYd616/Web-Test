#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConfigManagerFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.filePath = path.join(this.projectRoot, 'frontend', 'config', 'ConfigManager.ts');
  }

  async execute() {
    console.log('🔧 修复 ConfigManager.ts...\n');

    try {
      let content = fs.readFileSync(this.filePath, 'utf8');
      
      // 应用所有修复规则
      content = this.fixStringLiterals(content);
      content = this.fixMethodDeclarations(content);
      content = this.fixPropertyDeclarations(content);
      content = this.fixTemplateStrings(content);
      content = this.fixFunctionCalls(content);
      content = this.fixConditionalStatements(content);
      content = this.fixObjectProperties(content);
      content = this.fixArrayDeclarations(content);
      content = this.fixClassMethods(content);
      content = this.fixEventEmitters(content);

      fs.writeFileSync(this.filePath, content);
      console.log('✅ ConfigManager.ts 修复完成');

    } catch (error) {
      console.error('❌ 修复失败:', error);
      throw error;
    }
  }

  fixStringLiterals(content) {
    // 修复未终止的字符串字面量
    content = content.replace(/performanceMonitoring: import\.meta\.env\.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false;/g, 
      "performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false'");
    
    content = content.replace(/console\.warn\('Failed to sync with remote config: , error\);/g,
      "console.warn('Failed to sync with remote config:', error);");
    
    content = content.replace(/if \(this\.config\.ui\.theme === 'auto\) \{/g,
      "if (this.config.ui.theme === 'auto') {");
    
    content = content.replace(/this\.emit\('themeChanged', e\.matches \? 'dark' : 'light\);/g,
      "this.emit('themeChanged', e.matches ? 'dark' : 'light');");
    
    content = content.replace(/this\.emit\('networkStatusChanged', true'\);/g,
      "this.emit('networkStatusChanged', true);");
    
    content = content.replace(/this\.emit\('networkStatusChanged', false'\);/g,
      "this.emit('networkStatusChanged', false);");

    return content;
  }

  fixMethodDeclarations(content) {
    // 修复方法声明中的语法错误
    content = content.replace(/get<K extends keyof FrontendConfig>\(key: K\): FrontendConfig\[K\];/g,
      "get<K extends keyof FrontendConfig>(key: K): FrontendConfig[K];");
    
    content = content.replace(/get\(key: string\): any;/g,
      "get(key: string): any;");
    
    content = content.replace(/get\(key: string\): any \{/g,
      "get(key: string): any {");

    return content;
  }

  fixPropertyDeclarations(content) {
    // 修复属性声明
    content = content.replace(/private readonly storageKey = 'enhanced-app-config',/g,
      "private readonly storageKey = 'enhanced-app-config';");
    
    content = content.replace(/private readonly remoteConfigUrl = '\/api\/config\/frontend',/g,
      "private readonly remoteConfigUrl = '/api/config/frontend';");

    return content;
  }

  fixTemplateStrings(content) {
    // 修复模板字符串
    content = content.replace(/path\.split\('\.\)/g, "path.split('.')");
    content = content.replace(/const endMark = `\$\{name"\}-end`;\`/g, "const endMark = `${name}-end`;");

    return content;
  }

  fixFunctionCalls(content) {
    // 修复函数调用
    content = content.replace(/this\.emit\('configChanged', \{ \.\.\.change, source \} as ConfigChangeEvent\)'; /g,
      "this.emit('configChanged', { ...change, source } as ConfigChangeEvent);");
    
    content = content.replace(/this\.emit\('configUpdated', \{ oldConfig, newConfig, changes, source \}'\);/g,
      "this.emit('configUpdated', { oldConfig, newConfig, changes, source });");

    return content;
  }

  fixConditionalStatements(content) {
    // 修复条件语句
    content = content.replace(/const mediaQuery = window\.matchMedia\('prefers-color-scheme: dark'\);/g,
      "const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');");

    return content;
  }

  fixObjectProperties(content) {
    // 修复对象属性
    content = content.replace(/cacheStrategy: 'stale-while-revalidate,/g,
      "cacheStrategy: 'stale-while-revalidate',");

    return content;
  }

  fixArrayDeclarations(content) {
    // 修复数组声明
    content = content.replace(/private deepMerge\(\.\.\.objects: any\[\]\): any \{/g,
      "private deepMerge(...objects: any[]): any {");

    return content;
  }

  fixClassMethods(content) {
    // 修复类方法
    content = content.replace(/set\(key: string, value: any, source: 'local' \| 'user' = 'user'\): void \{/g,
      "set(key: string, value: any, source: 'local' | 'user' = 'user'): void {");
    
    content = content.replace(/updateBatch\(updates: Partial<FrontendConfig>, source: 'local' \| 'user' = 'user'\): void \{/g,
      "updateBatch(updates: Partial<FrontendConfig>, source: 'local' | 'user' = 'user'): void {");

    return content;
  }

  fixEventEmitters(content) {
    // 修复事件发射器
    content = content.replace(/this\.emit\('initialized', this\.config'\);/g,
      "this.emit('initialized', this.config);");

    return content;
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new ConfigManagerFixer();
  fixer.execute().catch(error => {
    console.error('❌ ConfigManager 修复失败:', error);
    process.exit(1);
  });
}

module.exports = ConfigManagerFixer;
