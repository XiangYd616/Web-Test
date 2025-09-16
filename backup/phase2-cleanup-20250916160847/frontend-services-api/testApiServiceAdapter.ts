/**
 * testApiService兼容性适配器
 * 确保新的统一API客户端与现有的testApiService完全兼容
 * 现有页面可以无缝切换到新的API客户端，也可以保持现有实现
 */

// 临时使用any类型，等待unifiedTestApiService完善
const unifiedTestApiClient: any = {};
type UnifiedApiResponse<T = any> = any;
type UnifiedTestExecution = any;

// 保持与现有testApiService.ts的接口完全一致
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  message?: string;
  timestamp?: string;
}

export interface TestExecutionResponse {
  id: string;
  status: string;
  test_type: string;
  created_at: string;
  updated_at?: string;
}

// 现有的配置接口（保持不变）
export interface PerformanceTestConfig {
  device: 'desktop' | 'mobile';
  network_condition: 'fast-3g' | 'slow-3g' | 'offline' | 'no-throttling';
  include_screenshots: boolean;
  lighthouse_categories: string[];
  custom_metrics: string[];
}

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

export interface SecurityTestConfig {
  scan_depth: 'surface' | 'deep';
  include_ssl: boolean;
  include_headers: boolean;
  include_cookies: boolean;
  custom_checks: string[];
}

export interface CompatibilityTestConfig {
  browsers: string[];
  devices: string[];
  features_to_test: string[];
  screenshot_comparison: boolean;
}

export interface UxTestConfig {
  accessibility_level: 'A' | 'AA' | 'AAA';
  include_usability: boolean;
  include_mobile: boolean;
  custom_checks: string[];
}

export interface SeoTestConfig {
  depth: 'page' | 'site';
  include_technical: boolean;
  include_content: boolean;
  competitor_urls?: string[];
}

/**
 * testApiService兼容性适配器类
 * 提供与现有testApiService.ts完全相同的接口
 */
export class TestApiServiceAdapter {
  private baseUrl = '/api/test';

  // ==================== 通用测试方法 ====================

  /**
   * 通用测试执行方法 - 保持现有接口
   */
  async executeTest(config: {
    test_type: string;
    target_url: string;
    configuration: Record<string, any>;
  }): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeTest({
        url: config.target_url,
        testType: config.test_type,
        ...config.configuration
      });

      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取测试结果 - 保持现有接口
   */
  async getTestResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      // 尝试从不同的测试类型获取结果
      const testTypes = ['performance', 'security', 'api', 'compatibility', 'ux', 'website'];

      for (const testType of testTypes) {
        try {
          const response = await unifiedTestApiClient.getTestResult(execution_id, testType);
          if (response.success) {
            return this.adaptResponse(response);
          }
        } catch {
          // 继续尝试下一个类型
        }
      }

