/**
 * 测试验证服务
 * 验证和标准化测试配置
 */

const { ErrorFactory } = require('../utils/ApiError');

class TestValidationService {
    constructor() {
        this.validators = new Map();
        this.initializeValidators();
    }

    /**
     * 初始化验证器
     */
    initializeValidators() {
        this.validators.set('seo', this.validateSEOConfig.bind(this));
        this.validators.set('performance', this.validatePerformanceConfig.bind(this));
        this.validators.set('security', this.validateSecurityConfig.bind(this));
        this.validators.set('accessibility', this.validateAccessibilityConfig.bind(this));
        this.validators.set('compatibility', this.validateCompatibilityConfig.bind(this));
        this.validators.set('api', this.validateAPIConfig.bind(this));
        this.validators.set('stress', this.validateStressConfig.bind(this));
        this.validators.set('ux', this.validateUXConfig.bind(this));
    }

    /**
     * 验证测试配置
     * @param {string} testType - 测试类型
     * @param {Object} config - 测试配置
     * @returns {Object} 验证结果
     */
    async validateTestConfig(testType, config) {
        if (!config || typeof config !== 'object') {
            return {
                isValid: false,
                errors: [{
                    field: 'config',
                    message: '测试配置是必需的'
                }]
            };
        }

        const validator = this.validators.get(testType);
        if (!validator) {
            return {
                isValid: false,
                errors: [{
                    field: 'testType',
                    message: `不支持的测试类型: ${testType}`
                }]
            };
        }

        try {
            return await validator(config);
        } catch (error) {
            console.error(`验证 ${testType} 配置失败:`, error);
            return {
                isValid: false,
                errors: [{
                    field: 'config',
                    message: `配置验证失败: ${error.message}`
                }]
            };
        }
    }

    /**
     * 验证SEO测试配置
     */
    async validateSEOConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证检查项目
        if (config.checks && !Array.isArray(config.checks)) {
            errors.push({ field: 'checks', message: '检查项目必须是数组' });
        } else {
            normalizedConfig.checks = config.checks || [
                'title', 'meta', 'headings', 'images', 'links', 'structured_data'
            ];
        }

        // 验证深度
        if (config.depth !== undefined) {
            const depth = parseInt(config.depth);
            if (isNaN(depth) || depth < 1 || depth > 5) {
                errors.push({ field: 'depth', message: '检查深度必须在1-5之间' });
            } else {
                normalizedConfig.depth = depth;
            }
        } else {
            normalizedConfig.depth = 1;
        }

        // 验证移动端检查
        normalizedConfig.mobile = config.mobile !== false;

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证性能测试配置
     */
    async validatePerformanceConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证设备类型
        const validDevices = ['desktop', 'mobile'];
        if (config.device && !validDevices.includes(config.device)) {
            errors.push({ field: 'device', message: `设备类型必须是: ${validDevices.join(', ')}` });
        } else {
            normalizedConfig.device = config.device || 'desktop';
        }

        // 验证网络条件
        const validNetworks = ['fast3g', 'slow3g', '4g', 'wifi'];
        if (config.network && !validNetworks.includes(config.network)) {
            errors.push({ field: 'network', message: `网络条件必须是: ${validNetworks.join(', ')}` });
        } else {
            normalizedConfig.network = config.network || '4g';
        }

