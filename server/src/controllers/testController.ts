import { Request, Response } from 'express';
import { TestResultModel } from '../models/TestResult';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger } from '../utils/logger';

export class TestController {
  /**
   * 获取测试结果列表（支持筛选、分页、搜索）
   */
  static async getTestResults(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        page = 1,
        limit = 10,
        testType = '',
        status = '',
        timeRange = '',
        search = ''
      } = req.query;

      // 构建查询条件
      const conditions: any = { user_id: userId };
      
      if (testType) {
        conditions.test_type = testType;
      }
      
      if (status) {
        conditions.status = status;
      }
      
      if (search) {
        conditions.url = { $ilike: `%${search}%` };
      }
      
      if (timeRange) {
        const days = parseInt(timeRange as string);
        if (days > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          conditions.created_at = { $gte: startDate };
        }
      }

      // 分页参数
      const pageNum = Math.max(1, parseInt(page as string));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * pageSize;

      // 获取测试结果
      const { tests, total } = await TestResultModel.findWithPagination(
        conditions,
        pageSize,
        offset,
        [['created_at', 'DESC']]
      );

      // 计算统计信息
      const stats = await TestResultModel.getStatsByUser(userId, conditions);

      // 分页信息
      const totalPages = Math.ceil(total / pageSize);
      const pagination = {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        pageSize,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      };

      res.json({
        success: true,
        data: {
          tests,
          pagination,
          stats
        }
      });

