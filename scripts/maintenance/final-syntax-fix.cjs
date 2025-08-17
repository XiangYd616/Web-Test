#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FinalSyntaxFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
  }

  async execute() {
    console.log('🔧 最终语法修复...\n');

    const problemFiles = [
      'config/ConfigManager.ts',
      'services/apiErrorInterceptor.ts', 
      'services/errorService.ts',
      'utils/performanceMonitor.ts',
      'utils/routePreloader.ts'
    ];

    for (const filePath of problemFiles) {
      await this.fixFile(path.join(this.frontendRoot, filePath));
    }

    console.log('\n📊 最终修复报告:');
    console.log(`   修复文件: ${this.fixedFiles.length}`);
    this.fixedFiles.forEach(file => console.log(`   ✅ ${file}`));
  }

  async fixFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // 应用所有修复规则
      content = this.fixAllSyntaxErrors(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(path.relative(this.projectRoot, filePath));
        console.log(`✅ 修复: ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      console.log(`❌ 错误: ${path.relative(this.projectRoot, filePath)} - ${error.message}`);
    }
  }

  fixAllSyntaxErrors(content) {
    // 1. 修复所有未终止的字符串字面量
    content = content.replace(/console\.log\('✅ Performance Monitor initialized \(simplified'\)'\);/g,
      "console.log('✅ Performance Monitor initialized (simplified)');");
    
    content = content.replace(/console\.error\('❌ Failed to initialize Performance Monitor: , error\);/g,
      "console.error('❌ Failed to initialize Performance Monitor:', error);");
    
    content = content.replace(/console\.error\('Failed to save local config: , error\);/g,
      "console.error('Failed to save local config:', error);");
    
    content = content.replace(/console\.log\('📝 Performance Monitor destroyed\);/g,
      "console.log('📝 Performance Monitor destroyed');");

    // 2. 修复模板字符串错误
    content = content.replace(/const endMark = `\$\{name"\}-end`;\`/g,
      "const endMark = `${name}-end`;");
    
    content = content.replace(/if \('performance' in window && 'mark' in performance && 'measure' in performance\) \{"\`/g,
      "if ('performance' in window && 'mark' in performance && 'measure' in performance) {");

    // 3. 修复函数参数和返回类型
    content = content.replace(/private getConfigDifferences\(oldConfig: any, newConfig: any, prefix = '\): Array<\{ key: string, oldValue: any, newValue: any \}> \{/g,
      "private getConfigDifferences(oldConfig: any, newConfig: any, prefix = ''): Array<{ key: string, oldValue: any, newValue: any }> {");

    // 4. 修复事件发射器调用
    content = content.replace(/this\.emit\('configChanged', \{ \.\.\.change, source \} as ConfigChangeEvent\)'; /g,
      "this.emit('configChanged', { ...change, source } as ConfigChangeEvent);");

    // 5. 修复条件语句中的引号错误
    content = content.replace(/if \(message\.includes\('unauthorized'\) \|\| message\.includes\('auth'\)'\) \{/g,
      "if (message.includes('unauthorized') || message.includes('auth')) {");
    
    content = content.replace(/if \(message\.includes\('forbidden'\) \|\| message\.includes\('permission'\)'\) \{/g,
      "if (message.includes('forbidden') || message.includes('permission')) {");
    
    content = content.replace(/if \(message\.includes\('critical'\) \|\| message\.includes\('fatal'\)'\) \{/g,
      "if (message.includes('critical') || message.includes('fatal')) {");
    
    content = content.replace(/if \(message\.includes\('network'\) \|\| message\.includes\('timeout'\)'\) \{/g,
      "if (message.includes('network') || message.includes('timeout')) {");
    
    content = content.replace(/if \(message\.includes\('network'\)'\) \{/g,
      "if (message.includes('network')) {");
    
    content = content.replace(/if \(message\.includes\('unauthorized'\) \|\| message\.includes\('forbidden'\)'\) \{/g,
      "if (message.includes('unauthorized') || message.includes('forbidden')) {");
    
    content = content.replace(/message\.includes\('fetch'\) \|\| message\.includes\('connection'\)'\) \{/g,
      "message.includes('fetch') || message.includes('connection')) {");

    // 6. 修复return语句中的字符串
    content = content.replace(/return '网络连接失败，请检查网络后重试;/g,
      "return '网络连接失败，请检查网络后重试';");
    
    content = content.replace(/return '操作超时，请稍后重试;/g,
      "return '操作超时，请稍后重试';");
    
    content = content.replace(/return '操作多次失败，请稍后再试或联系技术支持;/g,
      "return '操作多次失败，请稍后再试或联系技术支持';");
    
    content = content.replace(/return '操作失败，请重试;/g,
      "return '操作失败，请重试';");

    // 7. 修复console.log中的模板字符串
    content = content.replace(/const logMethod = error\.severity === ErrorSeverity\.CRITICAL \? 'error' : '/g,
      "const logMethod = error.severity === ErrorSeverity.CRITICAL ? 'error' :");
    
    content = content.replace(/error\.severity === ErrorSeverity\.HIGH \? 'warn' : info;\`/g,
      "error.severity === ErrorSeverity.HIGH ? 'warn' : 'info';");

    // 8. 修复对象属性
    content = content.replace(/"\},/g, '"},');
    content = content.replace(/stack: errorObj\.stack,/g, 'stack: errorObj.stack,');

    // 9. 修复方法声明
    content = content.replace(/return `req_\$\{Date\.now\(\)\}_\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 9\)\}`;/g,
      "return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;");

    // 10. 修复类方法结构
    content = content.replace(/destroy\(\): void \{/g, "destroy(): void {");
    content = content.replace(/getStatus\(\) \{/g, "getStatus() {");

    // 11. 修复for循环
    content = content.replace(/const allKeys = new Set\(\[\.\.\.Object\.keys\(oldConfig \|\| \{\}\), \.\.\.Object\.keys\(newConfig \|\| \{\}\)\]\);/g,
      "const allKeys = new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]);");

    // 12. 修复if语句
    content = content.replace(/if\(this\.syncInterval\) \{/g, "if (this.syncInterval) {");

    // 13. 修复媒体查询
    content = content.replace(/const mediaQuery = window\.matchMedia\('\(prefers-color-scheme: dark\)'\);/g,
      "const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');");

    // 14. 修复模板字符串中的emoji
    content = content.replace(/console\.warn\(`❌ 预加载失败: \$\{routePath\}`, error\);/g,
      "console.warn('❌ 预加载失败:', routePath, error);");

    // 15. 移除多余的模板字符串标记
    content = content.replace(/'\`$/gm, '');
    content = content.replace(/\`$/gm, '');

    // 16. 修复类的结束
    content = content.replace(/\n\}\n'\`\n$/gm, '\n}');

    return content;
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new FinalSyntaxFixer();
  fixer.execute().catch(error => {
    console.error('❌ 最终语法修复失败:', error);
    process.exit(1);
  });
}

module.exports = FinalSyntaxFixer;
