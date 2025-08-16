/**
 * 安全引擎清理脚本
 * 谨慎地检查和清理重复功能、命名规范问题
 */

const fs = require('fs');
const path = require('path');

class SafeEngineCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.enginesDir = path.join(this.projectRoot, 'backend', 'engines');
    
    this.testTools = [
      'api', 'compatibility', 'infrastructure', 'performance', 
      'security', 'seo', 'stress', 'ux', 'website'
    ];
    
    this.analysis = {
      namingIssues: [],
      duplicateFiles: [],
      extraFiles: [],
      functionalOverlaps: [],
      recommendations: []
    };
  }

  /**
   * 执行安全清理分析
   */
  async analyze() {
    console.log('🔍 开始安全引擎分析...\n');
    
    // 1. 检查命名规范
    await this.analyzeNaming();
    
    // 2. 检查重复文件
    await this.analyzeDuplicates();
    
    // 3. 检查额外文件
    await this.analyzeExtraFiles();
    
    // 4. 分析功能重叠
    await this.analyzeFunctionalOverlaps();
    
    // 5. 生成建议（不自动执行）
    await this.generateRecommendations();
    
    this.outputResults();
    await this.generateReport();
    
    console.log('\n✅ 安全引擎分析完成！');
  }

  /**
   * 分析命名规范
   */
  async analyzeNaming() {
    console.log('📝 分析命名规范...');
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      
      if (!fs.existsSync(toolDir)) {
        console.log(`   ⚠️ ${tool}: 目录不存在`);
        continue;
      }
      
      const files = fs.readdirSync(toolDir, { withFileTypes: true });
      
      // 检查主引擎文件
      const expectedMainFile = `${tool}TestEngine.js`;
      const mainFiles = files.filter(f => 
        f.isFile() && 
        f.name.toLowerCase().includes('testengine') && 
        f.name.endsWith('.js')
      );
      
      if (mainFiles.length === 0) {
        console.log(`   ❌ ${tool}: 缺少主引擎文件`);
        this.analysis.namingIssues.push({
          tool,
          issue: 'missing_main_file',
          expected: expectedMainFile
        });
      } else if (mainFiles.length > 1) {
        console.log(`   ⚠️ ${tool}: 多个引擎文件存在`);
        mainFiles.forEach(f => {
          if (f.name !== expectedMainFile) {
            this.analysis.namingIssues.push({
              tool,
              issue: 'incorrect_naming',
              current: f.name,
              expected: expectedMainFile
            });
          }
        });
      } else {
        const mainFile = mainFiles[0];
        if (mainFile.name !== expectedMainFile) {
          console.log(`   ⚠️ ${tool}: 主文件命名不规范 ${mainFile.name} -> ${expectedMainFile}`);
          this.analysis.namingIssues.push({
            tool,
            issue: 'incorrect_naming',
            current: mainFile.name,
            expected: expectedMainFile
          });
        } else {
          console.log(`   ✅ ${tool}: 主文件命名正确`);
        }
      }
      
      // 检查分析器文件
      const expectedAnalyzer = `${tool.charAt(0).toUpperCase() + tool.slice(1)}Analyzer.js`;
      const analyzerFiles = files.filter(f => 
        f.isFile() && 
        f.name.includes('Analyzer') && 
        f.name.endsWith('.js') &&
        !f.name.includes('/')
      );
      
      if (analyzerFiles.length > 1) {
        console.log(`   ⚠️ ${tool}: 多个分析器文件`);
        analyzerFiles.forEach(f => {
          if (f.name !== expectedAnalyzer) {
            this.analysis.namingIssues.push({
              tool,
              issue: 'duplicate_analyzer',
              current: f.name,
              expected: expectedAnalyzer
            });
          }
        });
      } else if (analyzerFiles.length === 1) {
        const analyzer = analyzerFiles[0];
        if (analyzer.name !== expectedAnalyzer) {
          console.log(`   ⚠️ ${tool}: 分析器命名不规范 ${analyzer.name} -> ${expectedAnalyzer}`);
          this.analysis.namingIssues.push({
            tool,
            issue: 'incorrect_analyzer_naming',
            current: analyzer.name,
            expected: expectedAnalyzer
          });
        }
      }
    }
  }

  /**
   * 分析重复文件
   */
  async analyzeDuplicates() {
    console.log('\n🔍 分析重复文件...');
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      
      if (!fs.existsSync(toolDir)) continue;
      
      const files = fs.readdirSync(toolDir, { withFileTypes: true });
      const jsFiles = files.filter(f => f.isFile() && f.name.endsWith('.js'));
      
      // 查找可能的重复引擎文件
      const engineFiles = jsFiles.filter(f => 
        f.name.toLowerCase().includes('engine') && 
        f.name !== 'index.js'
      );
      
      if (engineFiles.length > 1) {
        console.log(`   ⚠️ ${tool}: 发现多个引擎文件`);
        const expectedMain = `${tool}TestEngine.js`;
        
        engineFiles.forEach(f => {
          if (f.name !== expectedMain) {
            console.log(`      - 可能重复: ${f.name}`);
            this.analysis.duplicateFiles.push({
              tool,
              file: f.name,
              type: 'engine',
              reason: 'multiple_engine_files'
            });
          }
        });
      }
    }
  }

  /**
   * 分析额外文件
   */
  async analyzeExtraFiles() {
    console.log('\n📁 分析额外文件...');
    
    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      
      if (!fs.existsSync(toolDir)) continue;
      
      const files = fs.readdirSync(toolDir, { withFileTypes: true });
      
      // 标准文件列表
      const standardFiles = [
        `${tool}TestEngine.js`,
        `${tool.charAt(0).toUpperCase() + tool.slice(1)}Analyzer.js`,
        'index.js'
      ];
      
      const extraFiles = files.filter(f => 
        f.isFile() && 
        f.name.endsWith('.js') &&
        !standardFiles.includes(f.name) &&
        !f.name.startsWith('.')
      );
      
      if (extraFiles.length > 0) {
        console.log(`   📄 ${tool}: 发现额外文件`);
        extraFiles.forEach(f => {
          console.log(`      - ${f.name}`);
          
          // 分析文件用途
          const purpose = this.analyzeFilePurpose(f.name, tool);
          this.analysis.extraFiles.push({
            tool,
            file: f.name,
            purpose,
            recommendation: this.getFileRecommendation(f.name, purpose)
          });
        });
      }
    }
  }

  /**
   * 分析文件用途
   */
  analyzeFilePurpose(filename, tool) {
    const name = filename.toLowerCase();
    
    if (name.includes('accessibility')) return 'accessibility';
    if (name.includes('performance')) return 'performance';
    if (name.includes('security')) return 'security';
    if (name.includes('test')) return 'testing';
    if (name.includes('engine')) return 'engine';
    if (name.includes('analyzer')) return 'analyzer';
    if (name.includes('manager')) return 'manager';
    if (name.includes('generator')) return 'generator';
    if (name.includes('monitor')) return 'monitor';
    if (name.includes('optimizer')) return 'optimizer';
    
    return 'unknown';
  }

  /**
   * 获取文件建议
   */
  getFileRecommendation(filename, purpose) {
    if (purpose === 'accessibility' && !filename.includes('ux')) {
      return 'consider_moving_to_ux_tool';
    }
    if (purpose === 'performance' && !filename.includes('performance')) {
      return 'consider_moving_to_performance_tool';
    }
    if (purpose === 'security' && !filename.includes('security')) {
      return 'consider_moving_to_security_tool';
    }
    if (purpose === 'engine' && filename !== 'index.js') {
      return 'potential_duplicate_engine';
    }
    
    return 'review_necessity';
  }

  /**
   * 分析功能重叠
   */
  async analyzeFunctionalOverlaps() {
    console.log('\n🔄 分析功能重叠...');
    
    const toolMethods = {};
    
    // 收集每个工具的方法
    for (const tool of this.testTools) {
      const mainFile = path.join(this.enginesDir, tool, `${tool}TestEngine.js`);
      
      if (!fs.existsSync(mainFile)) continue;
      
      const content = fs.readFileSync(mainFile, 'utf8');
      toolMethods[tool] = this.extractMethods(content);
    }
    
    // 分析重叠
    const tools = Object.keys(toolMethods);
    for (let i = 0; i < tools.length; i++) {
      for (let j = i + 1; j < tools.length; j++) {
        const tool1 = tools[i];
        const tool2 = tools[j];
        
        const commonMethods = toolMethods[tool1].filter(method => 
          toolMethods[tool2].includes(method)
        );
        
        if (commonMethods.length > 2) { // 超过基础方法（如checkAvailability）
          console.log(`   ⚠️ ${tool1} ↔ ${tool2}: ${commonMethods.length} 个共同方法`);
          this.analysis.functionalOverlaps.push({
            tool1,
            tool2,
            commonMethods,
            severity: commonMethods.length > 5 ? 'high' : 'medium'
          });
        }
      }
    }
  }

  /**
   * 提取方法名
   */
  extractMethods(content) {
    const methods = [];
    
    // 提取async方法
    const asyncMatches = content.match(/async\s+(\w+)\s*\(/g) || [];
    asyncMatches.forEach(match => {
      const method = match.replace(/async\s+/, '').replace(/\s*\(/, '');
      methods.push(method);
    });
    
    // 提取普通方法
    const methodMatches = content.match(/^\s*(\w+)\s*\(/gm) || [];
    methodMatches.forEach(match => {
      const method = match.trim().replace(/\s*\(/, '');
      if (!methods.includes(method) && method !== 'constructor') {
        methods.push(method);
      }
    });
    
    return methods;
  }

  /**
   * 生成建议
   */
  async generateRecommendations() {
    console.log('\n💡 生成改进建议...');
    
    // 基于分析结果生成建议
    if (this.analysis.namingIssues.length > 0) {
      this.analysis.recommendations.push({
        type: 'naming',
        priority: 'high',
        description: '修正文件命名规范问题',
        actions: this.analysis.namingIssues.map(issue => 
          `重命名 ${issue.tool}/${issue.current || '缺失'} -> ${issue.expected}`
        )
      });
    }
    
    if (this.analysis.duplicateFiles.length > 0) {
      this.analysis.recommendations.push({
        type: 'duplicates',
        priority: 'medium',
        description: '处理重复文件',
        actions: this.analysis.duplicateFiles.map(dup => 
          `审查 ${dup.tool}/${dup.file} 是否为重复文件`
        )
      });
    }
    
    if (this.analysis.functionalOverlaps.length > 0) {
      const highSeverityOverlaps = this.analysis.functionalOverlaps.filter(o => o.severity === 'high');
      if (highSeverityOverlaps.length > 0) {
        this.analysis.recommendations.push({
          type: 'overlaps',
          priority: 'high',
          description: '解决严重的功能重叠问题',
          actions: highSeverityOverlaps.map(overlap => 
            `重构 ${overlap.tool1} 和 ${overlap.tool2} 的重叠功能`
          )
        });
      }
    }
    
    // 通用建议
    this.analysis.recommendations.push({
      type: 'maintenance',
      priority: 'low',
      description: '建立维护规范',
      actions: [
        '建立文件命名规范文档',
        '定期运行清理脚本',
        '建立代码审查流程',
        '避免功能重复实现'
      ]
    });
  }

  /**
   * 输出结果
   */
  outputResults() {
    console.log('\n📊 安全引擎分析结果:');
    
    console.log(`\n📝 命名问题: ${this.analysis.namingIssues.length}个`);
    if (this.analysis.namingIssues.length > 0) {
      this.analysis.namingIssues.forEach(issue => {
        console.log(`   - ${issue.tool}: ${issue.issue} (${issue.current || '缺失'} -> ${issue.expected})`);
      });
    }
    
    console.log(`\n🔍 重复文件: ${this.analysis.duplicateFiles.length}个`);
    if (this.analysis.duplicateFiles.length > 0) {
      this.analysis.duplicateFiles.forEach(dup => {
        console.log(`   - ${dup.tool}/${dup.file} (${dup.reason})`);
      });
    }
    
    console.log(`\n📁 额外文件: ${this.analysis.extraFiles.length}个`);
    if (this.analysis.extraFiles.length > 0) {
      this.analysis.extraFiles.forEach(extra => {
        console.log(`   - ${extra.tool}/${extra.file} (${extra.purpose}) -> ${extra.recommendation}`);
      });
    }
    
    console.log(`\n🔄 功能重叠: ${this.analysis.functionalOverlaps.length}对`);
    if (this.analysis.functionalOverlaps.length > 0) {
      this.analysis.functionalOverlaps.forEach(overlap => {
        console.log(`   - ${overlap.tool1} ↔ ${overlap.tool2}: ${overlap.commonMethods.length}个方法 (${overlap.severity})`);
      });
    }
    
    console.log(`\n💡 改进建议: ${this.analysis.recommendations.length}类`);
    this.analysis.recommendations.forEach(rec => {
      console.log(`   ${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.type}: ${rec.description}`);
    });
    
    console.log('\n⚠️ 注意: 此脚本仅进行分析，不会自动修改文件。请根据建议手动处理。');
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'SAFE_ENGINE_ANALYSIS_REPORT.md');
    
    const report = `# 安全引擎分析报告

## 📊 分析概览

- **命名问题**: ${this.analysis.namingIssues.length}个
- **重复文件**: ${this.analysis.duplicateFiles.length}个
- **额外文件**: ${this.analysis.extraFiles.length}个
- **功能重叠**: ${this.analysis.functionalOverlaps.length}对
- **改进建议**: ${this.analysis.recommendations.length}类
- **分析时间**: ${new Date().toISOString()}

## 📝 命名规范问题

${this.analysis.namingIssues.length > 0 ? 
  this.analysis.namingIssues.map(issue => 
    `- **${issue.tool}**: ${issue.issue} (${issue.current || '缺失'} -> ${issue.expected})`
  ).join('\n') : 
  '无命名问题'
}

## 🔍 重复文件分析

${this.analysis.duplicateFiles.length > 0 ? 
  this.analysis.duplicateFiles.map(dup => 
    `- **${dup.tool}/${dup.file}**: ${dup.reason}`
  ).join('\n') : 
  '无重复文件'
}

## 📁 额外文件分析

${this.analysis.extraFiles.length > 0 ? 
  this.analysis.extraFiles.map(extra => 
    `- **${extra.tool}/${extra.file}**: ${extra.purpose} -> ${extra.recommendation}`
  ).join('\n') : 
  '无额外文件'
}

## 🔄 功能重叠分析

${this.analysis.functionalOverlaps.length > 0 ? 
  this.analysis.functionalOverlaps.map(overlap => 
    `- **${overlap.tool1} ↔ ${overlap.tool2}**: ${overlap.commonMethods.length}个共同方法 (${overlap.severity}严重度)`
  ).join('\n') : 
  '无功能重叠'
}

## 💡 改进建议

${this.analysis.recommendations.map(rec => 
  `### ${rec.type.toUpperCase()} (${rec.priority}优先级)

**描述**: ${rec.description}

**行动项**:
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## ⚠️ 重要提醒

此报告仅提供分析结果和建议，**不会自动修改任何文件**。请根据分析结果和建议，谨慎地手动处理相关问题。

建议的处理顺序：
1. 🔴 高优先级问题（命名规范、严重功能重叠）
2. 🟡 中优先级问题（重复文件、中等功能重叠）
3. 🟢 低优先级问题（维护规范、轻微重叠）

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 安全分析报告已保存: ${reportPath}`);
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new SafeEngineCleanup();
  analyzer.analyze().catch(console.error);
}

module.exports = SafeEngineCleanup;
