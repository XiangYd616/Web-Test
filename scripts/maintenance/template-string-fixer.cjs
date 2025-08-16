#!/usr/bin/env node

/**
 * 模板字符串修复工具
 * 修复包含中文字符和emoji的模板字符串语法错误
 */

const fs = require('fs');
const path = require('path');

class TemplateStringFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 开始修复模板字符串问题...\n');

    try {
      // 只修复apiTestEngine.ts文件
      const filePath = path.join(this.projectRoot, 'frontend/services/testing/apiTestEngine.ts');
      
      if (fs.existsSync(filePath)) {
        await this.fixFile(filePath);
      }
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let fileModified = false;
      let fixCount = 0;

      // 修复模板字符串中的变量引用问题
      // 将 `text ${variable} text` 转换为 'text ' + variable + ' text'
      const templateStringPattern = /`([^`]*\$\{[^}]+\}[^`]*)`/g;
      
      modifiedContent = modifiedContent.replace(templateStringPattern, (match, content) => {
        // 检查是否包含中文字符或emoji
        if (/[\u4e00-\u9fa5]|[\u{1f000}-\u{1f9ff}]/u.test(content)) {
          // 将模板字符串转换为字符串拼接
          let result = content;
          
          // 替换 ${variable} 为 ' + variable + '
          result = result.replace(/\$\{([^}]+)\}/g, (varMatch, varName) => {
            return "' + " + varName.trim() + " + '";
          });
          
          // 清理多余的空字符串拼接
          result = result.replace(/^'/, '').replace(/'$/, '');
          result = result.replace(/'' \+ /g, '').replace(/ \+ ''/g, '');
          result = "'" + result + "'";
          
          fileModified = true;
          fixCount++;
          return result;
        }
        return match;
      });

      // 修复特定的问题模式
      const specificFixes = [
        // 修复console.log中的模板字符串
        {
          pattern: /console\.log\(`([^`]*\$\{[^}]+\}[^`]*)`\)/g,
          replacement: (match, content) => {
            let result = content.replace(/\$\{([^}]+)\}/g, "' + $1 + '");
            result = result.replace(/^'/, '').replace(/'$/, '');
            result = result.replace(/'' \+ /g, '').replace(/ \+ ''/g, '');
            return `console.log('${result}')`;
          }
        },
        
        // 修复description字段中的模板字符串
        {
          pattern: /description:\s*`([^`]*\$\{[^}]+\}[^`]*)`/g,
          replacement: (match, content) => {
            let result = content.replace(/\$\{([^}]+)\}/g, "' + $1 + '");
            result = result.replace(/^'/, '').replace(/'$/, '');
            result = result.replace(/'' \+ /g, '').replace(/ \+ ''/g, '');
            return `description: '${result}'`;
          }
        },
        
        // 修复estimatedImprovement字段中的模板字符串
        {
          pattern: /estimatedImprovement:\s*`([^`]*\$\{[^}]+\}[^`]*)`/g,
          replacement: (match, content) => {
            let result = content.replace(/\$\{([^}]+)\}/g, "' + $1 + '");
            result = result.replace(/^'/, '').replace(/'$/, '');
            result = result.replace(/'' \+ /g, '').replace(/ \+ ''/g, '');
            return `estimatedImprovement: '${result}'`;
          }
        }
      ];

      specificFixes.forEach(fix => {
        const beforeFix = modifiedContent;
        if (typeof fix.replacement === 'function') {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
        } else {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
        }
        
        if (beforeFix !== modifiedContent) {
          fileModified = true;
          const matches = beforeFix.match(fix.pattern);
          if (matches) {
            fixCount += matches.length;
          }
        }
      });

      // 如果文件被修改，写入新内容
      if (fileModified) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        this.fixedFiles++;
        this.totalFixes += fixCount;
        
        console.log(`✅ 修复 ${path.relative(this.projectRoot, filePath)}`);
        console.log(`   修复了 ${fixCount} 个模板字符串问题`);
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 模板字符串修复报告');
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的模板字符串问题。');
    } else {
      console.log('\n✅ 模板字符串修复完成！');
      console.log('\n🔍 建议后续操作:');
      console.log('1. 运行 TypeScript 编译检查: npm run type-check');
      console.log('2. 检查修复后的代码逻辑是否正确');
      console.log('3. 运行测试确保功能正常');
    }
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new TemplateStringFixer();
  fixer.execute().catch(console.error);
}

module.exports = TemplateStringFixer;
