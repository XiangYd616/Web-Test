#!/usr/bin/env node

/**
 * API响应格式验证工具
 * 验证前后端API响应格式的一致性
 * 版本: v1.0.0
 * 创建时间: 2024-08-08
 */

const fs = require('fs');
const path = require('path');

class ApiResponseValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.validatedEndpoints = 0;
    this.totalEndpoints = 0;
  }

  /**
   * 执行API响应格式验证
   */
  async validate() {
    console.log('🔍 API响应格式一致性验证');
    console.log('=' .repeat(60));

    try {
      // 1. 验证响应格式定义一致性
      await this.validateResponseDefinitions();
      
      // 2. 验证后端响应格式实现
      await this.validateBackendImplementation();
      
      // 3. 验证前端API调用期望
      await this.validateFrontendExpectations();
      
      // 4. 验证错误处理一致性
      await this.validateErrorHandling();
      
      // 5. 验证分页格式一致性
      await this.validatePaginationFormat();
      
      // 生成验证报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 验证响应格式定义一致性
   */
  async validateResponseDefinitions() {
    console.log('📋 验证响应格式定义一致性...');

    // 检查统一类型定义文件
    const unifiedApiPath = 'src/types/unified/apiResponse.ts';
    if (!fs.existsSync(unifiedApiPath)) {
      this.issues.push('缺少统一的API响应类型定义文件');
      return;
    }

    // 检查common.ts是否正确重新导出
    const commonTypesPath = 'src/types/common.ts';
    if (fs.existsSync(commonTypesPath)) {
      const content = fs.readFileSync(commonTypesPath, 'utf8');
      if (!content.includes('from \'./unified/apiResponse\'')) {
        this.issues.push('common.ts未正确重新导出统一的API响应类型');
      }
    }

    // 检查是否存在重复的API响应类型定义
    const duplicateFiles = this.findDuplicateApiTypes();
    if (duplicateFiles.length > 0) {
      this.warnings.push(`发现重复的API响应类型定义: ${duplicateFiles.join(', ')}`);
    }

    console.log('  ✅ 响应格式定义验证完成');
  }

  /**
   * 验证后端响应格式实现
   */
  async validateBackendImplementation() {
    console.log('🔧 验证后端响应格式实现...');

    // 检查ApiResponse.js
    const apiResponsePath = 'server/utils/ApiResponse.js';
    if (fs.existsSync(apiResponsePath)) {
      const content = fs.readFileSync(apiResponsePath, 'utf8');
      
      // 检查必要的响应方法
      const requiredMethods = ['success', 'error', 'paginated', 'validationError'];
      for (const method of requiredMethods) {
        if (!content.includes(`static ${method}`)) {
          this.issues.push(`ApiResponse.js缺少${method}方法`);
        }
      }
      
      // 检查响应格式是否包含必要字段
      if (!content.includes('success:') || !content.includes('timestamp:')) {
        this.issues.push('ApiResponse.js响应格式缺少必要字段');
      }
    } else {
      this.issues.push('缺少ApiResponse.js工具类');
    }

    // 检查responseFormatter中间件
    const formatterPath = 'server/api/middleware/responseFormatter.js';
    if (fs.existsSync(formatterPath)) {
      const content = fs.readFileSync(formatterPath, 'utf8');
      
      // 检查中间件是否提供统一的响应方法
      const responseMethods = ['success', 'error', 'paginated', 'created'];
      for (const method of responseMethods) {
        if (!content.includes(`res.${method} =`)) {
          this.warnings.push(`responseFormatter中间件缺少${method}方法`);
        }
      }
    }

    console.log('  ✅ 后端响应格式实现验证完成');
  }

  /**
   * 验证前端API调用期望
   */
  async validateFrontendExpectations() {
    console.log('🎯 验证前端API调用期望...');

    // 查找所有API服务文件
    const apiServiceFiles = this.findApiServiceFiles();
    
    for (const file of apiServiceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // 检查是否使用了统一的API响应类型
      if (content.includes('ApiResponse') && !content.includes('from \'../types/unified/apiResponse\'')) {
        if (!content.includes('from \'../types/common\'')) {
          this.warnings.push(`${file}未使用统一的API响应类型`);
        }
      }
      
      // 检查错误处理是否一致
      if (content.includes('.catch') || content.includes('try')) {
        if (!content.includes('response.success')) {
          this.warnings.push(`${file}的错误处理可能不一致`);
        }
      }
    }

    console.log('  ✅ 前端API调用期望验证完成');
  }

  /**
   * 验证错误处理一致性
   */
  async validateErrorHandling() {
    console.log('⚠️ 验证错误处理一致性...');

    // 检查错误代码定义
    const unifiedApiPath = 'src/types/unified/apiResponse.ts';
    if (fs.existsSync(unifiedApiPath)) {
      const content = fs.readFileSync(unifiedApiPath, 'utf8');
      
      // 检查是否定义了错误代码枚举
      if (!content.includes('enum ErrorCode')) {
        this.issues.push('缺少统一的错误代码枚举定义');
      }
      
      // 检查是否有默认错误消息
      if (!content.includes('DEFAULT_ERROR_MESSAGES')) {
        this.warnings.push('缺少默认错误消息定义');
      }
    }

    console.log('  ✅ 错误处理一致性验证完成');
  }

  /**
   * 验证分页格式一致性
   */
  async validatePaginationFormat() {
    console.log('📄 验证分页格式一致性...');

    // 检查分页类型定义
    const unifiedApiPath = 'src/types/unified/apiResponse.ts';
    if (fs.existsSync(unifiedApiPath)) {
      const content = fs.readFileSync(unifiedApiPath, 'utf8');
      
      // 检查分页接口定义
      const paginationFields = ['current', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'];
      for (const field of paginationFields) {
        if (!content.includes(`${field}:`)) {
          this.issues.push(`分页接口缺少${field}字段`);
        }
      }
    }

    console.log('  ✅ 分页格式一致性验证完成');
  }

  /**
   * 查找重复的API类型定义
   */
  findDuplicateApiTypes() {
    const duplicates = [];
    const typeFiles = [
      'src/types/api.ts',
      'src/services/api/baseApiService.ts',
      'src/engines/api/index.ts'
    ];

    for (const file of typeFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('interface ApiResponse') || content.includes('type ApiResponse')) {
          duplicates.push(file);
        }
      }
    }

    return duplicates;
  }

  /**
   * 查找API服务文件
   */
  findApiServiceFiles() {
    const files = [];
    const searchDirs = ['src/services', 'src/api', 'src/utils'];
    
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const dirFiles = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
        files.push(...dirFiles.filter(f => 
          f.includes('api') || f.includes('service') || f.includes('client')
        ));
      }
    }
    
    return files;
  }

  /**
   * 递归获取目录下的所有文件
   */
  getAllFiles(dir, extensions) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 API响应格式验证报告');
    console.log('=' .repeat(60));
    
    // 总体状态
    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;
    
    if (totalIssues === 0 && totalWarnings === 0) {
      console.log('✅ 所有检查通过，API响应格式一致性良好！');
    } else {
      console.log(`⚠️ 发现 ${totalIssues} 个问题和 ${totalWarnings} 个警告`);
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
    if (totalIssues > 0 || totalWarnings > 0) {
      console.log('\n💡 建议:');
      console.log('  1. 使用统一的API响应类型定义 (src/types/unified/apiResponse.ts)');
      console.log('  2. 确保所有API端点使用统一的响应格式');
      console.log('  3. 在前端使用类型守卫函数验证API响应');
      console.log('  4. 定期运行此验证工具确保一致性');
    }
    
    console.log('\n验证完成！');
    
    // 如果有严重问题，退出时返回错误代码
    if (totalIssues > 0) {
      process.exit(1);
    }
  }
}

// 执行验证
if (require.main === module) {
  const validator = new ApiResponseValidator();
  validator.validate().catch(error => {
    console.error('验证失败:', error);
    process.exit(1);
  });
}

module.exports = ApiResponseValidator;
