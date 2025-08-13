/**
 * API响应格式示例路由
 * 展示如何使用统一的API响应格式
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { ErrorFactory } = require('../utils/ApiError');
const { ErrorCodes } = require('../types/ApiResponse');

const router = express.Router();

/**
 * 成功响应示例
 * GET /api/example/success
 */
router.get('/success', asyncHandler(async (req, res) => {
    const data = {
        message: '这是一个成功的响应示例',
        timestamp: new Date().toISOString(),
        features: ['统一响应格式', '错误处理', '分页支持']
    };

    // 使用新的响应格式化方法
    return res.success(data, '操作成功完成');
}));

/**
 * 分页响应示例
 * GET /api/example/paginated
 */
router.get('/paginated', asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // 模拟数据
    const allData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `项目 ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'inactive'
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = allData.slice(startIndex, endIndex);

    // 使用分页响应格式
    return res.paginated(
        paginatedData,
        parseInt(page),
        parseInt(limit),
        allData.length,
        '数据获取成功'
    );
}));

/**
 * 验证错误示例
 * POST /api/example/validation-error
 */
router.post('/validation-error', asyncHandler(async (req, res) => {
    const { email, password, age } = req.body;
    const errors = [];

    if (!email) {
        errors.push({ field: 'email', message: '邮箱是必填字段' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ field: 'email', message: '邮箱格式无效' });
    }

    if (!password) {
        errors.push({ field: 'password', message: '密码是必填字段' });
    } else if (password.length < 6) {
        errors.push({ field: 'password', message: '密码长度至少6位' });
    }

    if (age && (age < 18 || age > 120)) {
        errors.push({ field: 'age', message: '年龄必须在18-120之间' });
    }

    if (errors.length > 0) {
        // 使用验证错误响应格式
        return res.validationError(errors, '数据验证失败');
    }

    return res.success({ message: '验证通过' }, '数据验证成功');
}));

/**
 * 未授权错误示例
 * GET /api/example/unauthorized
 */
router.get('/unauthorized', asyncHandler(async (req, res) => {
    // 使用未授权响应格式
    return res.unauthorized('此操作需要登录');
}));

/**
 * 资源不存在错误示例
 * GET /api/example/not-found/:id
 */
router.get('/not-found/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 模拟查找资源
    if (id !== '1') {
        return res.notFound('用户', `ID为${id}的用户不存在`);
    }

    return res.success({ id, name: '用户1' }, '用户找到了');
}));

/**
 * 服务器错误示例
 * GET /api/example/server-error
 */
router.get('/server-error', asyncHandler(async (req, res) => {
    // 模拟服务器错误
    throw new Error('这是一个模拟的服务器错误');
}));

/**
 * 自定义错误示例
 * GET /api/example/custom-error
 */
router.get('/custom-error', asyncHandler(async (req, res) => {
    // 使用ErrorFactory创建自定义错误
    throw ErrorFactory.test('configuration', '测试配置无效', {
        configField: 'timeout',
        providedValue: -1,
        expectedRange: '1-3600'
    });
}));

/**
 * 数据库错误示例
 * GET /api/example/database-error
 */
router.get('/database-error', asyncHandler(async (req, res) => {
    // 模拟数据库连接错误
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    throw error;
}));

/**
 * 文件错误示例
 * GET /api/example/file-error
 */
router.get('/file-error', asyncHandler(async (req, res) => {
    // 使用文件错误工厂
    throw ErrorFactory.file('tooLarge', '上传的文件过大', {
        maxSize: '10MB',
        actualSize: '15MB',
        filename: 'document.pdf'
    });
}));

/**
 * 带认证的成功响应示例
 * GET /api/example/authenticated
 */
router.get('/authenticated', authMiddleware, asyncHandler(async (req, res) => {
    return res.success({
        user: req.user,
        message: '这是需要认证的接口'
    }, '认证成功');
}));

/**
 * 可选认证的响应示例
 * GET /api/example/optional-auth
 */
router.get('/optional-auth', optionalAuth, asyncHandler(async (req, res) => {
    const data = {
        message: '这是可选认证的接口',
        isAuthenticated: !!req.user,
        user: req.user || null
    };

    return res.success(data, '请求处理成功');
}));

/**
 * 冲突错误示例
 * POST /api/example/conflict
 */
router.post('/conflict', asyncHandler(async (req, res) => {
    const { username } = req.body;

    // 模拟用户名已存在
    if (username === 'admin') {
        return res.conflict('用户名', '用户名已被占用');
    }

    return res.success({ username }, '用户名可用');
}));

/**
 * 服务不可用示例
 * GET /api/example/service-unavailable
 */
router.get('/service-unavailable', asyncHandler(async (req, res) => {
    return res.serviceUnavailable('邮件服务', '邮件服务正在维护中');
}));

/**
 * 复杂响应示例 - 包含多种元数据
 * GET /api/example/complex
 */
router.get('/complex', asyncHandler(async (req, res) => {
    const data = {
        items: [
            { id: 1, name: '项目A', status: 'active' },
            { id: 2, name: '项目B', status: 'inactive' }
        ],
        summary: {
            total: 2,
            active: 1,
            inactive: 1
        }
    };

    // 使用额外的元数据
    return res.success(data, '复杂数据获取成功', 200, {
        cached: false,
        source: 'database',
        queryTime: '45ms',
        version: '2.0'
    });
}));

/**
 * API信息端点
 * GET /api/example
 */
router.get('/', asyncHandler(async (req, res) => {
    const endpoints = {
        success: 'GET /api/example/success - 成功响应示例',
        paginated: 'GET /api/example/paginated - 分页响应示例',
        validationError: 'POST /api/example/validation-error - 验证错误示例',
        unauthorized: 'GET /api/example/unauthorized - 未授权错误示例',
        notFound: 'GET /api/example/not-found/:id - 资源不存在错误示例',
        serverError: 'GET /api/example/server-error - 服务器错误示例',
        customError: 'GET /api/example/custom-error - 自定义错误示例',
        databaseError: 'GET /api/example/database-error - 数据库错误示例',
        fileError: 'GET /api/example/file-error - 文件错误示例',
        authenticated: 'GET /api/example/authenticated - 需要认证的示例',
        optionalAuth: 'GET /api/example/optional-auth - 可选认证示例',
        conflict: 'POST /api/example/conflict - 冲突错误示例',
        serviceUnavailable: 'GET /api/example/service-unavailable - 服务不可用示例',
        complex: 'GET /api/example/complex - 复杂响应示例'
    };

    return res.success({
        title: 'API响应格式示例',
        description: '展示统一API响应格式的各种用法',
        endpoints
    }, 'API示例信息');
}));

module.exports = router;