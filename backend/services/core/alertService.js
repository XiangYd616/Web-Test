/**
 * 告警服务类
 * 负责处理监控告警的生成、发送和管理
 */

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');
const winston = require('winston');

// 创建专用的logger实例
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'alert-service' },
    transports: [
        new winston.transports.File({
            filename: 'backend/logs/alert.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: 'warn',
            format: winston.format.simple()
        })
    ]
});

class AlertService extends EventEmitter {
    constructor(dbPool) {
        super();
        this.dbPool = dbPool;
        this.emailTransporter = null;
        this.isRunning = false;

        // 告警配置
        this.config = {
            emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
            webhookEnabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
            slackEnabled: process.env.ALERT_SLACK_ENABLED === 'true',

            // 邮件配置
            emailHost: process.env.SMTP_HOST,
            emailPort: parseInt(process.env.SMTP_PORT) || 587,
            emailUser: process.env.SMTP_USER,
            emailPassword: process.env.SMTP_PASSWORD,
            emailFrom: process.env.ALERT_EMAIL_FROM || 'alerts@testweb.com',

            // 告警阈值
            criticalThreshold: 5,    // 连续失败5次为严重
            highThreshold: 3,        // 连续失败3次为高级
            mediumThreshold: 1,      // 连续失败1次为中级

            // 告警频率限制
            alertCooldown: 300000,   // 5分钟内同一站点不重复发送告警
            maxAlertsPerHour: 20     // 每小时最多发送20个告警
        };

        this.alertHistory = new Map(); // 告警历史缓存
        this.setupEventHandlers();
    }

    /**
     * 启动告警服务
     */
    async start() {
        try {
            if (this.isRunning) {

                logger.warn('告警服务已在运行中');
                return;
            }

            logger.info('启动告警服务...');

            // 初始化邮件传输器
            if (this.config.emailEnabled) {
                await this.initializeEmailTransporter();
            }

            this.isRunning = true;
            this.emit('service:started');

            logger.info('告警服务启动成功');
        } catch (error) {
            logger.error('告警服务启动失败:', error);
            throw error;
        }
    }

    /**
     * 停止告警服务
     */
    async stop() {
        try {
            if (!this.isRunning) {

                return;
            }

            logger.info('停止告警服务...');

            // 关闭邮件传输器
            if (this.emailTransporter) {
                this.emailTransporter.close();
                this.emailTransporter = null;
            }

            this.isRunning = false;
            this.emit('service:stopped');

            logger.info('告警服务已停止');
        } catch (error) {
            logger.error('停止告警服务时出错:', error);
            throw error;
        }
    }

