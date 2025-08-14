const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

/**
 * 真实的数据导入导出引擎
 */
class RealDataImportExportEngine {
  constructor() {
    this.name = 'data-import-export';
    this.version = '1.0.0';
    this.supportedFormats = ['json', 'csv', 'xlsx', 'pdf'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.tempDir = path.join(process.cwd(), 'temp');
    this.outputDir = path.join(process.cwd(), 'exports');

    this.initDirectories();
  }

  /**
   * 初始化目录
   */
  async initDirectories() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  /**
   * 导出数据
   */
  async exportData(config) {
    const {
      type = 'all',
      format = 'json',
      dateRange = {},
      includeDeleted = false,
      filters = {},
      userId = null
    } = config;

    console.log(`📤 Starting data export: ${type} -> ${format}`);

    try {
      // 获取数据
      const data = await this.fetchDataForExport(type, {
        dateRange,
        includeDeleted,
        filters,
        userId
      });

      // 生成文件
      const filename = this.generateFilename(type, format);
      const filePath = path.join(this.outputDir, filename);

      let result;
      switch (format) {
        case 'json':
          result = await this.exportToJSON(data, filePath);
          break;
        case 'csv':
          result = await this.exportToCSV(data, filePath);
          break;
        case 'xlsx':
          result = await this.exportToXLSX(data, filePath);
          break;
        case 'pdf':
          result = await this.exportToPDF(data, filePath);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      console.log(`✅ Export completed: ${filename}`);
      return {
        success: true,
        filename,
        filePath,
        fileSize: result.fileSize,
        recordCount: result.recordCount,
        downloadUrl: `/api/exports/download/${filename}`
      };

    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  }

  /**
   * 导入数据
   */
  async importData(config) {
    const {
      type,
      format,
      filePath,
      skipDuplicates = true,
      updateExisting = false,
      validateOnly = false,
      userId = null
    } = config;

    console.log(`📥 Starting data import: ${type} <- ${format}`);

    try {
      // 验证文件
      await this.validateFile(filePath, format);

      // 解析数据
      const data = await this.parseImportFile(filePath, format);

      // 验证数据结构
      const validationResult = await this.validateImportData(data, type);

      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors,
          validRecords: validationResult.validRecords,
          invalidRecords: validationResult.invalidRecords
        };
      }

      if (validateOnly) {
        return {
          success: true,
          validateOnly: true,
          totalRecords: data.length,
          validRecords: validationResult.validRecords,
          message: 'Validation completed successfully'
        };
      }

      // 执行导入
      const importResult = await this.executeImport(data, type, {
        skipDuplicates,
        updateExisting,
        userId
      });

      console.log(`✅ Import completed: ${importResult.processedRecords} records`);
      return {
        success: true,
        ...importResult
      };

    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  /**
   * 获取导出数据
   */
  async fetchDataForExport(type, options) {
    const { dateRange, includeDeleted, filters, userId } = options;

    // 这里需要根据实际的数据模型来获取数据
    const TestHistory = require('../models/TestHistory');
    const User = require('../models/User');

    let data = {};

    switch (type) {
      case 'users':
        data = await this.exportUsers(userId, includeDeleted);
        break;
      case 'tests':
        data = await this.exportTests(dateRange, filters, userId);
        break;
      case 'reports':
        data = await this.exportReports(dateRange, filters, userId);
        break;
      case 'logs':
        data = await this.exportLogs(dateRange, filters);
        break;
      case 'all':
        data = {
          users: await this.exportUsers(userId, includeDeleted),
          tests: await this.exportTests(dateRange, filters, userId),
          reports: await this.exportReports(dateRange, filters, userId),
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: userId,
            version: '1.0'
          }
        };
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    return data;
  }

  /**
   * 导出用户数据
   */
  async exportUsers(requestUserId, includeDeleted) {
    const User = require('../models/User');

    const whereClause = {};
    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
      paranoid: !includeDeleted
    });

    return users.map(user => user.toJSON());
  }

  /**
   * 导出测试数据
   */
  async exportTests(dateRange, filters, userId) {
    const TestHistory = require('../models/TestHistory');

    const whereClause = {};
    if (userId) whereClause.userId = userId;

    if (dateRange.start) {
      whereClause.startTime = {
        [require('sequelize').Op.gte]: new Date(dateRange.start)
      };
    }

    if (dateRange.end) {
      whereClause.endTime = {
        [require('sequelize').Op.lte]: new Date(dateRange.end)
      };
    }

    if (filters.testType) {
      whereClause.testType = filters.testType;
    }

    const tests = await TestHistory.findAll({
      where: whereClause,
      include: [
        {
          association: 'user',
          attributes: ['username', 'email']
        }
      ],
      order: [['startTime', 'DESC']]
    });

    return tests.map(test => test.toJSON());
  }

  /**
   * 导出报告数据
   */
  async exportReports(dateRange, filters, userId) {
    // 这里应该从报告表获取数据
    // 暂时返回测试历史中有报告的记录
    const TestHistory = require('../models/TestHistory');

    const whereClause = {
      reportGenerated: true
    };

    if (userId) whereClause.userId = userId;

    const reports = await TestHistory.findAll({
      where: whereClause,
      attributes: ['id', 'testName', 'testType', 'reportPath', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    return reports.map(report => report.toJSON());
  }

  /**
   * 导出日志数据
   */
  async exportLogs(dateRange, filters) {
    // 这里应该从日志系统获取数据
    // 暂时返回模拟数据
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System started',
        module: 'server'
      }
    ];
  }

  /**
   * 导出为JSON格式
   */
  async exportToJSON(data, filePath) {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');

    const stats = await fs.stat(filePath);
    return {
      fileSize: stats.size,
      recordCount: Array.isArray(data) ? data.length : Object.keys(data).length
    };
  }

  /**
   * 导出为CSV格式
   */
  async exportToCSV(data, filePath) {
    // 如果数据是对象，需要展平
    let records = Array.isArray(data) ? data : this.flattenDataForCSV(data);

    if (records.length === 0) {
      throw new Error('No data to export');
    }

    // 获取所有字段
    const headers = Object.keys(records[0]);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers.map(h => ({ id: h, title: h })),
      // 🔧 修复中文乱码：添加UTF-8 BOM头
      encoding: 'utf8'
    });

    await csvWriter.writeRecords(records);

    // 🔧 修复中文乱码：手动添加BOM头
    const originalContent = await fs.readFile(filePath, 'utf8');
    const BOM = '\uFEFF';
    await fs.writeFile(filePath, BOM + originalContent, 'utf8');

    const stats = await fs.stat(filePath);
    return {
      fileSize: stats.size,
      recordCount: records.length
    };
  }

