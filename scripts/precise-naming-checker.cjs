#!/usr/bin/env node

/**
 * 精确命名规范检查器
 * 专门检查真正的命名问题，避免误报
 */

const fs = require('fs');
const path = require('path');

class PreciseNamingChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    
    // 真正的问题模式
    this.problemPatterns = {
      // 明确的版本化前缀（在类名开头）
      versionPrefixes: /^(Enhanced|Advanced|Optimized|Improved|Unified|Extended|Modern|Smart|Better|New|Updated|Intelligent|Ultra|Master|Final|Latest)/,
      
      // 过时的方法调用
      deprecatedMethods: [
        { pattern: /\.substr\(/g, replacement: '.substring(', description: '使用过时的substr方法' },
        { pattern: /\bvar\s+/g, replacement: 'let ', description: '使用过时的var声明' }
      ],
      
      // 匈牙利命名法
      hungarianNotation: /^(str|int|bool|obj|arr|fn|num)[A-Z]/,
      
      // 不规范的下划线命名（在JavaScript中）
      underscoreNaming: /^[a-z]+_[a-z]/,
      
      // 连续大写字母（超过2个）
      consecutiveUppercase: /[A-Z]{3,}/
    };
  }

  /**
   * 执行精确检查
   */
  async executeCheck() {
    console.log('🎯 开始精确命名规范检查...\n');

    try {
      // 1. 检查过时方法使用
      await this.checkDeprecatedMethods();
      
      // 2. 检查明确的版本化命名
      await this.checkVersionizedNaming();
      
      // 3. 检查匈牙利命名法
      await this.checkHungarianNotation();
      
      // 4. 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查过时方法
   */
  async checkDeprecatedMethods() {
    console.log('⚠️  检查过时方法使用...');

    const files = this.getCodeFiles();
    let foundIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        this.problemPatterns.deprecatedMethods.forEach(({ pattern, replacement, description }) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addIssue({
              type: 'deprecated_method',
              severity: 'medium',
              file,
              issue: description,
              occurrences: matches.length,
              suggestion: `替换为 ${replacement}`,
              fixable: true
            });
            foundIssues++;
          }
        });
        
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log(`   发现 ${foundIssues} 个过时方法使用问题\n`);
  }

  /**
   * 检查版本化命名
   */
  async checkVersionizedNaming() {
    console.log('🏷️  检查版本化命名...');

    const files = this.getCodeFiles();
    let foundIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查类名
        const classMatches = content.match(/class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g);
        if (classMatches) {
          classMatches.forEach(match => {
            const className = match.replace('class ', '').trim();
            if (this.problemPatterns.versionPrefixes.test(className)) {
              this.addIssue({
                type: 'version_prefix',
                severity: 'medium',
                file,
                issue: '类名使用版本化前缀',
                current: className,
                suggestion: this.removeVersionPrefix(className),
                fixable: true
              });
              foundIssues++;
            }
          });
        }

        // 检查变量名
        const varMatches = content.match(/(const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g);
        if (varMatches) {
          varMatches.forEach(match => {
            const parts = match.split(/\s+/);
            const varName = parts[1];
            if (this.problemPatterns.versionPrefixes.test(varName)) {
              this.addIssue({
                type: 'version_prefix',
                severity: 'low',
                file,
                issue: '变量名使用版本化前缀',
                current: varName,
                suggestion: this.removeVersionPrefix(varName),
                fixable: true
              });
              foundIssues++;
            }
          });
        }
        
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log(`   发现 ${foundIssues} 个版本化命名问题\n`);
  }

  /**
   * 检查匈牙利命名法
   */
  async checkHungarianNotation() {
    console.log('🔤 检查匈牙利命名法...');

    const files = this.getCodeFiles();
    let foundIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查变量名
        const varMatches = content.match(/(const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g);
        if (varMatches) {
          varMatches.forEach(match => {
            const parts = match.split(/\s+/);
            const varName = parts[1];
            if (this.problemPatterns.hungarianNotation.test(varName)) {
              this.addIssue({
                type: 'hungarian_notation',
                severity: 'low',
                file,
                issue: '变量名使用匈牙利命名法',
                current: varName,
                suggestion: this.removeHungarianPrefix(varName),
                fixable: true
              });
              foundIssues++;
            }
          });
        }
        
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log(`   发现 ${foundIssues} 个匈牙利命名法问题\n`);
  }

  /**
   * 获取代码文件
   */
  getCodeFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;
        
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));
    
    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /node_modules/,
      /dist/,
      /build/
    ];
    
    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  removeVersionPrefix(name) {
    return name.replace(this.problemPatterns.versionPrefixes, '');
  }

  removeHungarianPrefix(name) {
    return name.replace(/^(str|int|bool|obj|arr|fn|num)/, '');
  }

  addIssue(issue) {
    this.issues.push(issue);
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('📊 精确命名规范检查报告');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('\n✅ 恭喜！没有发现明确的命名规范问题。');
      return;
    }
    
    console.log(`发现问题: ${this.issues.length}`);
    console.log(`可修复问题: ${this.issues.filter(i => i.fixable).length}`);
    
    // 按类型分组显示问题
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });
    
    console.log('\n📋 问题详情:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      console.log(`\n${this.getTypeDisplayName(type)} (${issues.length}个问题):`);
      issues.slice(0, 10).forEach(issue => {
        console.log(`   ❌ ${path.relative(this.projectRoot, issue.file)}`);
        console.log(`      问题: ${issue.issue}`);
        if (issue.current) {
          console.log(`      当前: ${issue.current}`);
          console.log(`      建议: ${issue.suggestion}`);
        } else if (issue.occurrences) {
          console.log(`      出现次数: ${issue.occurrences}`);
          console.log(`      建议: ${issue.suggestion}`);
        }
      });
      
      if (issues.length > 10) {
        console.log(`   ... 还有 ${issues.length - 10} 个类似问题`);
      }
    });
    
    console.log('\n💡 修复建议:');
    
    // 过时方法修复
    const deprecatedIssues = this.issues.filter(i => i.type === 'deprecated_method');
    if (deprecatedIssues.length > 0) {
      console.log('\n1. 过时方法修复:');
      console.log('   - 将 .substr( 替换为 .substring(');
      console.log('   - 将 var 声明替换为 let 或 const');
    }
    
    // 版本化前缀修复
    const versionIssues = this.issues.filter(i => i.type === 'version_prefix');
    if (versionIssues.length > 0) {
      console.log('\n2. 版本化前缀修复:');
      versionIssues.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.current} → ${issue.suggestion}`);
      });
    }
    
    // 匈牙利命名法修复
    const hungarianIssues = this.issues.filter(i => i.type === 'hungarian_notation');
    if (hungarianIssues.length > 0) {
      console.log('\n3. 匈牙利命名法修复:');
      hungarianIssues.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.current} → ${issue.suggestion}`);
      });
    }
  }

  getTypeDisplayName(type) {
    const typeNames = {
      deprecated_method: '过时方法',
      version_prefix: '版本化前缀',
      hungarian_notation: '匈牙利命名法'
    };
    
    return typeNames[type] || type;
  }
}

// 执行检查
if (require.main === module) {
  const checker = new PreciseNamingChecker();
  checker.executeCheck().catch(console.error);
}

module.exports = PreciseNamingChecker;
