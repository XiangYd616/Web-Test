#!/usr/bin/env node

/**
 * 简单导入修复工具
 * 修复已知的导入路径问题
 */

const fs = require('fs');
const path = require('path');

class SimpleImportFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;

    // 已知的路径替换规则
    this.replacementRules = [
      // 删除已删除文件的导入
      {
        pattern: /import.*from.*['"`].*TestCharts.*['"`];?\s*\n?/g,
        replacement: '// import TestCharts - 文件已删除\n',
        description: '删除TestCharts导入'
      },
      {
        pattern: /import\(['"`].*TestCharts.*['"`]\)/g,
        replacement: '// import TestCharts - 文件已删除',
        description: '删除TestCharts动态导入'
      },
      
      // 修复引擎管理器路径
      {
        pattern: /from\s+['"`]\.\.\/engines\/UnifiedTestEngineManager['"`]/g,
        replacement: "from '../engines/core/TestEngineManager'",
        description: '修复引擎管理器路径'
      },
      {
        pattern: /require\(['"`]\.\.\/engines\/UnifiedTestEngineManager['"`]\)/g,
        replacement: "require('../engines/core/TestEngineManager')",
        description: '修复引擎管理器require'
      },
      
      // 修复路由管理器路径
      {
        pattern: /from\s+['"`]\.\/UnifiedRouteManager['"`]/g,
        replacement: "from './RouteManager'",
        description: '修复路由管理器路径'
      },
      {
        pattern: /require\(['"`]\.\/UnifiedRouteManager['"`]\)/g,
        replacement: "require('./RouteManager')",
        description: '修复路由管理器require'
      },
      
      // 修复样式文件路径
      {
        pattern: /import\s+['"`]\.\.\/\.\.\/styles\/optimized-charts\.css['"`]/g,
        replacement: "import '../../styles/charts.css'",
        description: '修复样式文件路径'
      },
      
      // 修复服务路径
      {
        pattern: /from\s+['"`]\.\.\/\.\.\/services\/analytics\/advancedAnalyticsService['"`]/g,
        replacement: "from '../../services/analytics/analyticsService'",
        description: '修复分析服务路径'
      },
      
      // 修复实时管理器路径
      {
        pattern: /from\s+['"`]\.\.\/\.\.\/services\/realtime\/RealtimeManager['"`]/g,
        replacement: "from '../../services/realtime/realtimeManager'",
        description: '修复实时管理器路径'
      }
    ];
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 开始修复导入路径问题...\n');

    try {
      const files = this.getCodeFiles();
      
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

      // 应用所有替换规则
      this.replacementRules.forEach(rule => {
        const matches = modifiedContent.match(rule.pattern);
        if (matches) {
          modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
          fileModified = true;
          fileFixes.push({
            description: rule.description,
            count: matches.length
          });
          this.totalFixes += matches.length;
        }
      });

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
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite', 'backup'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 导入路径修复报告');
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的导入路径问题。');
    } else {
      console.log('\n✅ 导入路径修复完成！');
      console.log('\n🔍 建议后续操作:');
      console.log('1. 运行 TypeScript 编译检查: npm run type-check');
      console.log('2. 运行 ESLint 检查: npm run lint');
      console.log('3. 运行测试: npm run test');
      console.log('4. 检查应用是否正常启动');
    }
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new SimpleImportFixer();
  fixer.execute().catch(console.error);
}

module.exports = SimpleImportFixer;
