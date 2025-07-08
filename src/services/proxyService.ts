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

    try {
      // 验证和清理URL
      const cleanUrl = this.validateAndCleanUrl(url);

      // 首先尝试使用内置的代理API
      const response = await this.fetchViaProxy(cleanUrl, signal);
      if (response) {
        return response;
      }

      // 如果代理失败，尝试直接访问
      return await this.fetchDirect(cleanUrl, signal);

    } catch (error) {
      console.error('Proxy fetch failed:', error);

      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          throw new Error(`无法访问该网站：CORS策略阻止了跨域请求。请确保网站允许跨域访问，或者尝试其他网站。`);
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error(`网络连接失败：无法连接到目标网站。请检查网址是否正确，或者稍后重试。`);
        } else if (error.message.includes('404')) {
          throw new Error(`页面不存在：目标页面返回404错误。请检查网址是否正确。`);
        } else if (error.message.includes('timeout')) {
          throw new Error(`请求超时：网站响应时间过长。请稍后重试或尝试其他网站。`);
        } else {
          throw new Error(`获取页面内容失败：${error.message}`);
        }
      } else {
        throw new Error('获取页面内容时发生未知错误，请稍后重试。');
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
   * 通过代理API获取内容
   */
  private async fetchViaProxy(url: string, signal?: AbortSignal): Promise<ProxyResponse | null> {
    try {
      // 尝试使用公共代理服务（按可靠性排序）
      const proxyUrls = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://thingproxy.freeboard.io/fetch/${url}`
      ];

      for (const proxyUrl of proxyUrls) {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

          const response = await fetch(proxyUrl, {
            signal: signal || controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const loadTime = Date.now() - startTime;

            // 处理allorigins响应
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
            } else if (proxyUrl.includes('corsproxy.io')) {
              // 处理corsproxy.io响应
              const html = await response.text();
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
            } else {
              // 处理其他代理响应
              const html = await response.text();
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
        } catch (error) {
          console.warn(`Proxy ${proxyUrl} failed:`, error instanceof Error ? error.message : error);
          continue;
        }
      }

      // 所有代理都失败了
      console.error('All proxy services failed for URL:', url);
      return null;
    } catch (error) {
      console.error('Proxy service error:', error);
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
      const robotsUrl = `${baseUrl}/robots.txt`;
      const response = await this.fetchPage(robotsUrl, signal);

      return {
        exists: true,
        content: response.html,
        accessible: response.status === 200
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
      const response = await this.fetchPage(sitemapUrl, signal);

      // 解析sitemap中的URL
      const urls = this.parseSitemapUrls(response.html);

      return {
        exists: true,
        content: response.html,
        accessible: response.status === 200,
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
