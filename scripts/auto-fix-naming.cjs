#!/usr/bin/env node

/**
 * 自动修复命名问题
 * 基于精确检查器的结果自动修复可修复的命名问题
 */

const fs = require('fs');
const path = require('path');

class AutoNamingFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = new Set();
    this.statistics = {
      filesProcessed: 0,
      filesModified: 0,
      totalFixes: 0,
      fixesByType: {}
    };

    // 修复规则
    this.fixRules = [
      // 过时方法修复
      {
        type: 'deprecated_method',
        pattern: /\.substr\(/g,
        replacement: '.substring(',
        description: '修复过时的substr方法'
      },
      {
        type: 'deprecated_syntax',
        pattern: /\bvar\s+/g,
        replacement: 'let ',
        description: '修复过时的var声明'
      },
      
      // 版本化前缀修复（变量和类名）
      {
        type: 'version_prefix',
        pattern: /\b(Enhanced|Advanced|Optimized|Improved|Unified|Extended|Modern|Smart|Better|New|Updated|Intelligent|Ultra|Master|Final|Latest)([A-Z][a-zA-Z0-9]*)/g,
        replacement: '$2',
        description: '移除版本化前缀'
      },
      
      // 匈牙利命名法修复
      {
        type: 'hungarian_notation',
        pattern: /\b(str|int|bool|obj|arr|fn|num)([A-Z][a-zA-Z0-9]*)/g,
        replacement: '$2',
        description: '移除匈牙利命名法前缀'
      }
    ];
  }

  /**
   * 执行自动修复
   */
  async executeFix(dryRun = false) {
    console.log(`🔧 开始自动修复命名问题${dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      const files = this.getCodeFiles();
      
      for (const file of files) {
        await this.fixFile(file, dryRun);
      }
      
      this.generateReport(dryRun);
      
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath, dryRun = false) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let fileModified = false;
      const fileFixes = [];

      this.statistics.filesProcessed++;

      // 应用所有修复规则
      this.fixRules.forEach(rule => {
        const matches = modifiedContent.match(rule.pattern);
        if (matches) {
          const beforeFix = modifiedContent;
          modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
          
          if (beforeFix !== modifiedContent) {
            fileModified = true;
            const fixCount = matches.length;
            fileFixes.push({
              type: rule.type,
              description: rule.description,
              count: fixCount
            });
            
            this.statistics.totalFixes += fixCount;
            this.statistics.fixesByType[rule.type] = 
              (this.statistics.fixesByType[rule.type] || 0) + fixCount;
          }
        }
      });

      // 如果文件被修改
      if (fileModified) {
        this.statistics.filesModified++;
        this.fixedFiles.add(filePath);

        if (dryRun) {
          console.log(`📝 [预览] ${path.relative(this.projectRoot, filePath)}`);
          fileFixes.forEach(fix => {
            console.log(`   ✅ ${fix.description}: ${fix.count} 处修复`);
          });
        } else {
          // 写入修复后的内容
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
          console.log(`✅ 修复 ${path.relative(this.projectRoot, filePath)}`);
          fileFixes.forEach(fix => {
            console.log(`   ${fix.description}: ${fix.count} 处修复`);
          });
        }
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
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

  /**
   * 生成报告
   */
  generateReport(dryRun = false) {
    console.log(`\n📊 自动修复报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`处理文件: ${this.statistics.filesProcessed}`);
    console.log(`修改文件: ${this.statistics.filesModified}`);
    console.log(`总修复数: ${this.statistics.totalFixes}`);
    
    if (this.statistics.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的问题。');
      return;
    }
    
    console.log('\n📋 修复详情:');
    Object.entries(this.statistics.fixesByType).forEach(([type, count]) => {
      console.log(`   ${this.getTypeDisplayName(type)}: ${count} 处修复`);
    });
    
    if (dryRun) {
      console.log('\n💡 这是预览模式，没有实际修改文件。');
      console.log('运行 `node scripts/auto-fix-naming.cjs --fix` 执行实际修复。');
    } else {
      console.log('\n✅ 修复完成！');
      
      if (this.fixedFiles.size > 0) {
        console.log('\n📝 已修复的文件:');
        Array.from(this.fixedFiles).slice(0, 10).forEach(file => {
          console.log(`   ${path.relative(this.projectRoot, file)}`);
        });
        
        if (this.fixedFiles.size > 10) {
          console.log(`   ... 还有 ${this.fixedFiles.size - 10} 个文件`);
        }
      }
      
      console.log('\n🔍 建议后续操作:');
      console.log('1. 检查修复后的代码是否正确');
      console.log('2. 运行测试确保功能正常');
      console.log('3. 更新相关的导入语句（如果有类名变更）');
      console.log('4. 提交代码变更');
    }
  }

  getTypeDisplayName(type) {
    const typeNames = {
      deprecated_method: '过时方法',
      deprecated_syntax: '过时语法',
      version_prefix: '版本化前缀',
      hungarian_notation: '匈牙利命名法'
    };
    
    return typeNames[type] || type;
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix') || args.includes('-f');
const dryRun = !shouldFix;

// 执行修复
if (require.main === module) {
  const fixer = new AutoNamingFixer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的问题，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  fixer.executeFix(dryRun).catch(console.error);
}

module.exports = AutoNamingFixer;
