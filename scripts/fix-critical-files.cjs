const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复关键文件的语法错误
 */
class CriticalFilesFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixes = [];
  }

  /**
   * 执行关键文件修复
   */
  async execute() {
    console.log('🎯 修复关键文件的语法错误...\n');

    try {
      const initialErrors = this.getErrorCount();
      console.log('📊 初始错误数量:', initialErrors);

      // 修复最严重的文件
      await this.fixStressTestTsx();
      await this.fixSeoAnalysisEngine();
      await this.fixExportUtils();
      await this.fixLocalSeoAnalysisEngine();
      await this.fixSystemService();

      const finalErrors = this.getErrorCount();
      console.log('📊 修复后错误数量:', finalErrors);
      console.log('✅ 减少了', initialErrors - finalErrors, '个错误');

    } catch (error) {
      console.error('❌ 修复失败:', error);
    }
  }

  /**
   * 获取错误数量
   */
  getErrorCount() {
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return 0;
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      return (errorOutput.match(/error TS/g) || []).length;
    }
  }

  /**
   * 修复StressTest.tsx
   */
  async fixStressTestTsx() {
    console.log('🔧 修复StressTest.tsx...');

    const filePath = path.join(this.frontendPath, 'pages/core/testing/StressTest.tsx');
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️ 文件不存在，跳过');
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用基础修复
      content = this.applyBasicFixes(content);

      // 特殊修复：处理React组件结构
      content = this.fixReactComponent(content, 'StressTest');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ StressTest.tsx 修复完成');
        this.fixes.push('StressTest.tsx');
      }

    } catch (error) {
      console.error('  ❌ 修复StressTest.tsx失败:', error.message);
    }
  }

  /**
   * 修复seoAnalysisEngine.ts
   */
  async fixSeoAnalysisEngine() {
    console.log('🔧 修复seoAnalysisEngine.ts...');

    const filePath = path.join(this.frontendPath, 'services/seo/seoAnalysisEngine.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️ 文件不存在，跳过');
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用基础修复
      content = this.applyBasicFixes(content);

      // 特殊修复：处理TypeScript类和接口
      content = this.fixTypeScriptStructures(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ seoAnalysisEngine.ts 修复完成');
        this.fixes.push('seoAnalysisEngine.ts');
      }

    } catch (error) {
      console.error('  ❌ 修复seoAnalysisEngine.ts失败:', error.message);
    }
  }

  /**
   * 修复exportUtils.ts
   */
  async fixExportUtils() {
    console.log('🔧 修复exportUtils.ts...');

    const filePath = path.join(this.frontendPath, 'utils/exportUtils.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️ 文件不存在，跳过');
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用基础修复
      content = this.applyBasicFixes(content);

      // 特殊修复：处理工具函数
      content = this.fixUtilityFunctions(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ exportUtils.ts 修复完成');
        this.fixes.push('exportUtils.ts');
      }

    } catch (error) {
      console.error('  ❌ 修复exportUtils.ts失败:', error.message);
    }
  }

  /**
   * 修复localSEOAnalysisEngine.ts
   */
  async fixLocalSeoAnalysisEngine() {
    console.log('🔧 修复localSEOAnalysisEngine.ts...');

    const filePath = path.join(this.frontendPath, 'services/seo/localSEOAnalysisEngine.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️ 文件不存在，跳过');
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用基础修复
      content = this.applyBasicFixes(content);

      // 特殊修复：处理TypeScript类和接口
      content = this.fixTypeScriptStructures(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ localSEOAnalysisEngine.ts 修复完成');
        this.fixes.push('localSEOAnalysisEngine.ts');
      }

    } catch (error) {
      console.error('  ❌ 修复localSEOAnalysisEngine.ts失败:', error.message);
    }
  }

  /**
   * 修复systemService.ts
   */
  async fixSystemService() {
    console.log('🔧 修复systemService.ts...');

    const filePath = path.join(this.frontendPath, 'services/system/systemService.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️ 文件不存在，跳过');
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用基础修复
      content = this.applyBasicFixes(content);

      // 特殊修复：处理服务类
      content = this.fixServiceClass(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ systemService.ts 修复完成');
        this.fixes.push('systemService.ts');
      }

    } catch (error) {
      console.error('  ❌ 修复systemService.ts失败:', error.message);
    }
  }

  /**
   * 应用基础修复
   */
  applyBasicFixes(content) {
    // 1. 修复字符串引号问题
    content = content.replace(/([^\\])'([^']*)\s*$/gm, "$1'$2'");
    content = content.replace(/([^\\])"([^"]*)\s*$/gm, '$1"$2"');
    content = content.replace(/([^\\])`([^`]*)\s*$/gm, "$1`$2`");

    // 2. 修复缺少分号
    content = content.replace(/^(\s*[^{};\/\n]+[^{};\/\s])\s*$/gm, '$1;');

    // 3. 修复缺少逗号
    content = content.replace(/(\w+:\s*[^,}\n]+)\s*\n\s*(\w+:)/g, '$1,\n  $2');

    // 4. 修复括号匹配
    content = content.replace(/(\w+\([^)]*)\s*$/gm, '$1)');

    // 5. 清理多余的符号
    content = content.replace(/;;+/g, ';');
    content = content.replace(/,,+/g, ',');

    // 6. 修复常见的语法错误模式
    content = content.replace(/\);';'/g, ');');
    content = content.replace(/\}';'/g, '}');
    content = content.replace(/\]';'/g, ']');

    return content;
  }

  /**
   * 修复React组件
   */
  fixReactComponent(content, componentName) {
    // 确保组件有正确的导入
    if (!content.includes("import React")) {
      content = "import React from 'react';\n" + content;
    }

    // 确保组件有正确的导出
    if (!content.includes(`export default ${componentName}`)) {
      content += `\n\nexport default ${componentName};`;
    }

    // 修复JSX语法
    content = content.replace(/className\s*=\s*([^"\s>]+)/g, 'className="$1"');
    content = content.replace(/<(\w+)([^>]*)\s*$/gm, '<$1$2>');

    return content;
  }

  /**
   * 修复TypeScript结构
   */
  fixTypeScriptStructures(content) {
    // 修复接口定义
    content = content.replace(/interface\s+([^{]+)\s*{/g, 'interface $1 {');
    
    // 修复类型别名
    content = content.replace(/type\s+([^=]+)\s*=\s*([^;]+);?/g, 'type $1 = $2;');

    // 修复类定义
    content = content.replace(/class\s+([^{]+)\s*{/g, 'class $1 {');

    // 修复方法定义
    content = content.replace(/(\w+)\s*\([^)]*\)\s*:\s*([^{]+)\s*{/g, '$1(): $2 {');

    return content;
  }

  /**
   * 修复工具函数
   */
  fixUtilityFunctions(content) {
    // 修复函数导出
    content = content.replace(/export\s+function\s+([^(]+)\s*\(/g, 'export function $1(');
    
    // 修复函数声明
    content = content.replace(/function\s+([^(]+)\s*\(/g, 'function $1(');

    // 修复箭头函数
    content = content.replace(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/g, 'const $1 = () => {');

    return content;
  }

  /**
   * 修复服务类
   */
  fixServiceClass(content) {
    // 修复类方法
    content = content.replace(/(\w+)\s*\([^)]*\)\s*{/g, '$1() {');
    
    // 修复异步方法
    content = content.replace(/async\s+(\w+)\s*\([^)]*\)\s*{/g, 'async $1() {');

    // 修复静态方法
    content = content.replace(/static\s+(\w+)\s*\([^)]*\)\s*{/g, 'static $1() {');

    return content;
  }
}

if (require.main === module) {
  const fixer = new CriticalFilesFixer();
  fixer.execute().catch(console.error);
}

module.exports = { CriticalFilesFixer };
