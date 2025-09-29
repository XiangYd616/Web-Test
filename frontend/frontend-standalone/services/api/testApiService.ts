/**
 * 测试API服务
 * 统一的测试相关API调用服务
 * 基于后端API规范v1.0实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 * 更新: 2025-09-26 - 集成权限控制和认证检查
 */

import type {
  TestApiClient
} from '../../types';
import type {
  ApiResponse
} from '@shared/types';
import type {
  ApiRequestConfig,
  RequestConfig,
  TestCallbacks,
  UnifiedTestConfig
} from '@shared/types';
import type {
  TestType,
  TestStatus
} from '@shared/types';
import type {
  TestExecution,
  TestHistory
} from '@shared/types';
import { unifiedApiService } from './apiService';
import { requireAuth, TestPermissions, PermissionChecker } from '../auth/authDecorator';

// 本地类型定义已迁移到统一的类型系统
// 请从 '../../types' 导入所需的类型

// 保留一些后端API特定的接口
export interface TestConfiguration {
  test_type: string;
  name: string;
  configuration: Record<string, any>;
  project_id?: number;
  is_template?: boolean;
}

export interface TestExecutionRequest {
  test_type: string;
  configuration: Record<string, any>;
  project_id?: number;
  target_url: string;
}

export interface TestExecutionResponse {
  id: string;
  test_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  target_url: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress?: number;
  result?: Record<string, any>;
}

// 性能测试配置（本地版本）
export interface LocalPerformanceTestConfig {
  device: 'desktop' | 'mobile';
  network_condition: string;
  lighthouse_config?: Record<string, any>;
  custom_metrics?: string[];
}

// 安全测试配置（本地版本）
export interface LocalSecurityTestConfig {
  scan_depth: 'basic' | 'standard' | 'comprehensive';
  include_ssl: boolean;
  include_headers: boolean;
  custom_checks?: string[];
}

// API测试配置
export interface ApiTestConfig {
  endpoints: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    assertions: string[];
  }>;
  configuration: {
    timeout: number;
    retry_count: number;
    parallel_requests: number;
  };
}

// 压力测试配置 - 后端API专用
export interface TestApiStressConfig {
  concurrent_users: number;
  duration_seconds: number;
  ramp_up_time: number;
  test_scenarios: string[];
}

// 兼容性测试配置
export interface CompatibilityTestConfig {
  browsers: string[];
  devices: string[];
  features_to_test: string[];
  screenshot_comparison: boolean;
}

// SEO测试配置
export interface SeoTestConfig {
  depth: 'page' | 'site';
  include_technical: boolean;
  include_content: boolean;
  competitor_urls?: string[];
}

// 用户体验测试配置
export interface UxTestConfig {
  accessibility_level: 'A' | 'AA' | 'AAA';
  include_usability: boolean;
  include_mobile: boolean;
  custom_checks?: string[];
}

// 基础设施测试配置
export interface InfrastructureTestConfig {
  database?: {
    enabled: boolean;
    connection_string: string;
    test_queries: string[];
  };
  network?: {
    enabled: boolean;
    targets: string[];
    test_types: string[];
  };
}

class TestApiService implements TestApiClient {
  private baseUrl = '/api/test'; // 修正为实际的后端API路径

  /**
   * 获取测试类型对应的权限
   */
  private getTestTypePermission(testType: string): string | null {
    const permissionMap: Record<string, string> = {
      'performance': TestPermissions.RUN_PERFORMANCE_TEST,
      'security': TestPermissions.RUN_SECURITY_TEST,
      'api': TestPermissions.RUN_API_TEST,
      'stress': TestPermissions.RUN_STRESS_TEST,
      'compatibility': TestPermissions.RUN_COMPATIBILITY_TEST,
      'seo': TestPermissions.RUN_SEO_TEST,
      'website': TestPermissions.RUN_PERFORMANCE_TEST, // 网站测试使用性能测试权限
      'infrastructure': TestPermissions.ADMIN_ALL_TESTS // 基础设施测试需要管理员权限
    };
    
    return permissionMap[testType?.toLowerCase()] || null;
  }

  // ==================== BaseApiClient 接口实现 ====================

