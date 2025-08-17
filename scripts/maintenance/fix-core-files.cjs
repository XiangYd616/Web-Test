#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CoreFilesFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
    this.errors = [];
  }

  async execute() {
    console.log('🔧 修复核心文件...\n');

    const coreFiles = [
      'services/errorService.ts',
      'services/apiErrorInterceptor.ts', 
      'utils/performanceMonitor.ts',
      'utils/routePreloader.ts',
      'main.tsx',
      'components/common/ErrorBoundary.tsx',
      'contexts/AuthContext.tsx',
      'contexts/ThemeContext.tsx',
      'contexts/AppContext.tsx'
    ];

    for (const filePath of coreFiles) {
      await this.fixFile(path.join(this.frontendRoot, filePath));
    }

    this.generateReport();
  }

  async fixFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // 应用通用修复规则
      content = this.fixStringLiterals(content);
      content = this.fixTemplateStrings(content);
      content = this.fixFunctionCalls(content);
      content = this.fixConditionalStatements(content);
      content = this.fixMethodDeclarations(content);
      content = this.fixObjectProperties(content);
      content = this.fixJSXAttributes(content);
      content = this.fixImportStatements(content);
      content = this.fixTypeAnnotations(content);
      content = this.fixArrayDeclarations(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(path.relative(this.projectRoot, filePath));
        console.log(`✅ 修复: ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      this.errors.push({
        file: path.relative(this.projectRoot, filePath),
        error: error.message
      });
      console.log(`❌ 错误: ${path.relative(this.projectRoot, filePath)} - ${error.message}`);
    }
  }

  fixStringLiterals(content) {
    // 修复未终止的字符串字面量
    content = content.replace(/const errorType = error\.name \|\| 'UnknownError;/g,
      "const errorType = error.name || 'UnknownError';");
    
    content = content.replace(/if \(typeof error === 'string\) \{/g,
      "if (typeof error === 'string') {");
    
    content = content.replace(/const message = error\.message \|\| error\.response\?\.data\?\.message \|\| '请求失败;/g,
      "const message = error.message || error.response?.data?.message || '请求失败';");
    
    content = content.replace(/userFriendlyMessage: '发生了未知错误，请稍后重试,/g,
      "userFriendlyMessage: '发生了未知错误，请稍后重试',");

    // 修复各种未终止的字符串
    content = content.replace(/return '网络连接失败，请检查您的网络设置;/g,
      "return '网络连接失败，请检查您的网络设置';");
    
    content = content.replace(/return '请求超时，请稍后重试;/g,
      "return '请求超时，请稍后重试';");
    
    content = content.replace(/return '登录已过期，请重新登录;/g,
      "return '登录已过期，请重新登录';");
    
    content = content.replace(/return '权限不足，无法执行此操作;/g,
      "return '权限不足，无法执行此操作';");
    
    content = content.replace(/return '输入信息有误，请检查后重试;/g,
      "return '输入信息有误，请检查后重试';");
    
    content = content.replace(/return '服务器暂时不可用，请稍后重试;/g,
      "return '服务器暂时不可用，请稍后重试';");
    
    content = content.replace(/return '操作失败，请稍后重试;/g,
      "return '操作失败，请稍后重试';");

    return content;
  }

  fixTemplateStrings(content) {
    // 修复模板字符串
    content = content.replace(/console\.warn\(`❌ 预加载失败: \$\{routePath\}`, error\);/g,
      "console.warn(`❌ 预加载失败: ${routePath}`, error);");
    
    content = content.replace(/console\.warn\(`Rate limited\. Retry after \$\{waitTime\}ms`\);/g,
      "console.warn(`Rate limited. Retry after ${waitTime}ms`);");

    return content;
  }

  fixFunctionCalls(content) {
    // 修复函数调用中的语法错误
    content = content.replace(/if \(typeof data === 'string' && data\.includes\('<html>'\)'\) \{/g,
      "if (typeof data === 'string' && data.includes('<html>')) {");
    
    content = content.replace(/if \(message\.includes\('network'\) \|\| message\.includes\('fetch'\)'\) \{/g,
      "if (message.includes('network') || message.includes('fetch')) {");
    
    content = content.replace(/if \(message\.includes\('timeout'\)'\) \{/g,
      "if (message.includes('timeout')) {");
    
    content = content.replace(/if \(message\.includes\('unauthorized'\) \|\| message\.includes\('401'\)'\) \{/g,
      "if (message.includes('unauthorized') || message.includes('401')) {");
    
    content = content.replace(/if \(message\.includes\('forbidden'\) \|\| message\.includes\('403'\)'\) \{/g,
      "if (message.includes('forbidden') || message.includes('403')) {");
    
    content = content.replace(/if \(message\.includes\('validation'\) \|\| message\.includes\('invalid'\)'\) \{/g,
      "if (message.includes('validation') || message.includes('invalid')) {");
    
    content = content.replace(/if \(message\.includes\('server'\) \|\| message\.includes\('500'\)'\) \{/g,
      "if (message.includes('server') || message.includes('500')) {");

    return content;
  }

  fixConditionalStatements(content) {
    // 修复条件语句
    content = content.replace(/if \('performance' in window && 'mark' in performance'\) \{/g,
      "if ('performance' in window && 'mark' in performance) {");
    
    content = content.replace(/if \('performance' in window && 'mark' in performance && "measure" in performance'\) \{/g,
      "if ('performance' in window && 'mark' in performance && 'measure' in performance) {");

    return content;
  }

  fixMethodDeclarations(content) {
    // 修复方法声明
    content = content.replace(/private delay\(ms: number\): Promise<void> \{/g,
      "private delay(ms: number): Promise<void> {");
    
    content = content.replace(/private generateRequestId\(\): string \{/g,
      "private generateRequestId(): string {");

    return content;
  }

  fixObjectProperties(content) {
    // 修复对象属性
    content = content.replace(/"}\);/g, '});');
    content = content.replace(/unit: 'MB,/g, "unit: 'MB',");

    return content;
  }

  fixJSXAttributes(content) {
    // 修复JSX属性
    content = content.replace(/level='page'/g, "level='page'");

    return content;
  }

  fixImportStatements(content) {
    // 修复import语句
    content = content.replace(/import \{ /g, "import { ");

    return content;
  }

  fixTypeAnnotations(content) {
    // 修复类型注解
    content = content.replace(/: Promise<void> \{/g, ": Promise<void> {");
    content = content.replace(/: string \{/g, ": string {");
    content = content.replace(/: boolean \{/g, ": boolean {");
    content = content.replace(/: number \{/g, ": number {");

    return content;
  }

  fixArrayDeclarations(content) {
    // 修复数组声明
    content = content.replace(/: string\[\] \{/g, ": string[] {");
    content = content.replace(/: any\[\] \{/g, ": any[] {");

    return content;
  }

  generateReport() {
    console.log('\n📊 核心文件修复报告:');
    console.log(`   修复文件: ${this.fixedFiles.length}`);
    console.log(`   错误文件: ${this.errors.length}`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 已修复的文件:');
      this.fixedFiles.forEach(file => console.log(`   - ${file}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 修复失败的文件:');
      this.errors.forEach(error => console.log(`   - ${error.file}: ${error.error}`));
    }
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new CoreFilesFixer();
  fixer.execute().catch(error => {
    console.error('❌ 核心文件修复失败:', error);
    process.exit(1);
  });
}

module.exports = CoreFilesFixer;
