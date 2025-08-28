
import React from 'react';
// import { EnhancedError, ErrorSolution } from '../components/security/EnhancedErrorDisplay';
// 临时注释掉不存在的导入
type EnhancedError = any;
type ErrorSolution = any;

export interface ErrorContext {
  url?: string;
  operation?: string;
  userAgent?: string;
  timestamp?: number;
}

const ERROR_PATTERNS = {
  network: [
    /network error/i,
    /fetch.*failed/i,
    /connection.*refused/i,
    /timeout/i,
    /dns.*resolution.*failed/i,
    /getaddrinfo.*notfound/i,
    /enotfound/i,
    /econnrefused/i,
    /etimedout/i
  ],
  validation: [
    /invalid.*url/i,
    /url.*format/i,
    /malformed.*url/i,
    /请输入.*url/i,
    /url.*不能为空/i
  ],
  security: [
    /ssl.*error/i,
    /certificate.*error/i,
    /tls.*error/i,
    /https.*required/i,
    /security.*violation/i,
    /cors.*error/i
  ],
  timeout: [
    /timeout/i,
    /request.*timeout/i,
    /operation.*timeout/i,
    /超时/i
  ],
  server: [
    /server.*error/i,
    /internal.*server.*error/i,
    /service.*unavailable/i,
    /bad.*gateway/i,
    /gateway.*timeout/i,
    /5\d\d/
  ]
};

const SOLUTION_TEMPLATES: Record<string, ErrorSolution[]> = {
  network: [
    {
      title: '检查网络连接',
      description: '确认您的网络连接正常',
      difficulty: 'easy',
      estimatedTime: '1-2分钟',
      steps: [
        '检查您的网络连接是否正常',
        '尝试访问其他网站确认网络可用',
        '如果使用VPN，尝试断开后重试',
        '检查防火墙设置是否阻止了连接'
      ]
    },
    {
      title: '验证目标网站',
      description: '确认目标网站地址正确且可访问',
      difficulty: 'easy',
      estimatedTime: '2-3分钟',
      steps: [
        '在浏览器中直接访问目标网站',
        '检查URL拼写是否正确',
        '确认网站当前是否在线',
        '尝试使用不同的网络环境访问'
      ]
    }
  ],
  validation: [
    {
      title: '修正URL格式',
      description: '检查并修正URL的格式问题',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      steps: [
        '确保URL包含协议（http://或https://）',
        '检查域名拼写是否正确',
        '移除URL中的多余空格',
        '确认URL格式符合标准'
      ]
    },
    {
      title: '使用URL示例',
      description: '参考正确的URL格式示例',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      steps: [
        '正确格式：https://www.example.com',
        '包含路径：https://www.example.com/page',
        '包含端口：https://www.example.com:8080',
        '本地地址：http://localhost:3000'
      ]
    }
  ],
  security: [
    {
      title: '检查SSL证书',
      description: '解决SSL/TLS相关的安全问题',
      difficulty: 'medium',
      estimatedTime: '5-10分钟',
      steps: [
        '在浏览器中访问网站，查看证书状态',
        '检查证书是否过期或无效',
        '确认证书颁发机构是否可信',
        '如果是自签名证书，请联系网站管理员'
      ],
      externalLinks: [
        {
          title: 'SSL证书检查工具',
          url: 'https://www.ssllabs.com/ssltest/'
        }
      ]
    },
    {
      title: '使用HTTPS协议',
      description: '切换到更安全的HTTPS协议',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      steps: [
        '将URL中的http://改为https://',
        '确认网站支持HTTPS访问',
        '如果网站不支持HTTPS，请谨慎处理敏感信息'
      ]
    }
  ],
  timeout: [
    {
      title: '调整超时设置',
      description: '增加请求超时时间',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      steps: [
        '网站响应较慢，请稍后重试',
        '可以尝试在网络较好的环境下测试',
        '如果是大型网站，可能需要更长的检测时间'
      ]
    },
    {
      title: '分时段测试',
      description: '选择网络较好的时段进行测试',
      difficulty: 'easy',
      estimatedTime: '2-3分钟',
      steps: [
        '避开网络高峰期（如晚上8-10点）',
        '选择网络较好的时段重试',
        '如果是企业网络，避开工作时间'
      ]
    }
  ],
  server: [
    {
      title: '稍后重试',
      description: '服务器可能暂时不可用',
      difficulty: 'easy',
      estimatedTime: '5-10分钟',
      steps: [
        '服务器可能正在维护或遇到临时问题',
        '等待5-10分钟后重试',
        '检查网站官方公告是否有维护通知',
        '如果问题持续，请联系网站管理员'
      ]
    }
  ],
  unknown: [
    {
      title: '基础排查',
      description: '进行基本的问题排查',
      difficulty: 'medium',
      estimatedTime: '5-10分钟',
      steps: [
        '检查URL格式是否正确',
        '确认网络连接正常',
        '尝试在浏览器中直接访问网站',
        '如果问题持续，请联系技术支持'
      ]
    }
  ]
};

