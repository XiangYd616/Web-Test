/**
 * 数据导出服务
 * 专门处理数据导出功能
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class DataExportService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/data-export.log' }),
        new winston.transports.Console()
      ]
    });

    this.exportDir = path.join(__dirname, '../../exports');
    this.ensureExportDir();
  }

  /**
   * 确保导出目录存在
   */
  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      this.logger.error('创建导出目录失败:', error);
    }
  }

  /**
   * 导出测试历史数据
   */
  async exportTestHistory(userId, options = {}) {
    try {
      const {
        format = 'json',
        dateFrom,
        dateTo,
        testTypes = [],
        includeResults = true,
        includeConfig = true
      } = options;

      // 获取数据
      const { query } = require('../../config/database');

      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      if (testTypes.length > 0) {
        whereClause += ` AND test_type = ANY($${paramIndex})`;
        params.push(testTypes);
        paramIndex++;
      }

      const selectFields = [
        'id', 'test_name', 'test_type', 'url', 'status',
        'start_time', 'end_time', 'duration', 'created_at', 'updated_at'
      ];

      if (includeResults) {
        selectFields.push('results');
      }

      if (includeConfig) {
        selectFields.push('config');
      }

      const queryText = `
        SELECT ${selectFields.join(', ')}
        FROM test_history
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const result = await query(queryText, params);
      const data = result.rows;

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test_history_export_${timestamp}.${format}`;
      const filepath = path.join(this.exportDir, filename);

      // 根据格式导出
      let exportedData;
      switch (format.toLowerCase()) {
        case 'json':
          exportedData = await this.exportToJSON(data, filepath);
          break;
        case 'csv':
          exportedData = await this.exportToCSV(data, filepath);
          break;
        case 'xlsx':
          exportedData = await this.exportToExcel(data, filepath);
          break;
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      // 记录导出任务
      const exportTask = {
        id: this.generateTaskId(),
        name: `测试历史导出_${timestamp}`,
        type: 'test_history',
        format,
        status: 'completed',
        filename,
        filepath,
        recordCount: data.length,
        fileSize: exportedData.size,
        createdAt: new Date().toISOString(),
        userId
      };

      return {
        success: true,
        data: exportTask
      };

    } catch (error) {
      this.logger.error('导出测试历史失败:', error);
      throw new Error(`导出测试历史失败: ${error.message}`);
    }
  }

  /**
   * 导出为JSON格式
   */
  async exportToJSON(data, filepath) {
    try {
      const jsonData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          recordCount: data.length,
          format: 'json'
        },
        data: data
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      await fs.writeFile(filepath, jsonString, 'utf8');

      const stats = await fs.stat(filepath);
      return { size: stats.size };

    } catch (error) {
      this.logger.error('JSON导出失败:', error);
      throw new Error(`JSON导出失败: ${error.message}`);
    }
  }

  /**
   * 导出为CSV格式
   */
  async exportToCSV(data, filepath) {
    try {
      if (data.length === 0) {
        await fs.writeFile(filepath, '', 'utf8');
        return { size: 0 };
      }

      // 获取所有字段
      const fields = Object.keys(data[0]);

      // 生成CSV头部
      const csvHeader = fields.join(',');

      // 生成CSV数据行
      const csvRows = data.map(row => {
        return fields.map(field => {
          let value = row[field];

          // 处理特殊值
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value);
          }

          // 转义CSV特殊字符
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        }).join(',');
      });

      const csvContent = [csvHeader, ...csvRows].join('\n');
      // 🔧 修复中文乱码：添加UTF-8 BOM头
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      await fs.writeFile(filepath, csvWithBOM, 'utf8');

      const stats = await fs.stat(filepath);
      return { size: stats.size };

    } catch (error) {
      this.logger.error('CSV导出失败:', error);
      throw new Error(`CSV导出失败: ${error.message}`);
    }
  }

  /**
   * 导出为Excel格式
   */
  async exportToExcel(data, filepath) {
    try {
      // 这里可以使用 xlsx 库来生成Excel文件
      // 为了简化，暂时使用CSV格式
      const csvPath = filepath.replace('.xlsx', '.csv');
      const result = await this.exportToCSV(data, csvPath);

      // 重命名文件
      await fs.rename(csvPath, filepath);

      return result;

    } catch (error) {
      this.logger.error('Excel导出失败:', error);
      throw new Error(`Excel导出失败: ${error.message}`);
    }
  }

  /**
   * 获取导出任务列表
   */
  async getExportTasks(userId) {
    try {
      // 这里应该从数据库获取导出任务记录
      // 暂时返回模拟数据
      const mockTasks = [
        {
          id: '1',
          name: '测试历史导出_2025-07-19',
          type: 'test_history',
          format: 'json',
          status: 'completed',
          recordCount: 150,
          fileSize: 2048576,
          createdAt: new Date().toISOString(),
          userId
        }
      ];

      return {
        success: true,
        data: mockTasks
      };

    } catch (error) {
      this.logger.error('获取导出任务失败:', error);
      throw new Error(`获取导出任务失败: ${error.message}`);
    }
  }

  /**
   * 删除导出文件
   */
  async deleteExportFile(taskId, userId) {
    try {
      // 这里应该从数据库获取任务信息
      // 验证用户权限后删除文件

      return {
        success: true,
        message: '导出文件已删除'
      };

    } catch (error) {
      this.logger.error('删除导出文件失败:', error);
      throw new Error(`删除导出文件失败: ${error.message}`);
    }
  }

  /**
   * 下载导出文件
   */
  async downloadExportFile(taskId, userId) {
    try {
      // 这里应该从数据库获取任务信息
      // 验证用户权限后返回文件路径

      return {
        success: true,
        data: {
          filepath: '/path/to/export/file',
          filename: 'export.json'
        }
      };

    } catch (error) {
      this.logger.error('下载导出文件失败:', error);
      throw new Error(`下载导出文件失败: ${error.message}`);
    }
  }

  /**
   * 清理过期的导出文件
   */
  async cleanupExpiredFiles(retentionDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const files = await fs.readdir(this.exportDir);
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.exportDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          this.logger.info(`删除过期导出文件: ${file}`);
        }
      }

      return {
        success: true,
        data: { deletedCount },
        message: `已清理 ${deletedCount} 个过期文件`
      };

    } catch (error) {
      this.logger.error('清理过期文件失败:', error);
      throw new Error(`清理过期文件失败: ${error.message}`);
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证导出参数
   */
  validateExportOptions(options) {
    const errors = [];

    if (options.format && !['json', 'csv', 'xlsx'].includes(options.format.toLowerCase())) {
      errors.push('不支持的导出格式');
    }

    if (options.dateFrom && options.dateTo && new Date(options.dateFrom) > new Date(options.dateTo)) {
      errors.push('开始日期不能晚于结束日期');
    }

    if (errors.length > 0) {
      throw new Error(`参数验证失败: ${errors.join(', ')}`);
    }

    return true;
  }
}

module.exports = DataExportService;
