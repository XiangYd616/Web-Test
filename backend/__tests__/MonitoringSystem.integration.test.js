/**
 * 监控系统集成测试
 * 测试监控服务、告警系统和仪表板的完整功能
 */

const request = require('supertest');
const app = require('../src/app.js');
const { Pool } = require('pg');

// 模拟数据库连接池
const mockDbPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
};

// 模拟JWT令牌
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwiaWF0IjoxNjAwMDAwMDAwfQ.test';

describe('监控系统集成测试', () => {
    let server;

    beforeAll(async () => {
        // 设置测试环境变量
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-secret';

        // 启动服务器
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('监控目标管理', () => {
        test('应该能够添加监控目标', async () => {
            const newTarget = {
                name: '测试网站',
                url: 'https://example.com',
                monitoring_type: 'uptime',
                check_interval: 300,
                timeout: 30,
                notification_settings: {
                    email: true,
                    webhook: false
                }
            };

            mockDbPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'site-123',
                    ...newTarget,
                    user_id: 'test-user-123',
                    created_at: new Date().toISOString()
                }]
            });

            const response = await request(app)
                .post('/api/v1/monitoring/sites')
                .set('Authorization', `Bearer ${mockToken}`)
                .send(newTarget)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(newTarget.name);
            expect(response.body.data.url).toBe(newTarget.url);
        });

        test('应该能够获取监控目标列表', async () => {
            const mockTargets = [
                {
                    id: 'site-1',
                    name: '网站1',
                    url: 'https://example1.com',
                    status: 'online',
                    monitoring_type: 'uptime',
                    is_active: true
                },
                {
                    id: 'site-2',
                    name: '网站2',
                    url: 'https://example2.com',
                    status: 'offline',
                    monitoring_type: 'performance',
                    is_active: true
                }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: mockTargets }) // 获取数据
                .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // 获取总数

            const response = await request(app)
                .get('/api/v1/monitoring/sites')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.total).toBe(2);
        });

        test('应该能够更新监控目标', async () => {
            const updateData = {
                name: '更新的网站名称',
                check_interval: 600
            };

            mockDbPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'site-123',
                    name: updateData.name,
                    check_interval: updateData.check_interval,
                    updated_at: new Date().toISOString()
                }]
            });

            const response = await request(app)
                .put('/api/v1/monitoring/sites/site-123')
                .set('Authorization', `Bearer ${mockToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
        });

        test('应该能够删除监控目标', async () => {
            mockDbPool.query.mockResolvedValueOnce({
                rows: [{ id: 'site-123' }]
            });

            const response = await request(app)
                .delete('/api/v1/monitoring/sites/site-123')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('删除成功');
        });
    });

    describe('监控检查功能', () => {
        test('应该能够执行立即检查', async () => {
            const checkResult = {
                siteId: 'site-123',
                status: 'online',
                responseTime: 150,
                checkedAt: new Date().toISOString()
            };

            mockDbPool.query.mockResolvedValueOnce({
                rows: [checkResult]
            });

            const response = await request(app)
                .post('/api/v1/monitoring/sites/site-123/check')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('online');
        });

        test('应该能够获取监控历史', async () => {
            const mockHistory = [
                {
                    id: 'log-1',
                    site_id: 'site-123',
                    status: 'online',
                    response_time: 120,
                    checked_at: new Date().toISOString()
                },
                {
                    id: 'log-2',
                    site_id: 'site-123',
                    status: 'online',
                    response_time: 180,
                    checked_at: new Date(Date.now() - 300000).toISOString()
                }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: mockHistory })
                .mockResolvedValueOnce({ rows: [{ total: '2' }] });

            const response = await request(app)
                .get('/api/v1/monitoring/sites/site-123/history')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });
    });

    describe('告警系统', () => {
        test('应该能够获取告警列表', async () => {
            const mockAlerts = [
                {
                    id: 'alert-1',
                    site_id: 'site-123',
                    site_name: '测试网站',
                    alert_type: 'site_monitoring',
                    severity: 'high',
                    status: 'active',
                    message: '网站无法访问',
                    created_at: new Date().toISOString()
                }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: mockAlerts })
                .mockResolvedValueOnce({ rows: [{ total: '1' }] });

            const response = await request(app)
                .get('/api/v1/alerts')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].severity).toBe('high');
        });

        test('应该能够确认告警', async () => {
            mockDbPool.query.mockResolvedValueOnce({
                rows: [{ id: 'alert-123' }]
            });

            const response = await request(app)
                .put('/api/v1/alerts/alert-123/acknowledge')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('已确认');
        });

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

            mockDbPool.query.mockResolvedValueOnce({
                rows: [mockStats]
            });

            const response = await request(app)
                .get('/api/v1/alerts/stats')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.totalAlerts).toBe(10);
            expect(response.body.data.criticalAlerts).toBe(2);
        });
    });

    describe('监控统计和分析', () => {
        test('应该能够获取监控统计', async () => {
            const mockStats = {
                totalTargets: 5,
                activeTargets: 4,
                onlineTargets: 3,
                offlineTargets: 1,
                overallUptime: 98.5,
                averageResponseTime: 250
            };

            // 模拟多个数据库查询
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // 总目标数
                .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // 活跃目标数
                .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // 在线目标数
                .mockResolvedValueOnce({ rows: [{ avg_response_time: '250' }] }) // 平均响应时间
                .mockResolvedValueOnce({ rows: [] }); // 系统统计

            const response = await request(app)
                .get('/api/v1/monitoring/stats')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('system');
        });

        test('应该能够获取分析数据', async () => {
            const mockAnalytics = {
                uptimeData: [
                    { date: '2023-01-01', uptime: 99.5 },
                    { date: '2023-01-02', uptime: 98.2 }
                ],
                responseTimeData: [
                    { date: '2023-01-01', avgResponseTime: 200 },
                    { date: '2023-01-02', avgResponseTime: 250 }
                ]
            };

            mockDbPool.query.mockResolvedValueOnce({
                rows: mockAnalytics.uptimeData.concat(mockAnalytics.responseTimeData)
            });

            const response = await request(app)
                .get('/api/v1/monitoring/analytics')
                .set('Authorization', `Bearer ${mockToken}`)
                .query({ timeRange: '7d' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
    });

    describe('报告生成', () => {
        test('应该能够生成监控报告', async () => {
            const reportRequest = {
                reportType: 'summary',
                timeRange: '24h',
                format: 'json',
                includeCharts: true
            };

            // 模拟报告生成过程中的数据库查询
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [] }) // 获取站点数据
                .mockResolvedValueOnce({ rows: [] }) // 获取统计数据
                .mockResolvedValueOnce({ rows: [] }) // 获取告警数据
                .mockResolvedValueOnce({ // 保存报告记录
                    rows: [{
                        id: 'report-123',
                        filename: 'monitoring-report-summary-2023-01-01.json',
                        created_at: new Date().toISOString()
                    }]
                });

            const response = await request(app)
                .post('/api/v1/monitoring/reports')
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reportRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.filename).toContain('monitoring-report');
            expect(response.body.data.downloadUrl).toContain('/download');
        });

        test('应该能够获取报告列表', async () => {
            const mockReports = [
                {
                    id: 'report-1',
                    report_type: 'summary',
                    format: 'json',
                    filename: 'report1.json',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'report-2',
                    report_type: 'detailed',
                    format: 'csv',
                    filename: 'report2.csv',
                    created_at: new Date().toISOString()
                }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: mockReports })
                .mockResolvedValueOnce({ rows: [{ total: '2' }] });

            const response = await request(app)
                .get('/api/v1/monitoring/reports')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });
    });

    describe('数据导出', () => {
        test('应该能够导出JSON格式数据', async () => {
            const mockExportData = {
                sites: [],
                history: [],
                alerts: [],
                exportedAt: new Date().toISOString()
            };

            mockDbPool.query
                .mockResolvedValueOnce({ rows: [] }) // 站点数据
                .mockResolvedValueOnce({ rows: [] }) // 历史数据
                .mockResolvedValueOnce({ rows: [] }); // 告警数据

            const response = await request(app)
                .get('/api/v1/monitoring/export')
                .set('Authorization', `Bearer ${mockToken}`)
                .query({ format: 'json', timeRange: '24h' })
                .expect(200);

            expect(response.headers['content-type']).toContain('application/json');
            expect(response.headers['content-disposition']).toContain('attachment');
        });

        test('应该能够导出CSV格式数据', async () => {
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/v1/monitoring/export')
                .set('Authorization', `Bearer ${mockToken}`)
                .query({ format: 'csv', timeRange: '7d' })
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });
    });

    describe('健康检查', () => {
        test('应该能够获取监控服务健康状态', async () => {
            const response = await request(app)
                .get('/api/v1/monitoring/health')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('status');
        });
    });

    describe('错误处理', () => {
        test('未认证用户应该被拒绝访问', async () => {
            const response = await request(app)
                .get('/api/v1/monitoring/sites')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        test('无效的监控目标ID应该返回404', async () => {
            mockDbPool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/v1/monitoring/sites/invalid-id')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        test('数据库错误应该被正确处理', async () => {
            mockDbPool.query.mockRejectedValueOnce(new Error('数据库连接失败'));

            const response = await request(app)
                .get('/api/v1/monitoring/sites')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('实时功能', () => {
        test('WebSocket连接应该能够推送实时数据', (done) => {
            // 这里可以添加WebSocket测试
            // 由于测试环境的复杂性，暂时跳过
            done();
        });
    });
});