function determineErrorType(error: Error | string): keyof typeof ERROR_PATTERNS {
  const message = typeof error === 'string' ? error : error.message;

  for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(message))) {
      return type as keyof typeof ERROR_PATTERNS;
    }
  }

  return 'network' as const;
}

function generateErrorCode(type: string, message: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  const typeCode = type.toUpperCase().slice(0, 3);
  const messageHash = message.length.toString(16);
  return `${typeCode}-${messageHash}-${timestamp}`;
}

function createQuickActions(type: string, context: ErrorContext): Array<{
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}> {
  const actions: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
  }> = [];

  // 通用重试操作
  actions.push({
    label: '重新测试',
    action: () => {
      if (context.url) {
        window.location.reload();
      }
    }
  });

  // 根据错误类型添加特定操作
  switch (type) {
    case 'validation':
      if (context.url) {
        actions.push({
          label: '自动修复URL',
          action: () => {
            // 这里可以触发URL自动修复
            console.log('Auto-fix URL:', context.url);
          }
        });
      }
      break;

    case 'network':
      actions.push({
        label: '检查网络',
        action: () => {
          window.open('https://www.google.com', '_blank');
        }
      });
      break;

    case 'security':
      if (context.url) {
        actions.push({
          label: '检查SSL',
          action: () => {
            window.open(`https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(context.url!)}`, '_blank');
          }
        });
      }
      break;
  }

  return actions;
}

export function createError(
  error: Error | string,
  context: ErrorContext = {}
): EnhancedError {
  const message = typeof error === 'string' ? error : error.message;
  const type = determineErrorType(error);

  // 生成用户友好的标题
  const titles = {
    network: '网络连接问题',
    validation: 'URL格式错误',
    security: '安全验证失败',
    timeout: '请求超时',
    server: '服务器错误',
    unknown: '未知错误'
  };

  // 生成详细信息
  let details = '';
  if (error instanceof Error) {
    details = `错误类型: ${error.name}\n`;
    details += `错误信息: ${error.message}\n`;
    if (error.stack) {
      details += `堆栈信息: ${error.stack}`;
    }
  }

  if (context.url) {
    details += `\n目标URL: ${context.url}`;
  }

  if (context.operation) {
    details += `\n操作类型: ${context.operation}`;
  }

  if (context.timestamp) {
    details += `\n发生时间: ${new Date(context.timestamp).toLocaleString()}`;
  }

  return {
    type,
    title: titles[type],
    message,
    details: details || undefined,
    code: generateErrorCode(type, message),
    solutions: SOLUTION_TEMPLATES[type] || SOLUTION_TEMPLATES.unknown,
    quickActions: createQuickActions(type, context)
  };
}

export const createCommonErrors = {
  networkError: (url?: string): EnhancedError => createError(
    new Error('网络连接失败，请检查您的网络设置'),
    { url, operation: 'network_request' }
  ),

  invalidUrl: (url?: string): EnhancedError => createError(
    new Error('URL格式无效，请检查输入的网址'),
    { url, operation: 'url_validation' }
  ),

  sslError: (url?: string): EnhancedError => createError(
    new Error('SSL证书验证失败，网站可能存在安全问题'),
    { url, operation: 'ssl_verification' }
  ),

  timeoutError: (url?: string): EnhancedError => createError(
    new Error('请求超时，网站响应时间过长'),
    { url, operation: 'request_timeout' }
  ),

  serverError: (url?: string, statusCode?: number): EnhancedError => createError(
    new Error(`服务器错误 ${statusCode ? `(${statusCode})` : ''}，请稍后重试`),
    { url, operation: 'server_request' }
  )
};

export default createError;
