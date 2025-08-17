#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ComprehensiveTypeScriptFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
    this.errors = [];
    this.totalErrors = 0;
    this.fixedErrors = 0;
  }

  /**
   * 执行全面的TypeScript错误修复
   */
  async execute() {
    console.log('🔧 开始全面TypeScript错误修复...\n');

    try {
      // 1. 获取所有TypeScript文件
      const tsFiles = this.getAllTypeScriptFiles(this.frontendRoot);
      console.log(`📁 找到 ${tsFiles.length} 个TypeScript文件`);

      // 2. 修复每个文件
      for (const filePath of tsFiles) {
        await this.fixFile(filePath);
      }

      // 3. 生成修复报告
      this.generateFixReport();

      // 4. 验证修复结果
      await this.validateFixes();

    } catch (error) {
      console.error('❌ TypeScript修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTypeScriptFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
        files.push(...this.getAllTypeScriptFiles(fullPath));
      } else if (stat.isFile() && this.isTypeScriptFile(item)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 判断是否应该跳过目录
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', 'dist', 'build', '.git', '__tests__', 'coverage'];
    return skipDirs.includes(dirName);
  }

  /**
   * 判断是否是TypeScript文件
   */
  isTypeScriptFile(fileName) {
    return fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let fileFixed = false;

      // 应用各种修复规则
      const fixes = [
        this.fixUnterminatedStrings,
        this.fixQuoteMismatches,
        this.fixTemplateStringErrors,
        this.fixJSXStringErrors,
        this.fixImportStringErrors,
        this.fixObjectPropertyStringErrors,
        this.fixFunctionParameterStringErrors,
        this.fixArrayStringErrors,
        this.fixConditionalStringErrors
      ];

      for (const fixFunction of fixes) {
        const result = fixFunction.call(this, fixedContent);
        if (result.fixed) {
          fixedContent = result.content;
          fileFixed = true;
        }
      }

      // 如果文件被修复，保存它
      if (fileFixed) {
        fs.writeFileSync(filePath, fixedContent);
        this.fixedFiles.push({
          path: path.relative(this.projectRoot, filePath),
          fixes: 'Multiple string and syntax fixes'
        });
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

  /**
   * 修复未终止的字符串
   */
  fixUnterminatedStrings(content) {
    let fixed = false;
    let result = content;

    // 修复单引号未终止的字符串
    result = result.replace(/('[^']*$)/gm, (match, p1) => {
      if (!match.includes("'", 1)) {
        fixed = true;
        return p1 + "'";
      }
      return match;
    });

    // 修复双引号未终止的字符串
    result = result.replace(/("[^"]*$)/gm, (match, p1) => {
      if (!match.includes('"', 1)) {
        fixed = true;
        return p1 + '"';
      }
      return match;
    });

    // 修复模板字符串未终止
    result = result.replace(/(`[^`]*$)/gm, (match, p1) => {
      if (!match.includes('`', 1)) {
        fixed = true;
        return p1 + '`';
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复引号不匹配
   */
  fixQuoteMismatches(content) {
    let fixed = false;
    let result = content;

    // 修复混合引号问题 - 单引号开始双引号结束
    result = result.replace(/'([^'"]*?)"/g, (match, p1) => {
      fixed = true;
      return `'${p1}'`;
    });

    // 修复混合引号问题 - 双引号开始单引号结束
    result = result.replace(/"([^'"]*?)'/g, (match, p1) => {
      fixed = true;
      return `"${p1}"`;
    });

    // 修复JSX属性中的引号问题
    result = result.replace(/(\w+)=\s*(['"]).+?[^'"]\s*(['"]\s*[>}])/g, (match, attr, startQuote, endPart) => {
      if (startQuote === "'" && endPart.startsWith('"')) {
        fixed = true;
        return match.replace(/"/g, "'");
      } else if (startQuote === '"' && endPart.startsWith("'")) {
        fixed = true;
        return match.replace(/'/g, '"');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复模板字符串错误
   */
  fixTemplateStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复模板字符串中的变量引用错误
    result = result.replace(/`([^`]*)\$\{([^}]*)\}([^`]*)`'/g, (match, before, variable, after) => {
      fixed = true;
      return `\`${before}\${${variable}}${after}\``;
    });

    // 修复模板字符串的引号错误
    result = result.replace(/`([^`]*)'([^`]*)`/g, (match, before, after) => {
      fixed = true;
      return `\`${before}${after}\``;
    });

    return { content: result, fixed };
  }

  /**
   * 修复JSX字符串错误
   */
  fixJSXStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复JSX属性中的字符串错误
    result = result.replace(/(\w+)=\s*(['"]).+?[^'"]\s*;/g, (match, attr, quote) => {
      fixed = true;
      return match.replace(/;$/, quote);
    });

    // 修复className属性的字符串错误
    result = result.replace(/className=\s*(['"]).+?[^'"]\s*;/g, (match, quote) => {
      fixed = true;
      return match.replace(/;$/, quote);
    });

    // 修复JSX中的字符串连接错误
    result = result.replace(/\{([^}]*)'([^}]*)\}/g, (match, before, after) => {
      if (before.includes('"') || after.includes('"')) {
        fixed = true;
        return `{${before}"${after}"}`;
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复import语句字符串错误
   */
  fixImportStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复import语句中的字符串错误
    result = result.replace(/import\s+.*?from\s+(['"]).+?[^'"]\s*;/g, (match, quote) => {
      if (!match.endsWith(quote + ';')) {
        fixed = true;
        return match.replace(/;$/, quote + ';');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复对象属性字符串错误
   */
  fixObjectPropertyStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复对象属性值的字符串错误
    result = result.replace(/(\w+):\s*(['"]).+?[^'"]\s*,/g, (match, prop, quote) => {
      if (!match.endsWith(quote + ',')) {
        fixed = true;
        return match.replace(/,$/, quote + ',');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复函数参数字符串错误
   */
  fixFunctionParameterStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复函数调用中的字符串参数错误
    result = result.replace(/\(\s*(['"]).+?[^'"]\s*\)/g, (match, quote) => {
      if (!match.includes(quote, 1) || !match.endsWith(quote + ')')) {
        fixed = true;
        return match.replace(/\)$/, quote + ')');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复数组字符串错误
   */
  fixArrayStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复数组元素的字符串错误
    result = result.replace(/\[\s*(['"]).+?[^'"]\s*\]/g, (match, quote) => {
      if (!match.endsWith(quote + ']')) {
        fixed = true;
        return match.replace(/\]$/, quote + ']');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 修复条件语句字符串错误
   */
  fixConditionalStringErrors(content) {
    let fixed = false;
    let result = content;

    // 修复三元运算符中的字符串错误
    result = result.replace(/\?\s*(['"]).+?[^'"]\s*:/g, (match, quote) => {
      if (!match.endsWith(quote + ' :')) {
        fixed = true;
        return match.replace(/:$/, quote + ' :');
      }
      return match;
    });

    return { content: result, fixed };
  }

  /**
   * 验证修复结果
   */
  async validateFixes() {
    console.log('\n🔍 验证修复结果...');
    
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const tsc = spawn('npx', ['tsc', '--noEmit'], {
          cwd: this.frontendRoot,
          stdio: 'pipe'
        });

        let output = '';
        tsc.stdout.on('data', (data) => {
          output += data.toString();
        });

        tsc.stderr.on('data', (data) => {
          output += data.toString();
        });

        tsc.on('close', (code) => {
          if (code === 0) {
            console.log('✅ TypeScript编译检查通过！');
          } else {
            const errorCount = (output.match(/error TS\d+:/g) || []).length;
            console.log(`⚠️ 仍有 ${errorCount} 个TypeScript错误需要修复`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.log('⚠️ 无法运行TypeScript验证');
    }
  }

  /**
   * 生成修复报告
   */
  generateFixReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'comprehensive-typescript-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesProcessed: this.fixedFiles.length + this.errors.length,
        filesFixed: this.fixedFiles.length,
        errors: this.errors.length,
        fixTypes: [
          'Unterminated strings',
          'Quote mismatches', 
          'Template string errors',
          'JSX string errors',
          'Import string errors',
          'Object property string errors',
          'Function parameter string errors',
          'Array string errors',
          'Conditional string errors'
        ]
      },
      fixedFiles: this.fixedFiles,
      errors: this.errors
    };

    // 确保reports目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 TypeScript修复报告:');
    console.log(`   处理文件: ${report.summary.totalFilesProcessed}`);
    console.log(`   修复文件: ${report.summary.filesFixed}`);
    console.log(`   错误文件: ${report.summary.errors}`);
    console.log(`   报告已保存: reports/comprehensive-typescript-fix-report.json\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new ComprehensiveTypeScriptFixer();
  fixer.execute().catch(error => {
    console.error('❌ TypeScript修复失败:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveTypeScriptFixer;
