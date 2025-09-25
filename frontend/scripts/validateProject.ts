/**
 * 项目配置验证脚本
 * 用于验证项目配置和路径别名是否正确工作
 * 版本: v1.0.0
 */

import { DEFAULT_API_CONFIG, mergeApiConfig } from '@config/apiConfig';
import { DEFAULT_AUTH_CONFIG } from '@config/authConfig';
import { validateAllConfigs, createValidationReport } from '@config/validateConfig';
import { ERROR_CODES } from '@types/errors';

console.log('🔍 开始项目配置验证...\n');

// 测试路径别名是否正常工作
console.log('✅ 路径别名工作正常');

// 验证API配置
console.log('🔧 验证API配置...');
const testApiConfig = mergeApiConfig(DEFAULT_API_CONFIG, {
  baseURL: 'https://test-api.example.com',
  timeout: 15000
});

  baseURL: testApiConfig.baseURL,
  timeout: testApiConfig.timeout,
  cacheEnabled: testApiConfig.cache.enabled,
  retryEnabled: testApiConfig.retry.enabled
});

// 验证Auth配置
  apiBaseUrl: DEFAULT_AUTH_CONFIG.apiBaseUrl,
  environment: DEFAULT_AUTH_CONFIG.environment,
  jwtExpiry: DEFAULT_AUTH_CONFIG.tokens.jwt.accessTokenExpiry,
  mfaEnabled: DEFAULT_AUTH_CONFIG.security.mfa.enabled
});

// 运行配置验证
const validationResult = validateAllConfigs(testApiConfig, DEFAULT_AUTH_CONFIG);

  apiValid: validationResult.api.valid,
  authValid: validationResult.auth.valid,
  overallValid: validationResult.overall.valid,
  totalErrors: validationResult.overall.totalErrors,
  totalWarnings: validationResult.overall.totalWarnings
});

// 显示详细报告
if (validationResult.overall.totalErrors > 0 || validationResult.overall.totalWarnings > 0) {
  
} else {
  console.log('✅ 所有配置验证通过！');
}

// 测试错误代码
  NETWORK_ERROR: ERROR_CODES.NETWORK_ERROR,
  UNAUTHORIZED: ERROR_CODES.UNAUTHORIZED,
  VALIDATION_FAILED: ERROR_CODES.VALIDATION_FAILED
});


export default function runValidation() {
}
