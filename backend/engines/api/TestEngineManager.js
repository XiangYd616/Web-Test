/**
 * 测试引擎管理器
 * 统一管理所有测试引擎的执行和状态
 */

const { ErrorFactory } = require('..\..\utils\ApiError.js');

class TestEngineManager {
    constructor() {
        this.engines = new Map();
        this.runningTests = new Map();
        this.initializeEngines();
    }

    /**
     * 初始化测试引擎
     */
    initializeEngines() {
        try {
            // 压力测试引擎
            const RealStressTestEngine = require('..\stress\stressTestEngine.js');
            this.engines.set('stress', new RealStressTestEngine());

            // SEO测试引擎
            const SEOTestEngine = require('..\seo\SEOTestEngine.js');
            this.engines.set('seo', new SEOTestEngine());

            // 安全测试引擎
            const SecurityTestEngine = require('./SecurityTestEngine');
            this.engines.set('security', new SecurityTestEngine());

            // 性能和可访问性测试引擎
            const PerformanceAccessibilityEngine = require('..\performance\PerformanceAccessibilityEngine.js');
            this.engines.set('performance', new PerformanceAccessibilityEngine());
            this.engines.set('accessibility', new PerformanceAccessibilityEngine());

            // 尝试加载其他可选引擎
            try {
                const { RealCompatibilityTestEngine } = require('..\compatibility\compatibilityTestEngine.js');
                this.engines.set('compatibility', new RealCompatibilityTestEngine());
            } catch (error) {
                console.warn('兼容性测试引擎不可用:', error.message);
            }

            try {
                const { RealAPITestEngine } = require('./apiTestEngine');
                this.engines.set('api', new RealAPITestEngine());
            } catch (error) {
                console.warn('API测试引擎不可用:', error.message);
            }

            try {
                const { RealUXTestEngine } = require('./uxTestEngine');
                this.engines.set('ux', new RealUXTestEngine());
            } catch (error) {
                console.warn('UX测试引擎不可用:', error.message);
            }

            console.log(`✅ 测试引擎管理器初始化完成，加载了 ${this.engines.size} 个引擎`);
        } catch (error) {
            console.error('❌ 测试引擎初始化失败:', error);
        }
    }

    /**
     * 获取支持的测试类型
     * @returns {Array} 测试类型列表
     */
    async getSupportedTestTypes() {
        const types = [];

        for (const [type, engine] of this.engines) {
            const isAvailable = await this.isEngineAvailable(type);
            types.push({
                type,
                name: this.getTestTypeName(type),
                description: this.getTestTypeDescription(type),
                available: isAvailable,
                features: this.getTestTypeFeatures(type)
            });
        }

        return types;
    }

    /**
     * 获取引擎状态
     * @returns {Object} 引擎状态信息
     */
    async getEngineStatus() {
        const status = {
            totalEngines: this.engines.size,
            availableEngines: 0,
            runningTests: this.runningTests.size,
            engines: {}
        };

        for (const [type, engine] of this.engines) {
            const isAvailable = await this.isEngineAvailable(type);
            if (isAvailable) {
                status.availableEngines++;
            }

            status.engines[type] = {
                available: isAvailable,
                version: engine.version || '1.0.0',
                description: this.getTestTypeDescription(type),
                runningTests: this.getRunningTestsForEngine(type)
            };
        }

        return status;
    }

    /**
     * 检查引擎是否可用
     * @param {string} testType - 测试类型
     * @returns {boolean} 是否可用
     */
    async isEngineAvailable(testType) {
        const engine = this.engines.get(testType);
        if (!engine) {
            return false;
        }

        try {
            // 如果引擎有健康检查方法，调用它
            if (typeof engine.healthCheck === 'function') {
                return await engine.healthCheck();
            }

            // 否则检查引擎是否存在必要的方法
            return typeof engine.runTest === 'function' ||
                typeof engine.executeTest === 'function' ||
                typeof engine.performTest === 'function';
        } catch (error) {
            console.error(`引擎 ${testType} 健康检查失败:`, error);
            return false;
        }
    }

