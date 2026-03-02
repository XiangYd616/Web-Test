/**
 * 共享网络错误诊断工具
 * 将原始的 AxiosError / Node.js 网络错误转换为用户友好的诊断信息
 */

type AxiosLikeError = {
  response?: { status?: number; statusText?: string };
  code?: string;
  message?: string;
};

/**
 * 将网络错误转换为用户可读的诊断文案
 * @param error - 原始错误对象
 * @param context - 上下文描述，如 "获取页面内容" / "SEO 分析"
 * @param url - 目标 URL（可选，用于丰富诊断信息）
 */
export function diagnoseNetworkError(error: unknown, context: string, url?: string): string {
  const prefix = url ? `${context} (${url})` : context;
  if (!error) return `${prefix}失败`;

  const msg = error instanceof Error ? error.message : String(error);
  const axiosErr = error as AxiosLikeError;
  const code = axiosErr?.code || '';
  const status = axiosErr?.response?.status;

  // HTTP 状态码错误
  if (status) {
    if (status === 401) return `${prefix}失败: 目标站点需要认证 (HTTP 401)`;
    if (status === 403)
      return `${prefix}失败: 目标站点拒绝访问 (HTTP 403)，可能启用了防火墙或 IP 限制`;
    if (status === 404) return `${prefix}失败: 目标页面不存在 (HTTP 404)，请检查 URL 是否正确`;
    if (status === 429) return `${prefix}失败: 请求被限流 (HTTP 429)，目标站点启用了频率限制`;
    if (status === 500) return `${prefix}失败: 目标服务器内部错误 (HTTP 500)`;
    if (status === 502) return `${prefix}失败: 目标站点网关错误 (HTTP 502)，上游服务器可能不可用`;
    if (status === 503)
      return `${prefix}失败: 目标站点暂时不可用 (HTTP 503)，可能正在维护或被 CDN 防护拦截`;
    if (status === 504) return `${prefix}失败: 目标站点网关超时 (HTTP 504)`;
    if (status >= 400) return `${prefix}失败: 目标站点返回 HTTP ${status}`;
  }

  // DNS 解析失败
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return `${prefix}失败: DNS 解析失败，请检查域名是否正确、网络是否连通`;
  }

  // 连接被拒绝
  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
    return `${prefix}失败: 连接被拒绝，请确认目标服务器已启动且端口正确`;
  }

  // 连接被重置
  if (code === 'ECONNRESET' || msg.includes('ECONNRESET') || msg.includes('socket hang up')) {
    return `${prefix}失败: 连接被重置，服务器可能主动关闭了连接（检查防火墙或 WAF 规则）`;
  }

  // 超时
  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    msg.includes('timeout') ||
    msg.includes('ETIMEDOUT')
  ) {
    return `${prefix}超时: 目标站点响应过慢或网络不通，可尝试增大超时时间`;
  }

  // SSL/TLS 错误
  if (
    msg.includes('CERT') ||
    msg.includes('cert') ||
    msg.includes('SSL') ||
    msg.includes('ssl') ||
    msg.includes('TLS') ||
    msg.includes('tls') ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID'
  ) {
    return `${prefix}失败: SSL/TLS 证书错误，证书可能无效、已过期或域名不匹配`;
  }

  // 无效 URL
  if (code === 'ERR_INVALID_URL' || msg.includes('Invalid URL')) {
    return `${prefix}失败: URL 格式无效，请检查输入的地址`;
  }

  // 网络不可达
  if (code === 'ENETUNREACH' || msg.includes('ENETUNREACH')) {
    return `${prefix}失败: 网络不可达，请检查网络连接`;
  }

  // 通用回退：截断过长的错误信息
  const cleanMsg = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
  return `${prefix}失败: ${cleanMsg}`;
}

/**
 * 判断错误是否为致命网络错误（不可恢复，无需重试）
 */
export function isFatalNetworkError(error: unknown): boolean {
  const axiosErr = error as AxiosLikeError;
  const code = axiosErr?.code || '';
  const msg = error instanceof Error ? error.message : String(error);
  const fatalCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ERR_INVALID_URL'];
  return fatalCodes.includes(code) || /ENOTFOUND|ECONNREFUSED|ERR_INVALID_URL/.test(msg);
}
