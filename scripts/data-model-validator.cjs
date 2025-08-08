#!/usr/bin/env node

/**
 * 数据模型一致性验证工具
 * 验证前后端数据模型的一致性
 * 版本: v1.0.0
 * 创建时间: 2024-08-08
 */

const fs = require('fs');
const path = require('path');

class DataModelValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.validatedModels = 0;
    this.totalModels = 0;
    this.modelMappings = new Map();
  }

  /**
   * 执行数据模型验证
   */
  async validate() {
    console.log('🔍 数据模型一致性验证');
    console.log('=' .repeat(60));

    try {
      // 1. 验证统一类型定义
      await this.validateUnifiedTypes();
      
      // 2. 验证User模型一致性
      await this.validateUserModel();
      
      // 3. 验证TestResult模型一致性
      await this.validateTestResultModel();
      
      // 4. 验证API响应格式一致性
      await this.validateApiResponseModel();
      
      // 5. 验证数据库字段映射
      await this.validateDatabaseMapping();
      
      // 6. 验证枚举值一致性
      await this.validateEnumConsistency();
      
      // 生成验证报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 验证统一类型定义
   */
  async validateUnifiedTypes() {
    console.log('📋 验证统一类型定义...');

    const unifiedFiles = [
      'src/types/unified/user.ts',
      'src/types/unified/testResult.ts',
      'src/types/unified/apiResponse.ts'
    ];

    for (const file of unifiedFiles) {
      if (!fs.existsSync(file)) {
        this.issues.push(`缺少统一类型定义文件: ${file}`);
      } else {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查是否包含必要的导出
        if (!content.includes('export interface') && !content.includes('export enum')) {
          this.warnings.push(`${file}可能缺少类型导出`);
        }
        
        // 检查是否有数据转换函数
        if (file.includes('user.ts') || file.includes('testResult.ts')) {
          if (!content.includes('fromDatabaseFields') || !content.includes('toDatabaseFields')) {
            this.warnings.push(`${file}缺少数据转换函数`);
          }
        }
      }
    }

    // 检查common.ts是否正确重新导出
    const commonPath = 'src/types/common.ts';
    if (fs.existsSync(commonPath)) {
      const content = fs.readFileSync(commonPath, 'utf8');
      
      for (const file of unifiedFiles) {
        const fileName = path.basename(file, '.ts');
        if (!content.includes(`from './unified/${fileName}'`)) {
          this.issues.push(`common.ts未重新导出${fileName}的类型`);
        }
      }
    }

    console.log('  ✅ 统一类型定义验证完成');
  }

  /**
   * 验证User模型一致性
   */
  async validateUserModel() {
    console.log('👤 验证User模型一致性...');

    // 检查前端统一类型定义
    const frontendUserPath = 'src/types/unified/user.ts';
    let frontendUserFields = [];
    
    if (fs.existsSync(frontendUserPath)) {
      const content = fs.readFileSync(frontendUserPath, 'utf8');
      frontendUserFields = this.extractInterfaceFields(content, 'User');
    }

    // 检查后端模型定义
    const backendUserPath = 'server/models/User.js';
    let backendUserFields = [];
    
    if (fs.existsSync(backendUserPath)) {
      const content = fs.readFileSync(backendUserPath, 'utf8');
      backendUserFields = this.extractJSClassFields(content);
    }

    // 比较字段一致性
    this.compareModelFields('User', frontendUserFields, backendUserFields);

    // 检查枚举值一致性
    this.validateUserEnums();

    console.log('  ✅ User模型一致性验证完成');
  }

  /**
   * 验证TestResult模型一致性
   */
  async validateTestResultModel() {
    console.log('🧪 验证TestResult模型一致性...');

    // 检查前端统一类型定义
    const frontendTestPath = 'src/types/unified/testResult.ts';
    let frontendTestFields = [];
    
    if (fs.existsSync(frontendTestPath)) {
      const content = fs.readFileSync(frontendTestPath, 'utf8');
      frontendTestFields = this.extractInterfaceFields(content, 'TestResult');
    }

    // 检查数据库schema
    const schemaPath = 'server/scripts/optimized-database-schema.sql';
    let dbTestFields = [];
    
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      dbTestFields = this.extractSQLTableFields(content, 'test_results');
    }

    // 比较字段一致性
    this.compareModelFields('TestResult', frontendTestFields, dbTestFields);

    console.log('  ✅ TestResult模型一致性验证完成');
  }

  /**
   * 验证API响应格式一致性
   */
  async validateApiResponseModel() {
    console.log('🌐 验证API响应格式一致性...');

    // 检查前端API响应类型
    const frontendApiPath = 'src/types/unified/apiResponse.ts';
    if (fs.existsSync(frontendApiPath)) {
      const content = fs.readFileSync(frontendApiPath, 'utf8');
      
      // 检查必要的接口定义
      const requiredInterfaces = ['ApiResponse', 'ApiError', 'PaginationInfo'];
      for (const interfaceName of requiredInterfaces) {
        if (!content.includes(`interface ${interfaceName}`)) {
          this.issues.push(`API响应类型缺少${interfaceName}接口`);
        }
      }
    }

    // 检查后端API响应实现
    const backendApiPath = 'server/utils/ApiResponse.js';
    if (fs.existsSync(backendApiPath)) {
      const content = fs.readFileSync(backendApiPath, 'utf8');
      
      // 检查响应格式字段
      const requiredFields = ['success', 'message', 'data', 'timestamp'];
      for (const field of requiredFields) {
        if (!content.includes(`${field}:`)) {
          this.warnings.push(`后端API响应可能缺少${field}字段`);
        }
      }
    }

    console.log('  ✅ API响应格式一致性验证完成');
  }

  /**
   * 验证数据库字段映射
   */
  async validateDatabaseMapping() {
    console.log('🗄️ 验证数据库字段映射...');

    // 检查User模型的数据库映射
    const userPath = 'src/types/unified/user.ts';
    if (fs.existsSync(userPath)) {
      const content = fs.readFileSync(userPath, 'utf8');
      
      // 检查是否有数据库字段映射接口
      if (!content.includes('UserDatabaseFields')) {
        this.issues.push('User模型缺少数据库字段映射接口');
      }
      
      // 检查转换函数
      if (!content.includes('fromDatabaseFields') || !content.includes('toDatabaseFields')) {
        this.issues.push('User模型缺少数据库转换函数');
      }
    }

    // 检查TestResult模型的数据库映射
    const testPath = 'src/types/unified/testResult.ts';
    if (fs.existsSync(testPath)) {
      const content = fs.readFileSync(testPath, 'utf8');
      
      // 检查是否有数据库字段映射接口
      if (!content.includes('TestResultDatabaseFields')) {
        this.issues.push('TestResult模型缺少数据库字段映射接口');
      }
    }

    console.log('  ✅ 数据库字段映射验证完成');
  }

  /**
   * 验证枚举值一致性
   */
  async validateEnumConsistency() {
    console.log('🔢 验证枚举值一致性...');

    // 验证用户角色枚举
    this.validateUserEnums();
    
    // 验证测试类型枚举
    this.validateTestEnums();

    console.log('  ✅ 枚举值一致性验证完成');
  }

  /**
   * 验证用户相关枚举
   */
  validateUserEnums() {
    const frontendPath = 'src/types/unified/user.ts';
    const backendPath = 'server/models/User.js';
    const schemaPath = 'server/scripts/optimized-database-schema.sql';

    let frontendRoles = [];
    let backendRoles = [];
    let dbRoles = [];

    // 提取前端枚举
    if (fs.existsSync(frontendPath)) {
      const content = fs.readFileSync(frontendPath, 'utf8');
      frontendRoles = this.extractEnumValues(content, 'UserRole');
    }

    // 提取后端枚举
    if (fs.existsSync(backendPath)) {
      const content = fs.readFileSync(backendPath, 'utf8');
      const match = content.match(/UserRole\s*=\s*{([^}]+)}/);
      if (match) {
        backendRoles = match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
      }
    }

    // 提取数据库约束
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const match = content.match(/role.*CHECK.*IN\s*\(([^)]+)\)/);
      if (match) {
        dbRoles = match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
      }
    }

    // 比较枚举值
    this.compareEnumValues('UserRole', frontendRoles, backendRoles, dbRoles);
  }

  /**
   * 验证测试相关枚举
   */
  validateTestEnums() {
    const frontendPath = 'src/types/unified/testResult.ts';
    const schemaPath = 'server/scripts/optimized-database-schema.sql';

    let frontendTypes = [];
    let dbTypes = [];

    // 提取前端测试类型枚举
    if (fs.existsSync(frontendPath)) {
      const content = fs.readFileSync(frontendPath, 'utf8');
      frontendTypes = this.extractEnumValues(content, 'TestType');
    }

    // 提取数据库测试类型约束
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const match = content.match(/test_type.*CHECK.*IN\s*\(([^)]+)\)/);
      if (match) {
        dbTypes = match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
      }
    }

    // 比较枚举值
    this.compareEnumValues('TestType', frontendTypes, [], dbTypes);
  }

  /**
   * 提取TypeScript接口字段
   */
  extractInterfaceFields(content, interfaceName) {
    const regex = new RegExp(`interface\\s+${interfaceName}\\s*{([^}]+)}`, 's');
    const match = content.match(regex);
    
    if (!match) return [];
    
    const fields = [];
    const fieldLines = match[1].split('\n');
    
    for (const line of fieldLines) {
      const fieldMatch = line.trim().match(/^(\w+)(\?)?:\s*(.+);?$/);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          optional: !!fieldMatch[2],
          type: fieldMatch[3].replace(/;$/, '').trim()
        });
      }
    }
    
    return fields;
  }

  /**
   * 提取JavaScript类字段
   */
  extractJSClassFields(content) {
    const fields = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const fieldMatch = line.trim().match(/^this\.(\w+)\s*=/);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          optional: false,
          type: 'any'
        });
      }
    }
    
    return fields;
  }

  /**
   * 提取SQL表字段
   */
  extractSQLTableFields(content, tableName) {
    const regex = new RegExp(`CREATE TABLE.*${tableName}\\s*\\(([^;]+)\\)`, 's');
    const match = content.match(regex);
    
    if (!match) return [];
    
    const fields = [];
    const fieldLines = match[1].split('\n');
    
    for (const line of fieldLines) {
      const fieldMatch = line.trim().match(/^(\w+)\s+(\w+)/);
      if (fieldMatch && !fieldMatch[1].toUpperCase().includes('CONSTRAINT')) {
        fields.push({
          name: fieldMatch[1],
          optional: !line.includes('NOT NULL'),
          type: fieldMatch[2]
        });
      }
    }
    
    return fields;
  }

  /**
   * 提取枚举值
   */
  extractEnumValues(content, enumName) {
    const regex = new RegExp(`enum\\s+${enumName}\\s*{([^}]+)}`, 's');
    const match = content.match(regex);
    
    if (!match) return [];
    
    const values = [];
    const lines = match[1].split('\n');
    
    for (const line of lines) {
      const valueMatch = line.trim().match(/(\w+)\s*=\s*'([^']+)'/);
      if (valueMatch) {
        values.push(valueMatch[2]);
      }
    }
    
    return values;
  }

  /**
   * 比较模型字段
   */
  compareModelFields(modelName, frontendFields, backendFields) {
    const frontendFieldNames = frontendFields.map(f => f.name);
    const backendFieldNames = backendFields.map(f => f.name);
    
    // 检查缺失字段
    const missingInBackend = frontendFieldNames.filter(name => !backendFieldNames.includes(name));
    const missingInFrontend = backendFieldNames.filter(name => !frontendFieldNames.includes(name));
    
    if (missingInBackend.length > 0) {
      this.warnings.push(`${modelName}模型后端缺少字段: ${missingInBackend.join(', ')}`);
    }
    
    if (missingInFrontend.length > 0) {
      this.warnings.push(`${modelName}模型前端缺少字段: ${missingInFrontend.join(', ')}`);
    }
    
    this.validatedModels++;
  }

  /**
   * 比较枚举值
   */
  compareEnumValues(enumName, frontend, backend, database) {
    const allSources = [
      { name: '前端', values: frontend },
      { name: '后端', values: backend },
      { name: '数据库', values: database }
    ].filter(source => source.values.length > 0);

    if (allSources.length < 2) return;

    // 检查所有源的枚举值是否一致
    const baseValues = allSources[0].values;
    
    for (let i = 1; i < allSources.length; i++) {
      const currentValues = allSources[i].values;
      const missing = baseValues.filter(v => !currentValues.includes(v));
      const extra = currentValues.filter(v => !baseValues.includes(v));
      
      if (missing.length > 0 || extra.length > 0) {
        this.issues.push(`${enumName}枚举在${allSources[0].name}和${allSources[i].name}之间不一致`);
      }
    }
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 数据模型验证报告');
    console.log('=' .repeat(60));
    
    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;
    
    console.log(`📈 验证统计:`);
    console.log(`  - 已验证模型: ${this.validatedModels}`);
    console.log(`  - 发现问题: ${totalIssues}`);
    console.log(`  - 警告信息: ${totalWarnings}`);
    
    if (totalIssues === 0 && totalWarnings === 0) {
      console.log('\n✅ 所有检查通过，数据模型一致性良好！');
    } else {
      console.log(`\n⚠️ 发现 ${totalIssues} 个问题和 ${totalWarnings} 个警告`);
    }
    
    // 详细问题
    if (totalIssues > 0) {
      console.log('\n❌ 发现的问题:');
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    // 警告信息
    if (totalWarnings > 0) {
      console.log('\n⚠️ 警告信息:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // 建议
    console.log('\n💡 建议:');
    console.log('  1. 定期运行此验证工具确保数据模型一致性');
    console.log('  2. 在修改数据模型时同时更新前后端定义');
    console.log('  3. 使用统一的类型定义文件避免重复');
    console.log('  4. 建立数据模型变更的代码审查流程');
    
    console.log('\n验证完成！');
    
    // 如果有严重问题，退出时返回错误代码
    if (totalIssues > 0) {
      process.exit(1);
    }
  }
}

// 执行验证
if (require.main === module) {
  const validator = new DataModelValidator();
  validator.validate().catch(error => {
    console.error('验证失败:', error);
    process.exit(1);
  });
}

module.exports = DataModelValidator;
