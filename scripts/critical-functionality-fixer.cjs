#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CriticalFunctionalityFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.fixes = [];
        this.createdFiles = [];
    }

    /**
     * 执行关键功能修复
     */
    async execute() {
        console.log('🔧 开始关键功能修复...\n');

        try {
            // 1. 创建缺失的关键API端点
            await this.createMissingApiEndpoints();

            // 2. 创建缺失的关键组件
            await this.createMissingComponents();

            // 3. 修复页面API集成
            await this.fixPageApiIntegration();

            // 4. 添加错误处理到API服务
            await this.addErrorHandlingToApiServices();

            // 5. 生成修复报告
            this.generateFixReport();

        } catch (error) {
            console.error('❌ 关键功能修复过程中发生错误:', error);
            throw error;
        }
    }

    /**
     * 创建缺失的关键API端点
     */
    async createMissingApiEndpoints() {
        console.log('🔗 创建缺失的关键API端点...');

        // 创建认证API端点
        await this.createAuthApiEndpoints();

        // 创建测试API端点
        await this.createTestApiEndpoints();

        // 创建数据管理API端点
        await this.createDataApiEndpoints();

        console.log('   ✅ API端点创建完成\n');
    }

    /**
     * 创建认证API端点
     */
    async createAuthApiEndpoints() {
        const authRoutePath = path.join(this.projectRoot, 'backend/routes/auth.js');

        if (!fs.existsSync(authRoutePath)) {
            const authRouteContent = `const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { asyncRouteHandler } = require('../utils/asyncErrorHandler');
const { createSuccessResponse, createErrorResponse } = require('../../shared/utils/apiResponseBuilder');

const router = express.Router();

// 用户登录
router.post('/login', asyncRouteHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', '用户名和密码不能为空'));
  }

  // TODO: 实现用户验证逻辑
  // 这里应该查询数据库验证用户

  // 临时实现 - 演示用
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign(
      { userId: 1, username: 'admin' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    return res.json(createSuccessResponse({
      user: { id: 1, username: 'admin', email: 'admin@example.com' },
      token,
      expiresIn: 86400
    }, '登录成功'));
  }

  return res.status(401).json(createErrorResponse('INVALID_CREDENTIALS', '用户名或密码错误'));
}));

// 用户注册
router.post('/register', asyncRouteHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', '用户名、邮箱和密码不能为空'));
  }

  // TODO: 实现用户注册逻辑
  // 这里应该检查用户是否已存在，然后创建新用户

  // 临时实现 - 演示用
  const hashedPassword = await bcrypt.hash(password, 10);

  return res.status(201).json(createSuccessResponse({
    user: { id: Date.now(), username, email },
    message: '注册成功，请登录'
  }, '用户注册成功'));
}));

// 用户登出
router.post('/logout', asyncRouteHandler(async (req, res) => {
  // TODO: 实现登出逻辑（如果使用session或需要token黑名单）

  return res.json(createSuccessResponse(null, '登出成功'));
}));

// 获取当前用户信息
router.get('/me', asyncRouteHandler(async (req, res) => {
  // TODO: 实现获取当前用户信息的逻辑
  // 需要先实现认证中间件

  return res.json(createSuccessResponse({
    user: { id: 1, username: 'admin', email: 'admin@example.com' }
  }, '获取用户信息成功'));
}));

module.exports = router;`;

            fs.writeFileSync(authRoutePath, authRouteContent);
            this.createdFiles.push('backend/routes/auth.js');
            this.addFix('api_endpoint', 'backend/routes/auth.js', '创建认证API端点');
        }
    }

    /**
     * 创建测试API端点
     */
    async createTestApiEndpoints() {
        const testRoutePath = path.join(this.projectRoot, 'backend/routes/tests.js');

        if (!fs.existsSync(testRoutePath)) {
            const testRouteContent = `const express = require('express');
const { asyncRouteHandler } = require('../utils/asyncErrorHandler');
const { createSuccessResponse, createErrorResponse } = require('../../shared/utils/apiResponseBuilder');

const router = express.Router();

// 运行测试
router.post('/run', asyncRouteHandler(async (req, res) => {
  const { testType, config } = req.body;

  if (!testType || !config) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', '测试类型和配置不能为空'));
  }

  // TODO: 实现实际的测试执行逻辑
  // 这里应该调用相应的测试引擎

  // 临时实现 - 演示用
  const executionId = Date.now().toString();

  // 模拟异步测试执行
  setTimeout(() => {
    console.log(\`测试 \${executionId} 执行完成\`);
  }, 5000);

  return res.json(createSuccessResponse({
    executionId,
    status: 'running',
    testType,
    startTime: new Date().toISOString()
  }, '测试已开始执行'));
}));

// 获取测试结果
router.get('/results/:executionId', asyncRouteHandler(async (req, res) => {
  const { executionId } = req.params;

  // TODO: 实现从数据库获取测试结果的逻辑

  // 临时实现 - 演示用
  return res.json(createSuccessResponse({
    executionId,
    status: 'completed',
    results: {
      score: 85,
      metrics: {
        responseTime: 250,
        throughput: 1000,
        errorRate: 0.01
      },
      recommendations: ['优化数据库查询', '启用缓存']
    },
    completedAt: new Date().toISOString()
  }, '获取测试结果成功'));
}));

// 获取测试配置
router.get('/config/:testType', asyncRouteHandler(async (req, res) => {
  const { testType } = req.params;

  // TODO: 实现从数据库获取测试配置的逻辑

  // 临时实现 - 演示用
  const configs = {
    performance: {
      duration: 60,
      concurrency: 10,
      rampUp: 30
    },
    stress: {
      maxUsers: 1000,
      duration: 300,
      rampUp: 60
    },
    api: {
      timeout: 30,
      retries: 3,
      endpoints: []
    }
  };

  return res.json(createSuccessResponse(
    configs[testType] || {},
    '获取测试配置成功'
  ));
}));

// 获取测试历史
router.get('/history', asyncRouteHandler(async (req, res) => {
  const { page = 1, limit = 10, testType } = req.query;

  // TODO: 实现从数据库获取测试历史的逻辑

  // 临时实现 - 演示用
  const mockHistory = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: Date.now() - i * 1000,
    testType: testType || 'performance',
    status: ['completed', 'failed', 'running'][i % 3],
    score: Math.floor(Math.random() * 100),
    startTime: new Date(Date.now() - i * 3600000).toISOString(),
    duration: Math.floor(Math.random() * 300) + 60
  }));

  return res.json(createSuccessResponse(mockHistory, '获取测试历史成功'));
}));

module.exports = router;`;

            fs.writeFileSync(testRoutePath, testRouteContent);
            this.createdFiles.push('backend/routes/tests.js');
            this.addFix('api_endpoint', 'backend/routes/tests.js', '创建测试API端点');
        }
    }

    /**
     * 创建数据管理API端点
     */
    async createDataApiEndpoints() {
        const dataRoutePath = path.join(this.projectRoot, 'backend/routes/data.js');

        if (!fs.existsSync(dataRoutePath)) {
            const dataRouteContent = `const express = require('express');
const { asyncRouteHandler } = require('../utils/asyncErrorHandler');
const { createSuccessResponse, createErrorResponse, createPaginatedResponse } = require('../../shared/utils/apiResponseBuilder');

const router = express.Router();

// 获取数据列表
router.get('/list', asyncRouteHandler(async (req, res) => {
  const { page = 1, limit = 10, type, search } = req.query;

  // TODO: 实现从数据库获取数据列表的逻辑

  // 临时实现 - 演示用
  const mockData = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: Date.now() - i * 1000,
    type: type || 'test_result',
    name: \`数据项 \${i + 1}\`,
    status: ['active', 'inactive'][i % 2],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }));

  return res.json(createPaginatedResponse(
    mockData,
    parseInt(page),
    parseInt(limit),
    100, // 总数
    '获取数据列表成功'
  ));
}));

// 创建数据
router.post('/create', asyncRouteHandler(async (req, res) => {
  const { type, name, data } = req.body;

  if (!type || !name) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', '类型和名称不能为空'));
  }

  // TODO: 实现数据创建逻辑

  // 临时实现 - 演示用
  const newData = {
    id: Date.now(),
    type,
    name,
    data: data || {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return res.status(201).json(createSuccessResponse(newData, '数据创建成功'));
}));

// 更新数据
router.put('/update/:id', asyncRouteHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // TODO: 实现数据更新逻辑

  // 临时实现 - 演示用
  const updatedData = {
    id: parseInt(id),
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  return res.json(createSuccessResponse(updatedData, '数据更新成功'));
}));

// 删除数据
router.delete('/delete/:id', asyncRouteHandler(async (req, res) => {
  const { id } = req.params;

  // TODO: 实现数据删除逻辑

  // 临时实现 - 演示用
  return res.json(createSuccessResponse(
    { id: parseInt(id), deleted: true },
    '数据删除成功'
  ));
}));

module.exports = router;`;

            fs.writeFileSync(dataRoutePath, dataRouteContent);
            this.createdFiles.push('backend/routes/data.js');
            this.addFix('api_endpoint', 'backend/routes/data.js', '创建数据管理API端点');
        }
    }

    /**
     * 创建缺失的关键组件
     */
    async createMissingComponents() {
        console.log('🧩 创建缺失的关键组件...');

        await this.createAuthService();
        await this.createTestResults();
        await this.createDataComponents();

        console.log('   ✅ 关键组件创建完成\n');
    }

    /**
     * 创建AuthService组件
     */
    async createAuthService() {
        const authServicePath = path.join(this.projectRoot, 'frontend/services/authService.ts');

        if (!fs.existsSync(authServicePath)) {
            const authServiceContent = `/**
 * 认证服务
 * 处理用户登录、注册、登出等认证相关功能
 */

import { createSuccessResponse, createErrorResponse } from '../../shared/utils/apiResponseBuilder';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

class AuthService {
  private baseUrl = '/api/auth';
  private token: string | null = null;

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(\`\${this.baseUrl}/login\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '登录失败');
      }

      // 保存token
      this.token = result.data.token;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      return result.data;
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    }
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<{ user: User; message: string }> {
    try {
      const response = await fetch(\`\${this.baseUrl}/register\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '注册失败');
      }

      return result.data;
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await fetch(\`\${this.baseUrl}/logout\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.token}\`,
        },
      });
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      // 清除本地存储
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(\`\${this.baseUrl}/me\`, {
        headers: {
          'Authorization': \`Bearer \${this.token}\`,
        },
      });

      if (!response.ok) {
        throw new Error('获取用户信息失败');
      }

      const result = await response.json();
      return result.data.user;
    } catch (error) {
      console.error('获取用户信息错误:', error);
      return null;
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * 获取token
   */
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  /**
   * 获取当前用户（从本地存储）
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;`;

            fs.writeFileSync(authServicePath, authServiceContent);
            this.createdFiles.push('frontend/services/authService.ts');
            this.addFix('component', 'frontend/services/authService.ts', '创建认证服务');
        }
    }

    /**
     * 创建TestResults组件
     */
    async createTestResults() {
        const testResultsPath = path.join(this.projectRoot, 'frontend/components/TestResults.tsx');

        if (!fs.existsSync(testResultsPath)) {
            const testResultsContent = `/**
 * 测试结果组件
 * 显示测试执行结果和相关指标
 */

import React from 'react';

export interface TestResult {
  executionId: string;
  status: 'running' | 'completed' | 'failed';
  testType: string;
  score?: number;
  metrics?: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
  };
  recommendations?: string[];
  startTime: string;
  completedAt?: string;
}

interface TestResultsProps {
  result: TestResult;
  onRetry?: () => void;
  onDownload?: () => void;
}

export const TestResults: React.FC<TestResultsProps> = ({
  result,
  onRetry,
  onDownload
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">测试结果</h3>
          <p className="text-sm text-gray-600">执行ID: {result.executionId}</p>
        </div>
        <div className="flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新测试
            </button>
          )}
          {onDownload && result.status === 'completed' && (
            <button
              onClick={onDownload}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              下载报告
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700">状态</label>
          <p className={\`text-lg font-semibold \${getStatusColor(result.status)}\`}>
            {result.status === 'running' && '运行中'}
            {result.status === 'completed' && '已完成'}
            {result.status === 'failed' && '失败'}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">测试类型</label>
          <p className="text-lg">{result.testType}</p>
        </div>
      </div>

      {result.score !== undefined && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">总体评分</label>
          <p className={\`text-2xl font-bold \${getScoreColor(result.score)}\`}>
            {result.score}/100
          </p>
        </div>
      )}

      {result.metrics && (
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">性能指标</h4>
          <div className="grid grid-cols-3 gap-4">
            {result.metrics.responseTime && (
              <div>
                <label className="text-sm text-gray-600">响应时间</label>
                <p className="text-lg font-semibold">{result.metrics.responseTime}ms</p>
              </div>
            )}
            {result.metrics.throughput && (
              <div>
                <label className="text-sm text-gray-600">吞吐量</label>
                <p className="text-lg font-semibold">{result.metrics.throughput}/s</p>
              </div>
            )}
            {result.metrics.errorRate && (
              <div>
                <label className="text-sm text-gray-600">错误率</label>
                <p className="text-lg font-semibold">{(result.metrics.errorRate * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {result.recommendations && result.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">优化建议</h4>
          <ul className="list-disc list-inside space-y-1">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-700">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>开始时间: {new Date(result.startTime).toLocaleString()}</p>
        {result.completedAt && (
          <p>完成时间: {new Date(result.completedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
};

export default TestResults;`;

            fs.writeFileSync(testResultsPath, testResultsContent);
            this.createdFiles.push('frontend/components/TestResults.tsx');
            this.addFix('component', 'frontend/components/TestResults.tsx', '创建测试结果组件');
        }
    }

    /**
     * 创建数据管理组件
     */
    async createDataComponents() {
        // 创建DataTable组件
        const dataTablePath = path.join(this.projectRoot, 'frontend/components/DataTable.tsx');

        if (!fs.existsSync(dataTablePath)) {
            const dataTableContent = `/**
 * 数据表格组件
 * 通用的数据展示表格
 */

import React from 'react';

export interface DataItem {
  id: number;
  [key: string]: any;
}

interface DataTableProps {
  data: DataItem[];
  columns: Array<{
    key: string;
    title: string;
    render?: (value: any, item: DataItem) => React.ReactNode;
  }>;
  loading?: boolean;
  onEdit?: (item: DataItem) => void;
  onDelete?: (item: DataItem) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  loading = false,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.title}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(item[column.key], item) : item[column.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无数据
        </div>
      )}
    </div>
  );
};

export default DataTable;`;

            fs.writeFileSync(dataTablePath, dataTableContent);
            this.createdFiles.push('frontend/components/DataTable.tsx');
            this.addFix('component', 'frontend/components/DataTable.tsx', '创建数据表格组件');
        }
    }

    /**
     * 修复页面API集成
     */
    async fixPageApiIntegration() {
        console.log('🔗 修复页面API集成...');

        // 这里可以添加具体的页面API集成修复逻辑
        // 由于页面较多，这里只做示例

        console.log('   ⚠️  页面API集成需要手动修复，请参考创建的服务文件');
        console.log('   ✅ API集成修复指导完成\n');
    }

    /**
     * 添加错误处理到API服务
     */
    async addErrorHandlingToApiServices() {
        console.log('🛡️ 添加错误处理到API服务...');

        // 这里可以添加具体的API服务错误处理逻辑
        // 由于服务较多，这里只做示例

        console.log('   ⚠️  API服务错误处理需要手动添加，请参考创建的authService示例');
        console.log('   ✅ 错误处理指导完成\n');
    }

    /**
     * 添加修复记录
     */
    addFix(category, filePath, description) {
        this.fixes.push({
            category,
            file: path.relative(this.projectRoot, filePath),
            description,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 生成修复报告
     */
    generateFixReport() {
        const reportPath = path.join(this.projectRoot, 'critical-functionality-fix-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFixes: this.fixes.length,
                createdFiles: this.createdFiles.length,
                categories: {
                    api_endpoints: this.fixes.filter(f => f.category === 'api_endpoint').length,
                    components: this.fixes.filter(f => f.category === 'component').length,
                    integrations: this.fixes.filter(f => f.category === 'integration').length
                }
            },
            createdFiles: this.createdFiles,
            fixes: this.fixes,
            nextSteps: [
                '更新主路由文件以包含新的API端点',
                '在前端页面中集成新创建的服务',
                '测试新创建的API端点功能',
                '完善错误处理和验证逻辑',
                '添加单元测试和集成测试'
            ]
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('📊 关键功能修复报告:');
        console.log(`   总修复数: ${report.summary.totalFixes}`);
        console.log(`   创建文件: ${report.summary.createdFiles}`);
        console.log(`   - API端点: ${report.summary.categories.api_endpoints}`);
        console.log(`   - 组件: ${report.summary.categories.components}`);
        console.log(`   - 集成: ${report.summary.categories.integrations}`);
        console.log(`   报告已保存: ${reportPath}\n`);

        console.log('📋 创建的文件:');
        this.createdFiles.forEach(file => {
            console.log(`   ✅ ${file}`);
        });

        console.log('\n🎯 下一步操作:');
        report.nextSteps.forEach((step, index) => {
            console.log(`   ${index + 1}. ${step}`);
        });
    }
}

// 执行脚本
if (require.main === module) {
    const fixer = new CriticalFunctionalityFixer();
    fixer.execute().catch(error => {
        console.error('❌ 关键功能修复失败:', error);
        process.exit(1);
    });
}

module.exports = CriticalFunctionalityFixer;