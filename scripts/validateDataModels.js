#!/usr/bin/env node

/**
 * 数据模型一致性验证脚本
 * 验证前后端数据模型的一致性，确保类型定义同步
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataModelValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
  }

  /**
   * 执行完整的数据模型验证
   */
  async validate() {
    console.log('🔍 开始数据模型一致性验证...');
    console.log('='.repeat(60));

    try {
      // 验证类型定义文件结构
      this.validateTypeDefinitionStructure();

      // 验证用户模型一致性
      this.validateUserModel();

      // 验证测试模型一致性
      this.validateTestModel();

      // 验证API响应格式一致性
      this.validateApiResponseFormat();

      // 验证数据库字段映射
      this.validateDatabaseMapping();

      // 生成验证报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 验证类型定义文件结构
   */
  validateTypeDefinitionStructure() {
    console.log('📁 验证类型定义文件结构...');

    const requiredFiles = [
      'src/types/unified/models.ts',
      'src/types/unified/user.ts',
      'src/types/unified/apiResponse.ts',
      'src/types/common.ts'
    ];

    const redundantFiles = [
      'src/services/types/user.ts', // 应该被统一定义替代
      'src/types/user.ts' // 向后兼容文件，但应该只是重新导出
    ];

    // 检查必需文件
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.issues.push(`❌ 缺少必需的类型定义文件: ${file}`);
      } else {
        console.log(`  ✅ ${file} - 存在`);
      }
    });

    // 检查冗余文件
    redundantFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('重新导出') && !content.includes('export type')) {
          this.warnings.push(`⚠️  发现可能冗余的类型定义文件: ${file}`);
          this.fixes.push(`检查 ${file} 是否可以移除或改为重新导出统一类型`);
        }
      }
    });
  }

  /**
   * 验证用户模型一致性
   */
  validateUserModel() {
    console.log('👤 验证用户模型一致性...');

    // 检查前端统一类型定义
    const frontendUserPath = 'src/types/unified/user.ts';
    const backendUserPath = 'server/models/User.js';

    if (!fs.existsSync(frontendUserPath)) {
      this.issues.push('❌ 前端用户类型定义文件不存在');
      return;
    }

    if (!fs.existsSync(backendUserPath)) {
      this.issues.push('❌ 后端用户模型文件不存在');
      return;
    }

    // 读取文件内容
    const frontendContent = fs.readFileSync(frontendUserPath, 'utf8');
    const backendContent = fs.readFileSync(backendUserPath, 'utf8');

    // 验证枚举值一致性
    this.validateEnumConsistency('UserRole', frontendContent, backendContent);
    this.validateEnumConsistency('UserStatus', frontendContent, backendContent);
    this.validateEnumConsistency('UserPlan', frontendContent, backendContent);

    // 验证转换函数存在性
    if (!frontendContent.includes('fromDatabaseFields')) {
      this.issues.push('❌ 前端缺少 fromDatabaseFields 转换函数');
    }

    if (!frontendContent.includes('toDatabaseFields')) {
      this.issues.push('❌ 前端缺少 toDatabaseFields 转换函数');
    }

    if (!backendContent.includes('fromDatabase')) {
      this.issues.push('❌ 后端缺少 fromDatabase 转换方法');
    }

    if (!backendContent.includes('toDatabase')) {
      this.issues.push('❌ 后端缺少 toDatabase 转换方法');
    }

    console.log('  ✅ 用户模型一致性验证完成');
  }

  /**
   * 验证测试模型一致性
   */
  validateTestModel() {
    console.log('🧪 验证测试模型一致性...');

    const frontendTestPath = 'src/types/unified/models.ts';
    const backendTestPath = 'server/models/Test.js';

    if (!fs.existsSync(frontendTestPath)) {
      this.issues.push('❌ 前端测试类型定义文件不存在');
      return;
    }

    if (!fs.existsSync(backendTestPath)) {
      this.warnings.push('⚠️  后端测试模型文件不存在，可能需要创建');
      return;
    }

    const frontendContent = fs.readFileSync(frontendTestPath, 'utf8');
    const backendContent = fs.readFileSync(backendTestPath, 'utf8');

    // 验证测试类型枚举
    this.validateEnumConsistency('TestType', frontendContent, backendContent);
    this.validateEnumConsistency('TestStatus', frontendContent, backendContent);

    console.log('  ✅ 测试模型一致性验证完成');
  }

  /**
   * 验证API响应格式一致性
   */
  validateApiResponseFormat() {
    console.log('🌐 验证API响应格式一致性...');

    const frontendApiPath = 'src/types/unified/apiResponse.ts';
    const backendApiPath = 'server/utils/ApiResponse.js';
    const middlewarePath = 'server/api/middleware/responseFormatter.js';

    if (!fs.existsSync(frontendApiPath)) {
      this.issues.push('❌ 前端API响应类型定义文件不存在');
      return;
    }

    // 检查后端响应格式化工具
    const responseFormatters = [backendApiPath, middlewarePath].filter(fs.existsSync);

    if (responseFormatters.length === 0) {
      this.issues.push('❌ 后端缺少API响应格式化工具');
      return;
    }

    // 检查是否使用了推荐的responseFormatter中间件
    if (fs.existsSync(middlewarePath)) {
      console.log('  ✅ 使用推荐的responseFormatter中间件');

      // 如果同时存在ApiResponse.js，检查是否已标记为废弃
      if (fs.existsSync(backendApiPath)) {
        const apiResponseContent = fs.readFileSync(backendApiPath, 'utf8');
        if (apiResponseContent.includes('@deprecated') || apiResponseContent.includes('已废弃')) {
          console.log('  ✅ ApiResponse.js已标记为废弃，推荐使用responseFormatter');
        } else {
          this.warnings.push('⚠️  建议在ApiResponse.js中标记废弃，推荐使用responseFormatter中间件');
        }
      }
    } else {
      this.warnings.push('⚠️  建议使用responseFormatter中间件而不是ApiResponse.js');
    }

    // 验证响应格式结构
    const frontendContent = fs.readFileSync(frontendApiPath, 'utf8');

    // 检查必需的接口定义
    const requiredInterfaces = [
      'ApiSuccessResponse',
      'ApiErrorResponse',
      'ApiResponse',
      'PaginatedResponse'
    ];

    requiredInterfaces.forEach(interfaceName => {
      if (!frontendContent.includes(`interface ${interfaceName}`)) {
        this.issues.push(`❌ 前端缺少 ${interfaceName} 接口定义`);
      }
    });

    console.log('  ✅ API响应格式一致性验证完成');
  }

  /**
   * 验证数据库字段映射
   */
  validateDatabaseMapping() {
    console.log('🗄️  验证数据库字段映射...');

    // 检查数据库初始化脚本
    const dbScripts = [
      'server/scripts/compatible-init-database.sql',
      'server/scripts/master-detail-test-history-schema.sql'
    ];

    const existingScripts = dbScripts.filter(fs.existsSync);

    if (existingScripts.length === 0) {
      this.warnings.push('⚠️  未找到数据库初始化脚本');
      return;
    }

    // 验证字段命名约定
    existingScripts.forEach(script => {
      const content = fs.readFileSync(script, 'utf8');

      // 检查是否使用了一致的命名约定（snake_case）
      const tableMatches = content.match(/CREATE TABLE\s+(\w+)/gi);
      if (tableMatches) {
        tableMatches.forEach(match => {
          console.log(`  📋 发现数据表: ${match.replace(/CREATE TABLE\s+/i, '')}`);
        });
      }
    });

    console.log('  ✅ 数据库字段映射验证完成');
  }

  /**
   * 验证枚举值一致性
   */
  validateEnumConsistency(enumName, frontendContent, backendContent) {
    const frontendEnum = this.extractEnumValues(frontendContent, enumName);
    const backendEnum = this.extractEnumValues(backendContent, enumName);

    if (frontendEnum.length === 0 && backendEnum.length === 0) {
      return; // 两边都没有定义，跳过
    }

    if (frontendEnum.length === 0) {
      this.issues.push(`❌ 前端缺少 ${enumName} 枚举定义`);
      return;
    }

    if (backendEnum.length === 0) {
      this.issues.push(`❌ 后端缺少 ${enumName} 枚举定义`);
      return;
    }

    // 比较枚举值
    const frontendSet = new Set(frontendEnum);
    const backendSet = new Set(backendEnum);

    const onlyInFrontend = frontendEnum.filter(x => !backendSet.has(x));
    const onlyInBackend = backendEnum.filter(x => !frontendSet.has(x));

    if (onlyInFrontend.length > 0) {
      this.issues.push(`❌ ${enumName} 枚举值仅在前端存在: ${onlyInFrontend.join(', ')}`);
    }

    if (onlyInBackend.length > 0) {
      this.issues.push(`❌ ${enumName} 枚举值仅在后端存在: ${onlyInBackend.join(', ')}`);
    }

    if (onlyInFrontend.length === 0 && onlyInBackend.length === 0) {
      console.log(`  ✅ ${enumName} 枚举值一致`);
    }
  }

  /**
   * 提取枚举值
   */
  extractEnumValues(content, enumName) {
    const enumRegex = new RegExp(`(?:enum|const)\\s+${enumName}\\s*[=\\s]*\\{([^}]+)\\}`, 'i');
    const match = content.match(enumRegex);

    if (!match) return [];

    const enumBody = match[1];
    const values = [];

    // 提取枚举值
    const valueRegex = /(\w+)\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
    let valueMatch;

    while ((valueMatch = valueRegex.exec(enumBody)) !== null) {
      values.push(valueMatch[2]);
    }

    return values;
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 数据模型验证报告');
    console.log('='.repeat(60));

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 所有数据模型验证通过！');
      return;
    }

    if (this.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    if (this.fixes.length > 0) {
      console.log('\n🔧 建议的修复方案:');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }

    console.log(`\n📈 验证统计: ${this.issues.length} 个问题, ${this.warnings.length} 个警告`);

    // 如果有严重问题，退出时返回错误码
    if (this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// 执行验证
const validator = new DataModelValidator();
validator.validate().catch(error => {
  console.error('验证失败:', error);
  process.exit(1);
});

export default DataModelValidator;
