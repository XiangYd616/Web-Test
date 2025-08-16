#!/usr/bin/env node

/**
 * 服务导入修复工具
 * 基于服务依赖分析结果修复缺失的服务导入
 */

const fs = require('fs');
const path = require('path');

class ServiceImportFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;
    
    // 基于分析结果的服务映射
    this.serviceMappings = {
      // 实时服务映射
      '../../services/realtime/realtimeManager.ts': '../../services/realtime/websocketService',
      '../services/realtime/websocketService': '../../services/realtime/websocketService',
      
      // 通用服务映射
      '../../services/unifiedTestHistoryService': '../../services/testing/testHistoryService',
      '../../services/dataService': '../../services/data/dataService',
      '../../services/monitoringService': '../../services/monitoring/monitoringService',
      '../../services/dataAnalysisService': '../../services/analytics/dataAnalysisService',
      '../../services/reportGeneratorService': '../../services/reporting/reportGeneratorService',
      '../../services/testEngine': '../../services/testing/testEngineService',
      '../../services/realSEOAnalysisEngine': '../../services/testing/seoTestService',
      '../../services/unifiedSecurityEngine': '../../services/testing/securityTestService',
      '../../services/seoAnalysisEngine': '../../services/testing/seoTestService',
      '../../services/stressTestQueueManager': '../../services/testing/stressTestService',
      '../../services/testTemplates': '../../services/testing/testTemplateService',
      '../services/testApiService': '../services/testing/apiTestService',
      '../../services/userFeedbackService': '../../services/user/userFeedbackService',
      '../services/testService': '../services/testing/testService',
      '../services/configService': '../services/config/configService',
      
      // 工具函数映射
      '../../utils/common': '../../utils/commonUtils',
      '../utils/databaseManager': '../utils/database',
      '../../utils/ErrorHandler': '../../utils/errorHandler',
      '../utils/ErrorHandler': '../utils/errorHandler',
      './utils/smartOptimizationEngine': './utils/optimizationEngine',
      '../utils/cacheManager': null, // 删除，使用内置缓存
      '../utils/optimizedQueries': '../utils/queryOptimizer',
      '../../utils/enhancedUrlValidator': '../../utils/urlValidator',
      
      // React Hooks映射
      '../../hooks/useRealTimeData': '../../hooks/useWebSocket',
      '../../../hooks/useTestExecution': '../../../hooks/useTestRunner',
      '../../../hooks/useTestHistory': '../../../hooks/useTestData',
      '../../../hooks/useAuthCheck': '../../../hooks/useAuth',
      '../../../hooks/useUnifiedSEOTest.ts': '../../../hooks/useSEOTest',
      
      // 认证服务映射
      '../services/auth/enhancedAuthManager': '../services/auth/authManager',
      
      // 测试服务映射
      '../services/testing/apiTestService': '../services/testing/testService',
      
      // 未分类服务映射
      './apiService': '../api/apiService',
      './TestStateManager': '../state/testStateManager',
      './managers/TestCaseManager': '../managers/testCaseManager',
      './clients/HTTPClient': '../clients/httpClient',
      './automation/APITestAutomation': '../automation/apiTestAutomation',
      './performance/APIPerformanceTester': '../performance/apiPerformanceTester',
      './documentation/APIDocumentationGenerator': '../documentation/apiDocumentationGenerator',
      './analyzers/SSLAnalyzer': '../analyzers/sslAnalyzer',
      './analyzers/SecurityHeadersAnalyzer': '../analyzers/securityHeadersAnalyzer',
      './heavy-module.js': null, // 删除
      './feature.js': null, // 删除
      './LazyComponent': null, // 删除
      
      // 引擎组件映射
      '../engines/performance/PerformanceAccessibilityEngine.js': '../engines/performance/PerformanceAnalyzer.js',
      '../engines/stress/realStressTestEngine.js': '../engines/stress/StressTestEngine.js',
      '../engines/api/uxTestEngine.js': '../engines/api/UXAnalyzer.js',
      '../engines/api/networkTestEngine.js': '../engines/api/NetworkAnalyzer.js',
      '../engines/security/SecurityEngine': '../engines/security/SecurityAnalyzer',
      '../engines/api/testEngine.js': '../engines/api/ApiAnalyzer.js',
      
      // 后端服务映射
      '../services/databaseService': '../services/database/databaseService',
      '../services/smartCacheService': null, // 删除
      '../services/testQueueService': '../services/queue/queueService',
      '../services/enhancedTestHistoryService': '../services/testing/testHistoryService',
      '../services/DatabasePerformanceOptimizer': '../services/database/performanceOptimizer',
      '../services/storage/StorageService': '../services/storage/fileStorageService',
      '../services/cache/CacheManager.js': null, // 删除
      '../services/redis/connection.js': '../config/redis.js',
      './routes/unifiedSecurity': './routes/security',
      './routes/data': './routes/dataManagement',
      '../config/cache.js': null, // 删除
      './emailService': '../email/emailService',
      './smsService': '../sms/smsService',
      
      // 类型定义映射
      '../types': '../types/index',
      '../types/version': '../types/versionTypes',
      './cacheStrategy': null, // 删除
      '../services/cacheStrategy': null, // 删除
      '../analytics': '../analytics/analyticsService'
    };
  }

  /**
   * 执行修复
   */
  async execute(dryRun = false) {
    console.log(`🔧 开始服务导入修复${dryRun ? ' (预览模式)' : ''}...\n`);

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

      // 应用服务映射
      Object.entries(this.serviceMappings).forEach(([oldPath, newPath]) => {
        const pattern = new RegExp(`(['"\`])${this.escapeRegex(oldPath)}\\1`, 'g');
        const matches = modifiedContent.match(pattern);
        
        if (matches) {
          if (newPath === null) {
            // 注释掉导入
            const importPattern = new RegExp(`import[^;]*['"\`]${this.escapeRegex(oldPath)}['"\`][^;]*;?`, 'g');
            modifiedContent = modifiedContent.replace(importPattern, (match) => `// ${match} // 服务已删除`);
            
            // 注释掉require
            const requirePattern = new RegExp(`.*require\\s*\\(\\s*['"\`]${this.escapeRegex(oldPath)}['"\`]\\s*\\)[^;]*;?`, 'g');
            modifiedContent = modifiedContent.replace(requirePattern, (match) => `// ${match} // 服务已删除`);
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
    console.log(`\n📊 服务导入修复报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的服务导入问题。');
    } else {
      console.log('\n✅ 服务导入修复完成！');
      
      if (dryRun) {
        console.log('\n💡 这是预览模式，没有实际修改文件。');
        console.log('运行 `node scripts/service-import-fixer.cjs --fix` 执行实际修复。');
      } else {
        console.log('\n🔍 建议后续操作:');
        console.log('1. 运行服务依赖分析: node scripts/service-dependency-analyzer.cjs');
        console.log('2. 运行精确路径检查: npm run check:imports:precise');
        console.log('3. 运行 TypeScript 编译检查: npm run type-check');
        console.log('4. 检查应用是否正常启动');
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
  const fixer = new ServiceImportFixer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的问题，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  fixer.execute(dryRun).catch(console.error);
}

module.exports = ServiceImportFixer;
