#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class BusinessFlowImplementer {
  constructor() {
    this.projectRoot = process.cwd();
    this.implementedFlows = [];
    this.fixes = [];

    // 业务流程定义
    this.businessFlows = {
      userAuthentication: {
        name: '用户认证流程',
        description: '完整的用户登录、注册、权限验证和登出流程',
        steps: [
          'user_registration',
          'email_verification',
          'user_login',
          'token_validation',
          'permission_check',
          'auto_logout',
          'session_management'
        ],
        components: ['Login', 'Register', 'AuthGuard', 'UserProfile'],
        apis: ['/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/auth/me'],
        priority: 'high'
      },

      testExecution: {
        name: '测试执行流程',
        description: '从配置测试到查看结果的完整测试执行流程',
        steps: [
          'test_configuration',
          'test_validation',
          'test_execution',
          'progress_monitoring',
          'result_collection',
          'report_generation',
          'result_analysis'
        ],
        components: ['TestConfig', 'TestRunner', 'TestProgress', 'TestResults'],
        apis: ['/api/tests/run', '/api/tests/results', '/api/tests/config', '/api/tests/history'],
        priority: 'high'
      },

      dataManagement: {
        name: '数据管理流程',
        description: '数据的创建、查询、更新、删除和导出流程',
        steps: [
          'data_query',
          'data_validation',
          'data_creation',
          'data_update',
          'data_deletion',
          'data_export',
          'data_backup'
        ],
        components: ['DataTable', 'DataForm', 'DataExport', 'DataImport'],
        apis: ['/api/data/list', '/api/data/create', '/api/data/update', '/api/data/delete'],
        priority: 'medium'
      }
    };
  }

  /**
   * 执行业务流程实现
   */
  async execute() {
    console.log('🔄 开始核心业务流程实现...\n');

    try {
      // 1. 实现用户认证流程
      await this.implementUserAuthenticationFlow();

      // 2. 实现测试执行流程
      await this.implementTestExecutionFlow();

      // 3. 实现数据管理流程
      await this.implementDataManagementFlow();

      // 4. 创建流程集成组件
      await this.createFlowIntegrationComponents();

      // 5. 生成实现报告
      this.generateImplementationReport();

    } catch (error) {
      console.error('❌ 业务流程实现过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 实现用户认证流程
   */
  async implementUserAuthenticationFlow() {
    console.log('🔐 实现用户认证流程...');

    // 1. 创建认证上下文
    await this.createAuthContext();

    // 2. 创建认证守卫
    await this.createAuthGuard();

    // 3. 创建认证Hook
    await this.createAuthHooks();

    // 4. 集成认证流程到路由
    await this.integrateAuthToRoutes();

    this.implementedFlows.push({
      name: 'userAuthentication',
      status: 'completed',
      components: ['AuthContext', 'AuthGuard', 'useAuth', 'ProtectedRoute']
    });

    console.log('   ✅ 用户认证流程实现完成\n');
  }

  /**
   * 创建认证上下文
   */
  async createAuthContext() {
    const authContextPath = path.join(this.projectRoot, 'frontend/contexts/AuthContext.tsx');

    if (!fs.existsSync(authContextPath)) {
      const authContextContent = `/**
 * 认证上下文
 * 提供全局的用户认证状态管理
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService, { User, LoginCredentials, RegisterData } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 初始化时检查认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        // 清除无效的token
        await authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      await authService.register(userData);
      // 注册成功后不自动登录，让用户手动登录
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      // 如果刷新失败，可能token已过期，执行登出
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;`;

      fs.writeFileSync(authContextPath, authContextContent);
      this.addFix('auth_flow', authContextPath, '创建认证上下文');
    }
  }

  /**
   * 创建认证守卫
   */
  async createAuthGuard() {
    const authGuardPath = path.join(this.projectRoot, 'frontend/components/auth/AuthGuard.tsx');

    // 确保目录存在
    const authDir = path.dirname(authGuardPath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    if (!fs.existsSync(authGuardPath)) {
      const authGuardContent = `/**
 * 认证守卫组件
 * 保护需要认证的路由和组件
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../ui/Loading';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
  fallback
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 正在加载认证状态
  if (isLoading) {
    return fallback || <Loading message="验证登录状态..." />;
  }

  // 需要认证但用户未登录
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 不需要认证或用户已登录
  return <>{children}</>;
};

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  return (
    <AuthGuard requireAuth={true} redirectTo={redirectTo}>
      {children}
    </AuthGuard>
  );
};

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/dashboard'
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading message="验证登录状态..." />;
  }

  // 如果已登录，重定向到指定页面
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;`;

      fs.writeFileSync(authGuardPath, authGuardContent);
      this.addFix('auth_flow', authGuardPath, '创建认证守卫组件');
    }
  }

  /**
   * 创建认证Hook
   */
  async createAuthHooks() {
    const authHooksPath = path.join(this.projectRoot, 'frontend/hooks/useAuthFlow.ts');

    if (!fs.existsSync(authHooksPath)) {
      const authHooksContent = `/**
 * 认证流程相关Hook
 * 提供认证流程的状态管理和操作
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAsyncErrorHandler } from './useAsyncErrorHandler';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useAuthFlow = () => {
  const { login, register, logout } = useAuth();
  const { executeAsync, state } = useAsyncErrorHandler();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 验证登录表单
  const validateLoginForm = useCallback((data: LoginFormData) => {
    const errors: Record<string, string> = {};

    if (!data.email || !data.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!data.password || !data.password.trim()) {
      errors.password = '密码不能为空';
    } else if (data.password.length < 6) {
      errors.password = '密码长度至少6位';
    }

    return errors;
  }, []);

  // 验证注册表单
  const validateRegisterForm = useCallback((data: RegisterFormData) => {
    const errors: Record<string, string> = {};

    if (!data.username || !data.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (data.username.length < 3) {
      errors.username = '用户名长度至少3位';
    }

    if (!data.email || !data.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!data.password || !data.password.trim()) {
      errors.password = '密码不能为空';
    } else if (data.password.length < 6) {
      errors.password = '密码长度至少6位';
    }

    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    return errors;
  }, []);

  // 处理登录
  const handleLogin = useCallback(async (formData: LoginFormData) => {
    const errors = validateLoginForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    const result = await executeAsync(
      () => login({
        username: formData.email, // 使用邮箱作为用户名
        password: formData.password
      }),
      { context: 'AuthFlow.login' }
    );

    return !!result;
  }, [login, validateLoginForm, executeAsync]);

  // 处理注册
  const handleRegister = useCallback(async (formData: RegisterFormData) => {
    const errors = validateRegisterForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    const result = await executeAsync(
      () => register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      }),
      { context: 'AuthFlow.register' }
    );

    return !!result;
  }, [register, validateRegisterForm, executeAsync]);

  // 处理登出
  const handleLogout = useCallback(async () => {
    const result = await executeAsync(
      () => logout(),
      { context: 'AuthFlow.logout' }
    );

    return !!result;
  }, [logout, executeAsync]);

  return {
    // 状态
    isLoading: state.isLoading,
    error: state.error,
    formErrors,

    // 方法
    handleLogin,
    handleRegister,
    handleLogout,
    validateLoginForm,
    validateRegisterForm,
    clearFormErrors: () => setFormErrors({}),
    clearError: () => state.error && setFormErrors({})
  };
};

export default useAuthFlow;`;

      fs.writeFileSync(authHooksPath, authHooksContent);
      this.addFix('auth_flow', authHooksPath, '创建认证流程Hook');
    }
  }

  /**
   * 集成认证流程到路由
   */
  async integrateAuthToRoutes() {
    // 这里可以添加路由集成逻辑
    // 由于路由配置可能在不同的文件中，这里只做示例
    console.log('   📝 认证流程已准备好集成到路由系统');
  }

  /**
   * 实现测试执行流程
   */
  async implementTestExecutionFlow() {
    console.log('🧪 实现测试执行流程...');

    // 1. 创建测试流程管理器
    await this.createTestFlowManager();

    // 2. 创建测试状态Hook
    await this.createTestStateHook();

    // 3. 创建测试结果处理器
    await this.createTestResultHandler();

    this.implementedFlows.push({
      name: 'testExecution',
      status: 'completed',
      components: ['TestFlowManager', 'useTestFlow', 'TestResultHandler']
    });

    console.log('   ✅ 测试执行流程实现完成\n');
  }

  /**
   * 创建测试流程管理器
   */
  async createTestFlowManager() {
    const testFlowPath = path.join(this.projectRoot, 'frontend/services/testFlowManager.ts');

    if (!fs.existsSync(testFlowPath)) {
      const testFlowContent = `/**
 * 测试流程管理器
 * 管理完整的测试执行流程
 */

import apiClient from '../utils/apiClient';

export interface TestConfig {
  testType: 'performance' | 'stress' | 'api' | 'seo' | 'security';
  url: string;
  duration: number;
  concurrency?: number;
  options?: Record<string, any>;
}

export interface TestExecution {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  config: TestConfig;
  results?: any;
}

class TestFlowManager {
  private executions = new Map<string, TestExecution>();
  private listeners = new Set<(execution: TestExecution) => void>();

  /**
   * 开始测试执行
   */
  async startTest(config: TestConfig): Promise<string> {
    try {
      const response = await apiClient.post('/tests/run', {
        testType: config.testType,
        config
      });

      if (response.success) {
        const execution: TestExecution = {
          id: response.data.executionId,
          status: 'running',
          progress: 0,
          startTime: response.data.startTime,
          config
        };

        this.executions.set(execution.id, execution);
        this.notifyListeners(execution);

        // 开始轮询状态
        this.pollTestStatus(execution.id);

        return execution.id;
      } else {
        throw new Error(response.error?.message || '启动测试失败');
      }
    } catch (error) {
      console.error('启动测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResults(executionId: string): Promise<any> {
    try {
      const response = await apiClient.get(\`/tests/results/\${executionId}\`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '获取测试结果失败');
      }
    } catch (error) {
      console.error('获取测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(executionId: string): Promise<void> {
    try {
      const response = await apiClient.post(\`/tests/cancel/\${executionId}\`);
      
      if (response.success) {
        const execution = this.executions.get(executionId);
        if (execution) {
          execution.status = 'cancelled';
          this.executions.set(executionId, execution);
          this.notifyListeners(execution);
        }
      } else {
        throw new Error(response.error?.message || '取消测试失败');
      }
    } catch (error) {
      console.error('取消测试失败:', error);
      throw error;
    }
  }

  /**
   * 轮询测试状态
   */
  private async pollTestStatus(executionId: string) {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(\`/tests/results/\${executionId}\`);
        
        if (response.success) {
          const execution = this.executions.get(executionId);
          if (execution) {
            execution.status = response.data.status;
            execution.progress = response.data.progress || 0;
            execution.results = response.data.results;
            
            if (response.data.status === 'completed') {
              execution.endTime = response.data.completedAt;
              clearInterval(interval);
            } else if (response.data.status === 'failed' || response.data.status === 'cancelled') {
              clearInterval(interval);
            }
            
            this.executions.set(executionId, execution);
            this.notifyListeners(execution);
          }
        }
      } catch (error) {
        console.error('轮询测试状态失败:', error);
        clearInterval(interval);
      }
    }, 2000);
  }

  /**
   * 添加状态监听器
   */
  addListener(listener: (execution: TestExecution) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(execution: TestExecution) {
    this.listeners.forEach(listener => listener(execution));
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId: string): TestExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 获取所有执行
   */
  getAllExecutions(): TestExecution[] {
    return Array.from(this.executions.values());
  }
}

export const testFlowManager = new TestFlowManager();
export default testFlowManager;`;

      fs.writeFileSync(testFlowPath, testFlowContent);
      this.addFix('test_flow', testFlowPath, '创建测试流程管理器');
    }
  }

  /**
   * 实现数据管理流程
   */
  async implementDataManagementFlow() {
    console.log('📊 实现数据管理流程...');

    // 1. 创建数据流程管理器
    await this.createDataFlowManager();

    this.implementedFlows.push({
      name: 'dataManagement',
      status: 'completed',
      components: ['DataFlowManager']
    });

    console.log('   ✅ 数据管理流程实现完成\n');
  }

  /**
   * 创建数据流程管理器
   */
  async createDataFlowManager() {
    const dataFlowPath = path.join(this.projectRoot, 'frontend/services/dataFlowManager.ts');

    if (!fs.existsSync(dataFlowPath)) {
      const dataFlowContent = `/**
 * 数据管理流程管理器
 * 管理数据的CRUD操作流程
 */

import apiClient from '../utils/apiClient';

export interface DataItem {
  id: number;
  type: string;
  name: string;
  data: any;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DataQuery {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DataFlowManager {
  /**
   * 查询数据列表
   */
  async queryData(query: DataQuery = {}): Promise<{ data: DataItem[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await apiClient.get(\`/data/list?\${params.toString()}\`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '查询数据失败');
      }
    } catch (error) {
      console.error('查询数据失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据
   */
  async createData(data: Omit<DataItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataItem> {
    try {
      const response = await apiClient.post('/data/create', data);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '创建数据失败');
      }
    } catch (error) {
      console.error('创建数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据
   */
  async updateData(id: number, data: Partial<DataItem>): Promise<DataItem> {
    try {
      const response = await apiClient.put(\`/data/update/\${id}\`, data);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || '更新数据失败');
      }
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async deleteData(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(\`/data/delete/\${id}\`);
      
      if (!response.success) {
        throw new Error(response.error?.message || '删除数据失败');
      }
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除数据
   */
  async batchDeleteData(ids: number[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteData(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('批量删除数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出数据
   */
  async exportData(query: DataQuery = {}, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      params.append('format', format);

      const response = await fetch(\`/api/data/export?\${params.toString()}\`, {
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('auth_token')}\`
        }
      });

      if (!response.ok) {
        throw new Error('导出数据失败');
      }

      return await response.blob();
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }
}

export const dataFlowManager = new DataFlowManager();
export default dataFlowManager;`;

      fs.writeFileSync(dataFlowPath, dataFlowContent);
      this.addFix('data_flow', dataFlowPath, '创建数据管理流程管理器');
    }
  }

  /**
   * 创建流程集成组件
   */
  async createFlowIntegrationComponents() {
    console.log('🔗 创建流程集成组件...');

    // 创建业务流程状态Hook
    await this.createBusinessFlowHook();

    console.log('   ✅ 流程集成组件创建完成\n');
  }

  /**
   * 创建业务流程状态Hook
   */
  async createBusinessFlowHook() {
    const businessFlowHookPath = path.join(this.projectRoot, 'frontend/hooks/useBusinessFlow.ts');

    if (!fs.existsSync(businessFlowHookPath)) {
      const businessFlowHookContent = `/**
 * 业务流程状态Hook
 * 提供业务流程的统一状态管理
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import testFlowManager, { TestConfig } from '../services/testFlowManager';
import dataFlowManager, { DataQuery } from '../services/dataFlowManager';
import { useAsyncErrorHandler } from './useAsyncErrorHandler';

export const useBusinessFlow = () => {
  const { isAuthenticated } = useAuth();
  const { executeAsync, state } = useAsyncErrorHandler();
  const [activeFlows, setActiveFlows] = useState<string[]>([]);

  // 执行测试流程
  const executeTestFlow = useCallback(async (config: TestConfig) => {
    if (!isAuthenticated) {
      throw new Error('请先登录');
    }

    const flowId = \`test_\${Date.now()}\`;
    setActiveFlows(prev => [...prev, flowId]);

    try {
      const executionId = await executeAsync(
        () => testFlowManager.startTest(config),
        { context: 'BusinessFlow.executeTest' }
      );

      return executionId;
    } finally {
      setActiveFlows(prev => prev.filter(id => id !== flowId));
    }
  }, [isAuthenticated, executeAsync]);

  // 执行数据管理流程
  const executeDataFlow = useCallback(async (operation: 'query' | 'create' | 'update' | 'delete', data?: any) => {
    if (!isAuthenticated) {
      throw new Error('请先登录');
    }

    const flowId = \`data_\${Date.now()}\`;
    setActiveFlows(prev => [...prev, flowId]);

    try {
      let result;
      switch (operation) {
        case 'query':
          result = await executeAsync(
            () => dataFlowManager.queryData(data as DataQuery),
            { context: 'BusinessFlow.queryData' }
          );
          break;
        case 'create':
          result = await executeAsync(
            () => dataFlowManager.createData(data),
            { context: 'BusinessFlow.createData' }
          );
          break;
        case 'update':
          result = await executeAsync(
            () => dataFlowManager.updateData(data.id, data),
            { context: 'BusinessFlow.updateData' }
          );
          break;
        case 'delete':
          result = await executeAsync(
            () => dataFlowManager.deleteData(data.id),
            { context: 'BusinessFlow.deleteData' }
          );
          break;
        default:
          throw new Error(\`不支持的操作: \${operation}\`);
      }

      return result;
    } finally {
      setActiveFlows(prev => prev.filter(id => id !== flowId));
    }
  }, [isAuthenticated, executeAsync]);

  // 检查流程状态
  const isFlowActive = useCallback((flowType?: string) => {
    if (!flowType) {
      return activeFlows.length > 0;
    }
    return activeFlows.some(id => id.startsWith(flowType));
  }, [activeFlows]);

  return {
    // 状态
    isLoading: state.isLoading,
    error: state.error,
    activeFlows,
    isAuthenticated,

    // 方法
    executeTestFlow,
    executeDataFlow,
    isFlowActive,

    // 流程状态检查
    isTestFlowActive: () => isFlowActive('test'),
    isDataFlowActive: () => isFlowActive('data'),
    hasActiveFlows: () => activeFlows.length > 0
  };
};

export default useBusinessFlow;`;

      fs.writeFileSync(businessFlowHookPath, businessFlowHookContent);
      this.addFix('business_flow', businessFlowHookPath, '创建业务流程状态Hook');
    }
  }

  /**
   * 创建测试状态Hook
   */
  async createTestStateHook() {
    const testStateHookPath = path.join(this.projectRoot, 'frontend/hooks/useTestFlow.ts');

    if (!fs.existsSync(testStateHookPath)) {
      const testStateHookContent = `/**
 * 测试流程状态Hook
 * 管理测试执行的状态和生命周期
 */

import { useState, useEffect, useCallback } from 'react';
import testFlowManager, { TestConfig, TestExecution } from '../services/testFlowManager';
import { useAsyncErrorHandler } from './useAsyncErrorHandler';

export const useTestFlow = () => {
  const { executeAsync, state } = useAsyncErrorHandler();
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<TestExecution | null>(null);

  // 监听测试状态变化
  useEffect(() => {
    const unsubscribe = testFlowManager.addListener((execution) => {
      setExecutions(prev => {
        const index = prev.findIndex(e => e.id === execution.id);
        if (index >= 0) {
          const newExecutions = [...prev];
          newExecutions[index] = execution;
          return newExecutions;
        } else {
          return [...prev, execution];
        }
      });

      // 更新当前执行
      setCurrentExecution(prev =>
        prev?.id === execution.id ? execution : prev
      );
    });

    return unsubscribe;
  }, []);

  // 开始测试
  const startTest = useCallback(async (config: TestConfig) => {
    const executionId = await executeAsync(
      () => testFlowManager.startTest(config),
      { context: 'TestFlow.startTest' }
    );

    if (executionId) {
      const execution = testFlowManager.getExecution(executionId);
      if (execution) {
        setCurrentExecution(execution);
      }
    }

    return executionId;
  }, [executeAsync]);

  // 取消测试
  const cancelTest = useCallback(async (executionId: string) => {
    await executeAsync(
      () => testFlowManager.cancelTest(executionId),
      { context: 'TestFlow.cancelTest' }
    );
  }, [executeAsync]);

  // 获取测试结果
  const getResults = useCallback(async (executionId: string) => {
    return await executeAsync(
      () => testFlowManager.getTestResults(executionId),
      { context: 'TestFlow.getResults' }
    );
  }, [executeAsync]);

  return {
    // 状态
    isLoading: state.isLoading,
    error: state.error,
    executions,
    currentExecution,

    // 方法
    startTest,
    cancelTest,
    getResults,

    // 便捷方法
    isTestRunning: currentExecution?.status === 'running',
    hasActiveTests: executions.some(e => e.status === 'running'),
    getExecutionById: (id: string) => executions.find(e => e.id === id)
  };
};

export default useTestFlow;`;

      fs.writeFileSync(testStateHookPath, testStateHookContent);
      this.addFix('test_flow', testStateHookPath, '创建测试状态Hook');
    }
  }

  /**
   * 创建测试结果处理器
   */
  async createTestResultHandler() {
    const testResultHandlerPath = path.join(this.projectRoot, 'frontend/services/testResultHandler.ts');

    if (!fs.existsSync(testResultHandlerPath)) {
      const testResultHandlerContent = `/**
 * 测试结果处理器
 * 处理测试结果的分析、格式化和导出
 */

export interface TestResult {
  executionId: string;
  testType: string;
  status: 'completed' | 'failed';
  score?: number;
  metrics: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
    [key: string]: any;
  };
  recommendations: string[];
  rawData: any;
  generatedAt: string;
}

class TestResultHandler {
  /**
   * 格式化测试结果
   */
  formatResult(rawResult: any): TestResult {
    return {
      executionId: rawResult.executionId,
      testType: rawResult.testType || 'unknown',
      status: rawResult.status,
      score: rawResult.score,
      metrics: rawResult.metrics || {},
      recommendations: rawResult.recommendations || [],
      rawData: rawResult,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 分析测试结果
   */
  analyzeResult(result: TestResult): {
    summary: string;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 分析响应时间
    if (result.metrics.responseTime) {
      if (result.metrics.responseTime > 2000) {
        issues.push('响应时间过长');
        suggestions.push('考虑优化服务器性能或使用CDN');
      }
    }

    // 分析错误率
    if (result.metrics.errorRate) {
      if (result.metrics.errorRate > 0.05) {
        issues.push('错误率较高');
        suggestions.push('检查服务器稳定性和错误处理');
      }
    }

    // 分析吞吐量
    if (result.metrics.throughput) {
      if (result.metrics.throughput < 100) {
        issues.push('吞吐量较低');
        suggestions.push('考虑优化数据库查询和缓存策略');
      }
    }

    const summary = this.generateSummary(result, issues);

    return { summary, issues, suggestions };
  }

  /**
   * 生成结果摘要
   */
  private generateSummary(result: TestResult, issues: string[]): string {
    if (result.status === 'failed') {
      return '测试执行失败，请检查配置和网络连接';
    }

    if (issues.length === 0) {
      return '测试结果良好，性能指标符合预期';
    }

    return \`发现 \${issues.length} 个性能问题，建议进行优化\`;
  }

  /**
   * 导出测试结果
   */
  exportResult(result: TestResult, format: 'json' | 'csv' | 'pdf' = 'json'): string | Blob {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);

      case 'csv':
        return this.convertToCSV(result);

      case 'pdf':
        // 这里可以集成PDF生成库
        return this.generatePDFReport(result);

      default:
        throw new Error(\`不支持的导出格式: \${format}\`);
    }
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(result: TestResult): string {
    const headers = ['指标', '值'];
    const rows = [
      ['执行ID', result.executionId],
      ['测试类型', result.testType],
      ['状态', result.status],
      ['评分', result.score?.toString() || 'N/A'],
      ...Object.entries(result.metrics).map(([key, value]) => [key, value?.toString() || 'N/A'])
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\\n');
  }

  /**
   * 生成PDF报告
   */
  private generatePDFReport(result: TestResult): Blob {
    // 这里应该集成PDF生成库，如jsPDF
    // 暂时返回一个简单的文本blob
    const content = \`
测试报告

执行ID: \${result.executionId}
测试类型: \${result.testType}
状态: \${result.status}
评分: \${result.score || 'N/A'}

性能指标:
\${Object.entries(result.metrics).map(([key, value]) => \`\${key}: \${value}\`).join('\\n')}

建议:
\${result.recommendations.join('\\n')}
    \`;

    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * 比较测试结果
   */
  compareResults(result1: TestResult, result2: TestResult): {
    improvements: string[];
    regressions: string[];
    unchanged: string[];
  } {
    const improvements: string[] = [];
    const regressions: string[] = [];
    const unchanged: string[] = [];

    // 比较评分
    if (result1.score && result2.score) {
      if (result2.score > result1.score) {
        improvements.push(\`评分提升: \${result1.score} → \${result2.score}\`);
      } else if (result2.score < result1.score) {
        regressions.push(\`评分下降: \${result1.score} → \${result2.score}\`);
      } else {
        unchanged.push('评分无变化');
      }
    }

    // 比较指标
    const commonMetrics = Object.keys(result1.metrics).filter(key =>
      key in result2.metrics
    );

    for (const metric of commonMetrics) {
      const value1 = result1.metrics[metric];
      const value2 = result2.metrics[metric];

      if (typeof value1 === 'number' && typeof value2 === 'number') {
        const change = ((value2 - value1) / value1) * 100;

        if (Math.abs(change) < 5) {
          unchanged.push(\`\${metric}: 变化不大\`);
        } else if (this.isImprovementMetric(metric) ? change > 0 : change < 0) {
          improvements.push(\`\${metric}: 改善 \${Math.abs(change).toFixed(1)}%\`);
        } else {
          regressions.push(\`\${metric}: 退化 \${Math.abs(change).toFixed(1)}%\`);
        }
      }
    }

    return { improvements, regressions, unchanged };
  }

  /**
   * 判断指标是否为改善型指标（值越大越好）
   */
  private isImprovementMetric(metric: string): boolean {
    const improvementMetrics = ['throughput', 'score', 'availability'];
    return improvementMetrics.includes(metric.toLowerCase());
  }
}

export const testResultHandler = new TestResultHandler();
export default testResultHandler;`;

      fs.writeFileSync(testResultHandlerPath, testResultHandlerContent);
      this.addFix('test_flow', testResultHandlerPath, '创建测试结果处理器');
    }
  }

  /**
   * 工具方法
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
   * 生成实现报告
   */
  generateImplementationReport() {
    const reportPath = path.join(this.projectRoot, 'business-flow-implementation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFlows: this.implementedFlows.length,
        completedFlows: this.implementedFlows.filter(f => f.status === 'completed').length,
        totalFixes: this.fixes.length,
        flowTypes: {
          authentication: this.implementedFlows.filter(f => f.name === 'userAuthentication').length,
          testing: this.implementedFlows.filter(f => f.name === 'testExecution').length,
          dataManagement: this.implementedFlows.filter(f => f.name === 'dataManagement').length
        }
      },
      implementedFlows: this.implementedFlows,
      fixes: this.fixes,
      nextSteps: [
        '集成业务流程到现有页面',
        '测试端到端业务流程',
        '添加流程监控和日志',
        '优化流程性能',
        '添加流程文档和示例'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 业务流程实现报告:');
    console.log(`   实现流程: ${report.summary.totalFlows}`);
    console.log(`   完成流程: ${report.summary.completedFlows}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   流程类型分布:`);
    console.log(`   - 用户认证: ${report.summary.flowTypes.authentication}`);
    console.log(`   - 测试执行: ${report.summary.flowTypes.testing}`);
    console.log(`   - 数据管理: ${report.summary.flowTypes.dataManagement}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const implementer = new BusinessFlowImplementer();
  implementer.execute().catch(error => {
    console.error('❌ 业务流程实现失败:', error);
    process.exit(1);
  });
}

module.exports = BusinessFlowImplementer;
