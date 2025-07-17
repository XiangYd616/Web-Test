/**
 * 代理服务 - 处理CORS问题和网页抓取
 */

export interface ProxyResponse {
  html: string;
  headers: { [key: string]: string };
  status: number;
  url: string;
  loadTime: number;
}

/**
 * 代理服务类
 */
export class ProxyService {
  private static instance: ProxyService;

  static getInstance(): ProxyService {
    if (!ProxyService.instance) {
      ProxyService.instance = new ProxyService();
    }
    return ProxyService.instance;
  }

  /**
   * 通过代理获取网页内容
   */
  async fetchPage(url: string, signal?: AbortSignal): Promise<ProxyResponse> {
    const startTime = Date.now();

    // 验证和清理URL（在try外部定义以便在catch中使用）
    const cleanUrl = this.validateAndCleanUrl(url);

    try {

      // 首先尝试使用后端API
      const backendResponse = await this.fetchViaBackend(cleanUrl, signal);
      if (backendResponse) {
        return backendResponse;
      }

      // 如果后端失败，尝试使用代理API
      const proxyResponse = await this.fetchViaProxy(cleanUrl, signal);
      if (proxyResponse) {
        return proxyResponse;
      }

      // 如果代理失败，尝试直接访问
      try {
        return await this.fetchDirect(cleanUrl, signal);
      } catch (directError) {
        // 直接访问也失败，提供友好的错误信息
        throw new Error(`无法访问网站 ${cleanUrl}。

可能的原因：
• 网站服务器暂时不可用
• 网络连接问题
• 网站阻止了跨域访问
• URL地址不正确

建议解决方案：
1. 检查网址是否正确
2. 稍后重试
3. 切换到"本地分析"模式，上传HTML文件进行分析

本地分析模式可以提供完整的SEO检测功能，不受网络限制。`);
      }

    } catch (error) {
      console.warn('Fetch page failed:', error);

      // 提供更详细的错误信息
      if (error instanceof Error) {
        // 如果是我们自定义的详细错误信息，直接抛出
        if (error.message.includes('建议解决方案')) {
          throw error;
        }

        if (error.message.includes('CORS')) {
          throw new Error(`跨域访问被阻止：${cleanUrl}

该网站不允许跨域访问。建议：
• 切换到"本地分析"模式
• 上传网页HTML文件进行分析
• 本地分析功能完整，不受网络限制`);
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`网络连接失败：${cleanUrl}

请检查：
• 网址是否正确
• 网络连接是否正常
• 网站是否可访问

建议切换到"本地分析"模式进行离线分析。`);
        } else if (error.message.includes('404')) {
          throw new Error(`页面不存在：${cleanUrl}

该页面返回404错误，请：
• 检查网址拼写是否正确
• 确认页面是否存在
• 尝试访问网站首页`);
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
          throw new Error(`请求超时：${cleanUrl}

网站响应时间过长，建议：
• 稍后重试
• 检查网络连接
• 切换到"本地分析"模式`);
        } else {
          throw new Error(`访问失败：${error.message}

建议切换到"本地分析"模式，上传HTML文件进行完整的SEO分析。`);
        }
      } else {
        throw new Error(`访问网站时发生未知错误。

建议切换到"本地分析"模式进行离线SEO分析。`);
      }
    }
  }

  /**
   * 验证和清理URL
   */
  private validateAndCleanUrl(url: string): string {
    try {
      // 移除多余的空格和特殊字符
      let cleanUrl = url.trim();

      // 修复常见的URL错误
      cleanUrl = cleanUrl.replace(/,/g, '.'); // 修复逗号错误
      cleanUrl = cleanUrl.replace(/\s+/g, ''); // 移除空格

      // 确保有协议
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      // 验证URL格式
      new URL(cleanUrl);

      return cleanUrl;
    } catch (error) {
      throw new Error(`无效的URL格式: ${url}`);
    }
  }

  /**
   * 通过后端API获取内容（优先方案）
   */
  private async fetchViaBackend(url: string, signal?: AbortSignal): Promise<ProxyResponse | null> {
    try {
      const startTime = Date.now();

      // 后端API地址
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const apiEndpoint = `${backendUrl}/api/seo/fetch-page`;

      console.log(`🔄 尝试后端API: ${apiEndpoint}`);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal
      });

      if (!response.ok) {
        throw new Error(`后端API请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const loadTime = Date.now() - startTime;
        console.log(`✅ 后端API成功: ${url} (${loadTime}ms)`);

        return {
          html: result.data.html,
          headers: result.data.headers || {},
          status: result.data.status || 200,
          url: result.data.url || url,
          loadTime: result.data.loadTime || loadTime
        };
      } else {
        throw new Error(result.error || '后端API返回错误');
      }

    } catch (error) {
      console.warn(`❌ 后端API失败: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * 通过代理API获取内容（备用方案）
   */
  private async fetchViaProxy(url: string, signal?: AbortSignal): Promise<ProxyResponse | null> {
    try {
      // 尝试使用公共代理服务（按可靠性排序）
      const proxyUrls = [
        // 使用更可靠的代理服务
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://thingproxy.freeboard.io/fetch/${url}`,
        // 备用选项
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`
      ];

      for (const proxyUrl of proxyUrls) {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

          const response = await fetch(proxyUrl, {
            signal: signal || controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Cache-Control': 'no-cache'
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const loadTime = Date.now() - startTime;

            // 处理不同代理服务的响应格式
            if (proxyUrl.includes('allorigins')) {
              try {
                const data = await response.json();
                if (data.contents) {
                  return {
                    html: data.contents,
                    headers: data.headers || {},
                    status: data.status || 200,
                    url: url,
                    loadTime
                  };
                }
              } catch (jsonError) {
                console.warn('Failed to parse allorigins response:', jsonError);
                continue;
              }
            } else if (proxyUrl.includes('codetabs')) {
              // 处理codetabs响应
              try {
                const data = await response.json();
                if (data && typeof data === 'string') {
                  return {
                    html: data,
                    headers: {},
                    status: 200,
                    url: url,
                    loadTime
                  };
                } else if (data && data.contents) {
                  return {
                    html: data.contents,
                    headers: data.headers || {},
                    status: data.status || 200,
                    url: url,
                    loadTime
                  };
                }
              } catch (jsonError) {
                // 如果不是JSON，尝试作为文本处理
                const html = await response.text();
                if (html && html.length > 100) { // 确保有实际内容
                  return {
                    html,
                    headers: {},
                    status: 200,
                    url: url,
                    loadTime
                  };
                }
                continue;
              }
            } else {
              // 处理其他代理响应（corsproxy.io, thingproxy等）
              const html = await response.text();

              // 验证响应内容
              if (html && html.length > 100 && !html.includes('Error') && !html.includes('error')) {
                const headers: { [key: string]: string } = {};
                response.headers.forEach((value, key) => {
                  headers[key] = value;
                });

                return {
                  html,
                  headers,
                  status: response.status,
                  url: url,
                  loadTime
                };
              }
            }
          }
        } catch (error) {
          // 只在开发模式下显示代理错误详情，减少控制台噪音
          if (process.env.NODE_ENV === 'development') {
            console.warn(`代理服务失败 ${proxyUrl}:`, error instanceof Error ? error.message : error);
          }
          continue;
        }
      }

      // 所有代理都失败了
      console.warn('All proxy services failed for URL:', url);

      // 返回null，让调用者决定如何处理
      return null;
    } catch (error) {
      console.warn('Proxy service error:', error);

      // 返回null，让调用者决定如何处理
      return null;
    }
  }

  /**
   * 直接访问（可能受CORS限制）
   */
  private async fetchDirect(url: string, signal?: AbortSignal): Promise<ProxyResponse> {
    const startTime = Date.now();

    try {
      // 尝试直接访问
      const response = await fetch(url, {
        signal,
        mode: 'cors',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const loadTime = Date.now() - startTime;

      const headers: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        html,
        headers,
        status: response.status,
        url: url,
        loadTime
      };
    } catch (error) {
      // 如果直接访问失败，抛出错误
      throw error;
    }
  }



  /**
   * 检查URL是否可访问
   */
  async checkUrl(url: string, signal?: AbortSignal): Promise<{
    accessible: boolean;
    status: number;
    error?: string;
  }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal,
        mode: 'cors'
      });

      return {
        accessible: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        accessible: false,
        status: 0,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取robots.txt内容
   */
  async fetchRobotsTxt(baseUrl: string, signal?: AbortSignal): Promise<{
    exists: boolean;
    content: string;
    accessible: boolean;
  }> {
    try {
      // 首先尝试后端API
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const apiEndpoint = `${backendUrl}/api/seo/fetch-robots`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseUrl }),
        signal
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      }

      // 后端失败，回退到原方法
      const robotsUrl = `${baseUrl}/robots.txt`;
      const pageResponse = await this.fetchPage(robotsUrl, signal);

      return {
        exists: true,
        content: pageResponse.html,
        accessible: pageResponse.status === 200
      };
    } catch (error) {
      return {
        exists: false,
        content: '',
        accessible: false
      };
    }
  }

  /**
   * 获取sitemap内容
   */
  async fetchSitemap(sitemapUrl: string, signal?: AbortSignal): Promise<{
    exists: boolean;
    content: string;
    accessible: boolean;
    urls: string[];
  }> {
    try {
      // 首先尝试后端API
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const apiEndpoint = `${backendUrl}/api/seo/fetch-sitemap`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sitemapUrl }),
        signal
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      }

      // 后端失败，回退到原方法
      const pageResponse = await this.fetchPage(sitemapUrl, signal);

      // 解析sitemap中的URL
      const urls = this.parseSitemapUrls(pageResponse.html);

      return {
        exists: true,
        content: pageResponse.html,
        accessible: pageResponse.status === 200,
        urls
      };
    } catch (error) {
      // 404错误是正常的，不需要记录错误
      if (error instanceof Error && error.message.includes('404')) {
        // 静默处理404错误
      } else {
        console.warn(`Failed to fetch sitemap ${sitemapUrl}:`, error);
      }

      return {
        exists: false,
        content: '',
        accessible: false,
        urls: []
      };
    }
  }

  /**
   * 解析sitemap中的URL
   */
  private parseSitemapUrls(sitemapContent: string): string[] {
    const urls: string[] = [];

    try {
      // 简单的XML解析（实际应该使用专门的XML解析器）
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, '').trim();
          if (url) {
            urls.push(url);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to parse sitemap URLs:', error);
    }

    return urls;
  }

  /**
   * 批量检查URL状态
   */
  async checkMultipleUrls(urls: string[], signal?: AbortSignal): Promise<{
    [url: string]: {
      accessible: boolean;
      status: number;
      error?: string;
    }
  }> {
    const results: { [url: string]: any } = {};

    // 限制并发数量
    const concurrency = 5;
    const chunks = this.chunkArray(urls, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (url) => {
        const result = await this.checkUrl(url, signal);
        return { url, result };
      });

      const chunkResults = await Promise.allSettled(promises);

      chunkResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const { url, result } = promiseResult.value;
          results[url] = result;
        }
      });

      // 添加延迟避免过于频繁的请求
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 模拟页面性能测试
   */
  async measurePagePerformance(url: string, signal?: AbortSignal): Promise<{
    loadTime: number;
    pageSize: number;
    requests: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  }> {
    const startTime = performance.now();

    try {
      const response = await this.fetchPage(url, signal);
      const endTime = performance.now();

      const loadTime = endTime - startTime;
      const pageSize = new Blob([response.html]).size;

      // 简单估算请求数量（基于HTML中的资源引用）
      const requests = this.estimateResourceCount(response.html);

      return {
        loadTime,
        pageSize,
        requests,
        // 这些指标在实际环境中需要通过Performance API获取
        firstContentfulPaint: loadTime * 0.3,
        largestContentfulPaint: loadTime * 0.6
      };
    } catch (error) {
      throw new Error(`性能测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 估算页面资源数量
   */
  private estimateResourceCount(html: string): number {
    let count = 1; // HTML本身

    // 计算各种资源
    count += (html.match(/<img[^>]+src=/gi) || []).length; // 图片
    count += (html.match(/<link[^>]+href=[^>]*\.css/gi) || []).length; // CSS
    count += (html.match(/<script[^>]+src=/gi) || []).length; // JavaScript
    count += (html.match(/<link[^>]+href=[^>]*\.ico/gi) || []).length; // 图标

    return count;
  }
}

// 导出单例实例
export const proxyService = ProxyService.getInstance();
