/**
 * 性能和可访问性测试引擎
 * 
 * 功能特性：
 * - 集成Lighthouse进行性能测试
 * - WCAG标准的可访问性检查
 * - 性能优化建议生成
 * - 可访问性改进建议
 * - 测试结果可视化展示
 * - Core Web Vitals分析
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const axios = require('axios');

const execAsync = promisify(exec);

// 性能和可访问性测试常量
const PERF_CONSTANTS = {
    LIGHTHOUSE: {
        CATEGORIES: ['performance', 'accessibility', 'best-practices', 'seo'],
        PERFORMANCE_THRESHOLDS: {
            EXCELLENT: 90,
            GOOD: 75,
            NEEDS_IMPROVEMENT: 50,
            POOR: 0
        },
        ACCESSIBILITY_THRESHOLDS: {
            EXCELLENT: 95,
            GOOD: 85,
            NEEDS_IMPROVEMENT: 70,
            POOR: 0
        }
    },
    CORE_WEB_VITALS: {
        LCP: { GOOD: 2500, NEEDS_IMPROVEMENT: 4000 },
        FID: { GOOD: 100, NEEDS_IMPROVEMENT: 300 },
        CLS: { GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25 },
        FCP: { GOOD: 1800, NEEDS_IMPROVEMENT: 3000 },
        TTFB: { GOOD: 800, NEEDS_IMPROVEMENT: 1800 }
    },
    WCAG_LEVELS: {
        A: 'A',
        AA: 'AA',
        AAA: 'AAA'
    }
};

class PerformanceAccessibilityEngine {
    constructor() {
        this.name = 'performance-accessibility-engine';
        this.version = '1.0.0';
        this.lighthouseAvailable = false;
        this.axeAvailable = false;
    }

    /**
     * 初始化引擎
     */
    async initialize() {
        console.log('🔧 初始化性能和可访问性测试引擎...');

        // 检查Lighthouse可用性
        this.lighthouseAvailable = await this.checkLighthouseAvailability();

        // 检查axe-core可用性
        this.axeAvailable = await this.checkAxeAvailability();

        console.log(`✅ 引擎初始化完成 - Lighthouse: ${this.lighthouseAvailable}, Axe: ${this.axeAvailable}`);
    }

    /**
     * 执行性能和可访问性测试 - 主入口方法
     */
    async runPerformanceAccessibilityTest(url, config = {}) {
        const testId = this.generateTestId();
        const startTime = Date.now();

        console.log(`🚀 开始性能和可访问性测试: ${url}`);

        try {
            // 验证URL
            this.validateUrl(url);

            // 初始化测试结果
            const results = {
                testId,
                url,
                startTime: new Date(startTime).toISOString(),
                config,

                // 性能测试结果
                performance: {
                    lighthouse: null,
                    coreWebVitals: null,
                    resourceAnalysis: null,
                    opportunities: [],
                    diagnostics: []
                },

                // 可访问性测试结果
                accessibility: {
                    lighthouse: null,
                    wcagCompliance: null,
                    violations: [],
                    passes: [],
                    summary: null
                },

                // 综合评分
                overallScore: 0,
                performanceScore: 0,
                accessibilityScore: 0,

                // 建议
                recommendations: [],

                // 测试完成信息
                endTime: '',
                duration: 0
            };

            // 执行Lighthouse测试
            if (this.lighthouseAvailable) {
                await this.runLighthouseTest(url, config, results);
            } else {
                console.warn('⚠️ Lighthouse不可用，跳过Lighthouse测试');
                // 使用备用性能检测方法
                await this.runBasicPerformanceTest(url, config, results);
            }

            // 执行可访问性测试
            await this.runAccessibilityTest(url, config, results);

            // 计算综合评分
            this.calculateOverallScores(results);

            // 生成改进建议
            this.generateRecommendations(results);

            // 完成测试
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - startTime;

            console.log(`✅ 性能和可访问性测试完成: ${url} (性能: ${results.performanceScore}, 可访问性: ${results.accessibilityScore})`);

            return {
                success: true,
                data: results
            };

        } catch (error) {
            console.error(`❌ 性能和可访问性测试失败: ${url}`, error);

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
     * 检查Lighthouse可用性
     */
    async checkLighthouseAvailability() {
        try {
            await execAsync('lighthouse --version');
            return true;
        } catch (error) {
            console.warn('Lighthouse不可用:', error.message);
            return false;
        }
    }

    /**
     * 检查axe-core可用性
     */
    async checkAxeAvailability() {
        try {
            // 检查是否可以require axe-core
            require.resolve('axe-core');
            return true;
        } catch (error) {
            console.warn('axe-core不可用:', error.message);
            return false;
        }
    }

    /**
     * 运行Lighthouse测试
     */
    async runLighthouseTest(url, config, results) {
        try {
            console.log('🔍 运行Lighthouse测试...');

            const tempDir = path.join(os.tmpdir(), 'lighthouse-test');
            await fs.mkdir(tempDir, { recursive: true });

            const outputPath = path.join(tempDir, `lighthouse-${Date.now()}.json`);
            const device = config.device || 'desktop';
            const categories = config.categories || PERF_CONSTANTS.LIGHTHOUSE.CATEGORIES;

            // 构建Lighthouse命令
            const deviceFlag = device === 'mobile' ? '--preset=perf' : '--preset=desktop';
            const categoriesFlag = categories.map(cat => `--only-categories=${cat}`).join(' ');

            // Chrome标志
            let chromeFlags = '--headless --disable-gpu --disable-dev-shm-usage --disable-extensions';

            // 检查环境
            const isContainerEnv = process.env.DOCKER_ENV === 'true' || process.env.CI === 'true';
            const isRootUser = process.getuid && process.getuid() === 0;

            if (isContainerEnv || isRootUser) {
                chromeFlags += ' --no-sandbox --disable-setuid-sandbox';
            }

            const command = `lighthouse "${url}" ${deviceFlag} ${categoriesFlag} --output=json --output-path="${outputPath}" --chrome-flags="${chromeFlags}" --quiet`;

            console.log('执行Lighthouse命令:', command);

            await execAsync(command, {
                timeout: 180000, // 3分钟超时
                maxBuffer: 1024 * 1024 * 50 // 50MB缓冲区
            });

            // 读取结果
            const resultData = await fs.readFile(outputPath, 'utf-8');
            const lighthouseResult = JSON.parse(resultData);

            // 解析Lighthouse结果
            this.parseLighthouseResults(lighthouseResult, results);

            // 清理临时文件
            try {
                await fs.unlink(outputPath);
            } catch (cleanupError) {
                console.warn('清理临时文件失败:', cleanupError);
            }

        } catch (error) {
            console.error('Lighthouse测试失败:', error);
            // 使用备用方法
            await this.runBasicPerformanceTest(url, config, results);
        }
    }

    /**
     * 解析Lighthouse结果
     */
    parseLighthouseResults(lighthouseData, results) {
        const { categories, audits } = lighthouseData;

        // 提取分数
        const scores = {
            performance: Math.round((categories.performance?.score || 0) * 100),
            accessibility: Math.round((categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
            seo: Math.round((categories.seo?.score || 0) * 100)
        };

        // 性能指标
        results.performance.lighthouse = {
            score: scores.performance,
            metrics: this.extractPerformanceMetrics(audits),
            opportunities: this.extractOpportunities(audits),
            diagnostics: this.extractDiagnostics(audits)
        };

        // Core Web Vitals
        results.performance.coreWebVitals = this.extractCoreWebVitals(audits);

        // 可访问性结果
        results.accessibility.lighthouse = {
            score: scores.accessibility,
            violations: this.extractAccessibilityViolations(audits),
            passes: this.extractAccessibilityPasses(audits)
        };

        // 设置分数
        results.performanceScore = scores.performance;
        results.accessibilityScore = scores.accessibility;
    }

    /**
     * 提取性能指标
     */
    extractPerformanceMetrics(audits) {
        return {
            firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
            largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
            firstMeaningfulPaint: audits['first-meaningful-paint']?.numericValue || 0,
            speedIndex: audits['speed-index']?.numericValue || 0,
            timeToInteractive: audits['interactive']?.numericValue || 0,
            totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
            cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0,
            serverResponseTime: audits['server-response-time']?.numericValue || 0
        };
    }

    /**
     * 提取Core Web Vitals
     */
    extractCoreWebVitals(audits) {
        const lcp = audits['largest-contentful-paint']?.numericValue || 0;
        const fid = audits['max-potential-fid']?.numericValue || 0;
        const cls = audits['cumulative-layout-shift']?.numericValue || 0;
        const fcp = audits['first-contentful-paint']?.numericValue || 0;
        const ttfb = audits['server-response-time']?.numericValue || 0;

        return {
            lcp: {
                value: lcp,
                rating: this.getCoreWebVitalRating('LCP', lcp)
            },
            fid: {
                value: fid,
                rating: this.getCoreWebVitalRating('FID', fid)
            },
            cls: {
                value: cls,
                rating: this.getCoreWebVitalRating('CLS', cls)
            },
            fcp: {
                value: fcp,
                rating: this.getCoreWebVitalRating('FCP', fcp)
            },
            ttfb: {
                value: ttfb,
                rating: this.getCoreWebVitalRating('TTFB', ttfb)
            }
        };
    }

    /**
     * 获取Core Web Vital评级
     */
    getCoreWebVitalRating(metric, value) {
        const thresholds = PERF_CONSTANTS.CORE_WEB_VITALS[metric];
        if (!thresholds) return 'unknown';

        if (value <= thresholds.GOOD) return 'good';
        if (value <= thresholds.NEEDS_IMPROVEMENT) return 'needs-improvement';
        return 'poor';
    }  /**
  
 * 提取性能优化机会
   */
    extractOpportunities(audits) {
        const opportunities = [];

        Object.values(audits).forEach(audit => {
            if (audit.details?.type === 'opportunity' && audit.numericValue > 0) {
                opportunities.push({
                    id: audit.id,
                    title: audit.title,
                    description: audit.description,
                    savings: audit.numericValue,
                    displayValue: audit.displayValue,
                    impact: this.categorizeImpact(audit.numericValue)
                });
            }
        });

        return opportunities.sort((a, b) => b.savings - a.savings).slice(0, 10);
    }

    /**
     * 提取性能诊断信息
     */
    extractDiagnostics(audits) {
        const diagnostics = [];

        Object.values(audits).forEach(audit => {
            if (audit.score !== null && audit.score < 1 && audit.details?.type !== 'opportunity') {
                diagnostics.push({
                    id: audit.id,
                    title: audit.title,
                    description: audit.description,
                    severity: this.getSeverityFromScore(audit.score),
                    displayValue: audit.displayValue
                });
            }
        });

        return diagnostics.slice(0, 15);
    }

    /**
     * 提取可访问性违规
     */
    extractAccessibilityViolations(audits) {
        const violations = [];

        Object.values(audits).forEach(audit => {
            if (audit.score === 0 && audit.id.includes('accessibility')) {
                violations.push({
                    id: audit.id,
                    title: audit.title,
                    description: audit.description,
                    impact: this.getAccessibilityImpact(audit.id),
                    help: audit.help || '',
                    helpUrl: audit.helpUrl || '',
                    nodes: audit.details?.items || []
                });
            }
        });

        return violations;
    }

    /**
     * 提取可访问性通过项
     */
    extractAccessibilityPasses(audits) {
        const passes = [];

        Object.values(audits).forEach(audit => {
            if (audit.score === 1 && audit.id.includes('accessibility')) {
                passes.push({
                    id: audit.id,
                    title: audit.title,
                    description: audit.description
                });
            }
        });

        return passes;
    }

    /**
     * 运行基础性能测试（Lighthouse不可用时的备用方案）
     */
    async runBasicPerformanceTest(url, config, results) {
        try {
            console.log('🔍 运行基础性能测试...');

            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: 30000,
                maxRedirects: 5
            });
            const loadTime = Date.now() - startTime;

            // 基础性能指标
            const basicMetrics = {
                loadTime,
                responseSize: response.data.length,
                statusCode: response.status,
                headers: response.headers
            };

            // 分析响应头中的性能提示
            const performanceHints = this.analyzePerformanceHeaders(response.headers);

            // 简单的性能评分
            let performanceScore = 100;
            if (loadTime > 3000) performanceScore -= 30;
            else if (loadTime > 1500) performanceScore -= 15;
            else if (loadTime > 800) performanceScore -= 5;

            if (basicMetrics.responseSize > 1000000) performanceScore -= 20; // 1MB
            else if (basicMetrics.responseSize > 500000) performanceScore -= 10; // 500KB

            results.performance.lighthouse = {
                score: Math.max(0, performanceScore),
                metrics: {
                    loadTime,
                    responseSize: basicMetrics.responseSize,
                    ...performanceHints
                },
                opportunities: this.generateBasicOpportunities(basicMetrics, performanceHints),
                diagnostics: this.generateBasicDiagnostics(basicMetrics)
            };

            results.performanceScore = Math.max(0, performanceScore);

        } catch (error) {
            console.error('基础性能测试失败:', error);
            results.performance.lighthouse = {
                score: 0,
                metrics: {},
                opportunities: [],
                diagnostics: [{
                    title: '性能测试失败',
                    description: error.message,
                    severity: 'error'
                }]
            };
            results.performanceScore = 0;
        }
    }

    /**
     * 运行可访问性测试
     */
    async runAccessibilityTest(url, config, results) {
        try {
            console.log('🔍 运行可访问性测试...');

            if (this.axeAvailable) {
                await this.runAxeAccessibilityTest(url, config, results);
            } else {
                await this.runBasicAccessibilityTest(url, config, results);
            }

        } catch (error) {
            console.error('可访问性测试失败:', error);
            results.accessibility = {
                lighthouse: null,
                wcagCompliance: null,
                violations: [{
                    title: '可访问性测试失败',
                    description: error.message,
                    impact: 'critical'
                }],
                passes: [],
                summary: {
                    totalViolations: 1,
                    complianceLevel: 'unknown'
                }
            };
            results.accessibilityScore = 0;
        }
    }

    /**
     * 运行axe可访问性测试
     */
    async runAxeAccessibilityTest(url, config, results) {
        try {
            console.log('🔍 运行Axe可访问性测试...');

            const puppeteer = require('puppeteer');
            const { AxePuppeteer } = require('axe-puppeteer');

            // 启动浏览器
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();

            // 设置视口
            await page.setViewport({ width: 1920, height: 1080 });

            // 导航到页面
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // 运行axe测试
            const axeResults = await new AxePuppeteer(page)
                .withTags(config.wcagTags || ['wcag2a', 'wcag2aa', 'wcag21aa'])
                .analyze();

            await browser.close();

            // 处理axe结果
            const violations = axeResults.violations.map(violation => ({
                id: violation.id,
                title: violation.help,
                description: violation.description,
                impact: violation.impact || 'moderate',
                help: violation.help,
                helpUrl: violation.helpUrl,
                tags: violation.tags,
                nodes: violation.nodes.length,
                details: violation.nodes.map(node => ({
                    target: node.target,
                    html: node.html,
                    failureSummary: node.failureSummary
                }))
            }));

            const passes = axeResults.passes.map(pass => ({
                id: pass.id,
                title: pass.help,
                description: pass.description,
                tags: pass.tags
            }));

            // 计算WCAG合规性
            const wcagCompliance = this.calculateWCAGCompliance(axeResults);

            // 计算可访问性评分
            const totalTests = violations.length + passes.length;
            const accessibilityScore = totalTests > 0 ? Math.round((passes.length / totalTests) * 100) : 0;

            results.accessibility = {
                lighthouse: results.accessibility.lighthouse,
                wcagCompliance,
                violations,
                passes,
                summary: {
                    totalViolations: violations.length,
                    totalPasses: passes.length,
                    complianceLevel: this.getComplianceLevel(accessibilityScore),
                    testedElements: totalTests,
                    axeVersion: axeResults.testEngine.version
                }
            };

            results.accessibilityScore = accessibilityScore;

            console.log(`✅ Axe可访问性测试完成 - 违规: ${violations.length}, 通过: ${passes.length}`);

        } catch (error) {
            console.error('Axe可访问性测试失败:', error);
            // 回退到基础测试
            await this.runBasicAccessibilityTest(url, config, results);
        }
    }

    /**
     * 计算WCAG合规性
     */
    calculateWCAGCompliance(axeResults) {
        const wcagLevels = {
            'wcag2a': { violations: 0, total: 0 },
            'wcag2aa': { violations: 0, total: 0 },
            'wcag21aa': { violations: 0, total: 0 }
        };

        // 统计违规
        axeResults.violations.forEach(violation => {
            violation.tags.forEach(tag => {
                if (wcagLevels[tag]) {
                    wcagLevels[tag].violations++;
                    wcagLevels[tag].total++;
                }
            });
        });

        // 统计通过
        axeResults.passes.forEach(pass => {
            pass.tags.forEach(tag => {
                if (wcagLevels[tag]) {
                    wcagLevels[tag].total++;
                }
            });
        });

        // 计算合规率
        const compliance = {};
        Object.entries(wcagLevels).forEach(([level, data]) => {
            compliance[level] = {
                violations: data.violations,
                total: data.total,
                complianceRate: data.total > 0 ? Math.round(((data.total - data.violations) / data.total) * 100) : 100
            };
        });

        return {
            level: 'AA', // 默认检查AA级别
            details: compliance,
            overallCompliance: compliance['wcag2aa']?.complianceRate || 0
        };
    }

    /**
     * 运行基础可访问性测试
     */
    async runBasicAccessibilityTest(url, config, results) {
        try {
            const response = await axios.get(url);
            const html = response.data;

            const violations = [];
            const passes = [];

            // 基础可访问性检查
            const checks = [
                this.checkImageAltText(html),
                this.checkHeadingStructure(html),
                this.checkFormLabels(html),
                this.checkColorContrast(html),
                this.checkKeyboardNavigation(html),
                this.checkLangAttribute(html),
                this.checkPageTitle(html)
            ];

            checks.forEach(check => {
                if (check.passed) {
                    passes.push(check);
                } else {
                    violations.push(check);
                }
            });

            // 计算可访问性评分
            const totalChecks = checks.length;
            const passedChecks = passes.length;
            const accessibilityScore = Math.round((passedChecks / totalChecks) * 100);

            results.accessibility = {
                lighthouse: null,
                wcagCompliance: {
                    level: config.wcagLevel || 'AA',
                    complianceRate: accessibilityScore
                },
                violations,
                passes,
                summary: {
                    totalViolations: violations.length,
                    totalPasses: passes.length,
                    complianceLevel: this.getComplianceLevel(accessibilityScore),
                    testedElements: totalChecks
                }
            };

            results.accessibilityScore = accessibilityScore;

        } catch (error) {
            throw error;
        }
    }

    /**
     * 基础可访问性检查方法
     */
    checkImageAltText(html) {
        const imgRegex = /<img[^>]*>/gi;
        const images = html.match(imgRegex) || [];
        const imagesWithoutAlt = images.filter(img => !img.includes('alt=') || img.includes('alt=""'));

        return {
            id: 'image-alt',
            title: '图片替代文本',
            description: '所有图片都应该有描述性的alt属性',
            passed: imagesWithoutAlt.length === 0,
            impact: 'serious',
            help: '为所有图片添加有意义的alt属性',
            nodes: imagesWithoutAlt.length,
            details: `发现${images.length}个图片，其中${imagesWithoutAlt.length}个缺少alt属性`
        };
    }

    checkHeadingStructure(html) {
        const h1Regex = /<h1[^>]*>/gi;
        const h1Count = (html.match(h1Regex) || []).length;

        return {
            id: 'heading-structure',
            title: '标题结构',
            description: '页面应该有且仅有一个h1标题',
            passed: h1Count === 1,
            impact: 'moderate',
            help: '确保页面有且仅有一个h1标题',
            nodes: h1Count,
            details: `发现${h1Count}个h1标题`
        };
    }

    checkFormLabels(html) {
        const inputRegex = /<input[^>]*>/gi;
        const labelRegex = /<label[^>]*>/gi;
        const inputs = html.match(inputRegex) || [];
        const labels = html.match(labelRegex) || [];

        // 简化检查：假设每个input都应该有对应的label
        const hasLabels = labels.length >= inputs.filter(input =>
            input.includes('type="text"') ||
            input.includes('type="email"') ||
            input.includes('type="password"')
        ).length;

        return {
            id: 'form-labels',
            title: '表单标签',
            description: '所有表单控件都应该有关联的标签',
            passed: hasLabels,
            impact: 'serious',
            help: '为所有表单控件添加label标签',
            nodes: inputs.length,
            details: `发现${inputs.length}个输入框，${labels.length}个标签`
        };
    }

    checkColorContrast(html) {
        // 简化检查：检查是否有内联样式设置颜色
        const hasInlineColors = html.includes('color:') || html.includes('background-color:');

        return {
            id: 'color-contrast',
            title: '颜色对比度',
            description: '文本和背景之间应该有足够的对比度',
            passed: !hasInlineColors, // 简化：假设没有内联颜色样式就通过
            impact: 'serious',
            help: '确保文本和背景颜色有足够的对比度',
            nodes: hasInlineColors ? 1 : 0,
            details: hasInlineColors ? '检测到内联颜色样式，需要手动验证对比度' : '未检测到明显的对比度问题'
        };
    }

    checkKeyboardNavigation(html) {
        // 检查是否有tabindex属性
        const hasTabindex = html.includes('tabindex=');
        const hasNegativeTabindex = html.includes('tabindex="-1"');

        return {
            id: 'keyboard-navigation',
            title: '键盘导航',
            description: '页面应该支持键盘导航',
            passed: !hasNegativeTabindex,
            impact: 'serious',
            help: '避免使用负数tabindex，确保键盘可访问性',
            nodes: hasNegativeTabindex ? 1 : 0,
            details: hasNegativeTabindex ? '发现负数tabindex，可能影响键盘导航' : '未发现键盘导航问题'
        };
    }

    checkLangAttribute(html) {
        const hasLang = html.includes('<html') && html.includes('lang=');

        return {
            id: 'html-lang',
            title: '页面语言',
            description: 'HTML元素应该有lang属性',
            passed: hasLang,
            impact: 'serious',
            help: '为html元素添加lang属性',
            nodes: hasLang ? 0 : 1,
            details: hasLang ? '页面已设置语言属性' : '页面缺少语言属性'
        };
    }

    checkPageTitle(html) {
        const titleRegex = /<title[^>]*>([^<]+)<\/title>/i;
        const titleMatch = html.match(titleRegex);
        const hasTitle = titleMatch && titleMatch[1].trim().length > 0;

        return {
            id: 'page-title',
            title: '页面标题',
            description: '页面应该有描述性的标题',
            passed: hasTitle,
            impact: 'serious',
            help: '为页面添加描述性的title标签',
            nodes: hasTitle ? 0 : 1,
            details: hasTitle ? `页面标题: ${titleMatch[1]}` : '页面缺少标题'
        };
    }

    /**
     * 计算综合评分
     */
    calculateOverallScores(results) {
        const performanceWeight = 0.6;
        const accessibilityWeight = 0.4;

        results.overallScore = Math.round(
            results.performanceScore * performanceWeight +
            results.accessibilityScore * accessibilityWeight
        );
    }

    /**
     * 生成改进建议
     */
    generateRecommendations(results) {
        const recommendations = [];

        // 性能建议
        if (results.performanceScore < 75) {
            recommendations.push({
                category: 'performance',
                priority: results.performanceScore < 50 ? 'high' : 'medium',
                title: '提升页面性能',
                description: `当前性能评分为${results.performanceScore}分，需要优化`,
                impact: '改善用户体验，提高搜索引擎排名',
                actions: this.getPerformanceActions(results.performance)
            });
        }

        // 可访问性建议
        if (results.accessibilityScore < 85) {
            recommendations.push({
                category: 'accessibility',
                priority: results.accessibilityScore < 70 ? 'high' : 'medium',
                title: '改善可访问性',
                description: `当前可访问性评分为${results.accessibilityScore}分，需要改进`,
                impact: '让更多用户能够使用您的网站，符合无障碍标准',
                actions: this.getAccessibilityActions(results.accessibility)
            });
        }

        // Core Web Vitals建议
        if (results.performance.coreWebVitals) {
            const poorVitals = Object.entries(results.performance.coreWebVitals)
                .filter(([key, vital]) => vital.rating === 'poor');

            if (poorVitals.length > 0) {
                recommendations.push({
                    category: 'core-web-vitals',
                    priority: 'high',
                    title: '优化Core Web Vitals',
                    description: `${poorVitals.length}个核心网页指标需要改进`,
                    impact: '提升用户体验，改善搜索引擎排名',
                    actions: this.getCoreWebVitalsActions(poorVitals)
                });
            }
        }

        results.recommendations = recommendations;
    }

    // 辅助方法
    validateUrl(url) {
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`无效的URL格式: ${url}`);
        }
    }

    generateTestId() {
        return `perf_acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    categorizeImpact(savings) {
        if (savings > 1000) return 'high';
        if (savings > 500) return 'medium';
        return 'low';
    }

    getSeverityFromScore(score) {
        if (score === 0) return 'error';
        if (score < 0.5) return 'warning';
        return 'info';
    }

    getAccessibilityImpact(auditId) {
        const impactMap = {
            'color-contrast': 'serious',
            'image-alt': 'critical',
            'form-field-multiple-labels': 'moderate',
            'heading-order': 'moderate',
            'html-has-lang': 'serious'
        };
        return impactMap[auditId] || 'moderate';
    }

    getComplianceLevel(score) {
        if (score >= 95) return 'excellent';
        if (score >= 85) return 'good';
        if (score >= 70) return 'fair';
        return 'poor';
    }

    analyzePerformanceHeaders(headers) {
        return {
            cacheControl: headers['cache-control'] || '',
            contentEncoding: headers['content-encoding'] || '',
            contentType: headers['content-type'] || '',
            server: headers['server'] || '',
            hasGzip: (headers['content-encoding'] || '').includes('gzip'),
            hasBrotli: (headers['content-encoding'] || '').includes('br')
        };
    }

    generateBasicOpportunities(metrics, hints) {
        const opportunities = [];

        if (!hints.hasGzip && !hints.hasBrotli) {
            opportunities.push({
                title: '启用文本压缩',
                description: '启用gzip或brotli压缩可以减少传输大小',
                savings: metrics.responseSize * 0.7,
                impact: 'high'
            });
        }

        if (metrics.loadTime > 3000) {
            opportunities.push({
                title: '减少服务器响应时间',
                description: '优化服务器配置和数据库查询',
                savings: metrics.loadTime - 1000,
                impact: 'high'
            });
        }

        return opportunities;
    }

    generateBasicDiagnostics(metrics) {
        const diagnostics = [];

        if (metrics.responseSize > 1000000) {
            diagnostics.push({
                title: '页面大小过大',
                description: '页面大小超过1MB，可能影响加载速度',
                severity: 'warning'
            });
        }

        return diagnostics;
    }

    getPerformanceActions(performance) {
        const actions = ['优化图片大小和格式', '启用浏览器缓存', '压缩CSS和JavaScript'];

        if (performance.opportunities) {
            performance.opportunities.slice(0, 3).forEach(opp => {
                actions.push(opp.title);
            });
        }

        return actions;
    }

    getAccessibilityActions(accessibility) {
        const actions = [];

        if (accessibility.violations) {
            accessibility.violations.slice(0, 5).forEach(violation => {
                actions.push(violation.help || violation.title);
            });
        }

        if (actions.length === 0) {
            actions.push('为图片添加alt属性', '确保颜色对比度充足', '添加表单标签');
        }

        return actions;
    }

    getCoreWebVitalsActions(poorVitals) {
        const actions = [];

        poorVitals.forEach(([metric, vital]) => {
            switch (metric) {
                case 'lcp':
                    actions.push('优化最大内容绘制(LCP) - 优化图片和服务器响应时间');
                    break;
                case 'fid':
                    actions.push('改善首次输入延迟(FID) - 减少JavaScript执行时间');
                    break;
                case 'cls':
                    actions.push('减少累积布局偏移(CLS) - 为图片和广告设置尺寸');
                    break;
                case 'fcp':
                    actions.push('优化首次内容绘制(FCP) - 减少渲染阻塞资源');
                    break;
                case 'ttfb':
                    actions.push('优化首字节时间(TTFB) - 优化服务器配置和CDN');
                    break;
            }
        });

        return actions;
    }

    /**
     * 生成可视化数据
     */
    generateVisualizationData(results) {
        return {
            performanceChart: {
                type: 'radar',
                data: {
                    labels: ['性能', '可访问性', '最佳实践', 'SEO', 'PWA'],
                    datasets: [{
                        label: '当前评分',
                        data: [
                            results.performanceScore,
                            results.accessibilityScore,
                            results.performance.lighthouse?.bestPractices || 0,
                            results.performance.lighthouse?.seo || 0,
                            results.performance.lighthouse?.pwa || 0
                        ],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }]
                }
            },
            coreWebVitalsChart: {
                type: 'bar',
                data: {
                    labels: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
                    datasets: [{
                        label: '当前值',
                        data: results.performance.coreWebVitals ? [
                            results.performance.coreWebVitals.lcp?.value || 0,
                            results.performance.coreWebVitals.fid?.value || 0,
                            results.performance.coreWebVitals.cls?.value || 0,
                            results.performance.coreWebVitals.fcp?.value || 0,
                            results.performance.coreWebVitals.ttfb?.value || 0
                        ] : [0, 0, 0, 0, 0],
                        backgroundColor: results.performance.coreWebVitals ? [
                            this.getColorByRating(results.performance.coreWebVitals.lcp?.rating),
                            this.getColorByRating(results.performance.coreWebVitals.fid?.rating),
                            this.getColorByRating(results.performance.coreWebVitals.cls?.rating),
                            this.getColorByRating(results.performance.coreWebVitals.fcp?.rating),
                            this.getColorByRating(results.performance.coreWebVitals.ttfb?.rating)
                        ] : ['#ccc', '#ccc', '#ccc', '#ccc', '#ccc']
                    }]
                }
            },
            accessibilityBreakdown: {
                type: 'doughnut',
                data: {
                    labels: ['通过', '违规', '未测试'],
                    datasets: [{
                        data: [
                            results.accessibility.passes?.length || 0,
                            results.accessibility.violations?.length || 0,
                            Math.max(0, 20 - (results.accessibility.passes?.length || 0) - (results.accessibility.violations?.length || 0))
                        ],
                        backgroundColor: ['#4CAF50', '#F44336', '#FFC107']
                    }]
                }
            },
            performanceTimeline: {
                type: 'line',
                data: {
                    labels: ['开始', 'TTFB', 'FCP', 'LCP', '完成'],
                    datasets: [{
                        label: '加载时间线 (ms)',
                        data: results.performance.lighthouse?.metrics ? [
                            0,
                            results.performance.lighthouse.metrics.serverResponseTime || 0,
                            results.performance.lighthouse.metrics.firstContentfulPaint || 0,
                            results.performance.lighthouse.metrics.largestContentfulPaint || 0,
                            results.performance.lighthouse.metrics.timeToInteractive || 0
                        ] : [0, 0, 0, 0, 0],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        fill: true
                    }]
                }
            }
        };
    }

    /**
     * 根据评级获取颜色
     */
    getColorByRating(rating) {
        switch (rating) {
            case 'good': return '#4CAF50';
            case 'needs-improvement': return '#FF9800';
            case 'poor': return '#F44336';
            default: return '#9E9E9E';
        }
    }

    /**
     * 生成详细报告
     */
    generateDetailedReport(results) {
        const report = {
            summary: {
                url: results.url,
                testDate: results.startTime,
                duration: results.duration,
                overallScore: results.overallScore,
                performanceScore: results.performanceScore,
                accessibilityScore: results.accessibilityScore
            },
            performance: {
                score: results.performanceScore,
                metrics: results.performance.lighthouse?.metrics || {},
                coreWebVitals: results.performance.coreWebVitals || {},
                opportunities: results.performance.opportunities || [],
                diagnostics: results.performance.diagnostics || []
            },
            accessibility: {
                score: results.accessibilityScore,
                wcagCompliance: results.accessibility.wcagCompliance || {},
                violations: results.accessibility.violations || [],
                passes: results.accessibility.passes || [],
                summary: results.accessibility.summary || {}
            },
            recommendations: results.recommendations || [],
            visualizations: this.generateVisualizationData(results)
        };

        return report;
    }

    /**
     * 导出测试结果
     */
    async exportResults(results, format = 'json') {
        const report = this.generateDetailedReport(results);

        switch (format.toLowerCase()) {
            case 'json':
                return {
                    content: JSON.stringify(report, null, 2),
                    filename: `performance-accessibility-report-${Date.now()}.json`,
                    contentType: 'application/json'
                };

            case 'html':
                return {
                    content: this.generateHTMLReport(report),
                    filename: `performance-accessibility-report-${Date.now()}.html`,
                    contentType: 'text/html'
                };

            case 'csv':
                return {
                    content: this.generateCSVReport(report),
                    filename: `performance-accessibility-report-${Date.now()}.csv`,
                    contentType: 'text/csv'
                };

            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }
    }

    /**
     * 生成HTML报告
     */
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能和可访问性测试报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .score-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #007bff; }
        .score-value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .score-good { color: #28a745; border-left-color: #28a745; }
        .score-warning { color: #ffc107; border-left-color: #ffc107; }
        .score-danger { color: #dc3545; border-left-color: #dc3545; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .chart-container { position: relative; height: 400px; margin: 20px 0; }
        .recommendations { background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { background: white; border-radius: 4px; padding: 15px; margin: 10px 0; border-left: 4px solid #2196f3; }
        .violation { background: #ffebee; border-left-color: #f44336; }
        .opportunity { background: #e8f5e8; border-left-color: #4caf50; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .metric-value { font-weight: bold; }
        .metric-good { color: #28a745; }
        .metric-warning { color: #ffc107; }
        .metric-poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>性能和可访问性测试报告</h1>
            <p>测试网站: ${report.summary.url}</p>
            <p>测试时间: ${new Date(report.summary.testDate).toLocaleString('zh-CN')}</p>
            <p>测试耗时: ${(report.summary.duration / 1000).toFixed(2)}秒</p>
        </div>
        
        <div class="content">
            <div class="score-grid">
                <div class="score-card ${this.getScoreClass(report.summary.overallScore)}">
                    <h3>综合评分</h3>
                    <div class="score-value">${report.summary.overallScore}</div>
                    <p>总体表现</p>
                </div>
                <div class="score-card ${this.getScoreClass(report.summary.performanceScore)}">
                    <h3>性能评分</h3>
                    <div class="score-value">${report.summary.performanceScore}</div>
                    <p>页面性能</p>
                </div>
                <div class="score-card ${this.getScoreClass(report.summary.accessibilityScore)}">
                    <h3>可访问性评分</h3>
                    <div class="score-value">${report.summary.accessibilityScore}</div>
                    <p>无障碍访问</p>
                </div>
            </div>

            <div class="section">
                <h2>Core Web Vitals</h2>
                <div class="chart-container">
                    <canvas id="coreWebVitalsChart"></canvas>
                </div>
                <table>
                    <thead>
                        <tr><th>指标</th><th>当前值</th><th>评级</th><th>说明</th></tr>
                    </thead>
                    <tbody>
                        ${this.generateCoreWebVitalsTable(report.performance.coreWebVitals)}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>性能优化机会</h2>
                ${report.performance.opportunities.map(opp => `
                    <div class="recommendation opportunity">
                        <h4>${opp.title}</h4>
                        <p>${opp.description}</p>
                        <p><strong>预计节省:</strong> ${(opp.savings / 1000).toFixed(2)}秒</p>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>可访问性问题</h2>
                ${report.accessibility.violations.map(violation => `
                    <div class="recommendation violation">
                        <h4>${violation.title}</h4>
                        <p>${violation.description}</p>
                        <p><strong>影响级别:</strong> ${violation.impact}</p>
                        <p><strong>修复建议:</strong> ${violation.help}</p>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>改进建议</h2>
                <div class="recommendations">
                    ${report.recommendations.map(rec => `
                        <div class="recommendation">
                            <h4>${rec.title} (${rec.priority}优先级)</h4>
                            <p>${rec.description}</p>
                            <p><strong>预期影响:</strong> ${rec.impact}</p>
                            <ul>
                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>

    <script>
        // 渲染Core Web Vitals图表
        const ctx = document.getElementById('coreWebVitalsChart').getContext('2d');
        new Chart(ctx, ${JSON.stringify(report.visualizations.coreWebVitalsChart)});
    </script>
</body>
</html>`;
    }

    /**
     * 生成CSV报告
     */
    generateCSVReport(report) {
        const rows = [
            ['指标类型', '指标名称', '当前值', '评级', '说明'],
            ['综合', '综合评分', report.summary.overallScore, this.getScoreRating(report.summary.overallScore), '总体表现'],
            ['性能', '性能评分', report.summary.performanceScore, this.getScoreRating(report.summary.performanceScore), '页面性能'],
            ['可访问性', '可访问性评分', report.summary.accessibilityScore, this.getScoreRating(report.summary.accessibilityScore), '无障碍访问']
        ];

        // 添加Core Web Vitals数据
        if (report.performance.coreWebVitals) {
            Object.entries(report.performance.coreWebVitals).forEach(([key, vital]) => {
                rows.push(['Core Web Vitals', key.toUpperCase(), vital.value, vital.rating, this.getCoreWebVitalDescription(key)]);
            });
        }

        // 添加可访问性违规
        report.accessibility.violations.forEach(violation => {
            rows.push(['可访问性违规', violation.title, '', violation.impact, violation.description]);
        });

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    /**
     * 获取评分等级样式类
     */
    getScoreClass(score) {
        if (score >= 90) return 'score-good';
        if (score >= 70) return 'score-warning';
        return 'score-danger';
    }

    /**
     * 获取评分等级
     */
    getScoreRating(score) {
        if (score >= 90) return '优秀';
        if (score >= 70) return '良好';
        if (score >= 50) return '需要改进';
        return '较差';
    }

    /**
     * 生成Core Web Vitals表格
     */
    generateCoreWebVitalsTable(coreWebVitals) {
        if (!coreWebVitals) return '<tr><td colspan="4">暂无数据</td></tr>';

        return Object.entries(coreWebVitals).map(([key, vital]) => `
            <tr>
                <td>${key.toUpperCase()}</td>
                <td class="metric-value metric-${vital.rating}">${vital.value}${this.getCoreWebVitalUnit(key)}</td>
                <td class="metric-${vital.rating}">${this.getRatingText(vital.rating)}</td>
                <td>${this.getCoreWebVitalDescription(key)}</td>
            </tr>
        `).join('');
    }

    /**
     * 获取Core Web Vital单位
     */
    getCoreWebVitalUnit(metric) {
        switch (metric) {
            case 'lcp':
            case 'fcp':
            case 'fid':
            case 'ttfb':
                return 'ms';
            case 'cls':
                return '';
            default:
                return '';
        }
    }

    /**
     * 获取Core Web Vital描述
     */
    getCoreWebVitalDescription(metric) {
        const descriptions = {
            lcp: '最大内容绘制 - 页面主要内容加载完成的时间',
            fcp: '首次内容绘制 - 页面首次渲染内容的时间',
            fid: '首次输入延迟 - 用户首次交互到浏览器响应的时间',
            cls: '累积布局偏移 - 页面布局稳定性指标',
            ttfb: '首字节时间 - 服务器响应时间'
        };
        return descriptions[metric] || '';
    }

    /**
     * 获取评级文本
     */
    getRatingText(rating) {
        const ratingMap = {
            good: '良好',
            'needs-improvement': '需要改进',
            poor: '较差'
        };
        return ratingMap[rating] || '未知';
    }

    /**
     * 获取引擎状态
     */
    getEngineStatus() {
        return {
            name: this.name,
            version: this.version,
            status: 'active',
            capabilities: {
                lighthouse: this.lighthouseAvailable,
                axe: this.axeAvailable,
                performanceTesting: true,
                accessibilityTesting: true,
                coreWebVitals: true,
                wcagCompliance: true,
                visualizations: true,
                reportGeneration: true
            },
            supportedFormats: ['json', 'html', 'csv'],
            lastInitialized: new Date().toISOString()
        };
    }
}

module.exports = PerformanceAccessibilityEngine;