    /**
     * 执行测试
     * @param {string} testType - 测试类型
     * @param {Object} config - 测试配置
     * @param {Object} options - 执行选项
     * @returns {Promise<Object>} 测试结果
     */
    async executeTest(testType, config, options = {}) {
        const engine = this.engines.get(testType);
        if (!engine) {
            throw ErrorFactory.test('engineUnavailable', `不支持的测试类型: ${testType}`);
        }

        const isAvailable = await this.isEngineAvailable(testType);
        if (!isAvailable) {
            throw ErrorFactory.test('engineUnavailable', `${testType}测试引擎不可用`);
        }

        const { testId, userId, onProgress, onComplete, onError } = options;

        try {
            // 记录运行中的测试
            if (testId) {
                this.runningTests.set(testId, {
                    testType,
                    userId,
                    startTime: new Date(),
                    config
                });
            }

            let result;

            // 根据引擎类型调用不同的方法
            if (testType === 'stress') {
                // 压力测试特殊处理
                result = await this.executeStressTest(engine, config, options);
            } else if (testType === 'seo') {
                // SEO测试
                result = await this.executeSEOTest(engine, config, options);
            } else if (testType === 'security') {
                // 安全测试
                result = await this.executeSecurityTest(engine, config, options);
            } else if (testType === 'performance') {
                // 性能测试
                result = await this.executePerformanceTest(engine, config, options);
            } else if (testType === 'accessibility') {
                // 可访问性测试
                result = await this.executeAccessibilityTest(engine, config, options);
            } else {
                // 通用测试执行
                result = await this.executeGenericTest(engine, config, options);
            }

            // 移除运行中的测试记录
            if (testId) {
                this.runningTests.delete(testId);
            }

            return result;

        } catch (error) {
            // 移除运行中的测试记录
            if (testId) {
                this.runningTests.delete(testId);
            }

            console.error(`执行 ${testType} 测试失败:`, error);
            throw ErrorFactory.test('execution', `${testType}测试执行失败: ${error.message}`);
        }
    }

    /**
     * 异步执行测试
     * @param {string} testType - 测试类型
     * @param {Object} config - 测试配置
     * @param {Object} options - 执行选项
     */
    async executeTestAsync(testType, config, options = {}) {
        const { onComplete, onError } = options;

        try {
            const result = await this.executeTest(testType, config, options);
            if (onComplete) {
                onComplete(result);
            }
        } catch (error) {
            if (onError) {
                onError(error);
            }
        }
    }

    /**
     * 取消测试
     * @param {string} testType - 测试类型
     * @param {string} testId - 测试ID
     */
    async cancelTest(testType, testId) {
        const engine = this.engines.get(testType);
        if (!engine) {
            return false;
        }

        try {
            // 如果引擎支持取消操作
            if (typeof engine.cancelTest === 'function') {
                await engine.cancelTest(testId);
            }

            // 移除运行中的测试记录
            this.runningTests.delete(testId);

            return true;
        } catch (error) {
            console.error(`取消 ${testType} 测试失败:`, error);
            return false;
        }
    }

    /**
     * 执行压力测试
     */
    async executeStressTest(engine, config, options) {
        const { testId, onProgress } = options;

        // 压力测试配置验证
        const requiredFields = ['url', 'users', 'duration'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw ErrorFactory.validation([{
                    field,
                    message: `${field}是必需的`
                }]);
            }
        }

        // 设置WebSocket实例（如果可用）
        if (global.io && typeof engine.setWebSocket === 'function') {
            engine.setWebSocket(global.io);
        }

