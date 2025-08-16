#!/usr/bin/env node

/**
 * 语法修复工具
 * 修复TypeScript编译错误，特别是正则表达式和模板字符串问题
 */

const fs = require('fs');
const path = require('path');

class SyntaxFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;

    // 语法修复规则
    this.fixRules = [
      // 修复正则表达式中的错误转义
      {
        pattern: /\/Chrome\/\\?\(/g,
        replacement: '/Chrome\\/',
        description: '修复Chrome正则表达式'
      },
      {
        pattern: /\/Firefox\/\\?\(/g,
        replacement: '/Firefox\\/',
        description: '修复Firefox正则表达式'
      },
      {
        pattern: /\/Safari\/\\?\(/g,
        replacement: '/Safari\\/',
        description: '修复Safari正则表达式'
      },
      {
        pattern: /\/Edge\/\\?\(/g,
        replacement: '/Edge\\/',
        description: '修复Edge正则表达式'
      },
      {
        pattern: /\/Edg\/\\?\(/g,
        replacement: '/Edg\\/',
        description: '修复Edg正则表达式'
      },
      {
        pattern: /\/Version\/\\?\(/g,
        replacement: '/Version\\/',
        description: '修复Version正则表达式'
      },
      
      // 修复其他正则表达式问题
      {
        pattern: /\/google-analytics\|gtag\|ga\/\(\//g,
        replacement: '/google-analytics|gtag|ga/',
        description: '修复Google Analytics正则'
      },
      {
        pattern: /\/facebook\/\.net\|fbevents\//g,
        replacement: '/facebook\\.net|fbevents/',
        description: '修复Facebook正则'
      },
      {
        pattern: /\/linkedin\/\.com\//g,
        replacement: '/linkedin\\.com/',
        description: '修复LinkedIn正则'
      },
      {
        pattern: /\/pinterest\/\.com\//g,
        replacement: '/pinterest\\.com/',
        description: '修复Pinterest正则'
      },
      {
        pattern: /\/media\/\.net\//g,
        replacement: '/media\\.net/',
        description: '修复Media.net正则'
      },
      {
        pattern: /\/fonts\/\.googleapis\/\.com\//g,
        replacement: '/fonts\\.googleapis\\.com/',
        description: '修复Google Fonts正则'
      },
      {
        pattern: /\/typekit\/\.net\|use\/\.typekit\//g,
        replacement: '/typekit\\.net|use\\.typekit/',
        description: '修复Adobe Fonts正则'
      },
      {
        pattern: /\/maps\/\.googleapis\/\.com\//g,
        replacement: '/maps\\.googleapis\\.com/',
        description: '修复Google Maps正则'
      },
      {
        pattern: /\/vimeo\/\.com\//g,
        replacement: '/vimeo\\.com/',
        description: '修复Vimeo正则'
      },
      
      // 修复Android和iOS版本正则
      {
        pattern: /\/Android \(\/d\+\/\.\?\/d\*\)\//g,
        replacement: '/Android (\\d+\\.?\\d*)/',
        description: '修复Android版本正则'
      },
      {
        pattern: /\/OS \(\/d\+_\?\/d\*\)\//g,
        replacement: '/OS (\\d+_?\\d*)/',
        description: '修复iOS版本正则'
      },
      {
        pattern: /\/Mac OS X \(\/d\+_\?\/d\+_\?\/d\*\)\//g,
        replacement: '/Mac OS X (\\d+_?\\d+_?\\d*)/',
        description: '修复macOS版本正则'
      },
      
      // 修复GlobalSearch中的正则表达式
      {
        pattern: /\[.*\+\?\^\$\{\}\(\)\|\[\/\]\/ \/\]/g,
        replacement: '[.*+?^${}()|[\\]/\\\\]',
        description: '修复GlobalSearch正则转义'
      },
      
      // 修复模板字符串中的问题
      {
        pattern: /`([^`]*)\$\{([^}]*)\}([^`]*)`/g,
        replacement: (match, before, variable, after) => {
          // 检查是否包含中文字符，如果有则需要特殊处理
          if (/[\u4e00-\u9fa5]/.test(before + after)) {
            return `\`${before}\${${variable}}${after}\``;
          }
          return match;
        },
        description: '修复模板字符串'
      }
    ];
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 开始修复语法错误...\n');

    try {
      const files = this.getTypeScriptFiles();
      
      for (const file of files) {
        await this.fixFile(file);
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
      const fileFixes = [];

      // 应用所有修复规则
      this.fixRules.forEach(rule => {
        const beforeFix = modifiedContent;
        
        if (typeof rule.replacement === 'function') {
          modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
        } else {
          modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
        }
        
        if (beforeFix !== modifiedContent) {
          const matches = beforeFix.match(rule.pattern);
          if (matches) {
            fileModified = true;
            fileFixes.push({
              description: rule.description,
              count: matches.length
            });
            this.totalFixes += matches.length;
          }
        }
      });

      // 特殊修复：处理MFASetup.tsx中的className问题
      if (filePath.includes('MFASetup.tsx')) {
        const classNameFix = modifiedContent.replace(
          /className="w-full bg-gray-700 border border-gray-600 rounded-lg\s+px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500"/g,
          'className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500"'
        );
        
        if (classNameFix !== modifiedContent) {
          modifiedContent = classNameFix;
          fileModified = true;
          fileFixes.push({
            description: '修复className换行问题',
            count: 1
          });
          this.totalFixes += 1;
        }
      }

      // 特殊修复：处理DataExporter.tsx中的正则表达式
      if (filePath.includes('DataExporter.tsx')) {
        const regexFix = modifiedContent.replace(
          /filename\[.*\]\*=\(\(\['"\]\).*\?\/2\|\[.*\]\*\)/g,
          'filename[^;=\\n]*=(([\'"]).*?\\2|[^;\\n]*)'
        );
        
        if (regexFix !== modifiedContent) {
          modifiedContent = regexFix;
          fileModified = true;
          fileFixes.push({
            description: '修复filename正则表达式',
            count: 1
          });
          this.totalFixes += 1;
        }
      }

      // 特殊修复：处理codeSplitting.ts中的对象语法
      if (filePath.includes('codeSplitting.ts')) {
        const objectFix = modifiedContent.replace(
          /'([^']+)':\s*\(\)\s*=>\s*import\(/g,
          '$1: () => import('
        );
        
        if (objectFix !== modifiedContent) {
          modifiedContent = objectFix;
          fileModified = true;
          fileFixes.push({
            description: '修复对象属性语法',
            count: 1
          });
          this.totalFixes += 1;
        }
      }

      // 如果文件被修改，写入新内容
      if (fileModified) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        this.fixedFiles++;
        
        console.log(`✅ 修复 ${path.relative(this.projectRoot, filePath)}`);
        fileFixes.forEach(fix => {
          console.log(`   ${fix.description}: ${fix.count} 处修复`);
        });
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 获取TypeScript文件
   */
  getTypeScriptFiles() {
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
          } else if (/\.(ts|tsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    // 只扫描frontend目录
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    
    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /node_modules/,
      /dist/,
      /build/,
      /\.d\.ts$/
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
  generateReport() {
    console.log('\n📊 语法修复报告');
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的语法错误。');
    } else {
      console.log('\n✅ 语法修复完成！');
      console.log('\n🔍 建议后续操作:');
      console.log('1. 运行 TypeScript 编译检查: npm run type-check');
      console.log('2. 运行 ESLint 检查: npm run lint');
      console.log('3. 检查应用是否正常启动');
    }
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new SyntaxFixer();
  fixer.execute().catch(console.error);
}

module.exports = SyntaxFixer;
