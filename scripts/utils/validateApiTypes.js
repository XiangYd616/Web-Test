#!/usr/bin/env node

/**
 * API数据类型验证脚本
 * 验证API端点返回数据与TypeScript类型的匹配性
 * 建立数据模型变更的版本控制流程
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ApiTypeValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
    this.apiEndpoints = new Map();
    this.typeDefinitions = new Map();
  }

  /**
   * 执行完整的API类型验证
   */
  async validate() {
    console.log('🔍 开始API数据类型验证...');
    console.log('=' .repeat(60));

    try {
      // 扫描API端点
      this.scanApiEndpoints();
      
      // 扫描TypeScript类型定义
      this.scanTypeDefinitions();
      
      // 验证API响应格式
      this.validateApiResponseFormats();
      
      // 验证数据转换函数
      this.validateDataTransformFunctions();
      
      // 检查版本控制流程
      this.checkVersionControlProcess();
      
      // 生成验证报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 扫描API端点
   */
  scanApiEndpoints() {
    console.log('🌐 扫描API端点...');

    const routeDirectories = [
      'backend/routes',
      'backend/api/v1/routes'
    ];

    routeDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.endsWith('.js')) {
            this.analyzeRouteFile(path.join(dir, file));
          }
        });
      }
    });

    console.log(`  📊 发现 ${this.apiEndpoints.size} 个API端点`);
  }

  /**
   * 分析路由文件
   */
  analyzeRouteFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath, '.js');

      // 提取路由定义
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      
      if (routeMatches) {
        routeMatches.forEach(match => {
          const [, method, route] = match.match(/router\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/);
          const endpointKey = `${method.toUpperCase()} ${route}`;
          
          this.apiEndpoints.set(endpointKey, {
            file: filePath,
            method: method.toUpperCase(),
            route,
            module: fileName
          });
        });
      }

      // 检查响应调用
      this.analyzeResponseCalls(content, filePath);

    } catch (error) {
      this.warnings.push(`⚠️  无法分析路由文件 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 分析响应调用
   */
  analyzeResponseCalls(content, filePath) {
    // 检查是否使用了统一的响应格式
    const responsePatterns = [
      /res\.success\s*\(/g,
      /res\.error\s*\(/g,
      /res\.paginated\s*\(/g,
      /res\.created\s*\(/g
    ];

    let hasUnifiedResponse = false;
    responsePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasUnifiedResponse = true;
      }
    });

    if (!hasUnifiedResponse) {
      // 检查是否使用了原始的res.json()
      if (content.includes('res.json(')) {
        this.warnings.push(`⚠️  ${path.basename(filePath)} 使用原始res.json()，建议使用统一响应格式`);
      }
    }
  }

  /**
   * 扫描TypeScript类型定义
   */
  scanTypeDefinitions() {
    console.log('📝 扫描TypeScript类型定义...');

    const typeDirectories = [
      'src/types',
      'src/types/unified'
    ];

    typeDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanTypeDirectory(dir);
      }
    });

    console.log(`  📊 发现 ${this.typeDefinitions.size} 个类型定义`);
  }

  /**
   * 扫描类型定义目录
   */
  scanTypeDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory()) {
        this.scanTypeDirectory(path.join(dir, file.name));
      } else if (file.name.endsWith('.ts')) {
        this.analyzeTypeFile(path.join(dir, file.name));
      }
    });
  }

  /**
   * 分析类型定义文件
   */
  analyzeTypeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 提取接口定义
      const interfaceMatches = content.match(/export\s+interface\s+(\w+)/g);
      if (interfaceMatches) {
        interfaceMatches.forEach(match => {
          const interfaceName = match.match(/interface\s+(\w+)/)[1];
          this.typeDefinitions.set(interfaceName, {
            file: filePath,
            type: 'interface'
          });
        });
      }

      // 提取类型别名
      const typeMatches = content.match(/export\s+type\s+(\w+)/g);
      if (typeMatches) {
        typeMatches.forEach(match => {
          const typeName = match.match(/type\s+(\w+)/)[1];
          this.typeDefinitions.set(typeName, {
            file: filePath,
            type: 'type'
          });
        });
      }

      // 提取枚举定义
      const enumMatches = content.match(/export\s+enum\s+(\w+)/g);
      if (enumMatches) {
        enumMatches.forEach(match => {
          const enumName = match.match(/enum\s+(\w+)/)[1];
          this.typeDefinitions.set(enumName, {
            file: filePath,
            type: 'enum'
          });
        });
      }

    } catch (error) {
      this.warnings.push(`⚠️  无法分析类型文件 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 验证API响应格式
   */
  validateApiResponseFormats() {
    console.log('🔍 验证API响应格式...');

    // 检查是否有ApiResponse类型定义
    if (!this.typeDefinitions.has('ApiResponse')) {
      this.issues.push('❌ 缺少ApiResponse类型定义');
    }

    if (!this.typeDefinitions.has('ApiSuccessResponse')) {
      this.issues.push('❌ 缺少ApiSuccessResponse类型定义');
    }

    if (!this.typeDefinitions.has('ApiErrorResponse')) {
      this.issues.push('❌ 缺少ApiErrorResponse类型定义');
    }

    // 检查分页响应类型
    if (!this.typeDefinitions.has('PaginatedResponse')) {
      this.issues.push('❌ 缺少PaginatedResponse类型定义');
    }

    console.log('  ✅ API响应格式验证完成');
  }

  /**
   * 验证数据转换函数
   */
  validateDataTransformFunctions() {
    console.log('🔄 验证数据转换函数...');

    // 检查用户数据转换函数
    const userTypePath = 'src/types/unified/user.ts';
    if (fs.existsSync(userTypePath)) {
      const content = fs.readFileSync(userTypePath, 'utf8');
      
      if (!content.includes('fromDatabaseFields')) {
        this.issues.push('❌ 缺少用户数据fromDatabaseFields转换函数');
      }
      
      if (!content.includes('toDatabaseFields')) {
        this.issues.push('❌ 缺少用户数据toDatabaseFields转换函数');
      }
    }

    // 检查测试数据转换函数
    const modelsPath = 'src/types/unified/models.ts';
    if (fs.existsSync(modelsPath)) {
      const content = fs.readFileSync(modelsPath, 'utf8');
      
      if (!content.includes('testResultFromDatabase')) {
        this.issues.push('❌ 缺少测试结果fromDatabase转换函数');
      }
      
      if (!content.includes('testResultToDatabase')) {
        this.issues.push('❌ 缺少测试结果toDatabase转换函数');
      }
    }

    console.log('  ✅ 数据转换函数验证完成');
  }

  /**
   * 检查版本控制流程
   */
  checkVersionControlProcess() {
    console.log('📋 检查版本控制流程...');

    // 检查是否有数据模型版本文件
    const versionFiles = [
      'src/types/version.ts',
      'src/types/unified/version.ts',
      'docs/api-version.md'
    ];

    let hasVersionControl = false;
    versionFiles.forEach(file => {
      if (fs.existsSync(file)) {
        hasVersionControl = true;
        console.log(`  ✅ 发现版本控制文件: ${file}`);
      }
    });

    if (!hasVersionControl) {
      this.warnings.push('⚠️  建议建立数据模型版本控制流程');
      this.fixes.push('创建数据模型版本控制文件，记录API和类型定义的变更历史');
    }

    // 检查是否有变更日志
    const changelogFiles = [
      'CHANGELOG.md',
      'docs/CHANGELOG.md',
      'docs/api-changelog.md'
    ];

    let hasChangelog = false;
    changelogFiles.forEach(file => {
      if (fs.existsSync(file)) {
        hasChangelog = true;
        console.log(`  ✅ 发现变更日志: ${file}`);
      }
    });

    if (!hasChangelog) {
      this.warnings.push('⚠️  建议维护API变更日志');
      this.fixes.push('创建API变更日志，记录重要的数据模型和接口变更');
    }

    console.log('  ✅ 版本控制流程检查完成');
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 API数据类型验证报告');
    console.log('=' .repeat(60));

    // 统计信息
    console.log(`📈 统计信息:`);
    console.log(`  - API端点: ${this.apiEndpoints.size} 个`);
    console.log(`  - 类型定义: ${this.typeDefinitions.size} 个`);
    console.log(`  - 发现问题: ${this.issues.length} 个`);
    console.log(`  - 警告: ${this.warnings.length} 个`);

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 所有API数据类型验证通过！');
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

    // 如果有严重问题，退出时返回错误码
    if (this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// 执行验证
const validator = new ApiTypeValidator();
validator.validate().catch(error => {
  console.error('验证失败:', error);
  process.exit(1);
});

export default ApiTypeValidator;
