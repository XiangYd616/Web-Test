/**
 * 统一的测试错误处理工具
 */

export class TestError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = 'TestError';
  }
}

export class TestErrorHandler {
  /**
   * 处理测试错误
   */
  static handleTestError(error: any, testType: string): TestError {
    // 网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new TestError(
        '无法连接到目标服务器，请检查URL是否正确',
        'NETWORK_ERROR',
        true,
        { originalError: error.code }
      );
    }

    // 超时错误
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new TestError(
        '测试超时，请尝试增加超时时间或检查网络连接',
        'TIMEOUT_ERROR',
        true,
        { timeout: true }
      );
    }

    // 权限错误
    if (error.code === 'EACCES' || error.message?.includes('permission')) {
      return new TestError(
        '权限不足，请检查测试权限配置',
        'PERMISSION_ERROR',
        false,
        { permission: true }
      );
    }

    // 配置错误
    if (error.message?.includes('config') || error.message?.includes('invalid')) {
      return new TestError(
        '测试配置无效，请检查配置参数',
        'CONFIG_ERROR',
        true,
        { config: true }
      );
    }

    // 引擎错误
    if (error.message?.includes('engine') || error.message?.includes('not available')) {
      return new TestError(
        `${testType}测试引擎不可用，请检查依赖安装`,
        'ENGINE_ERROR',
        false,
        { engine: testType }
      );
    }

    // 通用错误
    return new TestError(
      error.message || '测试执行失败',
      'UNKNOWN_ERROR',
      true,
      { originalError: error }
    );
  }

  /**
   * 获取错误的用户友好消息
   */
  static getUserFriendlyMessage(error: TestError): string {
    const messages = {
      'NETWORK_ERROR': '网络连接失败，请检查URL和网络状态',
      'TIMEOUT_ERROR': '测试超时，建议增加超时时间',
      'PERMISSION_ERROR': '权限不足，请联系管理员',
      'CONFIG_ERROR': '配置参数有误，请检查输入',
      'ENGINE_ERROR': '测试引擎不可用，请检查系统配置',
      'UNKNOWN_ERROR': '未知错误，请重试或联系技术支持'
    };

    return messages[error.code] || error.message;
  }

  /**
   * 获取错误的修复建议
   */
  static getFixSuggestions(error: TestError): string[] {
    const suggestions = {
      'NETWORK_ERROR': [
        '检查URL格式是否正确',
        '确认目标网站是否可访问',
        '检查网络连接状态',
        '尝试使用其他网络环境'
      ],
      'TIMEOUT_ERROR': [
        '增加测试超时时间',
        '检查目标网站响应速度',
        '尝试在网络较好的环境下测试',
        '减少测试的复杂度'
      ],
      'PERMISSION_ERROR': [
        '联系系统管理员检查权限',
        '确认测试工具的安装权限',
        '检查防火墙设置'
      ],
      'CONFIG_ERROR': [
        '检查所有必填字段',
        '确认参数格式正确',
        '参考配置示例',
        '重置为默认配置'
      ],
      'ENGINE_ERROR': [
        '检查测试引擎依赖是否安装',
        '重新安装相关依赖包',
        '检查系统环境配置',
        '联系技术支持'
      ]
    };

    return suggestions[error.code] || ['请重试或联系技术支持'];
  }
}