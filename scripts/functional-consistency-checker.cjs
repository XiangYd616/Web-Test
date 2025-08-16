#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FunctionalConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.patterns = {
      apiCalls: [],
      errorHandling: [],
      stateManagement: [],
      componentStructures: []
    };
  }

  /**
   * 执行功能一致性检查
   */
  async execute() {
    console.log('🔍 开始功能实现一致性检查...\n');

    try {
      // 1. API接口调用方式一致性
      await this.checkAPICallConsistency();

      // 2. 错误处理模式一致性
      await this.checkErrorHandlingConsistency();

      // 3. 状态管理模式一致性
      await this.checkStateManagementConsistency();

      // 4. 相似功能模块实现一致性
      await this.checkSimilarModuleConsistency();

      // 5. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 功能一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查API接口调用方式一致性
   */
  async checkAPICallConsistency() {
    console.log('🌐 检查API接口调用方式一致性...');

    const serviceFiles = this.getServiceFiles();
    const apiPatterns = {
      fetch: 0,
      axios: 0,
      customApiService: 0
    };

    let inconsistencies = 0;

    for (const file of serviceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查API调用方式
        if (content.includes('fetch(')) {
          apiPatterns.fetch++;
          this.patterns.apiCalls.push({ file, method: 'fetch' });
        }
        
        if (content.includes('axios.') || content.includes('import axios')) {
          apiPatterns.axios++;
          this.patterns.apiCalls.push({ file, method: 'axios' });
        }
        
        if (content.includes('apiService.') || content.includes('baseApiService.')) {
          apiPatterns.customApiService++;
          this.patterns.apiCalls.push({ file, method: 'customApiService' });
        }

        // 检查错误处理一致性
        const hasStandardErrorHandling = content.includes('try {') && content.includes('catch');
        const hasCustomErrorHandler = content.includes('errorHandler') || content.includes('handleError');
        
        if (!hasStandardErrorHandling && !hasCustomErrorHandler) {
          this.addIssue('api_calls', 'missing_error_handling', file,
            'API调用缺少错误处理机制');
          inconsistencies++;
        }

        // 检查响应数据处理一致性
        const hasResponseValidation = content.includes('.data') || content.includes('response.');
        if (content.includes('fetch(') && !hasResponseValidation) {
          this.addIssue('api_calls', 'missing_response_validation', file,
            'fetch调用缺少响应数据验证');
          inconsistencies++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取服务文件: ${file}`);
      }
    }

    // 检查API调用方式是否统一
    const usedMethods = Object.keys(apiPatterns).filter(method => apiPatterns[method] > 0);
    if (usedMethods.length > 1) {
      this.addIssue('api_calls', 'mixed_methods', 'project',
        `项目中使用了多种API调用方式: ${usedMethods.join(', ')}`);
      inconsistencies++;
    }

    console.log(`   发现 ${inconsistencies} 个API调用一致性问题`);
    console.log(`   API调用方式分布: fetch(${apiPatterns.fetch}), axios(${apiPatterns.axios}), custom(${apiPatterns.customApiService})\n`);
  }

  /**
   * 检查错误处理模式一致性
   */
  async checkErrorHandlingConsistency() {
    console.log('🚨 检查错误处理模式一致性...');

    const allFiles = this.getAllProjectFiles();
    const errorPatterns = {
      tryCatch: 0,
      errorBoundary: 0,
      customErrorHandler: 0,
      noErrorHandling: 0
    };

    let inconsistencies = 0;

    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查错误处理模式
        if (content.includes('try {') && content.includes('catch')) {
          errorPatterns.tryCatch++;
          this.patterns.errorHandling.push({ file, pattern: 'try-catch' });
        }
        
        if (content.includes('ErrorBoundary') || content.includes('componentDidCatch')) {
          errorPatterns.errorBoundary++;
          this.patterns.errorHandling.push({ file, pattern: 'error-boundary' });
        }
        
        if (content.includes('errorHandler') || content.includes('handleError')) {
          errorPatterns.customErrorHandler++;
          this.patterns.errorHandling.push({ file, pattern: 'custom-handler' });
        }

        // 检查异步操作是否有错误处理
        const hasAsyncOperations = content.includes('async ') || content.includes('await ') || content.includes('.then(');
        const hasErrorHandling = content.includes('catch') || content.includes('handleError');
        
        if (hasAsyncOperations && !hasErrorHandling) {
          this.addIssue('error_handling', 'missing_async_error_handling', file,
            '异步操作缺少错误处理');
          inconsistencies++;
          errorPatterns.noErrorHandling++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取文件: ${file}`);
      }
    }

    console.log(`   发现 ${inconsistencies} 个错误处理一致性问题`);
    console.log(`   错误处理模式分布: try-catch(${errorPatterns.tryCatch}), error-boundary(${errorPatterns.errorBoundary}), custom(${errorPatterns.customErrorHandler}), none(${errorPatterns.noErrorHandling})\n`);
  }

  /**
   * 检查状态管理模式一致性
   */
  async checkStateManagementConsistency() {
    console.log('📊 检查状态管理模式一致性...');

    const componentFiles = this.getComponentFiles();
    const statePatterns = {
      useState: 0,
      useReducer: 0,
      contextAPI: 0,
      customHooks: 0
    };

    let inconsistencies = 0;

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查状态管理方式
        if (content.includes('useState')) {
          statePatterns.useState++;
          this.patterns.stateManagement.push({ file, pattern: 'useState' });
        }
        
        if (content.includes('useReducer')) {
          statePatterns.useReducer++;
          this.patterns.stateManagement.push({ file, pattern: 'useReducer' });
        }
        
        if (content.includes('useContext') || content.includes('Context.Provider')) {
          statePatterns.contextAPI++;
          this.patterns.stateManagement.push({ file, pattern: 'context' });
        }
        
        if (content.includes('use') && content.match(/use[A-Z]\w+/)) {
          statePatterns.customHooks++;
          this.patterns.stateManagement.push({ file, pattern: 'custom-hooks' });
        }

        // 检查状态更新模式
        const hasDirectStateUpdate = content.includes('setState') || content.includes('set');
        const hasImmutableUpdate = content.includes('...') || content.includes('Object.assign');
        
        if (hasDirectStateUpdate && !hasImmutableUpdate && content.includes('useState')) {
          this.addIssue('state_management', 'mutable_state_update', file,
            '可能存在直接修改状态的问题');
          inconsistencies++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取组件文件: ${file}`);
      }
    }

    console.log(`   发现 ${inconsistencies} 个状态管理一致性问题`);
    console.log(`   状态管理模式分布: useState(${statePatterns.useState}), useReducer(${statePatterns.useReducer}), context(${statePatterns.contextAPI}), custom-hooks(${statePatterns.customHooks})\n`);
  }

  /**
   * 检查相似功能模块实现一致性
   */
  async checkSimilarModuleConsistency() {
    console.log('🔧 检查相似功能模块实现一致性...');

    // 检查测试页面组件的一致性
    const testPages = this.getTestPageFiles();
    let inconsistencies = 0;

    const commonStructures = {
      hasUrlInput: 0,
      hasProgressBar: 0,
      hasResultsDisplay: 0,
      hasErrorHandling: 0
    };

    for (const file of testPages) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('URLInput') || content.includes('UrlInput')) {
          commonStructures.hasUrlInput++;
        }
        
        if (content.includes('ProgressBar') || content.includes('Progress')) {
          commonStructures.hasProgressBar++;
        }
        
        if (content.includes('Results') || content.includes('TestResults')) {
          commonStructures.hasResultsDisplay++;
        }
        
        if (content.includes('ErrorBoundary') || content.includes('error')) {
          commonStructures.hasErrorHandling++;
        }

        this.patterns.componentStructures.push({
          file,
          hasUrlInput: content.includes('URLInput'),
          hasProgressBar: content.includes('ProgressBar'),
          hasResultsDisplay: content.includes('Results'),
          hasErrorHandling: content.includes('error')
        });

      } catch (error) {
        console.log(`   ⚠️  无法读取测试页面: ${file}`);
      }
    }

    // 检查结构一致性
    const totalTestPages = testPages.length;
    if (totalTestPages > 0) {
      const urlInputRatio = commonStructures.hasUrlInput / totalTestPages;
      const progressBarRatio = commonStructures.hasProgressBar / totalTestPages;
      const resultsDisplayRatio = commonStructures.hasResultsDisplay / totalTestPages;

      if (urlInputRatio < 0.8) {
        this.addIssue('module_consistency', 'inconsistent_url_input', 'test_pages',
          `只有${Math.round(urlInputRatio * 100)}%的测试页面包含URL输入组件`);
        inconsistencies++;
      }

      if (progressBarRatio < 0.8) {
        this.addIssue('module_consistency', 'inconsistent_progress_bar', 'test_pages',
          `只有${Math.round(progressBarRatio * 100)}%的测试页面包含进度条组件`);
        inconsistencies++;
      }

      if (resultsDisplayRatio < 0.8) {
        this.addIssue('module_consistency', 'inconsistent_results_display', 'test_pages',
          `只有${Math.round(resultsDisplayRatio * 100)}%的测试页面包含结果显示组件`);
        inconsistencies++;
      }
    }

    console.log(`   发现 ${inconsistencies} 个模块一致性问题`);
    console.log(`   测试页面结构分布: URL输入(${commonStructures.hasUrlInput}/${totalTestPages}), 进度条(${commonStructures.hasProgressBar}/${totalTestPages}), 结果显示(${commonStructures.hasResultsDisplay}/${totalTestPages})\n`);
  }

  /**
   * 获取服务文件
   */
  getServiceFiles() {
    return this.getAllProjectFiles().filter(file => 
      file.includes('/services/') && ['.ts', '.js'].includes(path.extname(file))
    );
  }

  /**
   * 获取组件文件
   */
  getComponentFiles() {
    return this.getAllProjectFiles().filter(file => 
      file.includes('/components/') && ['.tsx', '.jsx'].includes(path.extname(file))
    );
  }

  /**
   * 获取测试页面文件
   */
  getTestPageFiles() {
    return this.getAllProjectFiles().filter(file => 
      file.includes('/testing/') && file.includes('Test.tsx')
    );
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (this.shouldSkipDirectory(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (this.isProjectFile(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    walkDir(path.join(this.projectRoot, 'frontend'));
    walkDir(path.join(this.projectRoot, 'backend'));
    return files;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  isProjectFile(fileName) {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  addIssue(category, type, file, message) {
    this.issues.push({
      category,
      type,
      file: typeof file === 'string' ? path.relative(this.projectRoot, file) : file,
      message,
      severity: this.getSeverity(category, type)
    });
  }

  getSeverity(category, type) {
    const severityMap = {
      api_calls: { mixed_methods: 'high', missing_error_handling: 'medium', missing_response_validation: 'low' },
      error_handling: { missing_async_error_handling: 'medium' },
      state_management: { mutable_state_update: 'medium' },
      module_consistency: { inconsistent_url_input: 'low', inconsistent_progress_bar: 'low', inconsistent_results_display: 'low' }
    };
    return severityMap[category]?.[type] || 'low';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'functional-consistency-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        categories: {
          api_calls: this.issues.filter(i => i.category === 'api_calls').length,
          error_handling: this.issues.filter(i => i.category === 'error_handling').length,
          state_management: this.issues.filter(i => i.category === 'state_management').length,
          module_consistency: this.issues.filter(i => i.category === 'module_consistency').length
        }
      },
      patterns: this.patterns,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 功能实现一致性检查报告:');
    console.log(`   总问题数: ${report.summary.totalIssues}`);
    console.log(`   - API调用问题: ${report.summary.categories.api_calls}`);
    console.log(`   - 错误处理问题: ${report.summary.categories.error_handling}`);
    console.log(`   - 状态管理问题: ${report.summary.categories.state_management}`);
    console.log(`   - 模块一致性问题: ${report.summary.categories.module_consistency}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new FunctionalConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ 功能一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = FunctionalConsistencyChecker;