        // 验证测试次数
        if (config.runs !== undefined) {
            const runs = parseInt(config.runs);
            if (isNaN(runs) || runs < 1 || runs > 5) {
                errors.push({ field: 'runs', message: '测试次数必须在1-5之间' });
            } else {
                normalizedConfig.runs = runs;
            }
        } else {
            normalizedConfig.runs = 1;
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证安全测试配置
     */
    async validateSecurityConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证扫描类型
        const validScans = ['xss', 'sql_injection', 'csrf', 'ssl', 'headers', 'cookies'];
        if (config.scans && !Array.isArray(config.scans)) {
            errors.push({ field: 'scans', message: '扫描类型必须是数组' });
        } else if (config.scans) {
            const invalidScans = config.scans.filter(scan => !validScans.includes(scan));
            if (invalidScans.length > 0) {
                errors.push({ field: 'scans', message: `无效的扫描类型: ${invalidScans.join(', ')}` });
            }
        }

        normalizedConfig.scans = config.scans || validScans;

        // 验证扫描深度
        if (config.depth !== undefined) {
            const depth = parseInt(config.depth);
            if (isNaN(depth) || depth < 1 || depth > 3) {
                errors.push({ field: 'depth', message: '扫描深度必须在1-3之间' });
            } else {
                normalizedConfig.depth = depth;
            }
        } else {
            normalizedConfig.depth = 1;
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证可访问性测试配置
     */
    async validateAccessibilityConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证WCAG级别
        const validLevels = ['A', 'AA', 'AAA'];
        if (config.wcagLevel && !validLevels.includes(config.wcagLevel)) {
            errors.push({ field: 'wcagLevel', message: `WCAG级别必须是: ${validLevels.join(', ')}` });
        } else {
            normalizedConfig.wcagLevel = config.wcagLevel || 'AA';
        }

        // 验证检查规则
        if (config.rules && !Array.isArray(config.rules)) {
            errors.push({ field: 'rules', message: '检查规则必须是数组' });
        } else {
            normalizedConfig.rules = config.rules || ['all'];
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证兼容性测试配置
     */
    async validateCompatibilityConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证浏览器列表
        const validBrowsers = ['chrome', 'firefox', 'safari', 'edge', 'ie'];
        if (config.browsers && !Array.isArray(config.browsers)) {
            errors.push({ field: 'browsers', message: '浏览器列表必须是数组' });
        } else if (config.browsers) {
            const invalidBrowsers = config.browsers.filter(browser => !validBrowsers.includes(browser));
            if (invalidBrowsers.length > 0) {
                errors.push({ field: 'browsers', message: `无效的浏览器: ${invalidBrowsers.join(', ')}` });
            }
        }

        normalizedConfig.browsers = config.browsers || ['chrome', 'firefox', 'safari'];

        // 验证特性列表
        if (config.features && !Array.isArray(config.features)) {
            errors.push({ field: 'features', message: '特性列表必须是数组' });
        } else {
            normalizedConfig.features = config.features || [
                'flexbox', 'grid', 'css-variables', 'webp', 'service-worker'
            ];
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证API测试配置
     */
    async validateAPIConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'API URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'API URL格式无效' });
        }

        // 验证HTTP方法
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        if (config.method && !validMethods.includes(config.method.toUpperCase())) {
            errors.push({ field: 'method', message: `HTTP方法必须是: ${validMethods.join(', ')}` });
        } else {
            normalizedConfig.method = (config.method || 'GET').toUpperCase();
        }

        // 验证请求头
        if (config.headers && typeof config.headers !== 'object') {
            errors.push({ field: 'headers', message: '请求头必须是对象' });
        } else {
            normalizedConfig.headers = config.headers || {};
        }

        // 验证请求体
        if (config.body && ['GET', 'HEAD'].includes(normalizedConfig.method)) {
            errors.push({ field: 'body', message: `${normalizedConfig.method}请求不能包含请求体` });
        }

        // 验证超时时间
        if (config.timeout !== undefined) {
            const timeout = parseInt(config.timeout);
            if (isNaN(timeout) || timeout < 1000 || timeout > 60000) {
                errors.push({ field: 'timeout', message: '超时时间必须在1000-60000毫秒之间' });
            } else {
                normalizedConfig.timeout = timeout;
            }
        } else {
            normalizedConfig.timeout = 10000;
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证压力测试配置
     */
    async validateStressConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证用户数
        if (!config.users) {
            errors.push({ field: 'users', message: '用户数是必需的' });
        } else {
            const users = parseInt(config.users);
            if (isNaN(users) || users < 1 || users > 1000) {
                errors.push({ field: 'users', message: '用户数必须在1-1000之间' });
            } else {
                normalizedConfig.users = users;
            }
        }

        // 验证测试时长
        if (!config.duration) {
            errors.push({ field: 'duration', message: '测试时长是必需的' });
        } else {
            const duration = parseInt(config.duration);
            if (isNaN(duration) || duration < 1 || duration > 3600) {
                errors.push({ field: 'duration', message: '测试时长必须在1-3600秒之间' });
            } else {
                normalizedConfig.duration = duration;
            }
        }

        // 验证加压时间
        if (config.rampUpTime !== undefined) {
            const rampUpTime = parseInt(config.rampUpTime);
            if (isNaN(rampUpTime) || rampUpTime < 0 || rampUpTime >= normalizedConfig.duration) {
                errors.push({ field: 'rampUpTime', message: '加压时间必须小于测试时长' });
            } else {
                normalizedConfig.rampUpTime = rampUpTime;
            }
        } else {
            normalizedConfig.rampUpTime = 0;
        }

        // 验证测试类型
        const validTestTypes = ['load', 'stress', 'spike', 'volume'];
        if (config.testType && !validTestTypes.includes(config.testType)) {
            errors.push({ field: 'testType', message: `测试类型必须是: ${validTestTypes.join(', ')}` });
        } else {
            normalizedConfig.testType = config.testType || 'load';
        }

        // 验证HTTP方法
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (config.method && !validMethods.includes(config.method.toUpperCase())) {
            errors.push({ field: 'method', message: `HTTP方法必须是: ${validMethods.join(', ')}` });
        } else {
            normalizedConfig.method = (config.method || 'GET').toUpperCase();
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证UX测试配置
     */
    async validateUXConfig(config) {
        const errors = [];
        const normalizedConfig = { ...config };

        // 验证URL
        if (!config.url) {
            errors.push({ field: 'url', message: 'URL是必需的' });
        } else if (!this.isValidURL(config.url)) {
            errors.push({ field: 'url', message: 'URL格式无效' });
        }

        // 验证测试场景
        const validScenarios = ['navigation', 'form_filling', 'search', 'checkout', 'custom'];
        if (config.scenarios && !Array.isArray(config.scenarios)) {
            errors.push({ field: 'scenarios', message: '测试场景必须是数组' });
        } else if (config.scenarios) {
            const invalidScenarios = config.scenarios.filter(scenario => !validScenarios.includes(scenario));
            if (invalidScenarios.length > 0) {
                errors.push({ field: 'scenarios', message: `无效的测试场景: ${invalidScenarios.join(', ')}` });
            }
        }

        normalizedConfig.scenarios = config.scenarios || ['navigation'];

        // 验证设备类型
        const validDevices = ['desktop', 'mobile', 'tablet'];
        if (config.device && !validDevices.includes(config.device)) {
            errors.push({ field: 'device', message: `设备类型必须是: ${validDevices.join(', ')}` });
        } else {
            normalizedConfig.device = config.device || 'desktop';
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedConfig
        };
    }

    /**
     * 验证URL格式
     * @param {string} url - URL字符串
     * @returns {boolean} 是否有效
     */
    isValidURL(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch (error) {
            return false;
        }
    }

    /**
     * 验证邮箱格式
     * @param {string} email - 邮箱字符串
     * @returns {boolean} 是否有效
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * 验证端口号
     * @param {number} port - 端口号
     * @returns {boolean} 是否有效
     */
    isValidPort(port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    }

    /**
     * 清理和标准化配置
     * @param {Object} config - 原始配置
     * @returns {Object} 清理后的配置
     */
    sanitizeConfig(config) {
        const sanitized = {};

        for (const [key, value] of Object.entries(config)) {
            if (value !== null && value !== undefined) {
                if (typeof value === 'string') {
                    sanitized[key] = value.trim();
                } else if (Array.isArray(value)) {
                    sanitized[key] = value.filter(item => item !== null && item !== undefined);
                } else {
                    sanitized[key] = value;
                }
            }
        }

        return sanitized;
    }
}

module.exports = TestValidationService;