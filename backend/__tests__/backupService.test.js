/**
 * 备份服务测试
 */

const BackupService = require('../services/dataManagement/backupService');
const path = require('path');
const fs = require('fs').promises;

// 模拟数据库连接池
const mockDbPool = {
    query: jest.fn()
};

// 模拟数据库配置
const mockDbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'testweb_test',
    user: 'postgres',
    password: 'postgres'
};

describe('BackupService', () => {
    let backupService;
    let testBackupDir;
    let testTempDir;

    beforeEach(async () => {
        // 创建测试目录
        testBackupDir = path.join(__dirname, '../temp/test-backups');
        testTempDir = path.join(__dirname, '../temp/test-backup-temp');

        await fs.mkdir(testBackupDir, { recursive: true });
        await fs.mkdir(testTempDir, { recursive: true });

        // 创建服务实例
        backupService = new BackupService(mockDbPool, mockDbConfig);
        backupService.backupDir = testBackupDir;
        backupService.tempDir = testTempDir;

        // 停止定时任务以避免测试干扰
        backupService.stopScheduledBackups();

        // 重置模拟
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // 清理测试文件
        try {
            const files = await fs.readdir(testBackupDir);
            for (const file of files) {
                await fs.unlink(path.join(testBackupDir, file));
            }
        } catch (error) {
            // 忽略清理错误
        }

        try {
            const files = await fs.readdir(testTempDir);
            for (const file of files) {
                await fs.unlink(path.join(testTempDir, file));
            }
        } catch (error) {
            // 忽略清理错误
        }

        // 停止定时任务
        if (backupService) {
            backupService.stopScheduledBackups();
        }
    });

    describe('初始化', () => {
        test('应该正确初始化备份服务', () => {
            expect(backupService.dbPool).toBe(mockDbPool);
            expect(backupService.dbConfig).toBe(mockDbConfig);
            expect(backupService.maxBackupRetention).toBe(30);
            expect(backupService.maxBackupCount).toBe(100);
        });

        test('应该创建必要的目录', async () => {
            const backupDirExists = await fs.access(testBackupDir).then(() => true).catch(() => false);
            const tempDirExists = await fs.access(testTempDir).then(() => true).catch(() => false);

            expect(backupDirExists).toBe(true);
            expect(tempDirExists).toBe(true);
        });
    });

    describe('备份文件验证', () => {
        test('应该验证有效的SQL文件', async () => {
            const testFilePath = path.join(testTempDir, 'test.sql');
            await fs.writeFile(testFilePath, 'SELECT 1;');

            await expect(backupService.validateBackupFile(testFilePath)).resolves.toBe(true);
        });

        test('应该验证有效的压缩文件', async () => {
            const testFilePath = path.join(testTempDir, 'test.sql.gz');
            await fs.writeFile(testFilePath, 'compressed content');

            await expect(backupService.validateBackupFile(testFilePath)).resolves.toBe(true);
        });

        test('应该拒绝空文件', async () => {
            const testFilePath = path.join(testTempDir, 'empty.sql');
            await fs.writeFile(testFilePath, '');

            await expect(backupService.validateBackupFile(testFilePath))
                .rejects.toThrow('备份文件为空');
        });

        test('应该拒绝不支持的文件格式', async () => {
            const testFilePath = path.join(testTempDir, 'test.txt');
            await fs.writeFile(testFilePath, 'some content');

            await expect(backupService.validateBackupFile(testFilePath))
                .rejects.toThrow('不支持的备份文件格式');
        });

        test('应该拒绝不存在的文件', async () => {
            const testFilePath = path.join(testTempDir, 'nonexistent.sql');

            await expect(backupService.validateBackupFile(testFilePath))
                .rejects.toThrow('备份文件验证失败');
        });
    });

    describe('备份列表管理', () => {
        test('应该获取空的备份列表', async () => {
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // 总数查询
                .mockResolvedValueOnce({ rows: [] }); // 备份列表查询

            const result = await backupService.getBackupList();

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.pagination.total).toBe(0);
        });

        test('应该获取备份列表', async () => {
            const mockBackups = [
                {
                    id: 'backup-1',
                    name: 'Test Backup 1',
                    type: 'full',
                    status: 'completed',
                    backup_path: '/path/to/backup1.sql.gz',
                    file_size: 1024,
                    compressed_size: 512,
                    tables_included: ['users', 'test_sessions'],
                    created_at: new Date(),
                    completed_at: new Date()
                }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // 总数查询
                .mockResolvedValueOnce({ rows: mockBackups }); // 备份列表查询

            const result = await backupService.getBackupList();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe('backup-1');
            expect(result.data[0].type).toBe('full');
            expect(result.pagination.total).toBe(1);
        });

        test('应该支持分页和筛选', async () => {
            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ total: '5' }] })
                .mockResolvedValueOnce({ rows: [] });

            const options = {
                page: 2,
                limit: 10,
                type: 'full',
                status: 'completed'
            };

            const result = await backupService.getBackupList(options);

            expect(result.pagination.page).toBe(2);
            expect(result.pagination.limit).toBe(10);
            expect(result.pagination.total).toBe(5);
            expect(result.pagination.totalPages).toBe(1);
        });
    });

    describe('备份删除', () => {
        test('应该成功删除备份', async () => {
            const backupId = 'test-backup-123';
            const backupPath = path.join(testBackupDir, 'test-backup.sql.gz');

            // 创建测试备份文件
            await fs.writeFile(backupPath, 'test backup content');

            mockDbPool.query
                .mockResolvedValueOnce({ rows: [{ backup_path: backupPath }] }) // 获取备份信息
                .mockResolvedValueOnce({ rows: [] }); // 删除备份记录

            const result = await backupService.deleteBackup(backupId);

            expect(result.success).toBe(true);
            expect(result.message).toBe('备份已删除');

            // 验证文件被删除
            const fileExists = await fs.access(backupPath).then(() => true).catch(() => false);
            expect(fileExists).toBe(false);
        });

        test('应该处理不存在的备份', async () => {
            const backupId = 'nonexistent-backup';

            mockDbPool.query.mockResolvedValueOnce({ rows: [] });

            await expect(backupService.deleteBackup(backupId))
                .rejects.toThrow('备份不存在');
        });
    });

    describe('过期备份清理', () => {
        test('应该清理过期备份', async () => {
            const expiredBackups = [
                { id: 'backup-1', backup_path: path.join(testBackupDir, 'backup1.sql.gz') },
                { id: 'backup-2', backup_path: path.join(testBackupDir, 'backup2.sql.gz') }
            ];

            // 创建测试备份文件
            for (const backup of expiredBackups) {
                await fs.writeFile(backup.backup_path, 'test content');
            }

            mockDbPool.query
                .mockResolvedValueOnce({ rows: expiredBackups }) // 获取过期备份
                .mockResolvedValueOnce({ rows: [] }) // 删除第一个备份
                .mockResolvedValueOnce({ rows: [] }); // 删除第二个备份

            const result = await backupService.cleanupExpiredBackups();

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(2);

            // 验证文件被删除
            for (const backup of expiredBackups) {
                const fileExists = await fs.access(backup.backup_path).then(() => true).catch(() => false);
                expect(fileExists).toBe(false);
            }
        });

        test('应该处理清理过程中的错误', async () => {
            const expiredBackups = [
                { id: 'backup-1', backup_path: '/nonexistent/path/backup1.sql.gz' }
            ];

            mockDbPool.query
                .mockResolvedValueOnce({ rows: expiredBackups })
                .mockResolvedValueOnce({ rows: [] });

            const result = await backupService.cleanupExpiredBackups();

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(1); // 仍然删除数据库记录
        });
    });

    describe('工具函数', () => {
        test('应该生成唯一的备份ID', () => {
            const id1 = backupService.generateBackupId();
            const id2 = backupService.generateBackupId();

            expect(id1).toMatch(/^backup_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^backup_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        test('应该正确转换驼峰命名', () => {
            expect(backupService.camelToSnake('camelCase')).toBe('camel_case');
            expect(backupService.camelToSnake('PascalCase')).toBe('_pascal_case');
            expect(backupService.camelToSnake('simpleword')).toBe('simpleword');
            expect(backupService.camelToSnake('XMLHttpRequest')).toBe('_x_m_l_http_request');
        });

        test('应该计算正确的过期时间', () => {
            const expirationDate = new Date(backupService.calculateExpirationDate());
            const now = new Date();
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 30);

            // 允许1分钟的误差
            const timeDiff = Math.abs(expirationDate.getTime() - expectedDate.getTime());
            expect(timeDiff).toBeLessThan(60000);
        });

        test('应该获取文件大小', async () => {
            const testFilePath = path.join(testTempDir, 'size-test.txt');
            const testContent = 'Hello, World!';
            await fs.writeFile(testFilePath, testContent);

            const size = await backupService.getFileSize(testFilePath);
            expect(size).toBe(testContent.length);
        });

        test('应该处理不存在文件的大小查询', async () => {
            const nonexistentPath = path.join(testTempDir, 'nonexistent.txt');
            const size = await backupService.getFileSize(nonexistentPath);
            expect(size).toBe(0);
        });
    });

    describe('定时任务管理', () => {
        test('应该启动和停止定时任务', () => {
            // 这个测试主要验证方法不会抛出错误
            expect(() => {
                backupService.startScheduledBackups();
                backupService.stopScheduledBackups();
            }).not.toThrow();
        });
    });

    describe('错误处理', () => {
        test('应该处理数据库连接错误', async () => {
            mockDbPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(backupService.getBackupList())
                .rejects.toThrow('Database connection failed');
        });

        test('应该处理文件系统错误', async () => {
            // 使用无效路径
            backupService.backupDir = '/invalid/path';

            await expect(backupService.validateBackupFile('/invalid/file.sql'))
                .rejects.toThrow('备份文件验证失败');
        });
    });
});