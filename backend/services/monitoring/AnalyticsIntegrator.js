/**
 * 业务分析服务集成器
 * 整合BusinessAnalyticsService与现有监控系统
 */

const BusinessAnalyticsService = require('./BusinessAnalyticsService');
const EventEmitter = require('events');

class AnalyticsIntegrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableRealTimeUpdates: true,
      syncInterval: 60000, // 1分钟同步间隔
      alertForwarding: true,
      metricsAggregation: true,
      ...options
    };

    this.analyticsService = null;
    this.monitoringService = null;
    this.testEngineService = null;
    this.realtimeService = null;
    
    this.syncInterval = null;
    this.isRunning = false;
    
    console.log('🔧 分析服务集成器已初始化');
  }

  /**
   * 启动集成器
   */
  async start(services = {}) {
    try {
      const {
        databaseManager,
        cacheManager,
        monitoringService,
        testEngineService,
        realtimeService
      } = services;

      // 初始化BusinessAnalyticsService
      this.analyticsService = new BusinessAnalyticsService(databaseManager, cacheManager);
      
      // 保存其他服务引用
      this.monitoringService = monitoringService;
      this.testEngineService = testEngineService;
      this.realtimeService = realtimeService;

      // 设置事件监听
      this.setupEventListeners();
      
      // 启动数据同步
      if (this.options.syncInterval > 0) {
        this.startDataSync();
      }
      
      this.isRunning = true;
      
      console.log('✅ 分析服务集成器已启动');
      this.emit('started');
      
      return this.analyticsService;

    } catch (error) {
      console.error('启动分析服务集成器失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.analyticsService) return;

    // 监听系统指标更新
    this.analyticsService.on('system_metrics', (metrics) => {
      this.handleSystemMetrics(metrics);
    });

    // 监听业务指标更新
    this.analyticsService.on('business_metrics', (metrics) => {
      this.handleBusinessMetrics(metrics);
    });

    // 监听用户指标更新
    this.analyticsService.on('user_metrics', (metrics) => {
      this.handleUserMetrics(metrics);
    });

    // 监听告警
    this.analyticsService.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    // 监听测试引擎事件（如果可用）
    if (this.testEngineService) {
      this.testEngineService.on('test_completed', (result) => {
        this.handleTestCompletion(result);
      });

      this.testEngineService.on('test_failed', (result) => {
        this.handleTestFailure(result);
      });

      this.testEngineService.on('batch_completed', (results) => {
        this.handleBatchCompletion(results);
      });
    }

    // 监听监控服务事件（如果可用）
    if (this.monitoringService) {
      this.monitoringService.on('site_down', (data) => {
        this.handleSiteDown(data);
      });

      this.monitoringService.on('site_up', (data) => {
        this.handleSiteUp(data);
      });
    }

    console.log('📡 事件监听器已设置');
  }

  /**
   * 处理系统指标
   */
  async handleSystemMetrics(metrics) {
    try {
      // 发送到实时通信服务
      if (this.realtimeService && this.options.enableRealTimeUpdates) {
        this.realtimeService.broadcast('system:metrics', {
          type: 'system_metrics',
          data: metrics,
          timestamp: new Date().toISOString()
        });
      }

      // 检查系统健康状态变化
      const systemHealth = this.analyticsService.calculateSystemHealth(metrics.system);
      if (systemHealth !== 'healthy') {
        this.emit('system_health_warning', {
          health: systemHealth,
          metrics: metrics.system
        });
      }

    } catch (error) {
      console.error('处理系统指标失败:', error);
    }
  }

  /**
   * 处理业务指标
   */
  async handleBusinessMetrics(metrics) {
    try {
      // 发送到实时通信服务
      if (this.realtimeService && this.options.enableRealTimeUpdates) {
        this.realtimeService.broadcast('business:metrics', {
          type: 'business_metrics',
          data: metrics,
          timestamp: new Date().toISOString()
        });
      }

      // 检查业务关键指标
      const business = metrics.business;
      if (business.errorRate > 5) {
        this.emit('business_alert', {
          type: 'high_error_rate',
          value: business.errorRate,
          threshold: 5
        });
      }

      if (business.averageResponseTime > 5000) {
        this.emit('business_alert', {
          type: 'slow_response',
          value: business.averageResponseTime,
          threshold: 5000
        });
      }

    } catch (error) {
      console.error('处理业务指标失败:', error);
    }
  }

  /**
   * 处理用户指标
   */
  async handleUserMetrics(metrics) {
    try {
      // 发送到实时通信服务
      if (this.realtimeService && this.options.enableRealTimeUpdates) {
        this.realtimeService.broadcast('user:metrics', {
          type: 'user_metrics',
          data: metrics,
          timestamp: new Date().toISOString()
        });
      }

      // 用户活动分析
      const users = metrics.users;
      if (users.bounceRate > 0.7) {
        this.emit('user_alert', {
          type: 'high_bounce_rate',
          value: users.bounceRate,
          threshold: 0.7
        });
      }

    } catch (error) {
      console.error('处理用户指标失败:', error);
    }
  }

  /**
   * 处理告警
   */
  async handleAlert(alert) {
    try {
      console.log(`🚨 告警处理: ${alert.message}`);

      // 转发告警到实时通信服务
      if (this.realtimeService && this.options.alertForwarding) {
        this.realtimeService.broadcast('system:alert', {
          type: 'system_alert',
          alert,
          timestamp: new Date().toISOString()
        });
      }

      // 集成到监控服务的告警系统
      if (this.monitoringService && typeof this.monitoringService.createAlert === 'function') {
        await this.monitoringService.createAlert({
          type: alert.type,
          level: alert.level,
          message: alert.message,
          source: 'analytics',
          data: alert
        });
      }

      this.emit('alert_processed', alert);

    } catch (error) {
      console.error('处理告警失败:', error);
    }
  }

  /**
   * 处理测试完成事件
   */
  async handleTestCompletion(result) {
    try {
      // 更新业务指标
      if (this.analyticsService) {
        // 这里可以触发实时指标更新
        this.emit('test_metrics_update', {
          type: 'completion',
          result,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('处理测试完成事件失败:', error);
    }
  }

  /**
   * 处理测试失败事件
   */
  async handleTestFailure(result) {
    try {
      // 触发告警检查
      if (this.analyticsService) {
        this.emit('test_metrics_update', {
          type: 'failure',
          result,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('处理测试失败事件失败:', error);
    }
  }

  /**
   * 处理批量测试完成
   */
  async handleBatchCompletion(results) {
    try {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      console.log(`📊 批量测试完成: 成功 ${successCount}, 失败 ${failureCount}`);

      // 发送批量测试统计
      if (this.realtimeService) {
        this.realtimeService.broadcast('test:batch_complete', {
          total: results.length,
          success: successCount,
          failure: failureCount,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('处理批量测试完成事件失败:', error);
    }
  }

  /**
   * 处理站点下线事件
   */
  async handleSiteDown(data) {
    try {
      console.log(`⚠️ 站点下线: ${data.url}`);
      
      if (this.realtimeService) {
        this.realtimeService.broadcast('monitoring:site_down', {
          ...data,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('处理站点下线事件失败:', error);
    }
  }

  /**
   * 处理站点上线事件
   */
  async handleSiteUp(data) {
    try {
      console.log(`✅ 站点恢复: ${data.url}`);
      
      if (this.realtimeService) {
        this.realtimeService.broadcast('monitoring:site_up', {
          ...data,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('处理站点上线事件失败:', error);
    }
  }

  /**
   * 启动数据同步
   */
  startDataSync() {
    this.syncInterval = setInterval(() => {
      this.performDataSync();
    }, this.options.syncInterval);

    console.log(`🔄 数据同步已启动，间隔 ${this.options.syncInterval}ms`);
  }

  /**
   * 执行数据同步
   */
  async performDataSync() {
    try {
      if (!this.analyticsService) return;

      // 同步测试引擎数据
      if (this.testEngineService) {
        await this.syncTestEngineData();
      }

      // 同步监控服务数据
      if (this.monitoringService) {
        await this.syncMonitoringData();
      }

      console.log('🔄 数据同步完成');

    } catch (error) {
      console.error('数据同步失败:', error);
    }
  }

  /**
   * 同步测试引擎数据
   */
  async syncTestEngineData() {
    try {
      if (typeof this.testEngineService.getMetrics === 'function') {
        const testMetrics = await this.testEngineService.getMetrics();
        
        // 将测试引擎指标集成到分析服务
        this.emit('external_metrics', {
          source: 'test_engine',
          metrics: testMetrics
        });
      }
    } catch (error) {
      console.error('同步测试引擎数据失败:', error);
    }
  }

  /**
   * 同步监控服务数据
   */
  async syncMonitoringData() {
    try {
      if (typeof this.monitoringService.getSystemStats === 'function') {
        const monitoringStats = await this.monitoringService.getSystemStats();
        
        // 将监控服务数据集成到分析服务
        this.emit('external_metrics', {
          source: 'monitoring',
          metrics: monitoringStats
        });
      }
    } catch (error) {
      console.error('同步监控服务数据失败:', error);
    }
  }

  /**
   * 获取集成后的仪表板数据
   */
  async getIntegratedDashboard() {
    try {
      if (!this.analyticsService) {
        throw new Error('分析服务未启动');
      }

      const dashboardData = await this.analyticsService.getDashboardData();

      // 集成外部服务数据
      const externalData = await this.gatherExternalData();

      return {
        ...dashboardData,
        external: externalData,
        integration: {
          status: 'active',
          services: {
            analytics: 'running',
            monitoring: this.monitoringService ? 'running' : 'disabled',
            testEngine: this.testEngineService ? 'running' : 'disabled',
            realtime: this.realtimeService ? 'running' : 'disabled'
          },
          lastSync: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('获取集成仪表板数据失败:', error);
      throw error;
    }
  }

  /**
   * 收集外部服务数据
   */
  async gatherExternalData() {
    const external = {};

    try {
      // 从监控服务获取数据
      if (this.monitoringService) {
        if (typeof this.monitoringService.getSystemStats === 'function') {
          external.monitoring = await this.monitoringService.getSystemStats();
        }
      }

      // 从测试引擎获取数据
      if (this.testEngineService) {
        if (typeof this.testEngineService.getStats === 'function') {
          external.testEngine = await this.testEngineService.getStats();
        }
      }

    } catch (error) {
      console.error('收集外部数据失败:', error);
    }

    return external;
  }

  /**
   * 生成综合报告
   */
  async generateIntegratedReport(timeRange = '24h') {
    try {
      if (!this.analyticsService) {
        throw new Error('分析服务未启动');
      }

      const analyticsReport = await this.analyticsService.generateAnalyticsReport(timeRange);
      const externalData = await this.gatherExternalData();

      return {
        ...analyticsReport,
        external: externalData,
        integration: {
          generatedBy: 'AnalyticsIntegrator',
          version: '1.0.0',
          services: Object.keys(externalData)
        }
      };

    } catch (error) {
      console.error('生成综合报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      integrator: {
        isRunning: this.isRunning,
        startTime: this.startTime,
        options: this.options
      },
      services: {
        analytics: this.analyticsService ? 'running' : 'stopped',
        monitoring: this.monitoringService ? 'available' : 'unavailable',
        testEngine: this.testEngineService ? 'available' : 'unavailable',
        realtime: this.realtimeService ? 'available' : 'unavailable'
      },
      sync: {
        enabled: !!this.syncInterval,
        interval: this.options.syncInterval,
        lastSync: this.lastSyncTime
      }
    };
  }

  /**
   * 停止集成器
   */
  async stop() {
    try {
      console.log('🔧 停止分析服务集成器...');

      this.isRunning = false;

      // 停止数据同步
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      // 停止分析服务
      if (this.analyticsService && typeof this.analyticsService.shutdown === 'function') {
        this.analyticsService.shutdown();
      }

      // 移除所有事件监听器
      this.removeAllListeners();

      console.log('✅ 分析服务集成器已停止');
      this.emit('stopped');

    } catch (error) {
      console.error('停止分析服务集成器失败:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsIntegrator;
