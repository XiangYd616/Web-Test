#!/usr/bin/env node

/**
 * 智能导入修复工具
 * 基于文件存在性和已知映射智能修复导入路径
 */

const fs = require('fs');
const path = require('path');

class SmartImportFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;
    
    // 智能路径映射
    this.pathMappings = {
      // 样式文件映射
      '../../styles/charts.css': '../../styles/components.css',
      '../../styles/data-table.css': '../../styles/components.css',
      './StressTestDetailModal.css': null, // 删除
      './StatusLabel.css': null, // 删除
      './StressTestHistory.css': null, // 删除
      '../../../components/stress/StatusLabel.css': null, // 删除
      
      // 服务文件映射
      '../../services/realtime/realtimeManager': '../../services/realtime/realtimeManager.ts',
      '../services/cacheStrategy': null, // 删除，使用内置缓存
      '../services/dataService': '../services/data/dataService',
      '../services/testService': '../services/testing/testService',
      '../services/configService': '../services/config/configService',
      '../services/monitoringService': '../services/monitoring/monitoringService',
      '../services/reportGeneratorService': '../services/reporting/reportService',
      '../services/testEngine': '../services/testing/testEngineService',
      '../services/testApiService': '../services/testing/apiTestService',
      '../services/websocketClient': '../services/realtime/websocketService',
      '../services/userFeedbackService': '../services/user/userFeedbackService',
      '../services/stressTestQueueManager': '../services/testing/stressTestService',
      '../services/seoAnalysisEngine': '../services/testing/seoTestService',
      '../services/testTemplates': '../services/testing/testTemplateService',
      '../services/unifiedTestHistoryService': '../services/testing/testHistoryService',
      '../services/dataAnalysisService': '../services/analytics/analyticsService',
      '../services/realSEOAnalysisEngine': '../services/testing/seoTestService',
      '../services/unifiedSecurityEngine': '../services/testing/securityTestService',
      
      // 组件映射
      '../../../components/shared': '../../../components/ui/shared',
      '../charts/ComplexChart': '../charts/Chart',
      '../tables/DataTable': '../ui/DataTable',
      '../editors/CodeEditor': '../ui/CodeEditor',
      './TestStatisticsPanel': './TestStatistics',
      './DataExportPanel': './DataExporter',
      '../../../components/testing/TestPageTemplate': '../../../components/testing/TestPage',
      
      // 页面映射
      '../../pages/core/testing/TestPage': '../../pages/testing/TestPage',
      '../../pages/data/reports/Analytics': '../../pages/analytics/Analytics',
      './TestPage': '../TestPage',
      '../pages/StressTest': '../pages/testing/StressTest',
      '../pages/SEOTest': '../pages/testing/SEOTest',
      '../pages/Admin': '../pages/admin/Admin',
      '../pages/Settings': '../pages/settings/Settings',
      
      // Hooks映射
      '../hooks/useRealTimeData': '../hooks/useWebSocket',
      '../hooks/useTestExecution': '../hooks/useTestRunner',
      '../hooks/useTestHistory': '../hooks/useTestData',
      '../hooks/useAuthCheck': '../hooks/useAuth',
      '../hooks/useUnifiedSEOTest.ts': '../hooks/useSEOTest',
      
      // 工具映射
      '../../utils/enhancedUrlValidator': '../../utils/urlValidator',
      '../../lib/utils': '../../utils/common',
      '../types': '../types/index',
      
      // 后端映射
      '../utils/ErrorHandler': '../utils/errorHandler',
      '../utils/cacheManager': null, // 删除
      '../utils/optimizedQueries': '../utils/queryOptimizer',
      '../utils/enhancedDatabaseConnectionManager': '../utils/databaseManager',
      '../services/databaseService': '../services/database/databaseService',
      '../services/smartCacheService': null, // 删除
      '../services/testQueueService': '../services/queue/queueService',
      '../services/enhancedTestHistoryService': '../services/testing/testHistoryService',
      '../engines/security/SecurityEngine': '../engines/security/SecurityAnalyzer',
      '../engines/api/testEngine.js': '../engines/api/ApiAnalyzer.js',
      '../engines/stress/realStressTestEngine': '../engines/stress/StressTestEngine',
      '../engines/api/uxTestEngine': '../engines/api/UXAnalyzer',
      '../engines/api/networkTestEngine': '../engines/api/NetworkAnalyzer'
    };
  }

  /**
   * 执行修复
   */
  async execute(dryRun = false) {
    console.log(`🔧 开始智能导入修复${dryRun ? ' (预览模式)' : ''}...\n`);

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

      // 应用路径映射
      Object.entries(this.pathMappings).forEach(([oldPath, newPath]) => {
        const pattern = new RegExp(`(['"\`])${this.escapeRegex(oldPath)}\\1`, 'g');
        const matches = modifiedContent.match(pattern);
        
        if (matches) {
          if (newPath === null) {
            // 注释掉导入
            const importPattern = new RegExp(`import[^;]*['"\`]${this.escapeRegex(oldPath)}['"\`][^;]*;?`, 'g');
            modifiedContent = modifiedContent.replace(importPattern, (match) => `// ${match} // 文件已删除`);
          } else {
            // 替换路径
            modifiedContent = modifiedContent.replace(pattern, `$1${newPath}$1`);
          }
          
          fileModified = true;
          fileFixes.push({
            from: oldPath,
            to: newPath || '已删除',
            count: matches.length
          });
          this.totalFixes += matches.length;
        }
      });

      // 如果文件被修改
      if (fileModified) {
        if (!dryRun) {
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
        }
        
        this.fixedFiles++;
        
        const action = dryRun ? '[预览]' : '✅';
        console.log(`${action} 修复 ${path.relative(this.projectRoot, filePath)}`);
        fileFixes.forEach(fix => {
          console.log(`   ${fix.from} → ${fix.to} (${fix.count}处)`);
        });
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  generateReport(dryRun = false) {
    console.log(`\n📊 智能导入修复报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的导入问题。');
    } else {
      console.log('\n✅ 智能导入修复完成！');
      
      if (dryRun) {
        console.log('\n💡 这是预览模式，没有实际修改文件。');
        console.log('运行 `node scripts/smart-import-fixer.cjs --fix` 执行实际修复。');
      } else {
        console.log('\n🔍 建议后续操作:');
        console.log('1. 运行 TypeScript 编译检查: npm run type-check');
        console.log('2. 运行精确路径检查: node scripts/precise-path-checker.cjs');
        console.log('3. 检查应用是否正常启动');
        console.log('4. 运行测试确保功能正常');
      }
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix') || args.includes('-f');
const dryRun = !shouldFix;

// 执行修复
if (require.main === module) {
  const fixer = new SmartImportFixer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的问题，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  fixer.execute(dryRun).catch(console.error);
}

module.exports = SmartImportFixer;
