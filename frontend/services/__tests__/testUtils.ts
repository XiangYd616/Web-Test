/**
 * 测试工具函数
 * 提供API集成测试的辅助功能
 * 版本: v1.0.0
 */

// 临时类型定义
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

interface BackendApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
  error?: string | {
    code: string;
    message: string;
    details?: any;
  };
}

// ==================== Mock数据生成器 ====================

/**
 * 生成模拟的后端成功响应
 */
export function createMockBackendSuccessResponse<T>(
  data: T,
  message: string = '操作成功'
): BackendApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 生成模拟的后端错误响应
 */
export function createMockBackendErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>
): BackendApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 生成模拟的项目数据
 */
export function createMockProject(overrides: Partial<any> = {}) {
  return {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test project description',
    target_url: 'https://example.com',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-123',
    ...overrides
  };
}

/**
 * 生成模拟的测试执行数据
 */
export function createMockTestExecution(overrides: Partial<any> = {}) {
  return {
    id: 'test-123',
    test_type: 'performance',
    project_id: 'project-123',
    target_url: 'https://example.com',
    status: 'completed',
    progress: 100,
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-01T00:05:00Z',
    duration: 300,
    result: {
      score: 85,
      grade: 'B',
      summary: 'Good performance',
      details: {}
    },
    created_by: 'user-123',
    ...overrides
  };
}

/**
 * 生成模拟的用户数据
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'user',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

// ==================== Fetch Mock辅助函数 ====================

/**
 * 创建模拟的fetch响应
 */
export function createMockFetchResponse(
  data: any,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    headers = { 'Content-Type': 'application/json' }
  } = options;

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: () => createMockFetchResponse(data, options),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/test'
  } as Response;
}

/**
 * 设置fetch mock以返回成功响应
 */
export function mockFetchSuccess<T>(data: T, message: string = '操作成功') {
  const mockResponse = createMockBackendSuccessResponse(data, message);
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
    createMockFetchResponse(mockResponse)
  );
}

/**
 * 设置fetch mock以返回错误响应
 */
export function mockFetchError(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
) {
  const mockResponse = createMockBackendErrorResponse(code, message, details);
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
    createMockFetchResponse(mockResponse, { ok: false, status })
  );
}

/**
 * 设置fetch mock以返回网络错误
 */
export function mockFetchNetworkError(errorMessage: string = 'Network error') {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
    new Error(errorMessage)
  );
}

// ==================== 测试断言辅助函数 ====================

/**
 * 验证API响应格式
 */
export function expectValidApiResponse<T>(response: ApiResponse<T>) {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('meta');
  expect(response.meta).toHaveProperty('timestamp');

  if (response.success) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message');
  } else {
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
  }
}

/**
 * 验证fetch调用参数
 */
export function expectFetchCalledWith(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  expect(global.fetch).toHaveBeenCalledWith(
    url,
    expect.objectContaining({
      method: options.method || 'GET',
      headers: expect.objectContaining(options.headers || {}),
      ...(options.body && { body: JSON.stringify(options.body) })
    })
  );
}

/**
 * 验证认证头是否正确设置
 */
export function expectAuthHeaderSet(token: string) {
  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': `Bearer ${token}`
      })
    })
  );
}

// ==================== 测试场景生成器 ====================

/**
 * 生成分页测试场景
 */
export function generatePaginationScenarios() {
  return [
    { page: 1, limit: 10, expectedQuery: 'page=1&limit=10' },
    { page: 2, limit: 20, expectedQuery: 'page=2&limit=20' },
    { page: 1, limit: 50, expectedQuery: 'page=1&limit=50' }
  ];
}

/**
 * 生成搜索测试场景
 */
export function generateSearchScenarios() {
  return [
    { search: 'test', expectedQuery: 'search=test' },
    { search: 'project name', expectedQuery: 'search=project%20name' },
    { search: '测试项目', expectedQuery: 'search=%E6%B5%8B%E8%AF%95%E9%A1%B9%E7%9B%AE' }
  ];
}

/**
 * 生成错误测试场景
 */
export function generateErrorScenarios() {
  return [
    { status: 400, code: 'BAD_REQUEST', message: '请求参数错误' },
    { status: 401, code: 'UNAUTHORIZED', message: '未授权访问' },
    { status: 403, code: 'FORBIDDEN', message: '禁止访问' },
    { status: 404, code: 'NOT_FOUND', message: '资源不存在' },
    { status: 422, code: 'VALIDATION_ERROR', message: '数据验证失败' },
    { status: 500, code: 'INTERNAL_ERROR', message: '服务器内部错误' }
  ];
}

// ==================== 测试数据验证器 ====================

/**
 * 验证项目数据结构
 */
export function validateProjectData(project: any) {
  expect(project).toHaveProperty('id');
  expect(project).toHaveProperty('name');
  expect(project).toHaveProperty('description');
  expect(project).toHaveProperty('target_url');
  expect(project).toHaveProperty('status');
  expect(project).toHaveProperty('created_at');
  expect(project).toHaveProperty('updated_at');
  expect(project).toHaveProperty('user_id');
}

/**
 * 验证测试执行数据结构
 */
export function validateTestExecutionData(execution: any) {
  expect(execution).toHaveProperty('id');
  expect(execution).toHaveProperty('test_type');
  expect(execution).toHaveProperty('project_id');
  expect(execution).toHaveProperty('target_url');
  expect(execution).toHaveProperty('status');
  expect(execution).toHaveProperty('start_time');
  expect(execution).toHaveProperty('created_by');
}

/**
 * 验证用户数据结构
 */
export function validateUserData(user: any) {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('role');
  expect(user).toHaveProperty('status');
  expect(user).toHaveProperty('created_at');
}

// ==================== 环境设置辅助函数 ====================

/**
 * 设置测试环境变量
 */
export function setupTestEnvironment() {
  process.env.REACT_APP_API_URL = process.env.BACKEND_URL || 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}';
  process.env.NODE_ENV = 'test';
}

/**
 * 清理测试环境
 */
export function cleanupTestEnvironment() {
  delete process.env.REACT_APP_API_URL;
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * 设置认证token
 */
export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

/**
 * 清除认证token
 */
export function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

// ==================== 所有函数已通过export function导出 ====================

