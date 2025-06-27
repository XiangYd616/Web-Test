/**
 * 监控控制器
 * 处理实时监控相关的API请求
 */

import { Request, Response } from 'express';
import { monitoringService, MonitoringSite } from '../services/monitoringService';
import { logger } from '../utils/logger';
import { ActivityLogModel } from '../models/ActivityLog';

export class MonitoringController {
  /**
   * 获取监控站点列表
   */
  static async getSites(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const sites = monitoringService.getSites().filter(site => site.userId === userId);
      
      res.json({
        success: true,
        data: sites
      });
    } catch (error) {
      logger.error('获取监控站点失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控站点失败'
      });
    }
  }

  /**
   * 添加监控站点
   */
  static async addSite(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { url, name, interval = 300, timeout = 10000, expectedStatus = 200, keywords, headers } = req.body;

      // 验证URL格式
      try {
        new URL(url);
      } catch {
        res.status(400).json({
          success: false,
          message: '无效的URL格式'
        });
        return;
      }

      // 验证间隔时间
      if (interval < 60 || interval > 3600) {
        res.status(400).json({
          success: false,
          message: '监控间隔必须在60-3600秒之间'
        });
        return;
      }

      const site = await monitoringService.addSite({
        url,
        name: name || url,
        interval,
        timeout,
        expectedStatus,
        keywords: keywords || [],
        headers: headers || {},
        enabled: true,
        userId
      });

      res.status(201).json({
        success: true,
        data: site
      });

      await ActivityLogModel.create({
        user_id: userId,
        action: 'add_monitoring_site',
        resource: 'monitoring_sites',
        resource_id: site.id,
        details: { url, name, interval },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });
    } catch (error) {
      logger.error('添加监控站点失败', error);
      res.status(500).json({
        success: false,
        message: '添加监控站点失败'
      });
    }
  }

  /**
   * 更新监控站点
   */
  static async updateSite(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;
      const updates = req.body;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      const success = monitoringService.updateSite(siteId, updates);
      if (!success) {
        res.status(500).json({
          success: false,
          message: '更新监控站点失败'
        });
        return;
      }

      const updatedSite = monitoringService.getSite(siteId);
      res.json({
        success: true,
        data: updatedSite
      });

      await ActivityLogModel.create({
        user_id: userId,
        action: 'update_monitoring_site',
        resource: 'monitoring_sites',
        resource_id: siteId,
        details: updates,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });
    } catch (error) {
      logger.error('更新监控站点失败', error);
      res.status(500).json({
        success: false,
        message: '更新监控站点失败'
      });
    }
  }

  /**
   * 删除监控站点
   */
  static async deleteSite(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      const success = monitoringService.removeSite(siteId);
      if (!success) {
        res.status(500).json({
          success: false,
          message: '删除监控站点失败'
        });
        return;
      }

      res.json({
        success: true,
        message: '监控站点已删除'
      });

      await ActivityLogModel.create({
        user_id: userId,
        action: 'delete_monitoring_site',
        resource: 'monitoring_sites',
        resource_id: siteId,
        details: { url: site.url, name: site.name },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });
    } catch (error) {
      logger.error('删除监控站点失败', error);
      res.status(500).json({
        success: false,
        message: '删除监控站点失败'
      });
    }
  }

  /**
   * 获取监控结果
   */
  static async getResults(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;
      const { limit = 50 } = req.query;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      const results = monitoringService.getResults(siteId);
      const limitedResults = results.slice(-Number(limit));

      res.json({
        success: true,
        data: limitedResults
      });
    } catch (error) {
      logger.error('获取监控结果失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控结果失败'
      });
    }
  }

  /**
   * 获取监控统计
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const sites = monitoringService.getSites().filter(site => site.userId === userId);

      const stats = {
        totalSites: sites.length,
        activeSites: sites.filter(site => site.enabled).length,
        onlineSites: sites.filter(site => site.status === 'online').length,
        offlineSites: sites.filter(site => site.status === 'offline').length,
        warningSites: sites.filter(site => site.status === 'warning').length,
        maintenanceSites: sites.filter(site => site.status === 'maintenance').length,
        averageResponseTime: 0,
        uptime: 0
      };

      // 计算平均响应时间和可用性
      let totalResponseTime = 0;
      let totalChecks = 0;
      let totalUptime = 0;

      for (const site of sites) {
        const results = monitoringService.getResults(site.id);
        if (results.length > 0) {
          const recentResults = results.slice(-10); // 最近10次检查
          const avgResponseTime = recentResults.reduce((sum, r) => sum + r.responseTime, 0) / recentResults.length;
          const successRate = recentResults.filter(r => r.success).length / recentResults.length;
          
          totalResponseTime += avgResponseTime;
          totalChecks++;
          totalUptime += successRate;
        }
      }

      if (totalChecks > 0) {
        stats.averageResponseTime = Math.round(totalResponseTime / totalChecks);
        stats.uptime = Math.round((totalUptime / totalChecks) * 100);
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取监控统计失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控统计失败'
      });
    }
  }

  /**
   * 手动触发检查
   */
  static async triggerCheck(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      // 触发立即检查
      (monitoringService as any).checkSite(siteId);

      res.json({
        success: true,
        message: '检查已触发'
      });

      await ActivityLogModel.create({
        user_id: userId,
        action: 'trigger_monitoring_check',
        resource: 'monitoring_sites',
        resource_id: siteId,
        details: { url: site.url },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        success: true
      });
    } catch (error) {
      logger.error('触发监控检查失败', error);
      res.status(500).json({
        success: false,
        message: '触发监控检查失败'
      });
    }
  }

  /**
   * 获取实时数据（用于WebSocket或SSE）
   */
  static async getRealTimeData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const sites = monitoringService.getSites().filter(site => site.userId === userId);

      const realTimeData = sites.map(site => {
        const results = monitoringService.getResults(site.id);
        const latestResult = results[results.length - 1];

        return {
          siteId: site.id,
          url: site.url,
          name: site.name,
          status: site.status,
          lastChecked: site.lastChecked,
          latestResult: latestResult ? {
            responseTime: latestResult.responseTime,
            statusCode: latestResult.statusCode,
            success: latestResult.success,
            timestamp: latestResult.timestamp
          } : null
        };
      });

      res.json({
        success: true,
        data: realTimeData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('获取实时数据失败', error);
      res.status(500).json({
        success: false,
        message: '获取实时数据失败'
      });
    }
  }

  /**
   * 获取单个监控站点
   */
  static async getSite(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: site
      });
    } catch (error) {
      logger.error('获取监控站点失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控站点失败'
      });
    }
  }

  /**
   * 获取站点统计
   */
  static async getSiteStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { siteId } = req.params;
      const { period = '24h' } = req.query;

      const site = monitoringService.getSite(siteId);
      if (!site || site.userId !== userId) {
        res.status(404).json({
          success: false,
          message: '监控站点不存在'
        });
        return;
      }

      const stats = monitoringService.getSiteStats(siteId, period as string);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取站点统计失败', error);
      res.status(500).json({
        success: false,
        message: '获取站点统计失败'
      });
    }
  }

  /**
   * 获取监控概览
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const overview = monitoringService.getOverview(userId);

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('获取监控概览失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控概览失败'
      });
    }
  }

  /**
   * 获取监控警报
   */
  static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { status, limit = 50 } = req.query;

      const alerts = monitoringService.getAlerts(userId, {
        status: status as string,
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('获取监控警报失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控警报失败'
      });
    }
  }

  /**
   * 标记警报为已读
   */
  static async markAlertAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { alertId } = req.params;

      const success = monitoringService.markAlertAsRead(alertId, userId);
      if (!success) {
        res.status(404).json({
          success: false,
          message: '警报不存在或无权限'
        });
        return;
      }

      res.json({
        success: true,
        message: '警报已标记为已读'
      });
    } catch (error) {
      logger.error('标记警报失败', error);
      res.status(500).json({
        success: false,
        message: '标记警报失败'
      });
    }
  }

  /**
   * 获取监控报告
   */
  static async getReports(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { type, startDate, endDate } = req.query;

      const reports = monitoringService.getReports(userId, {
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      logger.error('获取监控报告失败', error);
      res.status(500).json({
        success: false,
        message: '获取监控报告失败'
      });
    }
  }

  /**
   * 生成监控报告
   */
  static async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { type, siteIds, startDate, endDate, format = 'json' } = req.body;

      const report = await monitoringService.generateReport({
        userId,
        type,
        siteIds,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        format
      });

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="monitoring-report-${Date.now()}.pdf"`);
        res.send(report);
      } else {
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      logger.error('生成监控报告失败', error);
      res.status(500).json({
        success: false,
        message: '生成监控报告失败'
      });
    }
  }
}
