/**
 * 数据导出服务测试
 */

const DataExportService = require('../services/dataManagement/dataExportService');
const path = require('path');
const fs = require('fs').promises;

// 模拟数据库连接池
const mockDbPool = {
    query: jest.fn()
};

describe('DataExportService', () => {
    let exportService;
    let testExportDir;
    let testTempDir;

    beforeEach(async () => {
        // 创建测试目录
        testExportDir = path.join(__dirname, '../temp/test-exports');
        testTempDir = path.join(__dirname, '../temp/test-temp');

        await fs.mkdir(testExportDir, { recursive: true });
        await fs.mkdir(testTempDir, { recursive: true });

        // 创建服务实例
        exportService = new DataExportService(mockDbPool);
        exportService.exportDir = testExportDir;
        exportService.tempDir = testTempDir;

        // 重置模拟
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // 清理测试文件
        try {
            const files = await fs.readdir(testExportDir);
            for (const file of files) {
                await fs.unlink(path.join(testExportDir, file));
            }
        } catch (error) {
            // 忽略清理错误
        }
    });

    describe('配置验证', () => {
        test('应该验证有效的导出配置', () => {
            const validConfig = {
                dataType: 'test-results',
                format: 'json',
                dateRange: {
                    start: '2024-01-01',
                    end: '2024-01-31'
                },
                filters: {},
                options: {}
            };

            expect(() => exportService.validateExportConfig(validConfig)).not.toThrow();
        });

        test('应该拒绝无效的数据类型', () => {
            const invalidConfig = {
                dataType: 'invalid-type',
                format: 'json'
            };

            expect(() => exportService.validateExportConfig(invalidConfig))
                .toThrow('不支持的数据类型');
        });

        test('应该拒绝无效的格式', () => {
            const invalidConfig = {
                dataType: 'test-results',
                format: 'invalid-format'
            };

            expect(() => exportService.validateExportConfig(invalidConfig))
                .toThrow('不支持的导出格式');
        });

        test('应该验证日期范围', () => {
            const invalidConfig = {
                dataType: 'test-results',
                format: 'json',
                dateRange: {
                    start: '2024-01-31',
                    end: '2024-01-01'
                }
            };

            expect(() => exportService.validateExportConfig(invalidConfig))
                .toThrow('开始日期不能晚于结束日期');
        });
    });

    describe('JSON导出', () => {
        test('应该成功导出JSON格式数据', async () => {
            const testData = [
                { id: 1, name: 'Test 1', status: 'completed' },
                { id: 2, name: 'Test 2', status: 'failed' }
            ];

            const config = {
                dataType: 'test-results',
                format: 'json',
                filters: {},
                dateRange: {}
            };

            const result = await exportService.exportToJSON(testData, 'test-export', config);

            expect(result.filePath).toBeDefined();
            expect(result.fileSize).toBeGreaterThan(0);

            // 验证文件内容
            const fileContent = await fs.readFile(result.filePath, 'utf8');
            const parsedData = JSON.parse(fileContent);

            expect(parsedData.exportInfo).toBeDefined();
            expect(parsedData.exportInfo.recordCount).toBe(2);
            expect(parsedData.data).toEqual(testData);
        });

        test('应该处理空数据', async () => {
            const testData = [];
            const config = { dataType: 'test-results', format: 'json' };

            const result = await exportService.exportToJSON(testData, 'empty-export', config);

            expect(result.filePath).toBeDefined();
            expect(result.fileSize).toBeGreaterThan(0);

            const fileContent = await fs.readFile(result.filePath, 'utf8');
            const parsedData = JSON.parse(fileContent);

            expect(parsedData.exportInfo.recordCount).toBe(0);
            expect(parsedData.data).toEqual([]);
        });
    });

    describe('CSV导出', () => {
        test('应该成功导出CSV格式数据', async () => {
            const testData = [
                { id: 1, name: 'Test 1', status: 'completed', score: 95.5 },
                { id: 2, name: 'Test 2', status: 'failed', score: 60.0 }
            ];

            const config = { dataType: 'test-results', format: 'csv' };

            const result = await exportService.exportToCSV(testData, 'test-export', config);

            expect(result.filePath).toBeDefined();
            expect(result.fileSize).toBeGreaterThan(0);

            // 验证文件内容
            const fileContent = await fs.readFile(result.filePath, 'utf8');

            // 检查BOM头
            expect(fileContent.charCodeAt(0)).toBe(0xFEFF);

            // 检查CSV结构
            const lines = fileContent.substring(1).split('\n'); // 跳过BOM
            expect(lines[0]).toBe('id,name,status,score'); // 头部
            expect(lines[1]).toBe('1,Test 1,completed,95.5'); // 第一行数据
            expect(lines[2]).toBe('2,Test 2,failed,60'); // 第二行数据
        });

        test('应该正确处理CSV特殊字符', async () => {
            const testData = [
                { id: 1, name: 'Test, with comma', description: 'Has "quotes"' },
                { id: 2, name: 'Test\nwith newline', description: 'Normal text' }
            ];

            const config = { dataType: 'test-results', format: 'csv' };

            const result = await exportService.exportToCSV(testData, 'special-chars', config);

            const fileContent = await fs.readFile(result.filePath, 'utf8');
            const lines = fileContent.substring(1).split('\n');

            // 验证特殊字符被正确转义
            expect(lines[1]).toContain('"Test, with comma"');
            expect(lines[1]).toContain('"Has ""quotes"""');
        });
    });

    describe('Excel导出', () => {
        test('应该成功导出Excel格式数据', async () => {
            const testData = [
                { id: 1, name: 'Test 1', status: 'completed' },
                { id: 2, name: 'Test 2', status: 'failed' }
            ];

            const config = { dataType: 'test-results', format: 'excel' };

            const result = await exportService.exportToExcel(testData, 'test-export', config);

            expect(result.filePath).toBeDefined();
            expect(result.fileSize).toBeGreaterThan(0);
            expect(result.filePath).toMatch(/\.xlsx$/);

            // 验证文件存在
            const stats = await fs.stat(result.filePath);
            expect(stats.isFile()).toBe(true);
        });
    });

    describe('PDF导出', () => {
        test('应该成功导出PDF格式数据', async () => {
            const testData = [
                { id: 1, name: 'Test 1', status: 'completed' },
                { id: 2, name: 'Test 2', status: 'failed' }
            ];

            const config = { dataType: 'test-results', format: 'pdf' };

            const result = await exportService.exportToPDF(testData, 'test-export', config);

            expect(result.filePath).toBeDefined();
            expect(result.fileSize).toBeGreaterThan(0);
            expect(result.filePath).toMatch(/\.pdf$/);

            // 验证文件存在
            const stats = await fs.stat(result.filePath);
            expect(stats.isFile()).toBe(true);
        });
    });

    describe('任务管理', () => {
        test('应该创建导出任务', async () => {
            const userId = 1;
            const config = {
                dataType: 'test-results',
                format: 'json',
                dateRange: { start: '2024-01-01', end: '2024-01-31' },
                filters: {},
                options: {}
            };

            // 模拟数据库查询
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [] }) // 创建表
                .mockResolvedValueOnce({ rows: [] }) // 插入任务
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] }); // 获取数据

            const result = await exportService.createExportTask(userId, config);

            expect(result.success).toBe(true);
            expect(result.data.id).toBeDefined();
            expect(result.data.userId).toBe(userId);
            expect(result.data.dataType).toBe(config.dataType);
            expect(result.data.format).toBe(config.format);
        });

        test('应该获取任务状态', async () => {
            const taskId = 'test-task-123';
            const userId = 1;

            // 模拟数据库查询返回任务
            mockDbPool.query.mockResolvedValueOnce({
                rows: [{
                    id: taskId,
                    user_id: userId,
                    name: 'Test Export',
                    data_type: 'test-results',
                    format: 'json',
                    status: 'completed',
                    progress: 100,
                    file_path: '/path/to/file.json',
                    file_size: 1024,
                    record_count: 10,
                    created_at: new Date(),
                    completed_at: new Date()
                }]
            });

            const result = await exportService.getTaskStatus(taskId, userId);

            expect(result.success).toBe(true);
            expect(result.data.id).toBe(taskId);
            expect(result.data.status).toBe('completed');
            expect(result.data.progress).toBe(100);
        });

        test('应该获取用户任务列表', async () => {
            const userId = 1;
            const options = { page: 1, limit: 10 };

            // 模拟数据库查询
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // 总数查询
                .mockResolvedValueOnce({ // 任务列表查询
                    rows: [
                        {
                            id: 'task-1',
                            name: 'Export 1',
                            data_type: 'test-results',
                            format: 'json',
                            status: 'completed',
                            progress: 100,
                            created_at: new Date()
                        },
                        {
                            id: 'task-2',
                            name: 'Export 2',
                            data_type: 'monitoring-data',
                            format: 'csv',
                            status: 'processing',
                            progress: 50,
                            created_at: new Date()
                        }
                    ]
                });

            const result = await exportService.getUserTasks(userId, options);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(10);
        });
    });

    describe('数据获取', () => {
        test('应该获取测试结果数据', async () => {
            const userId = 1;
            const dateRange = { start: '2024-01-01', end: '2024-01-31' };
            const filters = { testTypes: ['seo', 'performance'] };

            // 模拟数据库查询
            mockDbPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, test_name: 'SEO Test', test_type: 'seo', status: 'completed' },
                    { id: 2, test_name: 'Performance Test', test_type: 'performance', status: 'completed' }
                ]
            });

            const result = await exportService.fetchTestResults(userId, dateRange, filters);

            expect(result).toHaveLength(2);
            expect(result[0].test_type).toBe('seo');
            expect(result[1].test_type).toBe('performance');
        });

        test('应该获取监控数据', async () => {
            const userId = 1;
            const dateRange = { start: '2024-01-01', end: '2024-01-31' };
            const filters = {};

            // 模拟数据库查询
            mockDbPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, target_name: 'Website 1', status: 'up', response_time: 200 },
                    { id: 2, target_name: 'Website 2', status: 'down', response_time: null }
                ]
            });

            const result = await exportService.fetchMonitoringData(userId, dateRange, filters);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe('up');
            expect(result[1].status).toBe('down');
        });
    });

    describe('文件压缩', () => {
        test('应该成功压缩文件', async () => {
            // 创建测试文件
            const testFilePath = path.join(testExportDir, 'test-file.json');
            const testContent = JSON.stringify({ test: 'data' });
            await fs.writeFile(testFilePath, testContent);

            const compressedPath = await exportService.compressFile(testFilePath, 'test-task');

            expect(compressedPath).toMatch(/\.zip$/);

            // 验证压缩文件存在
            const stats = await fs.stat(compressedPath);
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);

            // 验证原文件被删除
            await expect(fs.access(testFilePath)).rejects.toThrow();
        });
    });

    describe('错误处理', () => {
        test('应该处理数据库连接错误', async () => {
            mockDbPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const userId = 1;
            const config = {
                dataType: 'test-results',
                format: 'json',
                dateRange: {},
                filters: {},
                options: {}
            };

            await expect(exportService.createExportTask(userId, config))
                .rejects.toThrow('创建导出任务失败');
        });

        test('应该处理文件写入错误', async () => {
            // 使用无效路径
            exportService.exportDir = '/invalid/path';

            const testData = [{ id: 1, name: 'Test' }];
            const config = { dataType: 'test-results', format: 'json' };

            await expect(exportService.exportToJSON(testData, 'test', config))
                .rejects.toThrow('JSON导出失败');
        });
    });

    describe('清理功能', () => {
        test('应该清理过期文件', async () => {
            // 创建测试文件
            const oldFile = path.join(testExportDir, 'old-file.json');
            const newFile = path.join(testExportDir, 'new-file.json');

            await fs.writeFile(oldFile, 'old content');
            await fs.writeFile(newFile, 'new content');

            // 修改旧文件的时间戳
            const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10天前
            await fs.utimes(oldFile, oldTime, oldTime);

            const result = await exportService.cleanupExpiredFiles(7);

            expect(result.success).toBe(true);
            expect(result.data.deletedCount).toBe(1);

            // 验证旧文件被删除，新文件保留
            await expect(fs.access(oldFile)).rejects.toThrow();
            await expect(fs.access(newFile)).resolves.not.toThrow();
        });
    });
});