    /**
     * 初始化邮件传输器
     */
    async initializeEmailTransporter() {
        try {
            if (!this.config.emailHost || !this.config.emailUser || !this.config.emailPassword) {

                logger.warn('邮件配置不完整，跳过邮件传输器初始化');
                return;
            }

            this.emailTransporter = nodemailer.createTransporter({
                host: this.config.emailHost,
                port: this.config.emailPort,
                secure: this.config.emailPort === 465,
                auth: {
                    user: this.config.emailUser,
                    pass: this.config.emailPassword
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // 验证邮件配置
            await this.emailTransporter.verify();
            logger.info('邮件传输器初始化成功');

        } catch (error) {
            logger.error('邮件传输器初始化失败:', error);
            this.emailTransporter = null;
        }
    }

    /**
     * 处理监控告警
     */
    async handleMonitoringAlert(alertData) {
        try {
            const {
                targetId,
                target,
                url,
                status,
                consecutiveFailures,
                errorMessage,
                notificationSettings
            } = alertData;

            // 检查告警冷却时间
            if (this.isInCooldown(targetId)) {
                logger.info(`告警在冷却期内，跳过: ${target}`);
                return;
            }

            // 确定告警严重程度
            const severity = this.determineSeverity(consecutiveFailures);

            // 创建告警记录
            const alert = {
                id: this.generateAlertId(),
                targetId,
                target,
                url,
                type: 'site_monitoring',
                severity,
                status,
                consecutiveFailures,
                errorMessage,
                timestamp: new Date().toISOString(),
                notificationSettings: notificationSettings || {}
            };

            // 保存告警记录
            await this.saveAlert(alert);

            // 发送通知
            await this.sendNotifications(alert);

            // 更新告警历史
            this.updateAlertHistory(targetId);

            this.emit('alert:processed', alert);

            logger.info(`处理监控告警: ${target} (${severity})`);

        } catch (error) {
            logger.error('处理监控告警失败:', error);
            this.emit('alert:error', error);
        }
    }

    /**
     * 确定告警严重程度
     */
    determineSeverity(consecutiveFailures) {
        if (consecutiveFailures >= this.config.criticalThreshold) {

            return 'critical';
        } else if (consecutiveFailures >= this.config.highThreshold) {

            return 'high';
        } else if (consecutiveFailures >= this.config.mediumThreshold) {

            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * 检查是否在冷却期内
     */
    isInCooldown(targetId) {
        const lastAlert = this.alertHistory.get(targetId);
        if (!lastAlert) {

            return false;
        }

        const timeSinceLastAlert = Date.now() - lastAlert.timestamp;
        return timeSinceLastAlert < this.config.alertCooldown;
    }

    /**
     * 更新告警历史
     */
    updateAlertHistory(targetId) {
        this.alertHistory.set(targetId, {
            timestamp: Date.now(),
            count: (this.alertHistory.get(targetId)?.count || 0) + 1
        });
    }

    /**
     * 保存告警记录
     */
    async saveAlert(alert) {
        try {
            const query = `
        INSERT INTO monitoring_alerts (
          id, site_id, alert_type, severity, status, 
          message, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

            const values = [
                alert.id,
                alert.targetId,
                alert.type,
                alert.severity,
                'active',
                alert.errorMessage || `站点 ${alert.target} 状态异常`,
                JSON.stringify({
                    url: alert.url,
                    consecutiveFailures: alert.consecutiveFailures,
                    timestamp: alert.timestamp
                }),
                alert.timestamp
            ];

            await this.dbPool.query(query, values);

            logger.info(`保存告警记录: ${alert.id}`);

        } catch (error) {
            // 如果表不存在，先创建表
            if (error.code === '42P01') {
                await this.createAlertsTable();
                // 重试保存
                await this.saveAlert(alert);
            } else {
                logger.error('保存告警记录失败:', error);
                throw error;
            }
        }
    }

    /**
     * 创建告警表
     */
    async createAlertsTable() {
        try {
            const createTableQuery = `
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id VARCHAR(255) PRIMARY KEY,
          site_id UUID NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
          message TEXT,
          details JSONB DEFAULT '{}',
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          acknowledged_by UUID,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_site ON monitoring_alerts(site_id);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at DESC);
      `;

            await this.dbPool.query(createTableQuery);
            logger.info('创建告警表成功');

        } catch (error) {
            logger.error('创建告警表失败:', error);
            throw error;
        }
    }

    /**
     * 发送通知
     */
    async sendNotifications(alert) {
        const notifications = [];

        try {
            // 邮件通知
            if (this.config.emailEnabled && alert.notificationSettings.email !== false) {
                notifications.push(this.sendEmailNotification(alert));
            }

            // Webhook通知
            if (this.config.webhookEnabled && alert.notificationSettings.webhook_url) {
                notifications.push(this.sendWebhookNotification(alert));
            }

            // Slack通知
            if (this.config.slackEnabled && alert.notificationSettings.slack_webhook) {
                notifications.push(this.sendSlackNotification(alert));
            }

            // 等待所有通知发送完成
            const results = await Promise.allSettled(notifications);

            // 记录发送结果
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            logger.info(`告警通知发送完成: ${successful} 成功, ${failed} 失败`);

            if (failed > 0) {
                const errors = results
                    .filter(r => r.status === 'rejected')
                    .map(r => r.reason.message);
                logger.warn('部分通知发送失败:', errors);
            }

        } catch (error) {
            logger.error('发送通知失败:', error);
        }
    }

    /**
     * 发送邮件通知
     */
    async sendEmailNotification(alert) {
        if (!this.emailTransporter) {
            throw new Error('邮件传输器未初始化');
        }

        // 获取用户邮箱
        const userEmail = await this.getUserEmail(alert.targetId);
        if (!userEmail) {
            throw new Error('用户邮箱不存在');
        }

        const subject = `[${alert.severity.toUpperCase()}] 监控告警: ${alert.target}`;
        const html = this.generateEmailTemplate(alert);

        const mailOptions = {
            from: this.config.emailFrom,
            to: userEmail,
            subject,
            html
        };

        await this.emailTransporter.sendMail(mailOptions);
        logger.info(`邮件告警发送成功: ${userEmail}`);
    }

    /**
     * 发送Webhook通知
     */
    async sendWebhookNotification(alert) {
        const webhookUrl = alert.notificationSettings.webhook_url;
        if (!webhookUrl) {
            throw new Error('Webhook URL未配置');
        }

        const payload = {
            alert_id: alert.id,
            site_name: alert.target,
            site_url: alert.url,
            status: alert.status,
            severity: alert.severity,
            consecutive_failures: alert.consecutiveFailures,
            error_message: alert.errorMessage,
            timestamp: alert.timestamp
        };

        await axios.post(webhookUrl, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TestWebApp-AlertService/1.0'
            }
        });

        logger.info(`Webhook告警发送成功: ${webhookUrl}`);
    }

    /**
     * 发送Slack通知
     */
    async sendSlackNotification(alert) {
        const slackWebhook = alert.notificationSettings.slack_webhook;
        if (!slackWebhook) {
            throw new Error('Slack Webhook未配置');
        }

        const color = this.getSeverityColor(alert.severity);
        const payload = {
            attachments: [
                {
                    color,
                    title: `监控告警: ${alert.target}`,
                    fields: [
                        {
                            title: '站点URL',
                            value: alert.url,
                            short: true
                        },
                        {
                            title: '状态',
                            value: alert.status,
                            short: true
                        },
                        {
                            title: '严重程度',
                            value: alert.severity.toUpperCase(),
                            short: true
                        },
                        {
                            title: '连续失败次数',
                            value: alert.consecutiveFailures.toString(),
                            short: true
                        }
                    ],
                    text: alert.errorMessage || '站点监控检测到异常',
                    timestamp: Math.floor(new Date(alert.timestamp).getTime() / 1000)
                }
            ]
        };

        await axios.post(slackWebhook, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Slack告警发送成功`);
    }

    /**
     * 获取严重程度对应的颜色
     */
    getSeverityColor(severity) {
        const colors = {
            low: '#36a64f',      // 绿色
            medium: '#ff9500',   // 橙色
            high: '#ff0000',     // 红色
            critical: '#8b0000'  // 深红色
        };
        return colors[severity] || '#808080';
    }

    /**
     * 生成邮件模板
     */
    generateEmailTemplate(alert) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>监控告警</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
            .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .info-table td { padding: 8px; border-bottom: 1px solid #eee; }
            .info-table td:first-child { font-weight: bold; width: 30%; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🚨 监控告警 - ${alert.severity.toUpperCase()}</h2>
            </div>
            <div class="content">
                <p>您的监控站点检测到异常，详细信息如下：</p>
                
                <table class="info-table">
                    <tr>
                        <td>站点名称</td>
                        <td>${alert.target}</td>
                    </tr>
                    <tr>
                        <td>站点URL</td>
                        <td><a href="${alert.url}" target="_blank">${alert.url}</a></td>
                    </tr>
                    <tr>
                        <td>当前状态</td>
                        <td>${alert.status}</td>
                    </tr>
                    <tr>
                        <td>严重程度</td>
                        <td>${alert.severity.toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td>连续失败次数</td>
                        <td>${alert.consecutiveFailures}</td>
                    </tr>
                    <tr>
                        <td>错误信息</td>
                        <td>${alert.errorMessage || '无'}</td>
                    </tr>
                    <tr>
                        <td>检测时间</td>
                        <td>${new Date(alert.timestamp).toLocaleString('zh-CN')}</td>
                    </tr>
                </table>
                
                <p><strong>建议操作：</strong></p>
                <ul>
                    <li>检查站点是否正常运行</li>
                    <li>查看服务器日志和错误信息</li>
                    <li>确认网络连接是否正常</li>
                    <li>如果问题持续，请联系技术支持</li>
                </ul>
            </div>
            <div class="footer">
                <p>此邮件由 TestWebApp 监控系统自动发送，请勿回复。</p>
                <p>如需帮助，请访问我们的支持页面或联系技术支持。</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * 获取用户邮箱
     */
    async getUserEmail(siteId) {
        try {
            const query = `
        SELECT u.email 
        FROM users u
        JOIN monitoring_sites ms ON u.id = ms.user_id
        WHERE ms.id = $1 AND u.deleted_at IS NULL
      `;

            const result = await this.dbPool.query(query, [siteId]);
            return result.rows.length > 0 ? result.rows[0].email : null;

        } catch (error) {
            logger.error('获取用户邮箱失败:', error);
            return null;
        }
    }

    /**
     * 生成告警ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.on('error', (error) => {
            logger.error('告警服务错误:', error);
        });

        // 清理过期的告警历史
        setInterval(() => {
            this.cleanupAlertHistory();
        }, 3600000); // 每小时清理一次
    }

    /**
     * 清理过期的告警历史
     */
    cleanupAlertHistory() {
        const now = Date.now();
        const expiredThreshold = 24 * 60 * 60 * 1000; // 24小时

        for (const [targetId, history] of this.alertHistory) {
            if (now - history.timestamp > expiredThreshold) {
                this.alertHistory.delete(targetId);
            }
        }

        logger.info(`清理告警历史，当前缓存: ${this.alertHistory.size} 项`);
    }

    /**
     * 获取告警统计
     */
    async getAlertStats(userId = null, timeRange = '24h') {
        try {
            let timeCondition = '';
            switch (timeRange) {
                case '1h':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '1 hour'";
                    break;
                case '24h':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case '7d':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '30 days'";
                    break;
            }

            const userFilter = userId ? 'AND ms.user_id = $1' : '';
            const params = userId ? [userId] : [];

            const query = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN ma.severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN ma.severity = 'high' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN ma.severity = 'medium' THEN 1 END) as medium_alerts,
          COUNT(CASE WHEN ma.severity = 'low' THEN 1 END) as low_alerts,
          COUNT(CASE WHEN ma.status = 'active' THEN 1 END) as active_alerts,
          COUNT(CASE WHEN ma.status = 'resolved' THEN 1 END) as resolved_alerts
        FROM monitoring_alerts ma
        JOIN monitoring_sites ms ON ma.site_id = ms.id
        WHERE ms.deleted_at IS NULL ${userFilter} ${timeCondition}
      `;

            const result = await this.dbPool.query(query, params);
            const stats = result.rows[0];

            return {
                totalAlerts: parseInt(stats.total_alerts),
                criticalAlerts: parseInt(stats.critical_alerts),
                highAlerts: parseInt(stats.high_alerts),
                mediumAlerts: parseInt(stats.medium_alerts),
                lowAlerts: parseInt(stats.low_alerts),
                activeAlerts: parseInt(stats.active_alerts),
                resolvedAlerts: parseInt(stats.resolved_alerts),
                timeRange
            };

        } catch (error) {
            logger.error('获取告警统计失败:', error);
            // 如果表不存在，返回空统计
            return {
                totalAlerts: 0,
                criticalAlerts: 0,
                highAlerts: 0,
                mediumAlerts: 0,
                lowAlerts: 0,
                activeAlerts: 0,
                resolvedAlerts: 0,
                timeRange
            };
        }
    }

    /**
     * 测试通知配置
     */
    async testNotificationConfig(userId, notificationSettings) {
        try {
            const testAlert = {
                id: 'test_' + Date.now(),
                targetId: 'test-site',
                target: '测试站点',
                url: 'https://example.com',
                type: 'test',
                severity: 'medium',
                status: 'test',
                consecutiveFailures: 1,
                errorMessage: '这是一个测试告警',
                timestamp: new Date().toISOString(),
                notificationSettings
            };

            // 直接发送通知并检查结果
            const notifications = [];

            // 邮件通知
            if (this.config.emailEnabled && notificationSettings.email !== false) {
                notifications.push(this.sendEmailNotification(testAlert));
            }

            // Webhook通知
            if (this.config.webhookEnabled && notificationSettings.webhook_url) {
                notifications.push(this.sendWebhookNotification(testAlert));
            }

            // Slack通知
            if (this.config.slackEnabled && notificationSettings.slack_webhook) {
                notifications.push(this.sendSlackNotification(testAlert));
            }

            if (notifications.length === 0) {

                return {
                    success: false,
                    message: '没有启用的通知方式'
                };
            }

            // 等待所有通知发送完成
            const results = await Promise.allSettled(notifications);

            // 检查发送结果
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (failed > 0) {

                const errors = results
                    .filter(r => r.status === 'rejected')
                    .map(r => r.reason.message);
                return {
                    success: false,
                    message: errors[0] || '通知发送失败'
                };
            }

            return {
                success: true,
                message: '测试通知发送成功'
            };

        } catch (error) {
            logger.error('测试通知配置失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 确认告警
     */
    async acknowledgeAlert(alertId, userId) {
        try {
            const query = `
        UPDATE monitoring_alerts 
        SET status = 'acknowledged', 
            acknowledged_at = NOW(), 
            acknowledged_by = $2,
            updated_at = NOW()
        WHERE id = $1 
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertId, userId]);

            if (result.rows.length > 0) {
                logger.info(`告警已确认: ${alertId} by user ${userId}`);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('确认告警失败:', error);
            throw error;
        }
    }

    /**
     * 解决告警
     */
    async resolveAlert(alertId, userId) {
        try {
            const query = `
        UPDATE monitoring_alerts 
        SET status = 'resolved', 
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertId, userId]);

            if (result.rows.length > 0) {
                logger.info(`告警已解决: ${alertId} by user ${userId}`);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('解决告警失败:', error);
            throw error;
        }
    }

    /**
     * 删除告警
     */
    async deleteAlert(alertId, userId) {
        try {
            const query = `
        DELETE FROM monitoring_alerts 
        WHERE id = $1 
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertId, userId]);

            if (result.rows.length > 0) {
                logger.info(`告警已删除: ${alertId} by user ${userId}`);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('删除告警失败:', error);
            throw error;
        }
    }

    /**
     * 获取告警详情
     */
    async getAlertDetails(alertId, userId) {
        try {
            const query = `
        SELECT 
          ma.*,
          ms.name as site_name,
          ms.url as site_url,
          u.username as acknowledged_by_username
        FROM monitoring_alerts ma
        JOIN monitoring_sites ms ON ma.site_id = ms.id
        LEFT JOIN users u ON ma.acknowledged_by = u.id
        WHERE ma.id = $1 AND ms.user_id = $2 AND ms.deleted_at IS NULL
      `;

            const result = await this.dbPool.query(query, [alertId, userId]);

            return result.rows.length > 0 ? result.rows[0] : null;

        } catch (error) {
            logger.error('获取告警详情失败:', error);
            throw error;
        }
    }

    /**
     * 批量确认告警
     */
    async batchAcknowledgeAlerts(alertIds, userId) {
        try {
            const query = `
        UPDATE monitoring_alerts 
        SET status = 'acknowledged', 
            acknowledged_at = NOW(), 
            acknowledged_by = $2,
            updated_at = NOW()
        WHERE id = ANY($1::text[])
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertIds, userId]);

            logger.info(`批量确认告警: ${result.rows.length} 个告警 by user ${userId}`);

            return { updated: result.rows.length };

        } catch (error) {
            logger.error('批量确认告警失败:', error);
            throw error;
        }
    }

    /**
     * 批量解决告警
     */
    async batchResolveAlerts(alertIds, userId) {
        try {
            const query = `
        UPDATE monitoring_alerts 
        SET status = 'resolved', 
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = ANY($1::text[])
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertIds, userId]);

            logger.info(`批量解决告警: ${result.rows.length} 个告警 by user ${userId}`);

            return { updated: result.rows.length };

        } catch (error) {
            logger.error('批量解决告警失败:', error);
            throw error;
        }
    }

    /**
     * 批量删除告警
     */
    async batchDeleteAlerts(alertIds, userId) {
        try {
            const query = `
        DELETE FROM monitoring_alerts 
        WHERE id = ANY($1::text[])
          AND EXISTS (
            SELECT 1 FROM monitoring_sites ms 
            WHERE ms.id = monitoring_alerts.site_id 
              AND ms.user_id = $2
          )
        RETURNING id
      `;

            const result = await this.dbPool.query(query, [alertIds, userId]);

            logger.info(`批量删除告警: ${result.rows.length} 个告警 by user ${userId}`);

            return { deleted: result.rows.length };

        } catch (error) {
            logger.error('批量删除告警失败:', error);
            throw error;
        }
    }

    /**
     * 获取告警规则
     */
    async getAlertRules(userId) {
        try {
            // 从用户配置中获取告警规则
            const query = `
        SELECT preferences 
        FROM users 
        WHERE id = $1 AND deleted_at IS NULL
      `;

            const result = await this.dbPool.query(query, [userId]);

            if (result.rows.length === 0) {

                return this.getDefaultAlertRules();
            }

            const preferences = result.rows[0].preferences || {};
            return preferences.alertRules || this.getDefaultAlertRules();

        } catch (error) {
            logger.error('获取告警规则失败:', error);
            return this.getDefaultAlertRules();
        }
    }

    /**
     * 更新告警规则
     */
    async updateAlertRules(userId, rules) {
        try {
            const query = `
        UPDATE users 
        SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object('alertRules', $2::jsonb),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING preferences
      `;

            const result = await this.dbPool.query(query, [userId, JSON.stringify(rules)]);

            if (result.rows.length > 0) {
                logger.info(`更新告警规则: user ${userId}`);
                return result.rows[0].preferences.alertRules;
            }

            throw new Error('用户不存在');

        } catch (error) {
            logger.error('更新告警规则失败:', error);
            throw error;
        }
    }

    /**
     * 获取默认告警规则
     */
    getDefaultAlertRules() {
        return {
            enabled: true,
            thresholds: {
                critical: 5,    // 连续失败5次
                high: 3,        // 连续失败3次
                medium: 1       // 连续失败1次
            },
            notifications: {
                email: true,
                webhook: false,
                slack: false
            },
            cooldown: 300,      // 5分钟冷却期
            maxPerHour: 20      // 每小时最多20个告警
        };
    }

    /**
     * 获取告警历史统计
     */
    async getAlertHistoryStats(userId, timeRange = '30d') {
        try {
            let timeCondition = '';
            switch (timeRange) {
                case '7d':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '30 days'";
                    break;
                case '90d':
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '90 days'";
                    break;
                default:
                    timeCondition = "AND ma.created_at >= NOW() - INTERVAL '30 days'";
            }

            const query = `
        SELECT 
          DATE_TRUNC('day', ma.created_at) as date,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN ma.severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN ma.severity = 'high' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN ma.severity = 'medium' THEN 1 END) as medium_alerts,
          COUNT(CASE WHEN ma.severity = 'low' THEN 1 END) as low_alerts,
          COUNT(CASE WHEN ma.status = 'resolved' THEN 1 END) as resolved_alerts,
          AVG(EXTRACT(EPOCH FROM (ma.resolved_at - ma.created_at))/60) as avg_resolution_time_minutes
        FROM monitoring_alerts ma
        JOIN monitoring_sites ms ON ma.site_id = ms.id
        WHERE ms.user_id = $1 ${timeCondition}
          AND ms.deleted_at IS NULL
        GROUP BY DATE_TRUNC('day', ma.created_at)
        ORDER BY date DESC
      `;

            const result = await this.dbPool.query(query, [userId]);

            return {
                timeRange,
                data: result.rows.map(row => ({
                    date: row.date,
                    totalAlerts: parseInt(row.total_alerts),
                    criticalAlerts: parseInt(row.critical_alerts),
                    highAlerts: parseInt(row.high_alerts),
                    mediumAlerts: parseInt(row.medium_alerts),
                    lowAlerts: parseInt(row.low_alerts),
                    resolvedAlerts: parseInt(row.resolved_alerts),
                    avgResolutionTime: row.avg_resolution_time_minutes ?
                        Math.round(row.avg_resolution_time_minutes) : null
                }))
            };

        } catch (error) {
            logger.error('获取告警历史统计失败:', error);
            return {
                timeRange,
                data: []
            };
        }
    }
}

module.exports = AlertService;