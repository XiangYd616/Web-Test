#!/usr/bin/env node

/**
 * API响应格式统一修复脚本
 * 自动修复项目中API响应格式不一致的问题
 * 版本: v1.0.0
 */

const fs = require('fs');
const path = require('path');

class ApiResponseFormatFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.warnings = [];
  }

  /**
   * 执行修复
   */
  async fix() {
    console.log('🔧 API响应格式统一修复');
    console.log('=' .repeat(60));

    try {
      // 1. 修复前端API类型定义
      await this.fixFrontendApiTypes();
      
      // 2. 修复后端响应格式使用
      await this.fixBackendResponseFormat();
      
      // 3. 更新前端API服务
      await this.updateFrontendApiServices();
      
      // 4. 验证修复结果
      await this.validateFixes();
      
      // 生成修复报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 修复前端API类型定义
   */
  async fixFrontendApiTypes() {
    console.log('🎯 修复前端API类型定义...');

    // 修复baseApiService.ts中的重复类型定义
    const baseApiPath = 'src/services/api/baseApiService.ts';
    if (fs.existsSync(baseApiPath)) {
      let content = fs.readFileSync(baseApiPath, 'utf8');
      
      // 检查是否使用了重复的ApiResponse定义
      if (content.includes('export interface ApiResponse')) {
        // 替换为导入统一类型
        const newImport = `import type { ApiResponse } from '../../types/unified/apiResponse';`;
        const oldInterface = /export interface ApiResponse<T = any> \{[\s\S]*?\}/;
        
        if (!content.includes('from \'../../types/unified/apiResponse\'')) {
          content = newImport + '\n\n' + content;
        }
        
        content = content.replace(oldInterface, '// ApiResponse类型已从统一类型定义导入');
        
        fs.writeFileSync(baseApiPath, content);
        this.fixes.push('修复baseApiService.ts中的重复ApiResponse定义');
      }
    }

    console.log('  ✅ 前端API类型定义修复完成');
  }

  /**
   * 修复后端响应格式使用
   */
  async fixBackendResponseFormat() {
    console.log('🔧 修复后端响应格式使用...');

    // 查找所有路由文件
    const routeFiles = this.findRouteFiles();
    
    for (const file of routeFiles) {
      await this.fixRouteFile(file);
    }

    console.log('  ✅ 后端响应格式修复完成');
  }

  /**
   * 修复单个路由文件
   */
  async fixRouteFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 检查是否导入了旧的ApiResponse
    if (content.includes('require(\'../utils/ApiResponse\')') || 
        content.includes('require(\'../../utils/ApiResponse\')')) {
      
      // 移除旧的ApiResponse导入
      content = content.replace(/const\s+ApiResponse\s*=\s*require\(['"]\.\.\/.*?ApiResponse['"]\);?\n?/g, '');
      
      // 检查是否已经使用了responseFormatter中间件
      if (!content.includes('responseFormatter')) {
        this.warnings.push(`${filePath} 需要手动添加responseFormatter中间件`);
      }
      
      modified = true;
    }

    // 替换旧的响应格式调用
    const oldPatterns = [
      { old: /ApiResponse\.success\((.*?)\)/g, new: 'res.success($1)' },
      { old: /ApiResponse\.error\((.*?)\)/g, new: 'res.error($1)' },
      { old: /ApiResponse\.validationError\((.*?)\)/g, new: 'res.validationError($1)' },
      { old: /ApiResponse\.paginated\((.*?)\)/g, new: 'res.paginated($1)' }
    ];

    for (const pattern of oldPatterns) {
      if (pattern.old.test(content)) {
        content = content.replace(pattern.old, pattern.new);
        modified = true;
      }
    }

    // 修复直接使用res.json的错误响应
    const directJsonPattern = /res\.json\(\s*\{\s*success:\s*false[\s\S]*?\}\s*\)/g;
    if (directJsonPattern.test(content)) {
      this.warnings.push(`${filePath} 包含直接使用res.json的错误响应，需要手动修复`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      this.fixes.push(`修复路由文件: ${filePath}`);
    }
  }

  /**
   * 更新前端API服务
   */
  async updateFrontendApiServices() {
    console.log('🎯 更新前端API服务...');

    const apiServicePath = 'src/services/api/apiService.ts';
    if (fs.existsSync(apiServicePath)) {
      let content = fs.readFileSync(apiServicePath, 'utf8');
      
      // 添加类型导入
      if (!content.includes('from \'../../types/unified/apiResponse\'')) {
        const importLine = `import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '../../types/unified/apiResponse';\n`;
        content = importLine + content;
      }
      
      // 更新方法返回类型
      content = content.replace(
        /async (get|post|put|delete)\(.*?\): Promise<any>/g,
        'async $1($2): Promise<ApiResponse>'
      );
      
      fs.writeFileSync(apiServicePath, content);
      this.fixes.push('更新apiService.ts的类型定义');
    }

    console.log('  ✅ 前端API服务更新完成');
  }

  /**
   * 验证修复结果
   */
  async validateFixes() {
    console.log('✅ 验证修复结果...');

    // 检查是否还有旧的ApiResponse使用
    const allFiles = [
      ...this.findRouteFiles(),
      ...this.findApiServiceFiles()
    ];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('ApiResponse.success') || content.includes('ApiResponse.error')) {
        this.issues.push(`${file} 仍包含旧的ApiResponse调用`);
      }
    }

    console.log('  ✅ 修复结果验证完成');
  }

  /**
   * 查找路由文件
   */
  findRouteFiles() {
    const routeDir = 'server/routes';
    if (!fs.existsSync(routeDir)) return [];
    
    return fs.readdirSync(routeDir)
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(routeDir, file));
  }

  /**
   * 查找API服务文件
   */
  findApiServiceFiles() {
    const serviceDir = 'src/services/api';
    if (!fs.existsSync(serviceDir)) return [];
    
    return fs.readdirSync(serviceDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .map(file => path.join(serviceDir, file));
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📋 修复报告');
    console.log('=' .repeat(60));
    
    console.log(`✅ 成功修复: ${this.fixes.length} 项`);
    this.fixes.forEach(fix => console.log(`  - ${fix}`));
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  需要手动处理: ${this.warnings.length} 项`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (this.issues.length > 0) {
      console.log(`\n❌ 仍存在问题: ${this.issues.length} 项`);
      this.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log('\n🎉 API响应格式统一修复完成！');
    
    if (this.warnings.length > 0 || this.issues.length > 0) {
      console.log('\n📝 后续行动:');
      console.log('1. 手动处理上述警告项目');
      console.log('2. 运行测试确保功能正常');
      console.log('3. 更新API文档');
    }
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new ApiResponseFormatFixer();
  fixer.fix().catch(console.error);
}

module.exports = ApiResponseFormatFixer;
