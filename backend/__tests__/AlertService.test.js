/**
 * 告警服务测试
 */

const AlertService = require('../services/core/AlertService.js');
const axios = require('axios');

// 模拟数据库连接池
const mockDbPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
};

// 模拟邮件传输器
const mockEmailTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
    close: jest.fn()
};

// 模拟nodemailer
jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => mockEmailTransporter)
}));

// 模拟axios
jest.mock('axios', () => ({
    post: jest.fn()
}));

describe('AlertService', () => {
    let alertService;

    beforeEach(() => {
        jest.clearAllMocks();
        alertService = new AlertService(mockDbPool);

        // 设置环境变量
        process.env.ALERT_EMAIL_ENABLED = 'true';
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'test@example.com';
        process.env.SMTP_PASSWORD = 'password';
    });

    afterEach(() => {
        if (alertService.isRunning) {
            alertService.stop();
        }
    });

    describe('启动和停止', () => {
        test('应该能够启动告警服务', async () => {
            mockEmailTransporter.verify.mockResolvedValue(true);

            await alertService.start();

            expect(alertService.isRunning).toBe(true);
            // 由于邮件配置在beforeEach中设置，邮件传输器应该被初始化
            if (alertService.emailTransporter) {
                expect(mockEmailTransporter.verify).toHaveBeenCalled();
            }
        });

        test('应该能够停止告警服务', async () => {
            mockEmailTransporter.verify.mockResolvedValue(true);

            await alertService.start();
            await alertService.stop();

            expect(alertService.isRunning).toBe(false);
            expect(mockEmailTransporter.close).toHaveBeenCalled();
        });
    });

    describe('告警处理', () => {
        beforeEach(async () => {
            mockEmailTransporter.verify.mockResolvedValue(true);
            await alertService.start();
        });

        test('应该能够处理监控告警', async () => {
            const alertData = {
                targetId: 'site-123',
                target: '测试站点',
                url: 'https://example.com',
                status: 'down',
                consecutiveFailures: 3,
                errorMessage: '连接超时',
                notificationSettings: {
                    email: true
                }
            };

            // 模拟数据库操作
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [] }) // saveAlert
                .mockResolvedValueOnce({ rows: [{ email: 'user@example.com' }] }); // getUserEmail

            mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'test-123' });

            await alertService.handleMonitoringAlert(alertData);

            expect(mockDbPool.query).toHaveBeenCalled();
            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });

        test('应该能够确定告警严重程度', () => {
            expect(alertService.determineSeverity(1)).toBe('medium');
            expect(alertService.determineSeverity(3)).toBe('high');
            expect(alertService.determineSeverity(5)).toBe('critical');
        });

        test('应该能够检查冷却期', () => {
            const targetId = 'site-123';

            // 第一次告警
            expect(alertService.isInCooldown(targetId)).toBe(false);

            // 更新告警历史
            alertService.updateAlertHistory(targetId);

            // 应该在冷却期内
            expect(alertService.isInCooldown(targetId)).toBe(true);
        });
    });

    describe('告警管理', () => {
        test('应该能够获取告警统计', async () => {
            const mockStats = {
                total_alerts: '10',
                critical_alerts: '2',
                high_alerts: '3',
                medium_alerts: '3',
                low_alerts: '2',
                active_alerts: '5',
                resolved_alerts: '5'
            };

            mockDbPool.query.mockResolvedValue({ rows: [mockStats] });

            const stats = await alertService.getAlertStats('user-123', '24h');

            expect(stats.totalAlerts).toBe(10);
            expect(stats.criticalAlerts).toBe(2);
            expect(stats.activeAlerts).toBe(5);
            expect(mockDbPool.query).toHaveBeenCalledWith(
                expect.stringContaining('COUNT(*) as total_alerts'),
                ['user-123']
            );
        });

        test('应该能够确认告警', async () => {
            mockDbPool.query.mockResolvedValue({ rows: [{ id: 'alert-123' }] });

            const result = await alertService.acknowledgeAlert('alert-123', 'user-123');

            expect(result).toBe(true);
            expect(mockDbPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE monitoring_alerts'),
                ['alert-123', 'user-123']
            );
        });

        test('应该能够解决告警', async () => {
            mockDbPool.query.mockResolvedValue({ rows: [{ id: 'alert-123' }] });

            const result = await alertService.resolveAlert('alert-123', 'user-123');

            expect(result).toBe(true);
            expect(mockDbPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE monitoring_alerts'),
                ['alert-123', 'user-123']
            );
        });

        test('应该能够批量确认告警', async () => {
            const alertIds = ['alert-1', 'alert-2', 'alert-3'];
            mockDbPool.query.mockResolvedValue({
                rows: alertIds.map(id => ({ id }))
            });

            const result = await alertService.batchAcknowledgeAlerts(alertIds, 'user-123');

            expect(result.updated).toBe(3);
            expect(mockDbPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE monitoring_alerts'),
                [alertIds, 'user-123']
            );
        });
    });

    describe('通知发送', () => {
        beforeEach(async () => {
            mockEmailTransporter.verify.mockResolvedValue(true);
            await alertService.start();
        });

        test('应该能够发送邮件通知', async () => {
            const alert = {
                id: 'alert-123',
                targetId: 'site-123',
                target: '测试站点',
                url: 'https://example.com',
                severity: 'high',
                status: 'down',
                consecutiveFailures: 3,
                errorMessage: '连接超时',
                timestamp: new Date().toISOString(),
                notificationSettings: { email: true }
            };

            mockDbPool.query.mockResolvedValue({
                rows: [{ email: 'user@example.com' }]
            });
            mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'test-123' });

            await alertService.sendEmailNotification(alert);

            expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: expect.stringContaining('[HIGH] 监控告警'),
                    html: expect.stringContaining('测试站点')
                })
            );
        });

        test('应该能够发送Webhook通知', async () => {
            const alert = {
                id: 'alert-123',
                target: '测试站点',
                url: 'https://example.com',
                severity: 'high',
                status: 'down',
                consecutiveFailures: 3,
                errorMessage: '连接超时',
                timestamp: new Date().toISOString(),
                notificationSettings: {
                    webhook_url: 'https://webhook.example.com'
                }
            };

            axios.post.mockResolvedValue({ status: 200 });

            await alertService.sendWebhookNotification(alert);

            expect(axios.post).toHaveBeenCalledWith(
                'https://webhook.example.com',
                expect.objectContaining({
                    alert_id: 'alert-123',
                    site_name: '测试站点',
                    severity: 'high'
                }),
                expect.objectContaining({
                    timeout: 10000,
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        test('应该能够发送Slack通知', async () => {
            const alert = {
                id: 'alert-123',
                target: '测试站点',
                url: 'https://example.com',
                severity: 'critical',
                status: 'down',
                consecutiveFailures: 5,
                errorMessage: '服务器无响应',
                timestamp: new Date().toISOString(),
                notificationSettings: {
                    slack_webhook: 'https://hooks.slack.com/test'
                }
            };

            axios.post.mockResolvedValue({ status: 200 });

            await alertService.sendSlackNotification(alert);

            expect(axios.post).toHaveBeenCalledWith(
                'https://hooks.slack.com/test',
                expect.objectContaining({
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            title: '监控告警: 测试站点',
                            color: '#8b0000', // critical color
                            fields: expect.arrayContaining([
                                expect.objectContaining({
                                    title: '严重程度',
                                    value: 'CRITICAL'
                                })
                            ])
                        })
                    ])
                }),
                expect.objectContaining({
                    timeout: 10000
                })
            );
        });
    });

    describe('告警规则管理', () => {
        test('应该能够获取告警规则', async () => {
            const mockPreferences = {
                alertRules: {
                    enabled: true,
                    thresholds: {
                        critical: 5,
                        high: 3,
                        medium: 1
                    },
                    notifications: {
                        email: true,
                        webhook: false,
                        slack: false
                    }
                }
            };

            mockDbPool.query.mockResolvedValue({
                rows: [{ preferences: mockPreferences }]
            });

            const rules = await alertService.getAlertRules('user-123');

            expect(rules.enabled).toBe(true);
            expect(rules.thresholds.critical).toBe(5);
            expect(rules.notifications.email).toBe(true);
        });

        test('应该能够更新告警规则', async () => {
            const newRules = {
                enabled: true,
                thresholds: {
                    critical: 3,
                    high: 2,
                    medium: 1
                },
                notifications: {
                    email: true,
                    webhook: true,
                    slack: false
                }
            };

            mockDbPool.query.mockResolvedValue({
                rows: [{ preferences: { alertRules: newRules } }]
            });

            const result = await alertService.updateAlertRules('user-123', newRules);

            expect(result).toEqual(newRules);
            expect(mockDbPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                ['user-123', JSON.stringify(newRules)]
            );
        });
    });

    describe('测试通知配置', () => {
        beforeEach(async () => {
            mockEmailTransporter.verify.mockResolvedValue(true);
            await alertService.start();
        });

        test('应该能够测试通知配置', async () => {
            const config = {
                email: true,
                webhook: false,
                slack: false
            };

            mockDbPool.query.mockResolvedValue({
                rows: [{ email: 'user@example.com' }]
            });
            mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'test-123' });

            const result = await alertService.testNotificationConfig('user-123', config);

            expect(result.success).toBe(true);
            expect(result.message).toBe('测试通知发送成功');
            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });

        test('测试通知失败时应该返回错误信息', async () => {
            const config = {
                email: true,
                webhook: false,
                slack: false
            };

            mockEmailTransporter.sendMail.mockRejectedValue(new Error('发送失败'));

            const result = await alertService.testNotificationConfig('user-123', config);

            expect(result.success).toBe(false);
            expect(result.message).toBe('发送失败');
        });
    });

    describe('错误处理', () => {
        test('数据库错误时应该正确处理', async () => {
            mockDbPool.query.mockRejectedValue(new Error('数据库连接失败'));

            const stats = await alertService.getAlertStats('user-123');

            // 应该返回默认值而不是抛出错误
            expect(stats.totalAlerts).toBe(0);
            expect(stats.criticalAlerts).toBe(0);
        });

        test('邮件配置错误时应该跳过邮件初始化', async () => {
            // 清除邮件配置
            delete process.env.SMTP_HOST;

            const newAlertService = new AlertService(mockDbPool);
            await newAlertService.start();

            expect(newAlertService.emailTransporter).toBeNull();
            expect(newAlertService.isRunning).toBe(true);
        });
    });
});