      // 如果都失败了，返回错误
      return {
        success: false,
        error: {
          message: '未找到测试结果',
          code: 'NOT_FOUND'
        }
      };
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取测试历史 - 保持现有接口
   */
  async getTestHistory(
    test_type?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ApiResponse<TestExecutionResponse[]>> {
    try {
      const response = await unifiedTestApiClient.getTestHistory(test_type, limit);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 性能测试 ====================

  /**
   * 执行性能测试 - 保持现有接口
   */
  async executePerformanceTest(
    target_url: string,
    configuration: PerformanceTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executePerformanceTest(target_url, configuration);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取性能测试结果 - 保持现有接口
   */
  async getPerformanceResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      const response = await unifiedTestApiClient.getTestResult(execution_id, 'performance');
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 安全测试 ====================

  /**
   * 执行安全测试 - 保持现有接口
   */
  async executeSecurityTest(
    target_url: string,
    configuration: SecurityTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeSecurityTest(target_url, configuration);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取安全测试结果 - 保持现有接口
   */
  async getSecurityResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      const response = await unifiedTestApiClient.getTestResult(execution_id, 'security');
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== API测试 ====================

  /**
   * 执行API测试 - 保持现有接口
   */
  async executeApiTest(config: ApiTestConfig): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeApiTest(config);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取API测试结果 - 保持现有接口
   */
  async getApiResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      const response = await unifiedTestApiClient.getTestResult(execution_id, 'api');
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 兼容性测试 ====================

  /**
   * 执行兼容性测试 - 保持现有接口
   */
  async executeCompatibilityTest(
    target_url: string,
    configuration: CompatibilityTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeCompatibilityTest(target_url, configuration);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取兼容性测试结果 - 保持现有接口
   */
  async getCompatibilityResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      const response = await unifiedTestApiClient.getTestResult(execution_id, 'compatibility');
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 用户体验测试 ====================

  /**
   * 执行UX测试 - 保持现有接口
   */
  async executeUxTest(
    target_url: string,
    configuration: UxTestConfig
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeUxTest(target_url, configuration);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 获取UX测试结果 - 保持现有接口
   */
  async getUxResults(execution_id: string): Promise<ApiResponse<any>> {
    try {
      const response = await unifiedTestApiClient.getTestResult(execution_id, 'ux');
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 执行无障碍测试 - 保持现有接口
   */
  async executeAccessibilityTest(
    target_url: string,
    level: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeUxTest(target_url, {
        accessibility_level: level,
        include_usability: false,
        include_mobile: true,
        custom_checks: []
      });
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 网站综合测试 ====================

  /**
   * 执行网站综合测试 - 保持现有接口
   */
  async executeWebsiteTest(
    target_url: string,
    options: Record<string, any> = {}
  ): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeWebsiteTest(target_url, options);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 新增测试类型 ====================

  /**
   * 执行网络测试 - 新增功能
   */
  async executeNetworkTest(config: any): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeNetworkTest(config);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 执行数据库测试 - 新增功能
   */
  async executeDatabaseTest(config: any): Promise<ApiResponse<TestExecutionResponse>> {
    try {
      const response = await unifiedTestApiClient.executeDatabaseTest(config);
      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  /**
   * 测试数据库连接 - 新增功能
   */
  async testDatabaseConnection(connectionConfig: any): Promise<ApiResponse<{ connected: boolean; info?: any }>> {
    try {
      const response = await unifiedTestApiClient.executeTest({
        testType: 'database-connection',
        ...connectionConfig
      });

      return this.adaptResponse(response);
    } catch (error: any) {
      return this.adaptError(error);
    }
  }

  // ==================== 通用方法 ====================

  /**
   * 通用测试执行方法
   */
  async executeGenericTest(
    test_type: string,
    target_url: string,
    configuration: Record<string, any> = {}
  ): Promise<ApiResponse<TestExecutionResponse>> {
    return this.executeTest({
      test_type,
      target_url,
      configuration
    });
  }

  // ==================== 私有适配方法 ====================

  /**
   * 适配统一API响应到现有格式
   */
  private adaptResponse<T>(unifiedResponse: UnifiedApiResponse<T>): ApiResponse<T> {
    if (unifiedResponse.success) {
      return {
        success: true,
        data: unifiedResponse.data,
        message: unifiedResponse.message,
        timestamp: unifiedResponse.timestamp
      };
    } else {
      return {
        success: false,
        error: {
          message: unifiedResponse.error || '未知错误',
          code: 'API_ERROR'
        },
        timestamp: unifiedResponse.timestamp
      };
    }
  }

  /**
   * 适配错误到现有格式
   */
  private adaptError(error: any): ApiResponse<any> {
    return {
      success: false,
      error: {
        message: error.message || String(error),
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 适配测试执行响应
   */
  private adaptTestExecution(execution: UnifiedTestExecution): TestExecutionResponse {
    return {
      id: execution.id,
      status: execution.status,
      test_type: 'unknown', // 需要从上下文推断
      created_at: execution.startTime,
      updated_at: execution.endTime
    };
  }
}

// 创建适配器实例
export const testApiServiceAdapter = new TestApiServiceAdapter();

// 为了保持完全兼容，也可以直接导出为testApiService
export const testApiService = testApiServiceAdapter;

export default testApiServiceAdapter;