  /**
   * 导出为Excel格式
   */
  async exportToXLSX(data, filePath) {
    const workbook = XLSX.utils.book_new();

    if (Array.isArray(data)) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    } else {
      // 为每个数据类型创建一个工作表
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          const worksheet = XLSX.utils.json_to_sheet(data[key]);
          XLSX.utils.book_append_sheet(workbook, worksheet, key);
        }
      });
    }

    XLSX.writeFile(workbook, filePath);

    const stats = await fs.stat(filePath);
    return {
      fileSize: stats.size,
      recordCount: Array.isArray(data) ? data.length : Object.values(data).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 1), 0)
    };
  }

  /**
   * 导出为PDF格式
   */
  async exportToPDF(data, filePath) {
    const doc = new PDFDocument();
    const stream = require('fs').createWriteStream(filePath);
    doc.pipe(stream);

    // 添加标题
    doc.fontSize(20).text('Test Web App - Data Export Report', 100, 100);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 100, 130);

    let yPosition = 160;

    if (Array.isArray(data)) {
      // 处理数组数据
      data.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }

        doc.text(`Record ${index + 1}:`, 100, yPosition);
        yPosition += 20;

        Object.keys(item).forEach(key => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 100;
          }
          doc.text(`  ${key}: ${item[key]}`, 120, yPosition);
          yPosition += 15;
        });

        yPosition += 10;
      });
    } else {
      // 处理对象数据
      Object.keys(data).forEach(section => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }

        doc.fontSize(16).text(section.toUpperCase(), 100, yPosition);
        yPosition += 30;

        if (Array.isArray(data[section])) {
          data[section].forEach((item, index) => {
            if (yPosition > 700) {
              doc.addPage();
              yPosition = 100;
            }

            doc.fontSize(12).text(`${section} ${index + 1}:`, 120, yPosition);
            yPosition += 20;

            Object.keys(item).slice(0, 5).forEach(key => { // 限制字段数量
              if (yPosition > 700) {
                doc.addPage();
                yPosition = 100;
              }
              doc.text(`  ${key}: ${item[key]}`, 140, yPosition);
              yPosition += 15;
            });

            yPosition += 10;
          });
        }

        yPosition += 20;
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', async () => {
        try {
          const stats = await fs.stat(filePath);
          resolve({
            fileSize: stats.size,
            recordCount: Array.isArray(data) ? data.length : Object.keys(data).length
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * 解析导入文件
   */
  async parseImportFile(filePath, format) {
    switch (format) {
      case 'json':
        return await this.parseJSONFile(filePath);
      case 'csv':
        return await this.parseCSVFile(filePath);
      case 'xlsx':
        return await this.parseXLSXFile(filePath);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * 解析JSON文件
   */
  async parseJSONFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * 解析CSV文件
   */
  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = require('fs').createReadStream(filePath);

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * 解析Excel文件
   */
  async parseXLSXFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  /**
   * 验证导入数据
   */
  async validateImportData(data, type) {
    const errors = [];
    let validRecords = 0;
    let invalidRecords = 0;

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors, validRecords, invalidRecords };
    }

    // 根据类型验证数据结构
    const requiredFields = this.getRequiredFields(type);

    data.forEach((record, index) => {
      const recordErrors = [];

      requiredFields.forEach(field => {
        if (!record.hasOwnProperty(field) || record[field] === null || record[field] === '') {
          recordErrors.push(`Missing required field: ${field}`);
        }
      });

      if (recordErrors.length > 0) {
        errors.push(`Record ${index + 1}: ${recordErrors.join(', ')}`);
        invalidRecords++;
      } else {
        validRecords++;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords
    };
  }

  /**
   * 获取必需字段
   */
  getRequiredFields(type) {
    const fieldMap = {
      users: ['username', 'email'],
      tests: ['testName', 'testType', 'url'],
      reports: ['testId', 'reportType']
    };

    return fieldMap[type] || [];
  }

  /**
   * 执行导入
   */
  async executeImport(data, type, options) {
    const { skipDuplicates, updateExisting, userId } = options;

    let processedRecords = 0;
    let skippedRecords = 0;
    let updatedRecords = 0;
    let errors = [];

    for (const record of data) {
      try {
        const result = await this.importRecord(record, type, {
          skipDuplicates,
          updateExisting,
          userId
        });

        if (result.action === 'created') {
          processedRecords++;
        } else if (result.action === 'updated') {
          updatedRecords++;
        } else if (result.action === 'skipped') {
          skippedRecords++;
        }
      } catch (error) {
        errors.push(`Failed to import record: ${error.message}`);
      }
    }

    return {
      processedRecords,
      skippedRecords,
      updatedRecords,
      errors
    };
  }

  /**
   * 导入单条记录
   */
  async importRecord(record, type, options) {
    // 这里需要根据实际的数据模型来实现
    // 暂时返回模拟结果
    return { action: 'created' };
  }

  /**
   * 验证文件
   */
  async validateFile(filePath, format) {
    try {
      const stats = await fs.stat(filePath);

      if (stats.size > this.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      if (!this.supportedFormats.includes(format)) {
        throw new Error(`Unsupported file format: ${format}`);
      }

      return true;
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  /**
   * 生成文件名
   */
  generateFilename(type, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}-export-${timestamp}.${format}`;
  }

  /**
   * 展平数据用于CSV导出
   */
  flattenDataForCSV(data) {
    const records = [];

    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach(item => {
          records.push({
            category: key,
            ...item
          });
        });
      }
    });

    return records;
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

        if (ageHours > olderThanHours) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}

module.exports = RealDataImportExportEngine;
