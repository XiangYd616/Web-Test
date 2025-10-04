/**
 * API错误处理模块
 * 从enhancedApiService提取的专业错误类型
 */

export class ApiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiServiceError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class NetworkError extends ApiServiceError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details, true);
    this.name = 'NetworkError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class TimeoutError extends ApiServiceError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`, 'TIMEOUT_ERROR', 408, { timeout }, true);
    this.name = 'TimeoutError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class ValidationError extends ApiServiceError {
  constructor(message: string, errors: unknown[] = []) {
    super(message, 'VALIDATION_ERROR', 400, { errors }, false);
    this.name = 'ValidationError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class AuthenticationError extends ApiServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401, undefined, false);
    this.name = 'AuthenticationError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class AuthorizationError extends ApiServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, false);
    this.name = 'AuthorizationError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class RateLimitError extends ApiServiceError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429, { retryAfter }, true);
    this.name = 'RateLimitError';
  }
}


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
export class ServerError extends ApiServiceError {
  constructor(message: string, status: number, details?: any) {
    super(message, 'SERVER_ERROR', status, details, true);
    this.name = 'ServerError';
  }
}

/**
 * 根据HTTP响应创建相应的错误
 */
export function createErrorFromResponse(response: Response, data: any): ApiServiceError {
  const status = response.status;
  const message = data?.message || data?.error?.message || response.statusText;

  switch (status) {
    case 400:
      if (data?.errors) {
        return new ValidationError(message, data?.errors);
      }
      return new ApiServiceError(message, 'BAD_REQUEST', status, data);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 429:
      const retryAfter = response.headers.get('retry-after');
      return new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, status, data);
    default:
      return new ApiServiceError(message, 'HTTP_ERROR', status, data, status >= 500);
  }
}

/**
 * 处理请求错误
 */
export function handleRequestError(error: any): ApiServiceError {
  if (error.name === 'AbortError') {
    return new TimeoutError(10000); // 默认超时时间
  }

  if (error instanceof TypeError && error?.message.includes('fetch')) {
    return new NetworkError('Network connection failed', error);
  }

  if (error instanceof ApiServiceError) {
    return error;
  }

  return new ApiServiceError(
    error?.message || 'Unknown error',
    'UNKNOWN_ERROR',
    undefined,
    error,
    true
  );
}