      // 记录活动日志
      await ActivityLogModel.create({
        user_id: userId,
        action: 'view_test_history',
        resource: 'test_results',
        details: { filters: { testType, status, timeRange, search } },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });

    } catch (error) {
      logger.error('获取测试结果失败', error);
      res.status(500).json({
        success: false,
        message: '获取测试结果失败'
      });
    }
  }

  /**
   * 获取特定测试结果详情
   */
  static async getTestResult(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const testId = req.params.id;

      const test = await TestResultModel.findByIdAndUser(testId, userId);
      
      if (!test) {
        res.status(404).json({
          success: false,
          message: '测试结果不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: test
      });

      // 记录活动日志
      await ActivityLogModel.create({
        user_id: userId,
        action: 'view_test_detail',
        resource: 'test_result',
        resource_id: testId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });

    } catch (error) {
      logger.error('获取测试结果详情失败', error);
      res.status(500).json({
        success: false,
        message: '获取测试结果详情失败'
      });
    }
  }

  /**
   * 更新测试结果
   */
  static async updateTestResult(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const testId = req.params.id;
      const updateData = req.body;

      const test = await TestResultModel.findByIdAndUser(testId, userId);
      
      if (!test) {
        res.status(404).json({
          success: false,
          message: '测试结果不存在'
        });
        return;
      }

      const updatedTest = await TestResultModel.update(testId, updateData);

      res.json({
        success: true,
        data: updatedTest,
        message: '测试结果更新成功'
      });

      // 记录活动日志
      await ActivityLogModel.create({
        user_id: userId,
        action: 'update_test_result',
        resource: 'test_result',
        resource_id: testId,
        details: updateData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });

    } catch (error) {
      logger.error('更新测试结果失败', error);
      res.status(500).json({
        success: false,
        message: '更新测试结果失败'
      });
    }
  }

  /**
   * 删除测试结果
   */
  static async deleteTestResult(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const testId = req.params.id;

      const test = await TestResultModel.findByIdAndUser(testId, userId);
      
      if (!test) {
        res.status(404).json({
          success: false,
          message: '测试结果不存在'
        });
        return;
      }

      await TestResultModel.delete(testId);

      res.json({
        success: true,
        message: '测试结果删除成功'
      });

      // 记录活动日志
      await ActivityLogModel.create({
        user_id: userId,
        action: 'delete_test_result',
        resource: 'test_result',
        resource_id: testId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });

    } catch (error) {
      logger.error('删除测试结果失败', error);
      res.status(500).json({
        success: false,
        message: '删除测试结果失败'
      });
    }
  }

  /**
   * 获取测试统计信息
   */
  static async getTestStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { timeRange = '30' } = req.query;

      const conditions: any = { user_id: userId };
      
      if (timeRange) {
        const days = parseInt(timeRange as string);
        if (days > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          conditions.created_at = { $gte: startDate };
        }
      }

      const stats = await TestResultModel.getDetailedStats(userId, conditions);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('获取测试统计失败', error);
      res.status(500).json({
        success: false,
        message: '获取测试统计失败'
      });
    }
  }

  /**
   * 停止正在运行的测试
   */
  static async stopTest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const testId = req.params.id;

      const test = await TestResultModel.findByIdAndUser(testId, userId);
      
      if (!test) {
        res.status(404).json({
          success: false,
          message: '测试不存在'
        });
        return;
      }

      if (test.status !== 'running') {
        res.status(400).json({
          success: false,
          message: '测试未在运行中'
        });
        return;
      }

      // 更新测试状态为已停止
      await TestResultModel.update(testId, {
        status: 'cancelled',
        end_time: new Date(),
        error_message: '用户手动停止'
      });

      res.json({
        success: true,
        message: '测试已停止'
      });

      // 记录活动日志
      await ActivityLogModel.create({
        user_id: userId,
        action: 'stop_test',
        resource: 'test_result',
        resource_id: testId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });

    } catch (error) {
      logger.error('停止测试失败', error);
      res.status(500).json({
        success: false,
        message: '停止测试失败'
      });
    }
  }

  // 其他方法的占位符，需要根据具体需求实现
  static async runStressTest(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async runAPITest(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async runSecurityTest(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async runCompatibilityTest(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async runUXTest(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async getTestTemplates(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async createTestTemplate(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async updateTestTemplate(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async deleteTestTemplate(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  static async exportTestResults(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: '功能开发中' });
  }

  /**
   * 获取分析数据
   */
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d' } = req.query;
      const userId = (req as any).user?.id;

      // 如果没有用户认证，返回演示数据
      if (!userId) {
        const demoAnalytics = TestController.generateDemoAnalyticsData(timeRange as string);
        res.json(demoAnalytics);
        return;
      }

      // 获取用户的测试数据
      const conditions: any = { user_id: userId };

      if (timeRange) {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        conditions.created_at = { $gte: startDate };
      }

      const tests = await TestResultModel.findAll(conditions);
      const analytics = TestController.analyzeTestData(tests, timeRange as string);

      res.json(analytics);

      // 记录活动日志
      if (userId) {
        await ActivityLogModel.create({
          user_id: userId,
          action: 'view_analytics',
          resource: 'analytics',
          details: { timeRange },
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          success: true
        });
      }

    } catch (error) {
      logger.error('获取分析数据失败', error);
      res.status(500).json({
        success: false,
        message: '获取分析数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取详细分析报告
   */
  static async getDetailedAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const testId = req.params.testId;

      const test = await TestResultModel.findByIdAndUser(testId, userId);

      if (!test) {
        res.status(404).json({
          success: false,
          message: '测试结果不存在'
        });
        return;
      }

      const detailedAnalysis = TestController.generateDetailedAnalysis(test);

      res.json(detailedAnalysis);

    } catch (error) {
      logger.error('获取详细分析失败', error);
      res.status(500).json({
        success: false,
        message: '获取详细分析失败'
      });
    }
  }

  /**
   * 获取趋势数据
   */
  static async getTrendData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { metric = 'performance', timeRange = '30d' } = req.query;

      const conditions: any = { user_id: userId };

      if (timeRange) {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        conditions.created_at = { $gte: startDate };
      }

      const tests = await TestResultModel.findAll(conditions);
      const trendData = TestController.generateTrendData(tests, metric as string);

      res.json(trendData);

    } catch (error) {
      logger.error('获取趋势数据失败', error);
      res.status(500).json({
        success: false,
        message: '获取趋势数据失败'
      });
    }
  }

  /**
   * 导出分析数据
   */
  static async exportAnalyticsData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { format = 'json', timeRange = '30d' } = req.query;

      const conditions: any = { user_id: userId };

      if (timeRange) {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        conditions.created_at = { $gte: startDate };
      }

      const tests = await TestResultModel.findAll(conditions);
      const analytics = TestController.analyzeTestData(tests, timeRange as string);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}.json`);
        res.json(analytics);
      } else {
        res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        });
      }

    } catch (error) {
      logger.error('导出分析数据失败', error);
      res.status(500).json({
        success: false,
        message: '导出分析数据失败'
      });
    }
  }

  /**
   * 生成演示分析数据
   */
  private static generateDemoAnalyticsData(timeRange: string) {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;

    return {
      success: true,
      data: {
        totalTests: 156,
        avgPerformanceScore: 85.2,
        securityIssues: 3,
        accessibilityScore: 92.1,
        trends: {
          performance: 5.2,
          security: -2,
          accessibility: 3.1
        },
        chartData: {
          performance: Array.from({ length: days }, (_, i) => ({
            date: new Date(now.getTime() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 20) + 75
          })),
          testVolume: Array.from({ length: days }, (_, i) => ({
            date: new Date(now.getTime() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 10) + 2
          }))
        },
        insights: [
          {
            id: 1,
            type: 'performance',
            severity: 'medium',
            title: '页面加载时间偏高',
            description: '检测到多个页面的加载时间超过3秒',
            impact: '可能影响用户体验和SEO排名',
            confidence: 85
          },
          {
            id: 2,
            type: 'security',
            severity: 'high',
            title: 'SSL证书即将过期',
            description: 'SSL证书将在30天内过期',
            impact: '可能导致浏览器安全警告',
            confidence: 95
          }
        ],
        recommendations: [
          {
            id: 1,
            title: '优化图片压缩',
            description: '使用WebP格式和适当的压缩比例来减少图片大小',
            priority: 'high',
            metrics: {
              potentialImprovement: 1200
            },
            solution: {
              steps: [
                '使用WebP格式替换JPEG/PNG',
                '实施响应式图片',
                '启用图片懒加载'
              ],
              estimatedEffort: 'medium',
              estimatedImpact: 'high',
              resources: [
                {
                  title: 'WebP优化指南',
                  url: 'https://developers.google.com/speed/webp'
                }
              ]
            }
          }
        ]
      }
    };
  }

  /**
   * 分析测试数据
   */
  private static analyzeTestData(tests: any[], timeRange: string) {
    if (!tests || tests.length === 0) {
      return this.generateDemoAnalyticsData(timeRange);
    }

    const totalTests = tests.length;
    const completedTests = tests.filter(t => t.status === 'completed');

    // 计算平均性能评分
    const performanceScores = completedTests
      .map(t => t.results?.performance_score)
      .filter(score => score !== undefined && score !== null);
    const avgPerformanceScore = performanceScores.length > 0
      ? Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length * 10) / 10
      : 0;

    // 计算安全问题数量
    const securityIssues = completedTests
      .reduce((total, test) => {
        const issues = test.results?.security_issues || 0;
        return total + issues;
      }, 0);

    // 计算可访问性评分
    const accessibilityScores = completedTests
      .map(t => t.results?.accessibility_score)
      .filter(score => score !== undefined && score !== null);
    const accessibilityScore = accessibilityScores.length > 0
      ? Math.round(accessibilityScores.reduce((a, b) => a + b, 0) / accessibilityScores.length * 10) / 10
      : 0;

    return {
      success: true,
      data: {
        totalTests,
        avgPerformanceScore,
        securityIssues,
        accessibilityScore,
        trends: {
          performance: 0, // 需要历史数据对比
          security: 0,
          accessibility: 0
        },
        chartData: this.generateChartData(tests, timeRange),
        insights: this.generateInsights(tests),
        recommendations: this.generateRecommendations(tests)
      }
    };
  }

  /**
   * 生成图表数据
   */
  private static generateChartData(tests: any[], timeRange: string) {
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    const now = new Date();

    const chartData = {
      performance: [] as any[],
      testVolume: [] as any[]
    };

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (days - i - 1) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayTests = tests.filter(test => {
        const testDate = new Date(test.created_at).toISOString().split('T')[0];
        return testDate === dateStr;
      });

      const avgPerformance = dayTests.length > 0
        ? dayTests.reduce((sum, test) => sum + (test.results?.performance_score || 0), 0) / dayTests.length
        : 0;

      chartData.performance.push({
        date: dateStr,
        value: Math.round(avgPerformance)
      });

      chartData.testVolume.push({
        date: dateStr,
        value: dayTests.length
      });
    }

    return chartData;
  }

  /**
   * 生成洞察
   */
  private static generateInsights(tests: any[]) {
    const insights = [];

    // 性能洞察
    const performanceTests = tests.filter(t => t.results?.performance_score);
    if (performanceTests.length > 0) {
      const avgScore = performanceTests.reduce((sum, t) => sum + t.results.performance_score, 0) / performanceTests.length;
      if (avgScore < 70) {
        insights.push({
          id: insights.length + 1,
          type: 'performance',
          severity: 'high',
          title: '性能评分偏低',
          description: `平均性能评分为${avgScore.toFixed(1)}，低于推荐值70`,
          impact: '可能影响用户体验和搜索引擎排名',
          confidence: 90
        });
      }
    }

    return insights;
  }

  /**
   * 生成建议
   */
  private static generateRecommendations(tests: any[]) {
    return [
      {
        id: 1,
        title: '定期进行性能测试',
        description: '建议每周进行一次全面的性能测试',
        priority: 'medium',
        metrics: {
          potentialImprovement: 500
        },
        solution: {
          steps: [
            '设置自动化测试计划',
            '监控关键性能指标',
            '及时优化发现的问题'
          ],
          estimatedEffort: 'low',
          estimatedImpact: 'medium',
          resources: [
            {
              title: '性能测试最佳实践',
              url: 'https://web.dev/performance/'
            }
          ]
        }
      }
    ];
  }

  /**
   * 生成详细分析
   */
  private static generateDetailedAnalysis(test: any) {
    return {
      success: true,
      data: {
        testId: test.id,
        url: test.url,
        testType: test.test_type,
        timestamp: test.created_at,
        results: test.results,
        analysis: {
          summary: '测试完成，发现一些可优化的地方',
          recommendations: [
            '优化图片加载',
            '减少JavaScript包大小',
            '启用浏览器缓存'
          ]
        }
      }
    };
  }

  /**
   * 生成趋势数据
   */
  private static generateTrendData(tests: any[], metric: string) {
    const trendData = tests.map(test => ({
      date: test.created_at,
      value: test.results?.[`${metric}_score`] || 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      data: {
        metric,
        trend: trendData
      }
    };
  }
}
