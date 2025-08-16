#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FrontendApiIntegrator {
  constructor() {
    this.projectRoot = process.cwd();
    this.integratedPages = [];
    this.fixes = [];
    
    // API集成模板
    this.apiIntegrationTemplates = {
      authentication: {
        imports: `import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import authService from '../services/authService';`,
        hooks: `const { executeAsync, state } = useAsyncErrorHandler();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);`,
        effects: `useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authService.getUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();
  }, []);`
      },
      
      dataFetching: {
        imports: `import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';`,
        hooks: `const { executeAsync, state } = useAsyncErrorHandler();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);`,
        effects: `useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await executeAsync(
        () => fetch('/api/data/list').then(res => res.json()),
        { context: 'DataFetching' }
      );
      
      if (result && result.success) {
        setData(result.data);
      }
      setLoading(false);
    };
    
    fetchData();
  }, []);`
      },
      
      testExecution: {
        imports: `import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';`,
        hooks: `const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);`,
        methods: `const runTest = async (config) => {
    setIsRunning(true);
    const result = await executeAsync(
      () => fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'performance', config })
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }
    );
    
    if (result && result.success) {
      setTestResult(result.data);
      // 轮询获取测试结果
      pollTestResult(result.data.executionId);
    }
    setIsRunning(false);
  };
  
  const pollTestResult = async (executionId) => {
    const interval = setInterval(async () => {
      const result = await executeAsync(
        () => fetch(\`/api/tests/results/\${executionId}\`).then(res => res.json()),
        { context: 'TestExecution.pollResult' }
      );
      
      if (result && result.success && result.data.status === 'completed') {
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };`
      }
    };
  }

  /**
   * 执行前端API集成
   */
  async execute() {
    console.log('🔗 开始前端API集成...\n');

    try {
      // 1. 扫描需要集成的页面
      const pages = await this.scanPagesForIntegration();
      
      // 2. 为每个页面类型添加API集成
      for (const page of pages) {
        await this.integratePage(page);
      }

      // 3. 创建通用API工具
      await this.createApiUtils();

      // 4. 生成集成报告
      this.generateIntegrationReport();

    } catch (error) {
      console.error('❌ 前端API集成过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描需要集成的页面
   */
  async scanPagesForIntegration() {
    console.log('📄 扫描需要API集成的页面...');

    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    const pages = [];

    if (fs.existsSync(pagesDir)) {
      const pageFiles = this.getFilesRecursively(pagesDir, ['.tsx', '.jsx']);
      
      for (const pageFile of pageFiles) {
        const analysis = await this.analyzePage(pageFile);
        if (analysis.needsIntegration) {
          pages.push(analysis);
        }
      }
    }

    console.log(`   发现 ${pages.length} 个页面需要API集成\n`);
    return pages;
  }

  /**
   * 分析页面是否需要API集成
   */
  async analyzePage(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // 检查是否已有API调用
    const hasApiCalls = content.includes('fetch(') || content.includes('axios') || content.includes('api.');
    
    // 检查是否有状态管理
    const hasState = content.includes('useState') || content.includes('useReducer');
    
    // 确定页面类型
    const pageType = this.determinePageType(fileName, content);
    
    // 判断是否需要集成
    const needsIntegration = !hasApiCalls && hasState && pageType !== 'unknown';
    
    return {
      filePath,
      fileName,
      pageType,
      hasApiCalls,
      hasState,
      needsIntegration,
      content
    };
  }

  /**
   * 确定页面类型
   */
  determinePageType(fileName, content) {
    // 认证相关页面
    if (/login|register|auth/i.test(fileName)) {
      return 'authentication';
    }
    
    // 测试相关页面
    if (/test|stress|performance|api.*test/i.test(fileName)) {
      return 'testing';
    }
    
    // 数据管理页面
    if (/data|table|list|management|admin/i.test(fileName)) {
      return 'dataManagement';
    }
    
    // 结果展示页面
    if (/result|report|detail|analytics/i.test(fileName)) {
      return 'results';
    }
    
    // 配置页面
    if (/config|setting|profile/i.test(fileName)) {
      return 'configuration';
    }
    
    return 'unknown';
  }

  /**
   * 为页面添加API集成
   */
  async integratePage(pageInfo) {
    console.log(`🔧 集成页面: ${pageInfo.fileName}`);

    let newContent = pageInfo.content;
    let modified = false;

    // 根据页面类型添加相应的API集成
    switch (pageInfo.pageType) {
      case 'authentication':
        newContent = this.addAuthenticationIntegration(newContent);
        modified = true;
        break;
        
      case 'testing':
        newContent = this.addTestingIntegration(newContent);
        modified = true;
        break;
        
      case 'dataManagement':
        newContent = this.addDataManagementIntegration(newContent);
        modified = true;
        break;
        
      case 'results':
        newContent = this.addResultsIntegration(newContent);
        modified = true;
        break;
        
      case 'configuration':
        newContent = this.addConfigurationIntegration(newContent);
        modified = true;
        break;
    }

    if (modified) {
      // 添加通用的加载状态和错误处理
      newContent = this.addLoadingAndErrorHandling(newContent);
      
      fs.writeFileSync(pageInfo.filePath, newContent);
      this.integratedPages.push({
        file: path.relative(this.projectRoot, pageInfo.filePath),
        pageType: pageInfo.pageType,
        integration: 'completed'
      });
      this.addFix('api_integration', pageInfo.filePath, `添加${pageInfo.pageType}类型的API集成`);
    }
  }

  /**
   * 添加认证集成
   */
  addAuthenticationIntegration(content) {
    // 添加导入
    if (!content.includes('authService')) {
      content = this.addImports(content, this.apiIntegrationTemplates.authentication.imports);
    }

    // 添加状态和Hook
    content = this.addHooksToComponent(content, this.apiIntegrationTemplates.authentication.hooks);

    // 添加useEffect
    content = this.addEffectToComponent(content, this.apiIntegrationTemplates.authentication.effects);

    // 添加登录方法
    const loginMethod = `
  const handleLogin = async (credentials) => {
    const result = await executeAsync(
      () => authService.login(credentials),
      { context: 'Login.handleLogin' }
    );
    
    if (result) {
      setUser(result.user);
      setIsAuthenticated(true);
      // 重定向到主页或之前的页面
      navigate('/dashboard');
    }
  };`;

    content = this.addMethodToComponent(content, loginMethod);

    return content;
  }

  /**
   * 添加测试集成
   */
  addTestingIntegration(content) {
    // 添加导入
    if (!content.includes('useAsyncErrorHandler')) {
      content = this.addImports(content, this.apiIntegrationTemplates.testExecution.imports);
    }

    // 添加状态和Hook
    content = this.addHooksToComponent(content, this.apiIntegrationTemplates.testExecution.hooks);

    // 添加测试方法
    content = this.addMethodToComponent(content, this.apiIntegrationTemplates.testExecution.methods);

    return content;
  }

  /**
   * 添加数据管理集成
   */
  addDataManagementIntegration(content) {
    // 添加导入
    if (!content.includes('useAsyncErrorHandler')) {
      content = this.addImports(content, this.apiIntegrationTemplates.dataFetching.imports);
    }

    // 添加状态和Hook
    content = this.addHooksToComponent(content, this.apiIntegrationTemplates.dataFetching.hooks);

    // 添加数据获取效果
    content = this.addEffectToComponent(content, this.apiIntegrationTemplates.dataFetching.effects);

    // 添加CRUD方法
    const crudMethods = `
  const createData = async (newData) => {
    const result = await executeAsync(
      () => fetch('/api/data/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      }).then(res => res.json()),
      { context: 'DataManagement.createData' }
    );
    
    if (result && result.success) {
      // 刷新数据列表
      fetchData();
    }
  };
  
  const updateData = async (id, updateData) => {
    const result = await executeAsync(
      () => fetch(\`/api/data/update/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      }).then(res => res.json()),
      { context: 'DataManagement.updateData' }
    );
    
    if (result && result.success) {
      fetchData();
    }
  };
  
  const deleteData = async (id) => {
    const result = await executeAsync(
      () => fetch(\`/api/data/delete/\${id}\`, {
        method: 'DELETE'
      }).then(res => res.json()),
      { context: 'DataManagement.deleteData' }
    );
    
    if (result && result.success) {
      fetchData();
    }
  };`;

    content = this.addMethodToComponent(content, crudMethods);

    return content;
  }

  /**
   * 添加结果展示集成
   */
  addResultsIntegration(content) {
    // 类似于数据获取，但专注于结果展示
    return this.addDataManagementIntegration(content);
  }

  /**
   * 添加配置集成
   */
  addConfigurationIntegration(content) {
    // 类似于数据管理，但专注于配置
    return this.addDataManagementIntegration(content);
  }

  /**
   * 添加加载状态和错误处理
   */
  addLoadingAndErrorHandling(content) {
    // 在组件返回中添加加载和错误状态处理
    const loadingErrorHandling = `
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              操作失败
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }`;

    // 在return语句前添加加载和错误处理
    const returnMatch = content.match(/return\s*\(/);
    if (returnMatch) {
      const insertIndex = content.indexOf(returnMatch[0]);
      content = content.slice(0, insertIndex) + loadingErrorHandling + '\n\n  ' + content.slice(insertIndex);
    }

    return content;
  }

  /**
   * 工具方法 - 添加导入
   */
  addImports(content, imports) {
    const importMatch = content.match(/import.*from.*;/);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, lastImportIndex) + '\n' + imports + content.slice(lastImportIndex);
    } else {
      content = imports + '\n\n' + content;
    }
    return content;
  }

  /**
   * 工具方法 - 添加Hook到组件
   */
  addHooksToComponent(content, hooks) {
    // 在组件函数内部的开始位置添加hooks
    const componentMatch = content.match(/const\s+\w+.*=.*\(\)\s*=>\s*{/);
    if (componentMatch) {
      const insertIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      content = content.slice(0, insertIndex) + '\n  ' + hooks + content.slice(insertIndex);
    }
    return content;
  }

  /**
   * 工具方法 - 添加useEffect到组件
   */
  addEffectToComponent(content, effect) {
    return this.addHooksToComponent(content, '\n  ' + effect);
  }

  /**
   * 工具方法 - 添加方法到组件
   */
  addMethodToComponent(content, method) {
    return this.addHooksToComponent(content, '\n  ' + method);
  }

  /**
   * 创建通用API工具
   */
  async createApiUtils() {
    console.log('🛠️ 创建通用API工具...');

    const apiUtilsPath = path.join(this.projectRoot, 'frontend/utils/apiClient.ts');
    
    const apiUtilsContent = `/**
 * 通用API客户端工具
 * 提供统一的API调用接口和错误处理
 */

import authService from '../services/authService';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const token = authService.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': \`Bearer \${token}\` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || \`HTTP \${response.status}\`);
      }

      return result;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;`;

    fs.writeFileSync(apiUtilsPath, apiUtilsContent);
    this.addFix('api_utils', apiUtilsPath, '创建通用API客户端工具');

    console.log('   ✅ API工具创建完成\n');
  }

  /**
   * 工具方法
   */
  getFilesRecursively(dir, extensions) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成集成报告
   */
  generateIntegrationReport() {
    const reportPath = path.join(this.projectRoot, 'frontend-api-integration-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIntegrations: this.integratedPages.length,
        totalFixes: this.fixes.length,
        pageTypes: {
          authentication: this.integratedPages.filter(p => p.pageType === 'authentication').length,
          testing: this.integratedPages.filter(p => p.pageType === 'testing').length,
          dataManagement: this.integratedPages.filter(p => p.pageType === 'dataManagement').length,
          results: this.integratedPages.filter(p => p.pageType === 'results').length,
          configuration: this.integratedPages.filter(p => p.pageType === 'configuration').length
        }
      },
      integratedPages: this.integratedPages,
      fixes: this.fixes,
      nextSteps: [
        '测试API集成功能',
        '验证错误处理机制',
        '检查用户体验流程',
        '添加单元测试',
        '优化性能和用户反馈'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 前端API集成报告:');
    console.log(`   集成页面: ${report.summary.totalIntegrations}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   页面类型分布:`);
    console.log(`   - 认证页面: ${report.summary.pageTypes.authentication}`);
    console.log(`   - 测试页面: ${report.summary.pageTypes.testing}`);
    console.log(`   - 数据管理: ${report.summary.pageTypes.dataManagement}`);
    console.log(`   - 结果展示: ${report.summary.pageTypes.results}`);
    console.log(`   - 配置页面: ${report.summary.pageTypes.configuration}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const integrator = new FrontendApiIntegrator();
  integrator.execute().catch(error => {
    console.error('❌ 前端API集成失败:', error);
    process.exit(1);
  });
}

module.exports = FrontendApiIntegrator;
