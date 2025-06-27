import { Request, Response } from 'express';
import { DataTask } from '../models/DataTask';
import { TestResultModel } from '../models/TestResult';
import { logger } from '../utils/logger';
import { ActivityLogModel } from '../models/ActivityLog';

export class ReportController {
  /**
   * 获取报告列表
   */
  static async getReports(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 10, type, status } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      const whereConditions: any = { 
        user_id: userId,
        type: 'export'
      };

      if (type) whereConditions.data_type = type;
      if (status) whereConditions.status = status;

      const [reports, total] = await Promise.all([
        DataTask.findAll({
          where: whereConditions,
          limit: Number(limit),
          offset,
          order: [['created_at', 'DESC']]
        }),
        DataTask.count({ where: whereConditions })
      ]);

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取报告列表失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告列表失败'
      });
    }
  }

  /**
   * 获取单个报告
   */
  static async getReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { reportId } = req.params;

      const report = await DataTask.findOne({
        where: { id: reportId, user_id: userId }
      });

      if (!report) {
        res.status(404).json({
          success: false,
          error: '报告不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('获取报告失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告失败'
      });
    }
  }

  /**
   * 生成新报告
   */
  static async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { title, template, format, dateRange, filters, includeCharts, includeRawData } = req.body;

      // 创建报告任务
      const task = await DataTask.create({
        user_id: userId,
        type: 'export',
        data_type: 'reports',
        format: format || 'html',
        status: 'pending',
        config: {
          title: title || '测试报告',
          template: template || 'summary',
          dateRange: dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
          filters: filters || {},
          includeCharts: includeCharts !== false,
          includeRawData: includeRawData === true
        }
      });

      // 记录活动日志
      await (ActivityLogModel as any).logUserAction(
        userId,
        'report_generate',
        '生成报告',
        { taskId: task.id, template, format }
      );

      res.status(201).json({
        success: true,
        data: task,
        message: '报告生成任务已创建'
      });
    } catch (error) {
      logger.error('生成报告失败', error);
      res.status(500).json({
        success: false,
        error: '生成报告失败'
      });
    }
  }

  /**
   * 下载报告
   */
  static async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { reportId } = req.params;

      const report = await DataTask.findOne({
        where: { id: reportId, user_id: userId }
      });

      if (!report) {
        res.status(404).json({
          success: false,
          error: '报告不存在'
        });
        return;
      }

      if (report.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: '报告尚未完成'
        });
        return;
      }

      // 这里应该实现实际的文件下载逻辑
      res.json({
        success: true,
        data: {
          downloadUrl: report.getDownloadUrl(),
          fileName: `report-${reportId}.${report.format}`
        }
      });
    } catch (error) {
      logger.error('下载报告失败', error);
      res.status(500).json({
        success: false,
        error: '下载报告失败'
      });
    }
  }

  /**
   * 删除报告
   */
  static async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { reportId } = req.params;

      const success = await DataTask.delete(reportId, userId);
      if (!success) {
        res.status(404).json({
          success: false,
          error: '报告不存在'
        });
        return;
      }

      res.json({
        success: true,
        message: '报告已删除'
      });
    } catch (error) {
      logger.error('删除报告失败', error);
      res.status(500).json({
        success: false,
        error: '删除报告失败'
      });
    }
  }

  /**
   * 获取报告任务列表
   */
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 10, status } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      const whereConditions: any = { 
        user_id: userId,
        type: 'export',
        data_type: 'reports'
      };

      if (status) whereConditions.status = status;

      const [tasks, total] = await Promise.all([
        DataTask.findAll({
          where: whereConditions,
          limit: Number(limit),
          offset,
          order: [['created_at', 'DESC']]
        }),
        DataTask.count({ where: whereConditions })
      ]);

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取报告任务列表失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告任务列表失败'
      });
    }
  }

  /**
   * 获取单个报告任务
   */
  static async getTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { taskId } = req.params;

      const task = await DataTask.findOne({
        where: { id: taskId, user_id: userId }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          error: '任务不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('获取报告任务失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告任务失败'
      });
    }
  }

  /**
   * 取消报告任务
   */
  static async cancelTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { taskId } = req.params;

      const task = await DataTask.findOne({
        where: { id: taskId, user_id: userId }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          error: '任务不存在'
        });
        return;
      }

      if (!task.canCancel()) {
        res.status(400).json({
          success: false,
          error: '任务无法取消'
        });
        return;
      }

      await task.updateStatus('failed', '用户取消');

      res.json({
        success: true,
        message: '任务已取消'
      });
    } catch (error) {
      logger.error('取消报告任务失败', error);
      res.status(500).json({
        success: false,
        error: '取消报告任务失败'
      });
    }
  }

  /**
   * 重试报告任务
   */
  static async retryTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { taskId } = req.params;

      const task = await DataTask.findOne({
        where: { id: taskId, user_id: userId }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          error: '任务不存在'
        });
        return;
      }

      if (task.status !== 'failed') {
        res.status(400).json({
          success: false,
          error: '只能重试失败的任务'
        });
        return;
      }

      await task.updateStatus('pending');

      res.json({
        success: true,
        message: '任务已重新排队'
      });
    } catch (error) {
      logger.error('重试报告任务失败', error);
      res.status(500).json({
        success: false,
        error: '重试报告任务失败'
      });
    }
  }

  /**
   * 获取报告模板
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          id: 'summary',
          name: '摘要报告',
          description: '包含关键指标和趋势的简要报告',
          fields: ['overview', 'key_metrics', 'trends']
        },
        {
          id: 'detailed',
          name: '详细报告',
          description: '包含所有测试数据和分析的完整报告',
          fields: ['overview', 'detailed_results', 'analysis', 'recommendations']
        },
        {
          id: 'performance',
          name: '性能报告',
          description: '专注于性能指标和优化建议',
          fields: ['performance_metrics', 'bottlenecks', 'optimization_tips']
        },
        {
          id: 'security',
          name: '安全报告',
          description: '安全测试结果和风险评估',
          fields: ['security_issues', 'risk_assessment', 'remediation_steps']
        },
        {
          id: 'monitoring',
          name: '监控报告',
          description: '监控数据和可用性统计',
          fields: ['uptime_stats', 'response_times', 'incidents']
        }
      ];

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('获取报告模板失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告模板失败'
      });
    }
  }

  /**
   * 获取报告统计
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      // 获取各种状态的报告数量
      const [totalReports, completedReports, failedReports, pendingReports, processingReports] = await Promise.all([
        DataTask.count({ where: { user_id: userId, type: 'export', data_type: 'reports' } }),
        DataTask.count({ where: { user_id: userId, type: 'export', data_type: 'reports', status: 'completed' } }),
        DataTask.count({ where: { user_id: userId, type: 'export', data_type: 'reports', status: 'failed' } }),
        DataTask.count({ where: { user_id: userId, type: 'export', data_type: 'reports', status: 'pending' } }),
        DataTask.count({ where: { user_id: userId, type: 'export', data_type: 'reports', status: 'processing' } })
      ]);

      res.json({
        success: true,
        data: {
          totalReports,
          completedReports,
          failedReports,
          pendingReports,
          processingReports
        }
      });
    } catch (error) {
      logger.error('获取报告统计失败', error);
      res.status(500).json({
        success: false,
        error: '获取报告统计失败'
      });
    }
  }
}
