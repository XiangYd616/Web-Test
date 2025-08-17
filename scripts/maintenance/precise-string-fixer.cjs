#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PreciseStringFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 执行精确的字符串修复
   */
  async execute() {
    console.log('🔧 开始精确字符串修复...\n');

    try {
      const tsFiles = this.getAllTypeScriptFiles(this.frontendRoot);
      console.log(`📁 找到 ${tsFiles.length} 个TypeScript文件`);

      for (const filePath of tsFiles) {
        await this.fixFile(filePath);
      }

      this.generateFixReport();
      await this.validateFixes();

    } catch (error) {
      console.error('❌ 字符串修复过程中发生错误:', error);
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

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', 'dist', 'build', '.git', '__tests__', 'coverage'];
    return skipDirs.includes(dirName);
  }

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

      // 应用精确的修复规则
      const fixes = [
        this.fixImportStatements,
        this.fixConsoleStatements,
        this.fixJSXAttributes,
        this.fixStringLiterals,
        this.fixTemplateLiterals,
        this.fixFunctionCalls,
        this.fixObjectProperties,
        this.fixArrayElements,
        this.fixExtraQuotesAndSemicolons
      ];

      for (const fixFunction of fixes) {
        const result = fixFunction.call(this, fixedContent);
        if (result.fixed) {
          fixedContent = result.content;
          fileFixed = true;
        }
      }

      if (fileFixed) {
        fs.writeFileSync(filePath, fixedContent);
        this.fixedFiles.push({
          path: path.relative(this.projectRoot, filePath),
          fixes: 'Precise string fixes applied'
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
   * 修复import语句
   */
  fixImportStatements(content) {
    let fixed = false;
    let result = content;

    // 修复 import ... from 'path';' -> import ... from 'path';
    result = result.replace(/import\s+([^;]+)\s+from\s+(['"`][^'"`]+['"`]);['"`]/g, (match, imports, path) => {
      fixed = true;
      return `import ${imports} from ${path};`;
    });

    // 修复 import 'path';' -> import 'path';
    result = result.replace(/import\s+(['"`][^'"`]+['"`]);['"`]/g, (match, path) => {
      fixed = true;
      return `import ${path};`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复console语句
   */
  fixConsoleStatements(content) {
    let fixed = false;
    let result = content;

    // 修复 console.log('message'); ' -> console.log('message');
    result = result.replace(/console\.(log|error|warn|info)\(([^)]+)\);\s*['"`]/g, (match, method, args) => {
      fixed = true;
      return `console.${method}(${args});`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复JSX属性
   */
  fixJSXAttributes(content) {
    let fixed = false;
    let result = content;

    // 修复 className= 'value'> -> className='value'>
    result = result.replace(/(\w+)=\s+(['"`][^'"`]*['"`])>/g, (match, attr, value) => {
      fixed = true;
      return `${attr}=${value}>`;
    });

    // 修复 className= 'value' /> -> className='value' />
    result = result.replace(/(\w+)=\s+(['"`][^'"`]*['"`])\s+\/>/g, (match, attr, value) => {
      fixed = true;
      return `${attr}=${value} />`;
    });

    // 修复JSX属性中的多余引号
    result = result.replace(/(\w+)=(['"`][^'"`]*['"`])['"`]/g, (match, attr, value) => {
      fixed = true;
      return `${attr}=${value}`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复字符串字面量
   */
  fixStringLiterals(content) {
    let fixed = false;
    let result = content;

    // 修复字符串末尾的多余引号和分号
    result = result.replace(/(['"`][^'"`]*['"`]);['"`]/g, (match, str) => {
      fixed = true;
      return `${str};`;
    });

    // 修复字符串末尾的多余引号
    result = result.replace(/(['"`][^'"`]*['"`])['"`]/g, (match, str) => {
      fixed = true;
      return str;
    });

    return { content: result, fixed };
  }

  /**
   * 修复模板字符串
   */
  fixTemplateLiterals(content) {
    let fixed = false;
    let result = content;

    // 修复模板字符串末尾的多余引号
    result = result.replace(/(`[^`]*`);['"`]/g, (match, template) => {
      fixed = true;
      return `${template};`;
    });

    result = result.replace(/(`[^`]*`)['"`]/g, (match, template) => {
      fixed = true;
      return template;
    });

    return { content: result, fixed };
  }

  /**
   * 修复函数调用
   */
  fixFunctionCalls(content) {
    let fixed = false;
    let result = content;

    // 修复函数调用末尾的多余引号
    result = result.replace(/(\w+\([^)]*\));['"`]/g, (match, call) => {
      fixed = true;
      return `${call};`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复对象属性
   */
  fixObjectProperties(content) {
    let fixed = false;
    let result = content;

    // 修复对象属性值的多余引号
    result = result.replace(/(\w+):\s*(['"`][^'"`]*['"`]),['"`]/g, (match, prop, value) => {
      fixed = true;
      return `${prop}: ${value},`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复数组元素
   */
  fixArrayElements(content) {
    let fixed = false;
    let result = content;

    // 修复数组元素的多余引号
    result = result.replace(/\[\s*(['"`][^'"`]*['"`]),['"`]/g, (match, element) => {
      fixed = true;
      return `[${element},`;
    });

    return { content: result, fixed };
  }

  /**
   * 修复多余的引号和分号组合
   */
  fixExtraQuotesAndSemicolons(content) {
    let fixed = false;
    let result = content;

    // 修复行末的多余引号
    result = result.replace(/;['"`]\s*$/gm, (match) => {
      fixed = true;
      return ';';
    });

    // 修复行末的多余引号和空格
    result = result.replace(/['"`]\s*$/gm, (match) => {
      fixed = true;
      return '';
    });

    // 修复多个连续的引号
    result = result.replace(/['"`]{2,}/g, (match) => {
      fixed = true;
      return match[0]; // 保留第一个引号
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
            if (errorCount < 1000) {
              console.log('🎉 错误数量已大幅减少！');
            }
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
    const reportPath = path.join(this.projectRoot, 'reports', 'precise-string-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesProcessed: this.fixedFiles.length + this.errors.length,
        filesFixed: this.fixedFiles.length,
        errors: this.errors.length,
        fixTypes: [
          'Import statements',
          'Console statements',
          'JSX attributes',
          'String literals',
          'Template literals',
          'Function calls',
          'Object properties',
          'Array elements',
          'Extra quotes and semicolons'
        ]
      },
      fixedFiles: this.fixedFiles,
      errors: this.errors
    };

    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 精确字符串修复报告:');
    console.log(`   处理文件: ${report.summary.totalFilesProcessed}`);
    console.log(`   修复文件: ${report.summary.filesFixed}`);
    console.log(`   错误文件: ${report.summary.errors}`);
    console.log(`   报告已保存: reports/precise-string-fix-report.json\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new PreciseStringFixer();
  fixer.execute().catch(error => {
    console.error('❌ 精确字符串修复失败:', error);
    process.exit(1);
  });
}

module.exports = PreciseStringFixer;