  /**
   * 执行GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return unifiedApiService.get(url, config as any);
  }

  /**
   * 执行POST请求
   */
  async post<T = any>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return unifiedApiService.post(url, data, config as any);
  }

  /**
   * 执行PUT请求
   */
  async put<T = any>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return unifiedApiService.put(url, data, config as any);
  }

  /**
   * 执行DELETE请求
   */
  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return unifiedApiService.delete(url, config as any);
  }

  // ==================== 测试配置管理 ====================

  /**
   * 获取测试配置列表
   */
  async getConfigurations(params?: {
    test_type?: string;
    project_id?: number;
    is_template?: boolean;
  }): Promise<ApiResponse<TestConfiguration[]>> {
    const queryParams = new URLSearchParams();
    if (params?.test_type) queryParams.append('test_type', params?.test_type);
    if (params?.project_id) queryParams.append('project_id', params?.project_id.toString());
    if (params?.is_template !== undefined) queryParams.append('is_template', params?.is_template.toString());

    const url = `${this.baseUrl}/configurations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return unifiedApiService.get(url);
  }

  /**
   * 保存测试配置
   */
  async saveConfiguration(config: TestConfiguration): Promise<ApiResponse<TestConfiguration>> {
    return unifiedApiService.post(`${this.baseUrl}/configurations`, config);
  }

  // ==================== 测试执行管理 ====================

  /**
   * 执行测试 - 实现TestApiClient接口
   * 根据测试类型动态检查权限
   */
  async executeTest(config: UnifiedTestConfig): Promise<ApiResponse<TestExecution>> {
    try {
      // 根据测试类型检查相应权限
      const user = PermissionChecker.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: '请先登录后再执行测试',
          code: 'AUTH_REQUIRED'
        };
      }

      // 检查测试类型权限
      const requiredPermission = this.getTestTypePermission(config?.testType);
      if (requiredPermission && !user.isAdmin) {
        const hasPermission = user.permissions.includes(requiredPermission);
        if (!hasPermission) {
          return {
            success: false,
            error: `权限不足，无法执行${config?.testType}测试`,
            code: 'PERMISSION_DENIED'
          };
        }
      }

      // 记录测试启动日志
      console.log(`🚀 用户 ${user.email} 启动${config?.testType}测试`, {
        testType: config?.testType,
        target: config?.target,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      // 适配后端API格式
      const backendRequest = {
        testType: config?.testType,
        url: config?.target,
        config: config,
        testName: `${config?.testType}_test_${Date.now()}`,
        userId: user.id,
        userEmail: user.email
      };

      const response = await unifiedApiService.post(`${this.baseUrl}/run`, backendRequest);

      // 适配返回格式
      if (response.success && response.data) {
        const testExecution: TestExecution = {
          id: response.data.id,
          testType: config?.testType as TestType,
          status: response.data.status as TestStatus,
          progress: response.data.progress || 0,
          startTime: response.data.started_at || new Date().toISOString(),
          endTime: response.data.completed_at,
          results: response.data.result,
          error: response.data.error,
          config: config
        };

        // 记录成功日志
        console.log(`✅ 测试启动成功`, {
          testId: testExecution.id,
          testType: config?.testType,
          userId: user.id
        });

        return {
          success: true,
          data: testExecution,
          message: response.message
        };
      }

      return response as ApiResponse<TestExecution>;

    } catch (error) {
      console.error('❌ 测试执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '测试执行失败',
        code: 'EXECUTION_ERROR'
      };
    }
  }

  /**
   * 执行测试 - 保持向后兼容的方法
   */
  async executeTestLegacy(request: TestExecutionRequest): Promise<ApiResponse<TestExecutionResponse>> {
    // 适配后端API格式
    const backendRequest = {
      testType: request.test_type,
      url: request.target_url,
      config: request.configuration,
      testName: `${request.test_type}_test_${Date.now()}`
    };

    return unifiedApiService.post(`${this.baseUrl}/run`, backendRequest);
  }

  /**
   * 获取测试执行历史 - 适配后端API
   */
  async getExecutions(params?: {
    test_type?: string;
    project_id?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<TestExecutionResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.test_type) queryParams.append('testType', params?.test_type);
    if (params?.status) queryParams.append('status', params?.status);
    if (params?.limit) queryParams.append('limit', params?.limit.toString());
    if (params?.offset) queryParams.append('page', Math.floor((params?.offset || 0) / (params?.limit || 20) + 1).toString());

    const url = `${this.baseUrl}/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return unifiedApiService.get(url);
  }

  /**
   * 获取特定测试执行详情 - 适配后端API
   */
  async getExecutionDetails(id: string): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${id}`);
  }

  /**
   * 停止正在运行的测试 - 适配后端API
   */
  async stopExecution(id: string): Promise<ApiResponse<{ stopped: boolean }>> {
    return unifiedApiService.post(`${this.baseUrl}/${id}/stop`);
  }

  /**
   * 删除测试执行记录 - 适配后端API
   * 需要删除权限
   */
  @requireAuth({ 
    requireAuth: true, 
    requiredPermissions: [TestPermissions.DELETE_TEST_RESULTS] 
  })
  async deleteExecution(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return unifiedApiService.delete(`${this.baseUrl}/history/${id}`);
  }

  // ==================== 性能测试 ====================

  /**
   * 执行性能测试 - 适配后端API
   * 需要性能测试权限
   */
  @requireAuth({ 
    requireAuth: true, 
    requiredPermissions: [TestPermissions.RUN_PERFORMANCE_TEST] 
  })
  async executePerformanceTest(
    target_url: string,
    configuration: LocalPerformanceTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/performance`, {
      url: target_url,
      device: configuration.device,
      throttling: configuration.network_condition,
      ...configuration
    });
  }

  /**
   * 获取性能测试结果 - 适配后端API
   */
  async getPerformanceResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  /**
   * 分析性能数据 - 使用现有的统计API
   */
  async analyzePerformanceData(
    execution_ids: string[],
    comparison_type: 'trend' | 'benchmark'
  ): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/statistics?timeRange=30`);
  }

  // ==================== 安全测试 ====================

  /**
   * 执行安全测试 - 适配后端API
   * 需要安全测试权限
   */
  @requireAuth({ 
    requireAuth: true, 
    requiredPermissions: [TestPermissions.RUN_SECURITY_TEST] 
  })
  async executeSecurityTest(
    target_url: string,
    configuration: LocalSecurityTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/security`, {
      url: target_url,
      scanDepth: configuration.scan_depth,
      includeSsl: configuration.include_ssl,
      includeHeaders: configuration.include_headers,
      customChecks: configuration.custom_checks
    });
  }

  /**
   * 获取安全测试结果 - 适配后端API
   */
  async getSecurityResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/security/${execution_id}`);
  }

  /**
   * 获取安全测试历史
   */
  async getSecurityHistory(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/security/history`);
  }

  /**
   * 获取安全测试统计
   */
  async getSecurityStatistics(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/security/statistics`);
  }

  // ==================== API测试 ====================

  /**
   * 执行API测试 - 适配后端API
   */
  async executeApiTest(config: ApiTestConfig): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/api-test`, {
      baseUrl: config?.endpoints[0]?.url || '',
      endpoints: config?.endpoints,
      authentication: null,
      globalHeaders: [],
      timeout: config?.configuration.timeout,
      retryCount: config?.configuration.retry_count,
      parallelRequests: config?.configuration.parallel_requests
    });
  }

  /**
   * 获取API测试结果 - 适配后端API
   */
  async getApiResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  // ==================== 压力测试 ====================

  /**
   * 执行压力测试 - 适配后端API
   */
  async executeStressTest(
    target_url: string,
    configuration: TestApiStressConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/stress`, {
      url: target_url,
      concurrency: configuration.concurrent_users,
      duration: configuration.duration_seconds,
      rampUp: configuration.ramp_up_time,
      testScenarios: configuration.test_scenarios
    });
  }

  /**
   * 获取压力测试结果 - 适配后端API
   */
  async getStressResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/stress/status/${execution_id}`);
  }

  /**
   * 取消压力测试
   */
  async cancelStressTest(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.post(`${this.baseUrl}/stress/cancel/${execution_id}`);
  }

  /**
   * 获取运行中的压力测试
   */
  async getRunningStressTests(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/stress/running`);
  }

  // ==================== 兼容性测试 ====================

  /**
   * 执行兼容性测试 - 适配后端API
   */
  async executeCompatibilityTest(
    target_url: string,
    configuration: CompatibilityTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/compatibility`, {
      url: target_url,
      browsers: configuration.browsers,
      devices: configuration.devices,
      features: configuration.features_to_test,
      screenshotComparison: configuration.screenshot_comparison
    });
  }

  /**
   * 获取兼容性测试结果 - 适配后端API
   */
  async getCompatibilityResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  // ==================== SEO测试 ====================

  /**
   * 执行SEO测试 - 适配后端API
   */
  async executeSeoTest(
    target_url: string,
    configuration: SeoTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/seo`, {
      url: target_url,
      depth: configuration.depth,
      includeTechnical: configuration.include_technical,
      includeContent: configuration.include_content,
      competitorUrls: configuration.competitor_urls
    });
  }

  /**
   * 获取SEO测试结果 - 适配后端API
   */
  async getSeoResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  // ==================== 用户体验测试 ====================

  /**
   * 执行UX测试 - 适配后端API
   */
  async executeUxTest(
    target_url: string,
    configuration: UxTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/ux`, {
      url: target_url,
      accessibilityLevel: configuration.accessibility_level,
      includeUsability: configuration.include_usability,
      includeMobile: configuration.include_mobile,
      customChecks: configuration.custom_checks
    });
  }

  /**
   * 获取UX测试结果 - 适配后端API
   */
  async getUxResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  /**
   * 执行无障碍测试 - 适配后端API
   */
  async executeAccessibilityTest(
    target_url: string,
    level: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/accessibility`, {
      url: target_url,
      level,
      categories: []
    });
  }

  // ==================== 网站综合测试 ====================

  /**
   * 执行网站综合测试 - 适配后端API
   */
  async executeWebsiteTest(
    target_url: string,
    options: Record<string, any> = {}
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return unifiedApiService.post(`${this.baseUrl}/website`, {
      url: target_url,
      options
    });
  }

  // ==================== 通用测试方法 ====================

  /**
   * 通用测试执行方法
   */
  async executeGenericTest(
    test_type: string,
    target_url: string,
    configuration: Record<string, any> = {}
  ): Promise<ApiResponse<TestExecutionResponse>> {
    const result = await this.executeTest({
      testType: test_type,
      target: target_url,
      options: configuration
    });

    // 转换为TestExecutionResponse格式
    return {
      ...result,
      data: {
        ...result?.data,
        test_type: test_type,
        target_url: target_url,
        created_at: new Date().toISOString(),
        status: result?.data.status === TestStatus.RUNNING ? 'running' :
          result?.data.status === TestStatus.COMPLETED ? 'completed' :
            result?.data.status === TestStatus.FAILED ? 'failed' :
              result?.data.status === TestStatus.CANCELLED ? 'cancelled' : 'pending'
      }
    };
  }

  // ==================== 用户体验测试 ====================



  // ==================== 基础设施测试 ====================

  /**
   * 执行基础设施测试 - 适配后端API
   */
  async executeInfrastructureTest(
    configuration: InfrastructureTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    // 基础设施测试通常需要特定的端点，这里使用通用测试端点
    return unifiedApiService.post(`${this.baseUrl}/run`, {
      testType: 'infrastructure',
      config: configuration
    });
  }

  /**
   * 获取基础设施测试结果 - 适配后端API
   */
  async getInfrastructureResults(execution_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/history/${execution_id}`);
  }

  // ==================== 报告生成 ====================

  /**
   * 生成测试报告
   */
  async generateReport(
    execution_ids: string[],
    report_type: 'comprehensive' | 'performance' | 'security',
    format: 'html' | 'pdf' | 'json',
    include_recommendations: boolean = true
  ): Promise<ApiResponse<{ report_id: string; status: string }>> {
    return unifiedApiService.post(`${this.baseUrl}/reports/generate`, {
      execution_ids,
      report_type,
      format,
      include_recommendations
    });
  }

  /**
   * 获取生成的报告
   */
  async getReport(report_id: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/reports/${report_id}`);
  }

  /**
   * 下载报告文件
   */
  async downloadReport(report_id: string): Promise<Response> {
    const response = await fetch(`${process.env.REACT_APP_API_URL || process.env.BACKEND_URL || `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}`}${this.baseUrl}/reports/${report_id}/download`, {
      headers: {
        'Authorization': `Bearer ${unifiedApiService.getToken()}`
      }
    });
    return response;
  }

  // ==================== 统计分析 ====================

  /**
   * 获取仪表板数据
   */
  async getDashboardData(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/analytics/dashboard`);
  }

  /**
   * 获取趋势分析数据
   */
  async getTrendsData(params?: {
    test_type?: string;
    time_range?: string;
    metric?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.test_type) queryParams.append('test_type', params?.test_type);
    if (params?.time_range) queryParams.append('time_range', params?.time_range);
    if (params?.metric) queryParams.append('metric', params?.metric);

    const url = `${this.baseUrl}/analytics/trends${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return unifiedApiService.get(url);
  }

  /**
   * 获取对比分析数据
   */
  async getComparisonsData(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/analytics/comparisons`);
  }

  // ==================== 系统管理 ====================

  /**
   * 系统健康检查
   */
  async checkSystemHealth(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/system/health`);
  }

  /**
   * 获取系统性能指标
   */
  async getSystemMetrics(): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/system/metrics`);
  }

  /**
   * 系统维护操作（管理员）
   */
  async performMaintenance(operation: string): Promise<ApiResponse<any>> {
    return unifiedApiService.post(`${this.baseUrl}/system/maintenance`, { operation });
  }

  // ==================== TestApiClient 接口实现 ====================

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string, testType: TestType): Promise<ApiResponse<TestExecution>> {
    const response = await unifiedApiService.get(`${this.baseUrl}/${testType}/status/${testId}`);

    if (response.success && response.data) {
      const testExecution: TestExecution = {
        id: response.data.id || testId,
        testType: testType,
        status: response.data.status as TestStatus,
        progress: response.data.progress || 0,
        startTime: response.data.started_at || new Date().toISOString(),
        endTime: response.data.completed_at,
        results: response.data.result,
        error: response.data.error,
        config: response.data.config || {}
      };

      return {
        success: true,
        data: testExecution,
        message: response.message
      };
    }

    return response as ApiResponse<TestExecution>;
  }

  /**
   * 取消测试
   */
  async cancelTest(testId: string, testType?: TestType): Promise<ApiResponse<void>> {
    return unifiedApiService.post(`${this.baseUrl}/${testType}/cancel/${testId}`);
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string, testType?: TestType): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/${testType}/result/${testId}`);
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(testType?: TestType, limit?: number): Promise<ApiResponse<TestHistory>> {
    const params = new URLSearchParams();
    if (testType) params?.append('testType', testType);
    if (limit) params?.append('limit', limit?.toString());

    const url = `${this.baseUrl}/history${params?.toString() ? '?' + params?.toString() : ''}`;

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const response = await unifiedApiService.get(url);

    if (response.success && response.data) {
      const testHistory: TestHistory = {
        tests: response.data.tests || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        pageSize: response.data.pageSize || limit || 10,
        hasMore: response.data.hasMore || false
      };

      return {
        success: true,
        data: testHistory,
        message: response.message
      };
    }

    return response as ApiResponse<TestHistory>;
  }

  /**
   * 启动实时测试
   */
  async startRealtimeTest(config: UnifiedTestConfig, callbacks: TestCallbacks): Promise<string> {
    // 启动测试并获取测试ID
    const response = await this.executeTest(config);

    if (!response.success || !response.data) {
      throw new Error(response.message || '启动测试失败');
    }

    const testId = response.data.id;

    // 启动实时监控
    this.startRealtimeMonitoring(testId, config?.testType as TestType, callbacks);

    return testId;
  }

  /**
   * 启动实时监控（私有方法）
   */
  private startRealtimeMonitoring(testId: string, testType: TestType, callbacks: TestCallbacks): void {
    const pollInterval = 1000; // 1秒轮询一次

    const poll = async () => {
      try {

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        const statusResponse = await this.getTestStatus(testId, testType);

        if (statusResponse.success && statusResponse.data) {
          const execution = statusResponse.data;

          // 调用进度回调
          if (callbacks.onProgress) {
            callbacks.onProgress(execution.progress);
          }

          // 检查是否完成
          if (execution.status === 'completed') {
            if (callbacks.onComplete) {
              callbacks.onComplete(execution.results);
            }
            return; // 停止轮询
          }

          // 检查是否失败
          if (execution.status === 'failed') {
            if (callbacks.onError) {
              callbacks.onError(new Error(execution.error || '测试失败'));
            }
            return; // 停止轮询
          }

          // 继续轮询
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(error as Error);
        }
      }
    };

    // 开始轮询
    setTimeout(poll, pollInterval);
  }
}

// 创建单例实例
export const testApiService = new TestApiService();

// 注意：接口类型已通过 export interface 直接导出，无需重复导出

export default testApiService;
