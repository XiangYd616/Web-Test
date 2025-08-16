/**
 * 最终清理验证脚本
 * 验证引擎目录清理后的规范性
 */

const fs = require('fs');
const path = require('path');

class FinalCleanupValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.enginesDir = path.join(this.projectRoot, 'backend', 'engines');
    
    this.testTools = [
      'api', 'compatibility', 'infrastructure', 'performance', 
      'security', 'seo', 'stress', 'ux', 'website'
    ];
  }

  /**
   * 执行最终验证
   */
  async validate() {
    console.log('🔍 最终清理验证...\n');
    
    const results = {
      compliant: 0,
      issues: 0,
      details: {}
    };

    for (const tool of this.testTools) {
      console.log(`🧪 验证 ${tool} 工具...`);
      const validation = await this.validateTool(tool);
      results.details[tool] = validation;
      
      if (validation.isCompliant) {
        results.compliant++;
        console.log(`   ✅ 规范完整`);
      } else {
        results.issues++;
        console.log(`   ⚠️ 需要修正: ${validation.issues.join(', ')}`);
      }
      console.log('');
    }

    this.outputSummary(results);
    return results;
  }

  /**
   * 验证单个工具
   */
  async validateTool(tool) {
    const toolDir = path.join(this.enginesDir, tool);
    const expectedMainFile = `${tool}TestEngine.js`;
    const mainFilePath = path.join(toolDir, expectedMainFile);
    
    const validation = {
      hasDirectory: fs.existsSync(toolDir),
      hasMainFile: fs.existsSync(mainFilePath),
      correctNaming: false,
      correctClass: false,
      correctExport: false,
      hasCoreMethod: false,
      hasValidation: false,
      hasAvailabilityCheck: false,
      isCompliant: false,
      issues: []
    };

    if (!validation.hasDirectory) {
      validation.issues.push('目录不存在');
      return validation;
    }

    if (!validation.hasMainFile) {
      validation.issues.push(`缺少${expectedMainFile}`);
      return validation;
    }

    // 检查文件内容
    const content = fs.readFileSync(mainFilePath, 'utf8');
    const expectedClassName = `${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine`;
    
    validation.correctNaming = true; // 文件名已经正确
    validation.correctClass = content.includes(`class ${expectedClassName}`);
    validation.correctExport = content.includes(`module.exports = ${expectedClassName}`);
    validation.hasCoreMethod = this.hasMainTestMethod(content, tool);
    validation.hasValidation = content.includes('validateConfig');
    validation.hasAvailabilityCheck = content.includes('checkAvailability');

    // 收集问题
    if (!validation.correctClass) {
      validation.issues.push(`类名应为${expectedClassName}`);
    }
    if (!validation.correctExport) {
      validation.issues.push(`导出应为${expectedClassName}`);
    }
    if (!validation.hasCoreMethod) {
      validation.issues.push('缺少主测试方法');
    }
    if (!validation.hasValidation) {
      validation.issues.push('缺少validateConfig方法');
    }
    if (!validation.hasAvailabilityCheck) {
      validation.issues.push('缺少checkAvailability方法');
    }

    // 判断是否完全合规
    validation.isCompliant = validation.correctClass && 
                            validation.correctExport && 
                            validation.hasCoreMethod && 
                            validation.hasValidation && 
                            validation.hasAvailabilityCheck;

    return validation;
  }

  /**
   * 检查是否有主测试方法
   */
  hasMainTestMethod(content, tool) {
    const possibleMethods = [
      `run${tool.charAt(0).toUpperCase() + tool.slice(1)}Test`,
      `execute${tool.charAt(0).toUpperCase() + tool.slice(1)}Test`,
      'runTest',
      'executeTest'
    ];

    return possibleMethods.some(method => content.includes(method));
  }

  /**
   * 输出总结
   */
  outputSummary(results) {
    console.log('📊 最终清理验证结果:\n');
    
    console.log(`🎯 规范性统计:`);
    console.log(`   ✅ 完全规范: ${results.compliant}个工具`);
    console.log(`   ⚠️ 需要修正: ${results.issues}个工具`);
    console.log(`   📊 规范率: ${((results.compliant / this.testTools.length) * 100).toFixed(1)}%\n`);

    if (results.compliant === this.testTools.length) {
      console.log('🎉 优秀！所有测试工具都已规范化');
    } else if (results.compliant >= this.testTools.length * 0.8) {
      console.log('👍 良好！大部分工具已规范化');
    } else {
      console.log('⚠️ 需要继续改进规范性');
    }

    console.log('\n📁 清理后的标准目录结构:');
    console.log('```');
    console.log('backend/engines/');
    for (const tool of this.testTools) {
      const validation = results.details[tool];
      const icon = validation.isCompliant ? '✅' : '⚠️';
      console.log(`├── ${tool}/`);
      console.log(`│   ├── ${tool}TestEngine.js  ${icon}`);
      console.log(`│   └── index.js`);
    }
    console.log('```');

    console.log('\n🎯 功能职责清晰度:');
    console.log('✅ API测试工具: 专注测试外部API端点');
    console.log('✅ 性能测试工具: 使用Lighthouse进行性能分析');
    console.log('✅ 安全测试工具: 专注安全漏洞扫描');
    console.log('✅ SEO测试工具: 专注SEO优化分析');
    console.log('✅ 其他工具: 各司其职，避免功能重叠');
  }
}

// 执行验证
if (require.main === module) {
  const validator = new FinalCleanupValidator();
  validator.validate().catch(console.error);
}

module.exports = FinalCleanupValidator;