        // 执行压力测试
        if (typeof engine.runStressTest === 'function') {
            return await engine.runStressTest(config, testId);
        } else if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else {
            throw ErrorFactory.test('execution', '压力测试引擎方法不可用');
        }
    }

    /**
     * 执行SEO测试
     */
    async executeSEOTest(engine, config, options) {
        const { onProgress } = options;

        if (!config.url) {
            throw ErrorFactory.validation([{
                field: 'url',
                message: 'URL是必需的'
            }]);
        }

        // 执行SEO测试
        if (typeof engine.runSEOTest === 'function') {
            return await engine.runSEOTest(config.url, config);
        } else if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else {
            throw ErrorFactory.test('execution', 'SEO测试引擎方法不可用');
        }
    }

    /**
     * 执行安全测试
     */
    async executeSecurityTest(engine, config, options) {
        if (!config.url) {
            throw ErrorFactory.validation([{
                field: 'url',
                message: 'URL是必需的'
            }]);
        }

        // 执行安全测试
        if (typeof engine.runSecurityTest === 'function') {
            return await engine.runSecurityTest(config.url, config);
        } else if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else {
            throw ErrorFactory.test('execution', '安全测试引擎方法不可用');
        }
    }

    /**
     * 执行性能测试
     */
    async executePerformanceTest(engine, config, options) {
        if (!config.url) {
            throw ErrorFactory.validation([{
                field: 'url',
                message: 'URL是必需的'
            }]);
        }

        // 执行性能测试
        if (typeof engine.runPerformanceAccessibilityTest === 'function') {
            return await engine.runPerformanceAccessibilityTest(config.url, config);
        } else if (typeof engine.runPerformanceTest === 'function') {
            return await engine.runPerformanceTest(config.url, config);
        } else if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else {
            throw ErrorFactory.test('execution', '性能测试引擎方法不可用');
        }
    }

    /**
     * 执行可访问性测试
     */
    async executeAccessibilityTest(engine, config, options) {
        if (!config.url) {
            throw ErrorFactory.validation([{
                field: 'url',
                message: 'URL是必需的'
            }]);
        }

        // 执行可访问性测试
        if (typeof engine.runPerformanceAccessibilityTest === 'function') {
            return await engine.runPerformanceAccessibilityTest(config.url, config);
        } else if (typeof engine.runAccessibilityTest === 'function') {
            return await engine.runAccessibilityTest(config.url, config);
        } else if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else {
            throw ErrorFactory.test('execution', '可访问性测试引擎方法不可用');
        }
    }

    /**
     * 执行通用测试
     */
    async executeGenericTest(engine, config, options) {
        if (typeof engine.performTest === 'function') {
            return await engine.performTest(config);
        } else if (typeof engine.runTest === 'function') {
            return await engine.runTest(config);
        } else if (typeof engine.executeTest === 'function') {
            return await engine.executeTest(config);
        } else {
            throw ErrorFactory.test('execution', '测试引擎方法不可用');
        }
    }

    /**
     * 生成测试摘要
     * @param {string} testType - 测试类型
     * @param {Object} results - 测试结果
     * @returns {Object} 测试摘要
     */
    async generateTestSummary(testType, results) {
        try {
            const engine = this.engines.get(testType);

            if (engine && typeof engine.generateSummary === 'function') {
                return await engine.generateSummary(results);
            }

            // 默认摘要生成
            return this.generateDefaultSummary(testType, results);
        } catch (error) {
            console.error('生成测试摘要失败:', error);
            return this.generateDefaultSummary(testType, results);
        }
    }

    /**
     * 生成默认摘要
     */
    generateDefaultSummary(testType, results) {
        return {
            testType,
            status: results.success ? 'success' : 'failed',
            score: results.score || results.overallScore || 0,
            issues: results.issues?.length || 0,
            recommendations: results.recommendations?.length || 0,
            executionTime: results.executionTime || results.duration || 0,
            summary: `${testType}测试${results.success ? '完成' : '失败'}`
        };
    }

    /**
     * 获取测试类型名称
     */
    getTestTypeName(type) {
        const names = {
            seo: 'SEO测试',
            performance: '性能测试',
            security: '安全测试',
            accessibility: '可访问性测试',
            compatibility: '兼容性测试',
            api: 'API测试',
            stress: '压力测试',
            ux: 'UX测试'
        };
        return names[type] || type;
    }

    /**
     * 获取测试类型描述
     */
    getTestTypeDescription(type) {
        const descriptions = {
            seo: '检查网站的搜索引擎优化状况',
            performance: '测试网站的加载速度和性能指标',
            security: '扫描网站的安全漏洞和风险',
            accessibility: '检查网站的可访问性合规性',
            compatibility: '测试网站在不同浏览器的兼容性',
            api: '测试API接口的功能和性能',
            stress: '测试网站在高负载下的表现',
            ux: '评估网站的用户体验质量'
        };
        return descriptions[type] || '未知测试类型';
    }

    /**
     * 获取测试类型特性
     */
    getTestTypeFeatures(type) {
        const features = {
            seo: ['标题优化', '元标签检查', '结构化数据', '页面速度', '移动友好性'],
            performance: ['加载时间', '首屏渲染', '资源优化', '缓存策略', '网络性能'],
            security: ['SQL注入', 'XSS攻击', 'CSRF保护', 'SSL证书', '敏感信息泄露'],
            accessibility: ['WCAG合规', '键盘导航', '屏幕阅读器', '颜色对比度', '语义化标签'],
            compatibility: ['浏览器兼容', 'CSS支持', 'JavaScript兼容', '响应式设计', '设备适配'],
            api: ['接口测试', '性能测试', '数据验证', '错误处理', '文档检查'],
            stress: ['并发测试', '负载测试', '峰值测试', '稳定性测试', '资源监控'],
            ux: ['用户流程', '界面设计', '交互体验', '可用性测试', '用户满意度']
        };
        return features[type] || [];
    }

    /**
     * 获取引擎的运行中测试数量
     */
    getRunningTestsForEngine(testType) {
        let count = 0;
        for (const [testId, testInfo] of this.runningTests) {
            if (testInfo.testType === testType) {
                count++;
            }
        }
        return count;
    }

    /**
     * 获取所有运行中的测试
     */
    getRunningTests() {
        return Array.from(this.runningTests.entries()).map(([testId, testInfo]) => ({
            testId,
            ...testInfo
        }));
    }

    /**
     * 清理过期的运行中测试记录
     */
    cleanupExpiredTests() {
        const now = new Date();
        const maxDuration = 30 * 60 * 1000; // 30分钟

        for (const [testId, testInfo] of this.runningTests) {
            if (now - testInfo.startTime > maxDuration) {
                console.warn(`清理过期的测试记录: ${testId}`);
                this.runningTests.delete(testId);
            }
        }
    }
}

module.exports = TestEngineManager;