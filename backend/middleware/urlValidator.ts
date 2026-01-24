/**
 * 统一的后端URL验证中间件
 * 提供一致的URL验证逻辑给所有API路由使用
 */

import { promises as dns } from 'dns';
import type { NextFunction, Request, Response } from 'express';
import { URL } from 'url';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';

interface URLOptions {
  allowedProtocols?: string[];
  requireHTTPS?: boolean;
  allowLocalhost?: boolean;
  allowPrivateIPs?: boolean;
  checkDNS?: boolean;
  timeout?: number;
}

const respondUrlError = (
  res: Response,
  message: string,
  code: string,
  details?: Record<string, unknown>
) => res.error(StandardErrorCode.INVALID_INPUT, message, { code, details }, 400);

interface URLValidationResult {
  isValid: boolean;
  url: URL | null;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface DNSResolutionResult {
  resolvable: boolean;
  addresses: string[];
  error?: string;
}

/**
 * URL验证选项
 */
const DEFAULT_OPTIONS: URLOptions = {
  allowedProtocols: ['http:', 'https:'],
  requireHTTPS: false,
  allowLocalhost: true,
  allowPrivateIPs: true,
  checkDNS: false,
  timeout: 5000,
};

/**
 * 检查是否为私有IP地址
 */
function isPrivateIP(hostname: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  return privateRanges.some(range => range.test(hostname));
}

/**
 * 检查域名格式
 */
function isValidDomain(hostname: string): boolean {
  // 基本域名格式检查
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z-9])?)*$/;

  if (!domainRegex.test(hostname)) {
    return false;
  }

  // 检查是否有有效的顶级域名
  const parts = hostname.split('.');
  if (parts.length < 2) {
    return false;
  }

  const tld = parts[parts.length - 1];
  return tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
}

/**
 * 检查DNS解析
 */
async function checkDNSResolution(
  hostname: string,
  timeout: number = 5000
): Promise<DNSResolutionResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 尝试解析A记录
    const addresses = await dns.resolve4(hostname);
    clearTimeout(timeoutId);

    return {
      resolvable: true,
      addresses,
    };
  } catch {
    try {
      // 如果A记录失败，尝试AAAA记录
      const addresses = await dns.resolve6(hostname);
      return {
        resolvable: true,
        addresses,
      };
    } catch {
      return {
        resolvable: false,
        error: '无法解析DNS',
        addresses: [],
      };
    }
  }
}

/**
 * 主要的URL验证函数
 */
async function validateURL(
  urlString: string,
  options: URLOptions = {}
): Promise<URLValidationResult> {
  const opts: URLOptions = { ...DEFAULT_OPTIONS, ...options };
  const result: URLValidationResult = {
    isValid: false,
    url: null,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // 基本格式检查
  if (!urlString || typeof urlString !== 'string') {
    result.errors.push('请输入有效的URL');
    return result;
  }

  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    result.errors.push('URL不能为空');
    return result;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    result.url = parsedUrl;

    // 协议验证
    const allowedProtocols = opts.allowedProtocols ?? DEFAULT_OPTIONS.allowedProtocols ?? [];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      result.errors.push(
        `不支持的协议: ${parsedUrl.protocol}。支持的协议: ${allowedProtocols.join(', ')}`
      );
    }

    // HTTPS要求检查
    if (opts.requireHTTPS && parsedUrl.protocol !== 'https:') {
      result.errors.push('此URL必须使用HTTPS协议');
    }

    // 主机名验证
    const hostname = parsedUrl.hostname;
    if (!hostname) {
      result.errors.push('URL必须包含有效的主机名');
      return result;
    }

    // 本地主机检查
    if (
      !opts.allowLocalhost &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
    ) {
      result.errors.push('不允许访问本地主机');
    }

    // 私有IP检查
    if (!opts.allowPrivateIPs && isPrivateIP(hostname)) {
      result.errors.push('不允许访问私有IP地址');
    }

    // 域名格式检查
    if (!isValidDomain(hostname)) {
      result.warnings.push('域名格式可能无效');
    }

    // DNS解析检查
    if (opts.checkDNS && !isPrivateIP(hostname)) {
      const dnsResult = await checkDNSResolution(hostname, opts.timeout);
      if (!dnsResult.resolvable) {
        result.warnings.push(`无法解析域名: ${dnsResult.error}`);
      } else {
        result.suggestions.push(`DNS解析成功，找到 ${dnsResult.addresses.length} 个地址`);
      }
    }

    // 端口检查
    if (parsedUrl.port && (Number(parsedUrl.port) < 1 || Number(parsedUrl.port) > 65535)) {
      result.errors.push('端口号必须在1-65535范围内');
    }

    // 路径检查
    if (parsedUrl.pathname && parsedUrl.pathname.length > 2048) {
      result.warnings.push('URL路径过长，可能超过某些系统限制');
    }

    // 查询字符串检查
    if (parsedUrl.search && parsedUrl.search.length > 2048) {
      result.warnings.push('查询字符串过长，可能超过某些系统限制');
    }

    // 如果没有错误，标记为有效
    if (result.errors.length === 0) {
      result.isValid = true;
    }
  } catch (error) {
    result.errors.push(`无效的URL格式: ${(error as Error).message}`);
  }

  return result;
}

/**
 * URL验证中间件
 */
