/**
 * 性能和可访问性测试路由
 * 
 * 提供性能和可访问性测试的API接口
 * 支持Lighthouse集成、WCAG标准检查、可视化数据生成
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

const express = require('express');
const router = express.Router();
const PerformanceAccessibilityEngine = require('..\engines\performance\PerformanceAccessibilityEngine.js');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

// 初始化引擎
const performanceEngine = new PerformanceAccessibilityEngine();
performanceEngine.initialize();

/**
 * @swagger
 * /api/test/performance-accessibility:
 *   post:
 *     summary: 执行性能和可访问性测试
 *     tags: [Performance & Accessibility Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: 要测试的网站URL
 *                 example: "https://example.com"
 *               device:
 *                 type: string
 *                 enum: [desktop, mobile]
 *                 default: desktop
 *                 description: 测试设备类型
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [performance, accessibility, best-practices, seo]
 *                 default: [performance, accessibility]
 *                 description: 要测试的类别
 *               wcagLevel:
 *                 type: string
 *                 enum: [A, AA, AAA]
 *                 default: AA
 *                 description: WCAG合规级别
 *               wcagTags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: [wcag2a, wcag2aa, wcag21aa]
 *                 description: WCAG标签过滤
 *     responses:
 *       200:
 *         description: 测试成功完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     testId:
 *                       type: string
 *                       description: 测试ID
 *                     url:
 *                       type: string
 *                       description: 测试URL
 *                     overallScore:
 *                       type: number
 *                       description: 综合评分
 *                     performanceScore:
 *                       type: number
 *                       description: 性能评分
 *                     accessibilityScore:
 *                       type: number
 *                       description: 可访问性评分
 *                     performance:
 *                       type: object
 *                       description: 性能测试结果
 *                     accessibility:
 *                       type: object
 *                       description: 可访问性测试结果
 *                     recommendations:
 *                       type: array
 *                       description: 改进建议
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/', [
    authMiddleware,
    body('url')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('请提供有效的URL'),
    body('device')
        .optional()
        .isIn(['desktop', 'mobile'])
        .withMessage('设备类型必须是desktop或mobile'),
    body('categories')
        .optional()
        .isArray()
        .withMessage('categories必须是数组'),
    body('wcagLevel')
        .optional()
        .isIn(['A', 'AA', 'AAA'])
        .withMessage('WCAG级别必须是A、AA或AAA'),
    body('wcagTags')
        .optional()
        .isArray()
        .withMessage('wcagTags必须是数组')
], async (req, res) => {
    try {
        // 验证请求参数
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请求参数验证失败',
                    details: errors.array()
                }
            });
        }

        const { url, device, categories, wcagLevel, wcagTags } = req.body;
        const userId = req.user.id;

        console.log(`🚀 用户 ${userId} 开始性能和可访问性测试: ${url}`);

        // 执行测试
        const result = await performanceEngine.runPerformanceAccessibilityTest(url, {
            device,
            categories,
            wcagLevel,
            wcagTags,
            userId
        });

        if (result.success) {
            // 保存测试结果到数据库（如果需要）
            // await saveTestResult(userId, 'performance-accessibility', result.data);

            res.json({
                success: true,
                message: '性能和可访问性测试完成',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: {
                    code: 'TEST_FAILED',
                    message: '测试执行失败',
                    details: result.error
                },
                data: result.data
            });
        }

    } catch (error) {
        console.error('性能和可访问性测试路由错误:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '服务器内部错误',
                details: error.message
            }
        });
    }
});

/**
 * @swagger
 * /api/test/performance-accessibility/export:
 *   post:
 *     summary: 导出性能和可访问性测试报告
 *     tags: [Performance & Accessibility Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testResults
 *               - format
 *             properties:
 *               testResults:
 *                 type: object
 *                 description: 测试结果数据
 *               format:
 *                 type: string
 *                 enum: [json, html, csv]
 *                 description: 导出格式
 *     responses:
 *       200:
 *         description: 报告导出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: 报告内容
 *                     filename:
 *                       type: string
 *                       description: 文件名
 *                     contentType:
 *                       type: string
 *                       description: 内容类型
 */
router.post('/export', [
    authMiddleware,
    body('testResults')
        .notEmpty()
        .withMessage('测试结果不能为空'),
    body('format')
        .isIn(['json', 'html', 'csv'])
        .withMessage('导出格式必须是json、html或csv')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请求参数验证失败',
                    details: errors.array()
                }
            });
        }

        const { testResults, format } = req.body;

        // 导出报告
        const exportResult = await performanceEngine.exportResults(testResults, format);

        res.json({
            success: true,
            message: '报告导出成功',
            data: exportResult
        });

    } catch (error) {
        console.error('报告导出错误:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'EXPORT_ERROR',
                message: '报告导出失败',
                details: error.message
            }
        });
    }
});

/**
 * @swagger
 * /api/test/performance-accessibility/status:
 *   get:
 *     summary: 获取性能和可访问性测试引擎状态
 *     tags: [Performance & Accessibility Testing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 引擎状态获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: 引擎名称
 *                     version:
 *                       type: string
 *                       description: 引擎版本
 *                     status:
 *                       type: string
 *                       description: 引擎状态
 *                     capabilities:
 *                       type: object
 *                       description: 引擎能力
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const status = performanceEngine.getEngineStatus();

        res.json({
            success: true,
            message: '引擎状态获取成功',
            data: status
        });

    } catch (error) {
        console.error('获取引擎状态错误:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'STATUS_ERROR',
                message: '获取引擎状态失败',
                details: error.message
            }
        });
    }
});

/**
 * @swagger
 * /api/test/performance-accessibility/visualizations:
 *   post:
 *     summary: 生成测试结果可视化数据
 *     tags: [Performance & Accessibility Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testResults
 *             properties:
 *               testResults:
 *                 type: object
 *                 description: 测试结果数据
 *     responses:
 *       200:
 *         description: 可视化数据生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     performanceChart:
 *                       type: object
 *                       description: 性能雷达图数据
 *                     coreWebVitalsChart:
 *                       type: object
 *                       description: Core Web Vitals柱状图数据
 *                     accessibilityBreakdown:
 *                       type: object
 *                       description: 可访问性饼图数据
 *                     performanceTimeline:
 *                       type: object
 *                       description: 性能时间线图数据
 */
router.post('/visualizations', [
    authMiddleware,
    body('testResults')
        .notEmpty()
        .withMessage('测试结果不能为空')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请求参数验证失败',
                    details: errors.array()
                }
            });
        }

        const { testResults } = req.body;

        // 生成可视化数据
        const visualizations = performanceEngine.generateVisualizationData(testResults);

        res.json({
            success: true,
            message: '可视化数据生成成功',
            data: visualizations
        });

    } catch (error) {
        console.error('生成可视化数据错误:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'VISUALIZATION_ERROR',
                message: '可视化数据生成失败',
                details: error.message
            }
        });
    }
});

module.exports = router;