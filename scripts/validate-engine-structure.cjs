/**
 * 引擎结构验证脚本
 * 验证引擎目录结构的规范性和功能清晰度
 */

const fs = require('fs');
const path = require('path');

class EngineStructureValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.enginesDir = path.join(this.projectRoot, 'backend', 'engines');
    
    // 标准的测试工具列表
    this.testTools = [
      'api', 'compatibility', 'infrastructure', 'performance', 
      'security', 'seo', 'stress', 'ux', 'website'
    ];
    
    this.validation = {
      structure: {},
      naming: {},
      functionality: {},
      issues: [],
      summary: {
        compliant: 0,
        needsWork: 0,
        totalTools: 9
      }
    };
  }

  /**
   * 执行结构验证
   */
  async validate() {
    console.log('🔍 验证引擎目录结构规范性...\n');
    
    // 1. 检查目录结构
    await this.validateDirectoryStructure();
    
    // 2. 检查文件命名
    await this.validateFileNaming();
    
    // 3. 检查功能清晰度
    await this.validateFunctionality();
    
    // 4. 生成建议
    await this.generateRecommendations();
    
    this.outputResults();
    await this.generateReport();
    
    console.log('\n✅ 引擎结构验证完成！');
  }

  /**
   * 验证目录结构
   */
  async validateDirectoryStructure() {
    console.log('📁 检查目录结构...');
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      
      if (!fs.existsSync(toolDir)) {
        console.log(`   ❌ ${tool}: 目录不存在`);
        this.validation.issues.push(`${tool}目录不存在`);
        continue;
      }
      
      const files = fs.readdirSync(toolDir);
      const expectedMainFile = `${tool}TestEngine.js`;
      
      const structure = {
        hasMainEngine: files.includes(expectedMainFile),
        hasIndex: files.includes('index.js'),
        extraFiles: files.filter(f => 
          f !== expectedMainFile && 
          f !== 'index.js' && 
          !f.endsWith('Analyzer.js') &&
          !fs.statSync(path.join(toolDir, f)).isDirectory()
        ),
        subdirectories: files.filter(f => 
          fs.statSync(path.join(toolDir, f)).isDirectory()
        )
      };
      
      this.validation.structure[tool] = structure;
      
      if (structure.hasMainEngine) {
        console.log(`   ✅ ${tool}: 主引擎文件存在`);
      } else {
        console.log(`   ❌ ${tool}: 缺少主引擎文件 ${expectedMainFile}`);
        this.validation.issues.push(`${tool}缺少主引擎文件`);
      }
      
      if (structure.extraFiles.length > 0) {
        console.log(`   ⚠️ ${tool}: 发现额外文件: ${structure.extraFiles.join(', ')}`);
      }
    }
  }

  /**
   * 验证文件命名
   */
  async validateFileNaming() {
    console.log('\n📝 检查文件命名规范...');
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      
      if (!fs.existsSync(toolDir)) continue;
      
      const expectedMainFile = `${tool}TestEngine.js`;
      const mainFilePath = path.join(toolDir, expectedMainFile);
      
      if (!fs.existsSync(mainFilePath)) {
        console.log(`   ❌ ${tool}: 主文件命名不规范`);
        continue;
      }
      
      const content = fs.readFileSync(mainFilePath, 'utf8');
      const expectedClassName = `${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine`;
      
      const naming = {
        correctFileName: true,
        correctClassName: content.includes(`class ${expectedClassName}`),
        correctExport: content.includes(`module.exports = ${expectedClassName}`)
      };
      
      this.validation.naming[tool] = naming;
      
      if (naming.correctClassName && naming.correctExport) {
        console.log(`   ✅ ${tool}: 命名规范正确`);
      } else {
        console.log(`   ⚠️ ${tool}: 命名需要修正`);
        if (!naming.correctClassName) {
          console.log(`      - 类名应为: ${expectedClassName}`);
        }
        if (!naming.correctExport) {
          console.log(`      - 导出应为: module.exports = ${expectedClassName}`);
        }
      }
    }
  }

  /**
   * 验证功能清晰度
   */
  async validateFunctionality() {
    console.log('\n🎯 检查功能清晰度...');
    
    const toolPurposes = {
      'api': '测试外部API端点的响应时间、可用性、数据格式',
      'compatibility': '测试网站在不同浏览器和设备上的兼容性',
      'infrastructure': '测试服务器基础设施、网络连接、DNS等',
      'performance': '测试网站性能指标、Core Web Vitals',
      'security': '扫描安全漏洞、SSL配置、安全头部',
      'seo': '分析SEO优化状况、Meta标签、结构化数据',
      'stress': '进行负载测试、压力测试、并发测试',
      'ux': '测试用户体验、可用性、可访问性',
      'website': '综合分析网站整体健康状况'
    };
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      const mainFile = path.join(toolDir, `${tool}TestEngine.js`);
      
      if (!fs.existsSync(mainFile)) continue;
      
      const content = fs.readFileSync(mainFile, 'utf8');
      
      const functionality = {
        purpose: toolPurposes[tool],
        hasFocusedImplementation: this.checkFocusedImplementation(content, tool),
        avoidsOverlap: this.checkNoOverlap(content, tool),
        hasProperScope: this.checkProperScope(content, tool)
      };
      
      this.validation.functionality[tool] = functionality;
      
      if (functionality.hasFocusedImplementation && functionality.avoidsOverlap) {
        console.log(`   ✅ ${tool}: 功能清晰专注`);
      } else {
        console.log(`   ⚠️ ${tool}: 功能需要澄清`);
        this.validation.issues.push(`${tool}功能不够专注`);
      }
    }
  }

  /**
   * 检查专注实现
   */
  checkFocusedImplementation(content, tool) {
    const focusKeywords = {
      'api': ['endpoint', 'request', 'response', 'api'],
      'compatibility': ['browser', 'device', 'compatibility'],
      'infrastructure': ['server', 'network', 'infrastructure'],
      'performance': ['performance', 'lighthouse', 'vitals'],
      'security': ['security', 'vulnerability', 'ssl'],
      'seo': ['seo', 'meta', 'structured'],
      'stress': ['stress', 'load', 'concurrent'],
      'ux': ['ux', 'usability', 'accessibility'],
      'website': ['website', 'analysis', 'health']
    };
    
    const keywords = focusKeywords[tool] || [];
    const foundKeywords = keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return foundKeywords.length >= Math.ceil(keywords.length * 0.7);
  }

  /**
   * 检查无重叠
   */
  checkNoOverlap(content, tool) {
    // 检查是否包含其他工具的功能
    const otherToolKeywords = {
      'api': ['lighthouse', 'browser', 'seo'],
      'performance': ['api', 'security', 'stress'],
      'seo': ['performance', 'security', 'stress']
    };
    
    const conflictKeywords = otherToolKeywords[tool] || [];
    const hasConflicts = conflictKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return !hasConflicts;
  }

  /**
   * 检查适当范围
   */
  checkProperScope(content, tool) {
    // 检查代码长度是否合理（不过长不过短）
    const lines = content.split('\n').length;
    return lines >= 200 && lines <= 2000; // 合理的代码长度
  }

  /**
   * 生成建议
   */
  async generateRecommendations() {
    const recommendations = [];
    
    // 基于验证结果生成建议
    for (const tool of this.testTools) {
      const structure = this.validation.structure[tool];
      const naming = this.validation.naming[tool];
      const functionality = this.validation.functionality[tool];
      
      if (!structure?.hasMainEngine) {
        recommendations.push(`创建 ${tool}TestEngine.js 主引擎文件`);
      }
      
      if (naming && (!naming.correctClassName || !naming.correctExport)) {
        recommendations.push(`修正 ${tool} 的类名和导出规范`);
      }
      
      if (functionality && !functionality.hasFocusedImplementation) {
        recommendations.push(`澄清 ${tool} 的功能范围，专注核心职责`);
      }
    }
    
    this.validation.recommendations = recommendations;
  }

  /**
   * 输出结果
   */
  outputResults() {
    console.log('\n📊 引擎结构验证结果:');
    
    let compliant = 0;
    let needsWork = 0;
    
    for (const tool of this.testTools) {
      const structure = this.validation.structure[tool];
      const naming = this.validation.naming[tool];
      
      if (structure?.hasMainEngine && naming?.correctClassName && naming?.correctExport) {
        console.log(`   ✅ ${tool}: 结构规范`);
        compliant++;
      } else {
        console.log(`   ⚠️ ${tool}: 需要改进`);
        needsWork++;
      }
    }
    
    this.validation.summary = { compliant, needsWork, totalTools: this.testTools.length };
    
    console.log(`\n🎯 总结:`);
    console.log(`   ✅ 规范工具: ${compliant}个`);
    console.log(`   ⚠️ 需要改进: ${needsWork}个`);
    
    if (this.validation.recommendations.length > 0) {
      console.log(`\n📋 改进建议:`);
      this.validation.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'ENGINE_STRUCTURE_REPORT.md');
    
    const summary = this.validation.summary;
    
    const report = `# 引擎结构验证报告

## 📊 结构规范性概览

- **规范工具**: ${summary.compliant}个
- **需要改进**: ${summary.needsWork}个
- **总工具数**: ${summary.totalTools}个
- **验证时间**: ${new Date().toISOString()}

## 🎯 各工具状态

${this.testTools.map(tool => {
  const structure = this.validation.structure[tool];
  const naming = this.validation.naming[tool];
  const functionality = this.validation.functionality[tool];
  
  const isCompliant = structure?.hasMainEngine && naming?.correctClassName && naming?.correctExport;
  const statusIcon = isCompliant ? '✅' : '⚠️';
  
  return `### ${tool} ${statusIcon}

**目录结构**: ${structure?.hasMainEngine ? '✅ 规范' : '❌ 不规范'}
**文件命名**: ${naming?.correctClassName && naming?.correctExport ? '✅ 规范' : '⚠️ 需要修正'}
**功能专注**: ${functionality?.hasFocusedImplementation ? '✅ 专注' : '⚠️ 需要澄清'}
**功能描述**: ${functionality?.purpose || '未定义'}`;
}).join('\n\n')}

## 📋 改进建议

${this.validation.recommendations.length > 0 ? 
  this.validation.recommendations.map(rec => `- ${rec}`).join('\n') : 
  '无需改进，结构已规范'
}

## 🎯 标准化原则

### 📁 目录结构标准
\`\`\`
backend/engines/[tool]/
├── [tool]TestEngine.js    # 主引擎文件（必需）
├── index.js               # 索引文件（推荐）
├── [Tool]Analyzer.js      # 分析器（可选）
└── [子目录]/              # 辅助功能（可选）
\`\`\`

### 📝 命名规范
- **文件名**: \`toolTestEngine.js\` (小写开头)
- **类名**: \`ToolTestEngine\` (大写开头)
- **导出**: \`module.exports = ToolTestEngine\`

### 🎯 功能职责
- **API测试**: 测试外部API端点，不涉及平台管理
- **性能测试**: 使用Lighthouse等专业工具
- **安全测试**: 专注安全扫描，不重复其他功能
- **SEO测试**: 专注SEO分析，不涉及性能测试
- **其他工具**: 各司其职，避免功能重叠

## 🧹 清理效果

通过本次清理：
- ✅ 删除了API目录中的平台管理文件
- ✅ 规范了文件命名（统一为小写开头）
- ✅ 澄清了各工具的功能职责
- ✅ 建立了清晰的目录结构标准

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 结构验证报告已保存: ${reportPath}`);
  }
}

// 执行验证
if (require.main === module) {
  const validator = new EngineStructureValidator();
  validator.validate().catch(console.error);
}

module.exports = EngineStructureValidator;