function urlValidator(options: URLOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const urlParam = (req.query.url as string) || (req.body.url as string);

    if (!urlParam) {
      respondUrlError(res, 'URL参数是必需的', 'MISSING_URL');
      return;
    }

    const validation = await validateURL(urlParam, options);

    if (!validation.isValid) {
      respondUrlError(res, 'URL验证失败', 'INVALID_URL', {
        errors: validation.errors,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
      });
      return;
    }

    // 将验证后的URL对象附加到请求中
    if (validation.url) {
      (req as Request & { validatedURL?: URL }).validatedURL = validation.url;
    }

    next();
  };
}

/**
 * 批量URL验证中间件
 */
function batchUrlValidator(options: URLOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const urls = (req.body.urls as string[]) || [];

    if (!Array.isArray(urls) || urls.length === 0) {
      respondUrlError(res, 'URLs数组是必需的', 'MISSING_URLS');
      return;
    }

    if (urls.length > 50) {
      respondUrlError(res, '批量验证最多支持50个URL', 'BATCH_SIZE_EXCEEDED');
      return;
    }

    const results = await Promise.all(urls.map(url => validateURL(url, options)));

    const invalidResults = results.filter(result => !result.isValid);

    if (invalidResults.length > 0) {
      respondUrlError(res, '批量URL验证失败', 'BATCH_VALIDATION_FAILED', {
        total: results.length,
        valid: results.length - invalidResults.length,
        invalid: invalidResults.length,
        errors: invalidResults.map(result => ({
          url: result.url?.href,
          errors: result.errors,
          warnings: result.warnings,
        })),
      });
      return;
    }

    // 将验证结果附加到请求中
    (req as Request & { validationResults?: URLValidationResult[] }).validationResults = results;

    next();
  };
}

/**
 * 条件URL验证中间件
 */
function conditionalUrlValidator(condition: (req: Request) => boolean, options: URLOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (condition(req)) {
      await urlValidator(options)(req, res, next);
      return;
    }
    next();
  };
}

/**
 * 必需HTTPS验证中间件
 */
function requireHTTPS(options: URLOptions = {}) {
  return urlValidator({
    ...options,
    requireHTTPS: true,
  });
}

/**
 * 公共URL验证中间件（不允许私有IP和本地主机）
 */
function publicURLValidator(options: URLOptions = {}) {
  return urlValidator({
    ...options,
    allowLocalhost: false,
    allowPrivateIPs: false,
    checkDNS: true,
  });
}

/**
 * 内部URL验证中间件（允许私有IP和本地主机）
 */
function internalURLValidator(options: URLOptions = {}) {
  return urlValidator({
    ...options,
    allowLocalhost: true,
    allowPrivateIPs: true,
    checkDNS: false,
  });
}

/**
 * 严格URL验证中间件（包含所有检查）
 */
function strictURLValidator(options: URLOptions = {}) {
  return urlValidator({
    ...options,
    requireHTTPS: true,
    allowLocalhost: false,
    allowPrivateIPs: false,
    checkDNS: true,
    timeout: 10000,
  });
}

/**
 * URL格式化中间件
 */
function urlFormatter() {
  return (req: Request, res: Response, next: NextFunction) => {
    const urlParam = (req.query.url as string) || (req.body.url as string);

    if (urlParam) {
      try {
        const formattedUrl = new URL(urlParam).href;
        req.query.url = formattedUrl;
        if (req.body.url) {
          req.body.url = formattedUrl;
        }
      } catch {
        // 如果格式化失败，保持原值
      }
    }

    next();
  };
}

/**
 * URL安全检查中间件
 */
function urlSecurityCheck() {
  return (req: Request, res: Response, next: NextFunction) => {
    const urlParam = (req.query.url as string) || (req.body.url as string);

    if (!urlParam) {
      return next();
    }

    // 检查潜在的安全问题
    const securityChecks = [
      // 检查是否包含脚本标签
      /<script/i,
      // 检查是否包含JavaScript伪协议
      /javascript:/i,
      // 检查是否包含data: URL
      /data:/i,
      // 检查是否包含vbscript: URL
      /vbscript:/i,
    ];

    const issues = securityChecks
      .filter(regex => regex.test(urlParam))
      .map(regex => `检测到潜在的安全问题: ${regex.source}`);

    if (issues.length > 0) {
      return respondUrlError(res, 'URL包含潜在的安全问题', 'URL_SECURITY_ISSUE', { issues });
    }

    next();
  };
}

/**
 * URL长度限制中间件
 */
function urlLengthLimit(maxLength: number = 2048) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const urlParam = (req.query.url as string) || (req.body.url as string);

    if (urlParam && urlParam.length > maxLength) {
      respondUrlError(res, `URL长度不能超过${maxLength}个字符`, 'URL_TOO_LONG');
      return;
    }

    next();
  };
}

export {
  batchUrlValidator,
  checkDNSResolution,
  conditionalUrlValidator,
  DEFAULT_OPTIONS,
  internalURLValidator,
  isPrivateIP,
  isValidDomain,
  publicURLValidator,
  requireHTTPS,
  strictURLValidator,
  urlFormatter,
  urlLengthLimit,
  urlSecurityCheck,
  urlValidator,
  validateURL,
};

module.exports = {
  validateURL,
  urlValidator,
  batchUrlValidator,
  conditionalUrlValidator,
  requireHTTPS,
  publicURLValidator,
  internalURLValidator,
  strictURLValidator,
  urlFormatter,
  urlSecurityCheck,
  urlLengthLimit,
  isPrivateIP,
  isValidDomain,
  checkDNSResolution,
  DEFAULT_OPTIONS,
};
