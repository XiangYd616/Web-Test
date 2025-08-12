/**
 * 安全测试引擎 - OWASP标准的安全检测工具
 * 
 * 功能特性：
 * - SQL注入、XSS、CSRF等常见漏洞检测
 * - SSL/TLS安全检测
 * - HTTP安全头检测
 * - Cookie安全分析
 * - 内容安全策略(CSP)分析
 * - 安全测试报告和风险评估
 * - 自定义安全规则支持
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

const axios = require('axios');
const https = require('https');
const tls = require('tls');
const { URL } = require('url');

// 安全测试常量
const SECURITY_CONSTANTS = {
    RISK_LEVELS: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
        INFO: 'info'
    },
    VULNERABILITY_TYPES: {
        SQL_INJECTION: 'sql_injection',
        XSS: 'xss',
        CSRF: 'csrf',
        CLICKJACKING: 'clickjacking',
        SSL_TLS: 'ssl_tls',
        HEADERS: 'security_headers',
        COOKIES: 'insecure_cookies',
        DIRECTORY_TRAVERSAL: 'directory_traversal',
        INFORMATION_DISCLOSURE: 'information_disclosure'
    },
    SECURITY_HEADERS: {
        REQUIRED: [
            'strict-transport-security',
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'content-security-policy'
        ],
        RECOMMENDED: [
            'referrer-policy',
            'permissions-policy',
            'expect-ct'
        ]
    },
    PAYLOADS: {
        SQL_INJECTION: [
            "' OR '1'='1",
            "' OR 1=1--",
            "' UNION SELECT NULL--",
            "'; DROP TABLE users--",
            "1' AND (SELECT COUNT(*) FROM information_schema.tables)>0--"
        ],
        XSS: [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//"
        ],
        DIRECTORY_TRAVERSAL: [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ]
    }
};

class SecurityTestEngine {
    constructor() {
        this.name = 'security-test-engine';
        this.version = '1.0.0';
        this.axiosInstance = this.createAxiosInstance();
        this.vulnerabilities = [];
        this.testResults = {};
    }

    /**
     * 创建axios实例
     */
    createAxiosInstance() {
        return axios.create({
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: () => true, // 接受所有状态码
            headers: {
                'User-Agent': 'SecurityScanner/1.0 (Security Testing Tool)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            // 允许不安全的HTTPS连接用于测试
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    /**
     * 执行安全测试 - 主入口方法
     */
    async runSecurityTest(url, config = {}) {
        const testId = this.generateTestId();
        const startTime = Date.now();

        console.log(`🔒 开始安全测试: ${url}`);

        try {
            // 验证URL
            this.validateUrl(url);

            // 初始化测试结果
            const results = {
                testId,
                url,
                startTime: new Date(startTime).toISOString(),
                config,

                // 安全测试结果
                vulnerabilities: [],
                securityHeaders: {},
                sslInfo: {},
                cookieAnalysis: {},
                contentSecurityPolicy: {},

                // 风险评估
                riskLevel: 'low',
                securityScore: 0,

                // 测试统计
                testsPerformed: 0,
                vulnerabilitiesFound: 0,

                // 建议
                recommendations: [],

                // 测试完成信息
                endTime: '',
                duration: 0
            };

            // 执行各项安全检测
            await this.performSecurityChecks(url, config, results);

            // 计算安全评分和风险等级
            this.calculateSecurityScore(results);
            this.assessRiskLevel(results);

            // 生成安全建议
            this.generateSecurityRecommendations(results);

            // 完成测试
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - startTime;

            console.log(`✅ 安全测试完成: ${url} (评分: ${results.securityScore}, 风险: ${results.riskLevel})`);

            return {
                success: true,
                data: results
            };

        } catch (error) {
            console.error(`❌ 安全测试失败: ${url}`, error);

            return {
                success: false,
                error: error.message,
                data: {
                    testId,
                    url,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    errorDetails: {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status
                    }
                }
            };
        }
    }
    /**
      * 执行安全检测
      */
    async performSecurityChecks(url, config, results) {
        console.log('🔍 开始执行安全检测...');

        // 1. HTTP安全头检测
        await this.checkSecurityHeaders(url, results);
        results.testsPerformed++;

        // 2. SSL/TLS安全检测
        await this.checkSSLSecurity(url, results);
        results.testsPerformed++;

        // 3. Cookie安全检测
        await this.checkCookieSecurity(url, results);
        results.testsPerformed++;

        // 4. 内容安全策略检测
        await this.checkContentSecurityPolicy(url, results);
        results.testsPerformed++;

        // 5. SQL注入检测
        if (config.checkSQLInjection !== false) {
            await this.checkSQLInjection(url, results);
            results.testsPerformed++;
        }

        // 6. XSS检测
        if (config.checkXSS !== false) {
            await this.checkXSS(url, results);
            results.testsPerformed++;
        }

        // 7. CSRF检测
        if (config.checkCSRF !== false) {
            await this.checkCSRF(url, results);
            results.testsPerformed++;
        }

        // 8. 点击劫持检测
        await this.checkClickjacking(url, results);
        results.testsPerformed++;

        // 9. 目录遍历检测
        if (config.checkDirectoryTraversal !== false) {
            await this.checkDirectoryTraversal(url, results);
            results.testsPerformed++;
        }

        // 10. 信息泄露检测
        await this.checkInformationDisclosure(url, results);
        results.testsPerformed++;

        results.vulnerabilitiesFound = results.vulnerabilities.length;
    }

    /**
     * 检测HTTP安全头
     */
    async checkSecurityHeaders(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const headers = response.headers;

            const securityHeaders = {
                'strict-transport-security': headers['strict-transport-security'],
                'x-frame-options': headers['x-frame-options'],
                'x-content-type-options': headers['x-content-type-options'],
                'x-xss-protection': headers['x-xss-protection'],
                'content-security-policy': headers['content-security-policy'],
                'referrer-policy': headers['referrer-policy'],
                'permissions-policy': headers['permissions-policy'],
                'expect-ct': headers['expect-ct']
            };

            results.securityHeaders = securityHeaders;

            // 检查缺失的安全头
            SECURITY_CONSTANTS.SECURITY_HEADERS.REQUIRED.forEach(header => {
                if (!securityHeaders[header]) {
                    this.addVulnerability(results, {
                        type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                        severity: 'medium',
                        title: `缺少安全头: ${header}`,
                        description: `网站缺少重要的安全头 ${header}`,
                        impact: this.getHeaderImpact(header),
                        solution: this.getHeaderSolution(header),
                        evidence: `HTTP响应中未找到 ${header} 头部`
                    });
                }
            });

            // 检查不安全的安全头配置
            this.validateSecurityHeaders(securityHeaders, results);

        } catch (error) {
            console.error('安全头检测失败:', error.message);
        }
    }

    /**
     * 检测SSL/TLS安全性
     */
    async checkSSLSecurity(url, results) {
        try {
            const urlObj = new URL(url);

            if (urlObj.protocol !== 'https:') {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS,
                    severity: 'high',
                    title: '未使用HTTPS',
                    description: '网站未使用HTTPS加密连接',
                    impact: '数据传输可能被窃听或篡改',
                    solution: '启用HTTPS并配置SSL/TLS证书',
                    evidence: `URL使用HTTP协议: ${url}`
                });
                return;
            }

            // 获取SSL证书信息
            const sslInfo = await this.getSSLInfo(urlObj.hostname, urlObj.port || 443);
            results.sslInfo = sslInfo;

            // 检查SSL配置问题
            this.validateSSLConfiguration(sslInfo, results);

        } catch (error) {
            console.error('SSL检测失败:', error.message);
            this.addVulnerability(results, {
                type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS,
                severity: 'medium',
                title: 'SSL检测失败',
                description: '无法获取SSL证书信息',
                impact: '无法验证SSL配置安全性',
                solution: '检查SSL证书配置',
                evidence: error.message
            });
        }
    }

    /**
     * 检测Cookie安全性
     */
    async checkCookieSecurity(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const cookies = this.parseCookies(response.headers['set-cookie'] || []);

            const cookieAnalysis = {
                totalCookies: cookies.length,
                secureCookies: 0,
                httpOnlyCookies: 0,
                sameSiteCookies: 0,
                issues: []
            };

            cookies.forEach(cookie => {
                if (cookie.secure) cookieAnalysis.secureCookies++;
                if (cookie.httpOnly) cookieAnalysis.httpOnlyCookies++;
                if (cookie.sameSite) cookieAnalysis.sameSiteCookies++;

                // 检查不安全的Cookie
                if (!cookie.secure && url.startsWith('https:')) {
                    this.addVulnerability(results, {
                        type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.COOKIES,
                        severity: 'medium',
                        title: 'Cookie缺少Secure标志',
                        description: `Cookie "${cookie.name}" 在HTTPS连接中缺少Secure标志`,
                        impact: 'Cookie可能通过不安全的HTTP连接传输',
                        solution: '为所有Cookie添加Secure标志',
                        evidence: `Cookie: ${cookie.name}`
                    });
                }

                if (!cookie.httpOnly) {
                    this.addVulnerability(results, {
                        type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.COOKIES,
                        severity: 'medium',
                        title: 'Cookie缺少HttpOnly标志',
                        description: `Cookie "${cookie.name}" 缺少HttpOnly标志`,
                        impact: 'Cookie可能被JavaScript访问，增加XSS风险',
                        solution: '为敏感Cookie添加HttpOnly标志',
                        evidence: `Cookie: ${cookie.name}`
                    });
                }

                if (!cookie.sameSite) {
                    this.addVulnerability(results, {
                        type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.COOKIES,
                        severity: 'low',
                        title: 'Cookie缺少SameSite标志',
                        description: `Cookie "${cookie.name}" 缺少SameSite标志`,
                        impact: '可能存在CSRF攻击风险',
                        solution: '为Cookie添加适当的SameSite标志',
                        evidence: `Cookie: ${cookie.name}`
                    });
                }
            });

            results.cookieAnalysis = cookieAnalysis;

        } catch (error) {
            console.error('Cookie安全检测失败:', error.message);
        }
    }

    /**
     * 检测内容安全策略
     */
    async checkContentSecurityPolicy(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const csp = response.headers['content-security-policy'];

            if (!csp) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                    severity: 'medium',
                    title: '缺少内容安全策略(CSP)',
                    description: '网站未配置内容安全策略',
                    impact: '增加XSS攻击风险',
                    solution: '配置适当的Content-Security-Policy头部',
                    evidence: '响应中未找到Content-Security-Policy头部'
                });
                return;
            }

            const cspAnalysis = this.parseCSP(csp);
            results.contentSecurityPolicy = cspAnalysis;

            // 检查不安全的CSP配置
            this.validateCSP(cspAnalysis, results);

        } catch (error) {
            console.error('CSP检测失败:', error.message);
        }
    }

    /**
     * 检测SQL注入漏洞
     */
    async checkSQLInjection(url, results) {
        try {
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

            for (const payload of SECURITY_CONSTANTS.PAYLOADS.SQL_INJECTION) {
                try {
                    // 测试URL参数
                    const testUrl = `${baseUrl}?test=${encodeURIComponent(payload)}`;
                    const response = await this.axiosInstance.get(testUrl);

                    if (this.detectSQLInjectionResponse(response)) {
                        this.addVulnerability(results, {
                            type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SQL_INJECTION,
                            severity: 'critical',
                            title: 'SQL注入漏洞',
                            description: '检测到可能的SQL注入漏洞',
                            impact: '攻击者可能获取、修改或删除数据库数据',
                            solution: '使用参数化查询和输入验证',
                            evidence: `Payload: ${payload}`,
                            cwe: 'CWE-89',
                            cvss: 9.8
                        });
                        break; // 找到一个就够了
                    }

                    // 添加延迟避免被检测
                    await this.sleep(100);

                } catch (error) {
                    // 忽略单个请求错误
                    continue;
                }
            }

        } catch (error) {
            console.error('SQL注入检测失败:', error.message);
        }
    }

    /**
     * 检测XSS漏洞
     */
    async checkXSS(url, results) {
        try {
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

            for (const payload of SECURITY_CONSTANTS.PAYLOADS.XSS) {
                try {
                    const testUrl = `${baseUrl}?test=${encodeURIComponent(payload)}`;
                    const response = await this.axiosInstance.get(testUrl);

                    if (this.detectXSSResponse(response, payload)) {
                        this.addVulnerability(results, {
                            type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.XSS,
                            severity: 'high',
                            title: 'XSS漏洞',
                            description: '检测到可能的跨站脚本(XSS)漏洞',
                            impact: '攻击者可能执行恶意脚本，窃取用户信息',
                            solution: '对用户输入进行适当的编码和验证',
                            evidence: `Payload: ${payload}`,
                            cwe: 'CWE-79',
                            cvss: 7.5
                        });
                        break;
                    }

                    await this.sleep(100);

                } catch (error) {
                    continue;
                }
            }

        } catch (error) {
            console.error('XSS检测失败:', error.message);
        }
    }

    /**
     * 检测CSRF漏洞
     */
    async checkCSRF(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const html = response.data;

            // 检查是否有表单
            const formRegex = /<form[^>]*>/gi;
            const forms = html.match(formRegex) || [];

            if (forms.length === 0) {
                return; // 没有表单，跳过CSRF检测
            }

            // 检查CSRF令牌
            const hasCSRFToken = /csrf|_token|authenticity_token/i.test(html);

            if (!hasCSRFToken) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.CSRF,
                    severity: 'medium',
                    title: 'CSRF保护缺失',
                    description: '表单缺少CSRF令牌保护',
                    impact: '攻击者可能执行跨站请求伪造攻击',
                    solution: '为所有表单添加CSRF令牌验证',
                    evidence: `发现${forms.length}个表单，但未检测到CSRF令牌`,
                    cwe: 'CWE-352'
                });
            }

        } catch (error) {
            console.error('CSRF检测失败:', error.message);
        }
    }

    /**
     * 检测点击劫持漏洞
     */
    async checkClickjacking(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const xFrameOptions = response.headers['x-frame-options'];
            const csp = response.headers['content-security-policy'];

            let isProtected = false;

            // 检查X-Frame-Options
            if (xFrameOptions && (xFrameOptions.toLowerCase() === 'deny' ||
                xFrameOptions.toLowerCase() === 'sameorigin')) {
                isProtected = true;
            }

            // 检查CSP frame-ancestors
            if (csp && csp.includes('frame-ancestors')) {
                isProtected = true;
            }

            if (!isProtected) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.CLICKJACKING,
                    severity: 'medium',
                    title: '点击劫持漏洞',
                    description: '网站缺少点击劫持保护',
                    impact: '攻击者可能通过iframe嵌入页面进行点击劫持攻击',
                    solution: '设置X-Frame-Options头部或CSP frame-ancestors指令',
                    evidence: '未检测到X-Frame-Options或CSP frame-ancestors保护',
                    cwe: 'CWE-1021'
                });
            }

        } catch (error) {
            console.error('点击劫持检测失败:', error.message);
        }
    }

    /**
     * 检测目录遍历漏洞
     */
    async checkDirectoryTraversal(url, results) {
        try {
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

            for (const payload of SECURITY_CONSTANTS.PAYLOADS.DIRECTORY_TRAVERSAL) {
                try {
                    const testUrl = `${baseUrl}/${payload}`;
                    const response = await this.axiosInstance.get(testUrl);

                    if (this.detectDirectoryTraversalResponse(response)) {
                        this.addVulnerability(results, {
                            type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.DIRECTORY_TRAVERSAL,
                            severity: 'high',
                            title: '目录遍历漏洞',
                            description: '检测到可能的目录遍历漏洞',
                            impact: '攻击者可能访问服务器上的敏感文件',
                            solution: '验证和过滤文件路径输入',
                            evidence: `Payload: ${payload}`,
                            cwe: 'CWE-22'
                        });
                        break;
                    }

                    await this.sleep(100);

                } catch (error) {
                    continue;
                }
            }

        } catch (error) {
            console.error('目录遍历检测失败:', error.message);
        }
    }

    /**
     * 检测信息泄露
     */
    async checkInformationDisclosure(url, results) {
        try {
            const response = await this.axiosInstance.get(url);
            const headers = response.headers;
            const html = response.data;

            // 检查服务器信息泄露
            if (headers.server) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.INFORMATION_DISCLOSURE,
                    severity: 'low',
                    title: '服务器信息泄露',
                    description: '响应头泄露了服务器信息',
                    impact: '攻击者可能利用服务器信息进行针对性攻击',
                    solution: '隐藏或修改Server头部信息',
                    evidence: `Server: ${headers.server}`
                });
            }

            // 检查技术栈信息泄露
            if (headers['x-powered-by']) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.INFORMATION_DISCLOSURE,
                    severity: 'low',
                    title: '技术栈信息泄露',
                    description: '响应头泄露了技术栈信息',
                    impact: '攻击者可能利用技术栈信息进行针对性攻击',
                    solution: '移除X-Powered-By头部',
                    evidence: `X-Powered-By: ${headers['x-powered-by']}`
                });
            }

            // 检查HTML中的敏感信息
            this.checkSensitiveInfoInHTML(html, results);

        } catch (error) {
            console.error('信息泄露检测失败:', error.message);
        }
    }
    /**
      * 添加漏洞记录
      */
    addVulnerability(results, vulnerability) {
        const vuln = {
            id: this.generateVulnerabilityId(),
            timestamp: new Date().toISOString(),
            ...vulnerability
        };

        results.vulnerabilities.push(vuln);
        console.log(`🚨 发现漏洞: ${vuln.title} (${vuln.severity})`);
    }

    /**
     * 计算安全评分
     */
    calculateSecurityScore(results) {
        let score = 100;

        results.vulnerabilities.forEach(vuln => {
            switch (vuln.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
                case 'info':
                    score -= 1;
                    break;
            }
        });

        results.securityScore = Math.max(0, score);
    }

    /**
     * 评估风险等级
     */
    assessRiskLevel(results) {
        const criticalCount = results.vulnerabilities.filter(v => v.severity === 'critical').length;
        const highCount = results.vulnerabilities.filter(v => v.severity === 'high').length;
        const mediumCount = results.vulnerabilities.filter(v => v.severity === 'medium').length;

        if (criticalCount > 0) {
            results.riskLevel = 'critical';
        } else if (highCount > 2) {
            results.riskLevel = 'high';
        } else if (highCount > 0 || mediumCount > 3) {
            results.riskLevel = 'medium';
        } else {
            results.riskLevel = 'low';
        }
    }

    /**
     * 生成安全建议
     */
    generateSecurityRecommendations(results) {
        const recommendations = [];

        // 基于漏洞类型生成建议
        const vulnTypes = [...new Set(results.vulnerabilities.map(v => v.type))];

        vulnTypes.forEach(type => {
            const vulns = results.vulnerabilities.filter(v => v.type === type);
            const highestSeverity = vulns.reduce((max, v) =>
                this.getSeverityWeight(v.severity) > this.getSeverityWeight(max) ? v.severity : max, 'info');

            recommendations.push({
                category: type,
                priority: highestSeverity,
                title: this.getRecommendationTitle(type),
                description: this.getRecommendationDescription(type, vulns.length),
                impact: this.getRecommendationImpact(type),
                actions: this.getRecommendationActions(type)
            });
        });

        // 通用安全建议
        if (results.securityScore < 80) {
            recommendations.push({
                category: 'general',
                priority: 'medium',
                title: '提升整体安全性',
                description: '网站存在多个安全问题，需要全面的安全加固',
                impact: '降低整体安全风险，保护用户和数据安全',
                actions: [
                    '定期进行安全测试和评估',
                    '建立安全开发流程',
                    '实施安全监控和日志记录',
                    '定期更新和打补丁'
                ]
            });
        }

        results.recommendations = recommendations;
    }

    // 辅助检测方法
    detectSQLInjectionResponse(response) {
        const indicators = [
            'sql syntax',
            'mysql_fetch',
            'ora-01756',
            'microsoft jet database',
            'odbc sql server driver',
            'postgresql query failed',
            'warning: mysql',
            'valid mysql result',
            'sqlite_exception'
        ];

        const responseText = response.data.toLowerCase();
        return indicators.some(indicator => responseText.includes(indicator));
    }

    detectXSSResponse(response, payload) {
        const responseText = response.data;
        // 检查payload是否被直接反射到响应中
        return responseText.includes(payload) ||
            responseText.includes(payload.replace(/[<>]/g, ''));
    }

    detectDirectoryTraversalResponse(response) {
        const indicators = [
            'root:x:0:0',
            '[boot loader]',
            'windows registry editor',
            '# /etc/passwd',
            'daemon:x:1:1'
        ];

        const responseText = response.data.toLowerCase();
        return indicators.some(indicator => responseText.includes(indicator));
    }

    checkSensitiveInfoInHTML(html, results) {
        const patterns = [
            { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: '密码泄露' },
            { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, type: 'API密钥泄露' },
            { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, type: '密钥泄露' },
            { pattern: /token\s*[:=]\s*['"][^'"]+['"]/gi, type: '令牌泄露' },
            { pattern: /<!--.*?-->/gs, type: 'HTML注释' }
        ];

        patterns.forEach(({ pattern, type }) => {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.INFORMATION_DISCLOSURE,
                    severity: type.includes('密码') || type.includes('密钥') ? 'high' : 'medium',
                    title: `HTML中发现${type}`,
                    description: `在HTML源码中发现可能的敏感信息`,
                    impact: '敏感信息可能被攻击者获取',
                    solution: '移除HTML中的敏感信息',
                    evidence: `发现${matches.length}处匹配`
                });
            }
        });
    }

    // SSL相关方法
    async getSSLInfo(hostname, port) {
        return new Promise((resolve, reject) => {
            const socket = tls.connect(port, hostname, { rejectUnauthorized: false }, () => {
                const cert = socket.getPeerCertificate();
                const protocol = socket.getProtocol();
                const cipher = socket.getCipher();

                resolve({
                    isSecure: true,
                    protocol: protocol,
                    cipher: cipher,
                    validFrom: cert.valid_from,
                    validTo: cert.valid_to,
                    issuer: cert.issuer,
                    subject: cert.subject,
                    fingerprint: cert.fingerprint,
                    serialNumber: cert.serialNumber,
                    certificateChain: socket.getPeerCertificateChain?.() || []
                });

                socket.end();
            });

            socket.on('error', (error) => {
                reject(error);
            });

            socket.setTimeout(10000, () => {
                socket.destroy();
                reject(new Error('SSL连接超时'));
            });
        });
    }

    validateSSLConfiguration(sslInfo, results) {
        // 检查证书过期
        const now = new Date();
        const validTo = new Date(sslInfo.validTo);
        const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            this.addVulnerability(results, {
                type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS,
                severity: 'critical',
                title: 'SSL证书已过期',
                description: 'SSL证书已过期',
                impact: '用户将看到安全警告，可能拒绝访问',
                solution: '更新SSL证书',
                evidence: `证书过期时间: ${sslInfo.validTo}`
            });
        } else if (daysUntilExpiry < 30) {
            this.addVulnerability(results, {
                type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS,
                severity: 'medium',
                title: 'SSL证书即将过期',
                description: `SSL证书将在${daysUntilExpiry}天后过期`,
                impact: '证书过期后用户将无法安全访问',
                solution: '及时更新SSL证书',
                evidence: `证书过期时间: ${sslInfo.validTo}`
            });
        }

        // 检查弱加密算法
        if (sslInfo.protocol && sslInfo.protocol.includes('TLSv1.0')) {
            this.addVulnerability(results, {
                type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS,
                severity: 'high',
                title: '使用过时的TLS版本',
                description: '使用TLS 1.0协议存在安全风险',
                impact: '可能受到协议降级攻击',
                solution: '升级到TLS 1.2或更高版本',
                evidence: `TLS版本: ${sslInfo.protocol}`
            });
        }
    }

    // Cookie解析
    parseCookies(setCookieHeaders) {
        const cookies = [];

        setCookieHeaders.forEach(header => {
            const parts = header.split(';').map(part => part.trim());
            const [nameValue] = parts;
            const [name, value] = nameValue.split('=');

            const cookie = {
                name: name.trim(),
                value: value ? value.trim() : '',
                secure: parts.some(part => part.toLowerCase() === 'secure'),
                httpOnly: parts.some(part => part.toLowerCase() === 'httponly'),
                sameSite: parts.find(part => part.toLowerCase().startsWith('samesite='))?.split('=')[1]
            };

            cookies.push(cookie);
        });

        return cookies;
    }

    // CSP解析和验证
    parseCSP(csp) {
        const directives = {};
        const parts = csp.split(';').map(part => part.trim());

        parts.forEach(part => {
            const [directive, ...values] = part.split(/\s+/);
            if (directive) {
                directives[directive.toLowerCase()] = values;
            }
        });

        return {
            directives,
            raw: csp
        };
    }

    validateCSP(cspAnalysis, results) {
        const { directives } = cspAnalysis;

        // 检查不安全的CSP配置
        Object.entries(directives).forEach(([directive, values]) => {
            if (values.includes("'unsafe-inline'")) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                    severity: 'medium',
                    title: 'CSP配置不安全',
                    description: `${directive}指令包含'unsafe-inline'`,
                    impact: '可能增加XSS攻击风险',
                    solution: '移除unsafe-inline，使用nonce或hash',
                    evidence: `${directive}: ${values.join(' ')}`
                });
            }

            if (values.includes("'unsafe-eval'")) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                    severity: 'medium',
                    title: 'CSP配置不安全',
                    description: `${directive}指令包含'unsafe-eval'`,
                    impact: '可能增加代码注入风险',
                    solution: '移除unsafe-eval',
                    evidence: `${directive}: ${values.join(' ')}`
                });
            }
        });
    }

    validateSecurityHeaders(headers, results) {
        // 验证HSTS
        const hsts = headers['strict-transport-security'];
        if (hsts) {
            if (!hsts.includes('max-age=') || parseInt(hsts.match(/max-age=(\d+)/)?.[1] || 0) < 31536000) {
                this.addVulnerability(results, {
                    type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                    severity: 'low',
                    title: 'HSTS配置不当',
                    description: 'HSTS max-age值过小',
                    impact: '可能无法有效防止协议降级攻击',
                    solution: '设置max-age至少为31536000秒(1年)',
                    evidence: `HSTS: ${hsts}`
                });
            }
        }

        // 验证X-Frame-Options
        const xfo = headers['x-frame-options'];
        if (xfo && !['DENY', 'SAMEORIGIN'].includes(xfo.toUpperCase())) {
            this.addVulnerability(results, {
                type: SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS,
                severity: 'medium',
                title: 'X-Frame-Options配置不当',
                description: 'X-Frame-Options值不安全',
                impact: '可能存在点击劫持风险',
                solution: '设置为DENY或SAMEORIGIN',
                evidence: `X-Frame-Options: ${xfo}`
            });
        }
    }

    // 工具方法
    validateUrl(url) {
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`无效的URL格式: ${url}`);
        }
    }

    generateTestId() {
        return `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateVulnerabilityId() {
        return `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSeverityWeight(severity) {
        const weights = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
        return weights[severity] || 0;
    }

    getHeaderImpact(header) {
        const impacts = {
            'strict-transport-security': '防止协议降级攻击',
            'x-frame-options': '防止点击劫持攻击',
            'x-content-type-options': '防止MIME类型嗅探攻击',
            'x-xss-protection': '启用浏览器XSS过滤器',
            'content-security-policy': '防止XSS和数据注入攻击'
        };
        return impacts[header] || '提升安全性';
    }

    getHeaderSolution(header) {
        const solutions = {
            'strict-transport-security': '添加 Strict-Transport-Security: max-age=31536000; includeSubDomains',
            'x-frame-options': '添加 X-Frame-Options: DENY 或 SAMEORIGIN',
            'x-content-type-options': '添加 X-Content-Type-Options: nosniff',
            'x-xss-protection': '添加 X-XSS-Protection: 1; mode=block',
            'content-security-policy': '配置适当的Content-Security-Policy策略'
        };
        return solutions[header] || `添加${header}安全头`;
    }

    getRecommendationTitle(type) {
        const titles = {
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.SQL_INJECTION]: '修复SQL注入漏洞',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.XSS]: '修复XSS漏洞',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.CSRF]: '实施CSRF保护',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS]: '完善安全头配置',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS]: '改善SSL/TLS配置',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.COOKIES]: '加强Cookie安全',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.CLICKJACKING]: '防止点击劫持',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.INFORMATION_DISCLOSURE]: '防止信息泄露'
        };
        return titles[type] || '修复安全问题';
    }

    getRecommendationDescription(type, count) {
        return `发现${count}个${this.getRecommendationTitle(type)}相关的安全问题，需要及时修复`;
    }

    getRecommendationImpact(type) {
        const impacts = {
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.SQL_INJECTION]: '防止数据库被攻击和数据泄露',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.XSS]: '防止恶意脚本执行和用户信息窃取',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.CSRF]: '防止跨站请求伪造攻击',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS]: '提升整体安全防护水平',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.SSL_TLS]: '确保数据传输安全',
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.COOKIES]: '保护用户会话安全'
        };
        return impacts[type] || '提升安全性';
    }

    getRecommendationActions(type) {
        const actions = {
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.SQL_INJECTION]: [
                '使用参数化查询或预编译语句',
                '对用户输入进行严格验证和过滤',
                '实施最小权限原则',
                '定期进行代码审查'
            ],
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.XSS]: [
                '对输出进行HTML编码',
                '使用内容安全策略(CSP)',
                '验证和过滤用户输入',
                '使用安全的模板引擎'
            ],
            [SECURITY_CONSTANTS.VULNERABILITY_TYPES.HEADERS]: [
                '配置所有必需的安全头',
                '定期检查安全头配置',
                '使用安全头检测工具',
                '保持安全头配置最新'
            ]
        };
        return actions[type] || ['修复相关安全问题'];
    }
}

module.exports = SecurityTestEngine;