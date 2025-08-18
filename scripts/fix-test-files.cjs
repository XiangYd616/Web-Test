const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复测试文件的语法错误
 */
class TestFilesFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixedFiles = [];
  }

  /**
   * 执行测试文件修复
   */
  async execute() {
    console.log('🧪 修复测试文件的语法错误...\n');

    try {
      const initialErrors = this.getErrorCount();
      console.log('📊 初始错误数量:', initialErrors);

      // 获取所有测试文件
      const testFiles = this.getAllTestFiles();
      console.log('📁 发现', testFiles.length, '个测试文件');

      // 修复每个测试文件
      for (const testFile of testFiles) {
        await this.fixTestFile(testFile);
      }

      const finalErrors = this.getErrorCount();
      console.log('📊 修复后错误数量:', finalErrors);
      console.log('✅ 减少了', initialErrors - finalErrors, '个错误');
      console.log('🔧 修复了', this.fixedFiles.length, '个测试文件');

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
   * 获取所有测试文件
   */
  getAllTestFiles() {
    const testFiles = [];
    
    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(fullPath);
          } else if (item.endsWith('.test.tsx') || item.endsWith('.test.ts') || item.endsWith('.spec.tsx') || item.endsWith('.spec.ts')) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }
    
    scanDirectory(this.frontendPath);
    return testFiles;
  }

  /**
   * 修复单个测试文件
   */
  async fixTestFile(filePath) {
    const relativePath = path.relative(this.frontendPath, filePath);
    console.log('🔧 修复测试文件:', relativePath);

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用测试文件特定的修复
      content = this.fixTestSyntax(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(relativePath);
        console.log('  ✅ 修复完成');
      } else {
        console.log('  ℹ️ 无需修复');
      }

    } catch (error) {
      console.error('  ❌ 修复失败:', error.message);
    }
  }

  /**
   * 修复测试语法
   */
  fixTestSyntax(content) {
    // 1. 修复注释语法
    content = content.replace(/\/\*\*;/g, '/**');
    content = content.replace(/\s*\*\s*[^*\n]*;/g, (match) => match.replace(/;$/, ''));
    content = content.replace(/\s*\*\//g, ' */');

    // 2. 修复describe语句
    content = content.replace(/describe\('([^']*)';\s*$/gm, "describe('$1', () => {");
    content = content.replace(/describe\("([^"]*)";\s*$/gm, 'describe("$1", () => {');

    // 3. 修复it语句
    content = content.replace(/it\('([^']*)';\s*$/gm, "it('$1', () => {");
    content = content.replace(/it\("([^"]*)";\s*$/gm, 'it("$1", () => {');

    // 4. 修复expect语句
    content = content.replace(/expect\([^)]*\)\.[^)]*\(\)['"]\s*$/gm, (match) => {
      return match.replace(/['"]$/, ';');
    });

    // 5. 修复render语句
    content = content.replace(/render\([^)]*\)['"]\s*$/gm, (match) => {
      return match.replace(/['"]$/, ';');
    });

    // 6. 修复fireEvent语句
    content = content.replace(/fireEvent\.[^)]*\([^)]*\)['"]\s*$/gm, (match) => {
      return match.replace(/['"]$/, ';');
    });

    // 7. 修复缺少的括号和分号
    content = content.replace(/\}\)['"]\s*$/gm, '});');
    content = content.replace(/\)['"]\s*$/gm, ');');

    // 8. 修复字符串引号问题
    content = content.replace(/className="([^"]*>)/g, 'className="$1"');
    content = content.replace(/className='([^']*>)/g, "className='$1'");

    // 9. 修复JSX属性
    content = content.replace(/<([^>]*)\s+([^=]+)=([^"'\s>]+)([^>]*)>/g, '<$1 $2="$3"$4>');

    // 10. 逐行修复
    const lines = content.split('\n');
    const fixedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;

      // 修复describe块
      if (line.trim().match(/^describe\(/)) {
        if (!line.includes(', () => {') && !line.includes(', function() {')) {
          line = line.replace(/describe\('([^']*)'[^{]*$/, "describe('$1', () => {");
          line = line.replace(/describe\("([^"]*)"[^{]*$/, 'describe("$1", () => {');
        }
      }

      // 修复it块
      if (line.trim().match(/^it\(/)) {
        if (!line.includes(', () => {') && !line.includes(', function() {')) {
          line = line.replace(/it\('([^']*)'[^{]*$/, "it('$1', () => {");
          line = line.replace(/it\("([^"]*)"[^{]*$/, 'it("$1", () => {');
        }
      }

      // 修复expect语句
      if (line.includes('expect(') && line.includes(')\'\'')) {
        line = line.replace(/\)\'\'$/, ');');
      }
      if (line.includes('expect(') && line.includes(')""')) {
        line = line.replace(/\)""$/, ');');
      }

      // 修复render语句
      if (line.includes('render(') && line.includes(')\'\'')) {
        line = line.replace(/\)\'\'$/, ');');
      }
      if (line.includes('render(') && line.includes(')""')) {
        line = line.replace(/\)""$/, ');');
      }

      // 修复缺少的分号
      if (line.trim().match(/^(expect|render|fireEvent|screen)\([^;]*[^;]$/)) {
        line = line + ';';
      }

      // 修复缺少的右括号
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens && line.trim().endsWith('\'\'')) {
        const diff = openParens - closeParens;
        line = line.replace(/\'\'$/, ')'.repeat(diff) + ';');
      }

      fixedLines.push(line);
    }

    content = fixedLines.join('\n');

    // 最终清理
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+$/gm, '')
      .replace(/\n+$/, '\n');

    return content;
  }
}

if (require.main === module) {
  const fixer = new TestFilesFixer();
  fixer.execute().catch(console.error);
}

module.exports = { TestFilesFixer };
