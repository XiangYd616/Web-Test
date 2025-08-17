#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FinalCoreFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
  }

  async execute() {
    console.log('🔧 最终核心文件修复...\n');

    const coreFiles = [
      'main.tsx',
      'config/ConfigManager.ts',
      'services/apiErrorInterceptor.ts',
      'services/errorService.ts',
      'utils/performanceMonitor.ts',
      'utils/routePreloader.ts'
    ];

    for (const filePath of coreFiles) {
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
      content = this.fixAllErrors(content, path.basename(filePath));

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(path.relative(this.projectRoot, filePath));
        console.log(`✅ 修复: ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      console.log(`❌ 错误: ${path.relative(this.projectRoot, filePath)} - ${error.message}`);
    }
  }

  fixAllErrors(content, fileName) {
    // 根据文件名应用特定修复
    switch (fileName) {
      case 'main.tsx':
        return this.fixMainTsx(content);
      case 'ConfigManager.ts':
        return this.fixConfigManager(content);
      case 'apiErrorInterceptor.ts':
        return this.fixApiErrorInterceptor(content);
      case 'errorService.ts':
        return this.fixErrorService(content);
      case 'performanceMonitor.ts':
        return this.fixPerformanceMonitor(content);
      case 'routePreloader.ts':
        return this.fixRoutePreloader(content);
      default:
        return this.fixGeneral(content);
    }
  }

  fixMainTsx(content) {
    // 修复main.tsx的特定错误
    content = content.replace(/ReactDOM\.createRoot\(document\.getElementById\('root'\)!\'\)\.render\('\)/g,
      "ReactDOM.createRoot(document.getElementById('root')!).render(");
    
    content = content.replace(/\<\/React\.StrictMode\>,/g, "</React.StrictMode>");
    
    // 确保正确的JSX结构
    if (content.includes('React.StrictMode')) {
      content = content.replace(/\)\s*$/g, ')');
    }

    return content;
  }

  fixConfigManager(content) {
    // 修复ConfigManager.ts的特定错误
    
    // 移除文件末尾的未终止模板字符串
    content = content.replace(/\n`\s*$/g, '');
    
    // 修复媒体查询行
    content = content.replace(/const mediaQuery = window\.matchMedia\('prefers-color-scheme: dark'\);[\s\S]*?$/gm,
      "const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');");

    return content;
  }

  fixApiErrorInterceptor(content) {
    // 修复apiErrorInterceptor.ts的特定错误
    
    // 修复console.warn语句
    content = content.replace(/console\.warn\(`Rate limited\. Retry after \$\{waitTime\}ms`\);/g,
      "console.warn('Rate limited. Retry after ' + waitTime + 'ms');");
    
    // 修复generateRequestId方法
    content = content.replace(/return `req_\$\{Date\.now\(\)\}_\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 9\)\}`;/g,
      "return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);");
    
    // 移除文件末尾的未终止模板字符串
    content = content.replace(/\n\s*$/g, '');

    return content;
  }

  fixErrorService(content) {
    // 修复errorService.ts的特定错误
    
    // 修复console语句
    content = content.replace(/console\[logMethod\]\(`\[\$\{error\.type\}\] \$\{error\.message\}`, \{/g,
      "console[logMethod]('[' + error.type + '] ' + error.message, {");
    
    // 修复context对象
    content = content.replace(/context: \{'\);/g, "context: {");
    content = content.replace(/operation: context\?\.operation \|\| 'async operation',/g,
      "operation: context?.operation || 'async operation'");
    
    // 修复对象结束
    content = content.replace(/\"\},/g, '},');
    content = content.replace(/stack: errorObj\.stack,/g, 'stack: errorObj.stack');
    
    // 移除文件末尾的未终止模板字符串
    content = content.replace(/\n`\s*$/g, '');

    return content;
  }

  fixPerformanceMonitor(content) {
    // 修复performanceMonitor.ts的特定错误
    
    // 修复endMark声明
    content = content.replace(/const endMark = `\$\{name\}-end`;\`/g,
      "const endMark = `${name}-end`;");
    
    // 移除文件末尾的未终止模板字符串
    content = content.replace(/\n`\s*$/g, '');

    return content;
  }

  fixRoutePreloader(content) {
    // 修复routePreloader.ts的特定错误
    
    // 修复事件监听器
    content = content.replace(/element\.addEventListener\('mouseenter', handleMouseEnter'\);/g,
      "element.addEventListener('mouseenter', handleMouseEnter);");
    
    content = content.replace(/element\.addEventListener\('mouseleave', handleMouseLeave'\);/g,
      "element.addEventListener('mouseleave', handleMouseLeave);");
    
    content = content.replace(/element\.removeEventListener\('mouseleave', handleMouseLeave'\);/g,
      "element.removeEventListener('mouseleave', handleMouseLeave);");
    
    // 修复返回值
    content = content.replace(/return 'loaded;/g, "return 'loaded';");
    content = content.replace(/return 'loading;/g, "return 'loading';");
    content = content.replace(/return 'failed;/g, "return 'failed';");
    content = content.replace(/return 'idle;/g, "return 'idle';");
    
    // 修复import语句
    content = content.replace(/import\('\.\.\/pages\/core\/auth\/Register\)/g,
      "import('../pages/core/auth/Register')");
    
    // 修复数组
    content = content.replace(/critical: \['\/dashboard', '\/website-test', '\/test-history\],/g,
      "critical: ['/dashboard', '/website-test', '/test-history'],");
    
    content = content.replace(/high: \['\/security-test', '\/performance-test', '\/seo-test', '\/api-test\],/g,
      "high: ['/security-test', '/performance-test', '/seo-test', '/api-test'],");
    
    content = content.replace(/medium: \['\/network-test', '\/database-test', '\/stress-test', '\/compatibility-test\],/g,
      "medium: ['/network-test', '/database-test', '/stress-test', '/compatibility-test'],");
    
    content = content.replace(/low: \['\/settings', '\/profile', '\/admin', \/integrations\]/g,
      "low: ['/settings', '/profile', '/admin', '/integrations']");

    return content;
  }

  fixGeneral(content) {
    // 通用修复规则
    
    // 1. 移除文件末尾的未终止模板字符串
    content = content.replace(/\n`\s*$/g, '');
    
    // 2. 修复常见的字符串错误
    content = content.replace(/(['"`])([^'"`]*?)[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+\1/g, '$1$2$1');
    
    // 3. 清理行末空白字符
    content = content.replace(/[\t ]+$/gm, '');
    
    // 4. 标准化换行符
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return content;
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new FinalCoreFixer();
  fixer.execute().catch(error => {
    console.error('❌ 最终核心修复失败:', error);
    process.exit(1);
  });
}

module.exports = FinalCoreFixer;
