/**
 * 测试引擎API文档定义
 * OpenAPI 3.0规范
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TestRequest:
 *       type: object
 *       required:
 *         - url
 *         - testType
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: 要测试的URL
 *           example: "https://example.com"
 *         testType:
 *           type: string
 *           enum: [seo, performance, security, api, compatibility, accessibility, loadtest]
 *           description: 测试类型
 *           example: "seo"
 *         testName:
 *           type: string
 *           description: 测试名称
 *           example: "首页SEO测试"
 *         config:
 *           type: object
 *           description: 测试配置参数
 *           properties:
 *             timeout:
 *               type: integer
 *               description: 超时时间(毫秒)
 *               default: 30000
 *             forceRefresh:
 *               type: boolean
 *               description: 强制刷新，不使用缓存
 *               default: false
 *             device:
 *               type: string
 *               enum: [desktop, mobile, tablet]
 *               description: 设备类型
 *               default: "desktop"
 *             
 *     TestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 请求是否成功
 *         testId:
 *           type: string
 *           description: 测试ID
 *           example: "test_123456789"
 *         message:
 *           type: string
 *           description: 响应消息
 *         results:
 *           type: object
 *           description: 测试结果摘要
 *           
 *     TestProgress:
 *       type: object
 *       properties:
 *         testId:
 *           type: string
 *           description: 测试ID
 *         percentage:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: 完成百分比
 *         stage:
 *           type: string
 *           enum: [initializing, loading, analyzing, saving, completed, failed]
 *           description: 当前阶段
 *         message:
 *           type: string
 *           description: 进度消息
 *         metrics:
 *           type: object
 *           description: 实时指标数据
 *           
 *     TestStatus:
 *       type: object
 *       properties:
 *         testId:
 *           type: string
 *           description: 测试ID
 *         status:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *           description: 测试状态
 *         startedAt:
 *           type: string
 *           format: date-time
 *           description: 开始时间
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: 完成时间
 *         overallScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: 总体评分
 *         grade:
 *           type: string
 *           enum: [A, B, C, D, F]
 *           description: 评级
 *           
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: 错误代码
 *               example: "VALIDATION_ERROR"
 *             message:
 *               type: string
 *               description: 错误消息
 *               example: "URL格式无效"
 *             details:
 *               type: object
 *               description: 错误详情
 *             retryable:
 *               type: boolean
 *               description: 是否可重试
 *             suggestions:
 *               type: array
 *               items:
 *                 type: string
 *               description: 修复建议
 *               
 *     SEOResults:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: 测试URL
 *         timestamp:
 *           type: string
 *           format: date-time
 *         overallScore:
 *           type: number
 *           description: 总体SEO评分
 *         grade:
 *           type: string
 *           enum: [A, B, C, D, F]
 *         scores:
 *           type: object
 *           properties:
 *             meta:
 *               type: number
 *               description: Meta标签评分
 *             content:
 *               type: number
 *               description: 内容评分
 *             performance:
 *               type: number
 *               description: 性能评分
 *             structuredData:
 *               type: number
 *               description: 结构化数据评分
 *             links:
 *               type: number
 *               description: 链接评分
 *             mobile:
 *               type: number
 *               description: 移动端优化评分
 *         recommendations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               impact:
 *                 type: string
 *                 
 *     PerformanceResults:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         overallScore:
 *           type: number
 *         coreWebVitals:
 *           type: object
 *           properties:
 *             lcp:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 rating:
 *                   type: string
 *                   enum: [good, needs-improvement, poor]
 *             fid:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 rating:
 *                   type: string
 *             cls:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 rating:
 *                   type: string
 *                   
 *     SecurityResults:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         overallScore:
 *           type: number
 *         vulnerabilities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               description:
 *                 type: string
 *               recommendation:
 *                 type: string
 *                 
 *     LoadTestResults:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         overallScore:
 *           type: number
 *         metrics:
 *           type: object
 *           properties:
 *             totalRequests:
 *               type: integer
 *             successfulRequests:
 *               type: integer
 *             failedRequests:
 *               type: integer
 *             averageResponseTime:
 *               type: number
 *             maxResponseTime:
 *               type: number
 *             requestsPerSecond:
 *               type: number
 *             concurrentUsers:
 *               type: integer
 *               
 *   responses:
 *     ValidationError:
 *       description: 请求参数验证失败
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "VALIDATION_ERROR"
 *               message: "URL格式无效"
 *               details:
 *                 field: "url"
 *                 value: "invalid-url"
 *               retryable: false
 *               suggestions:
 *                 - "请提供有效的HTTP或HTTPS URL"
 *                 - "确保URL包含协议前缀"
 *                 
 *     TestNotFound:
 *       description: 测试不存在
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "TEST_NOT_FOUND"
 *               message: "指定的测试不存在"
 *               retryable: false
 *               
 *     ServerError:
 *       description: 服务器内部错误
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "INTERNAL_ERROR"
 *               message: "服务器内部错误"
 *               retryable: true
 *               suggestions:
 *                 - "请稍后重试"
 *                 - "如果问题持续存在，请联系技术支持"
 */

module.exports = {};
