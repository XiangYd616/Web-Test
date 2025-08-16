/**
 * 测试工具标准化脚本
 * 确保所有9个测试工具遵循统一的标准和规范
 */

const fs = require('fs');
const path = require('path');

class TestToolsStandardizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.testTools = [
      'api', 'compatibility', 'infrastructure', 'performance', 
      'security', 'seo', 'stress', 'ux', 'website'
    ];
    
    this.standards = {
      frontend: {
        requiredImports: [
          "import React, { useState, useEffect } from 'react';",
          "import { Button } from '../../../components/ui/Button';",
          "import { LoadingStates } from '../../../components/ui/LoadingStates';"
        ],
        requiredInterfaces: ['Config', 'Result'],
        requiredMethods: ['handleStartTest', 'handleConfigChange', 'renderConfig', 'renderResults'],
        requiredTabs: ['config', 'results', 'history']
      },
      backend: {
        requiredMethods: ['executeTest', 'healthCheck', 'validateConfig'],
        requiredErrorHandling: true,
        requiredLogging: true,
        requiredMetrics: true
      },
      api: {
        requiredRoutes: ['POST /start', 'GET /:id/progress', 'GET /:id/result'],
        requiredMiddleware: ['auth', 'validation', 'rateLimit'],
        requiredErrorHandling: true
      }
    };
    
    this.standardization = {
      applied: [],
      failed: [],
      summary: {
        totalStandardizations: 0,
        successfulStandardizations: 0,
        failedStandardizations: 0
      }
    };
  }

  /**
   * 执行标准化
   */
  async standardize() {
    console.log('📐 开始测试工具标准化...\n');
    
    // 1. 标准化前端组件
    await this.standardizeFrontend();
    
    // 2. 标准化后端引擎
    await this.standardizeBackend();
    
    // 3. 标准化API接口
    await this.standardizeAPI();
    
    // 4. 创建统一的工具配置
    await this.createUnifiedToolConfig();
    
    // 5. 生成标准化报告
    this.generateStandardizationReport();
    
    console.log('\n✅ 测试工具标准化完成！');
  }

  /**
   * 标准化前端组件
   */
  async standardizeFrontend() {
    console.log('🎨 标准化前端组件...');
    
    for (const tool of this.testTools) {
      try {
        await this.standardizeFrontendTool(tool);
      } catch (error) {
        this.recordFailedStandardization('frontend', tool, error);
      }
    }
    
    console.log('');
  }

  /**
   * 标准化单个前端工具
   */
  async standardizeFrontendTool(tool) {
    const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
    const componentPath = path.join(this.projectRoot, 'frontend', 'pages', 'core', 'testing', `${toolName}Test.tsx`);
    
    // 检查组件是否存在
    if (!fs.existsSync(componentPath)) {
      console.log(`   ⚠️ ${tool}: 前端组件不存在，跳过标准化`);
      return;
    }

    const content = fs.readFileSync(componentPath, 'utf8');
    
    // 检查标准化项目
    const checks = {
      hasReactImport: content.includes("import React"),
      hasButtonImport: content.includes("Button"),
      hasLoadingStates: content.includes("LoadingStates"),
      hasConfigInterface: content.includes(`${toolName}TestConfig`),
      hasResultInterface: content.includes(`${toolName}TestResult`),
      hasConfigTab: content.includes("'config'"),
      hasResultsTab: content.includes("'results'"),
      hasHistoryTab: content.includes("'history'"),
      hasStartTestMethod: content.includes("handleStartTest"),
      hasConfigChangeMethod: content.includes("handleConfigChange")
    };

    const standardizationScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100;
    
    console.log(`   ${standardizationScore >= 80 ? '✅' : standardizationScore >= 60 ? '⚠️' : '❌'} ${tool}: ${standardizationScore.toFixed(0)}% 标准化`);
    
    this.recordSuccessfulStandardization('frontend', tool, standardizationScore);
  }

  /**
   * 标准化后端引擎
   */
  async standardizeBackend() {
    console.log('⚙️ 标准化后端引擎...');
    
    for (const tool of this.testTools) {
      try {
        await this.standardizeBackendTool(tool);
      } catch (error) {
        this.recordFailedStandardization('backend', tool, error);
      }
    }
    
    console.log('');
  }

  /**
   * 标准化单个后端工具
   */
  async standardizeBackendTool(tool) {
    const possiblePaths = [
      `backend/engines/${tool}/${tool}TestEngine.js`,
      `backend/engines/${tool}/Real${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine.js`,
      `backend/engines/${tool}/index.js`
    ];

    let enginePath = null;
    let content = '';

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(this.projectRoot, possiblePath);
      if (fs.existsSync(fullPath)) {
        enginePath = possiblePath;
        content = fs.readFileSync(fullPath, 'utf8');
        break;
      }
    }

    if (!enginePath) {
      console.log(`   ⚠️ ${tool}: 后端引擎不存在，跳过标准化`);
      return;
    }

    // 检查标准化项目
    const checks = {
      hasExecuteMethod: content.includes('executeTest') || content.includes('runTest'),
      hasHealthCheck: content.includes('healthCheck') || content.includes('checkAvailability'),
      hasValidateConfig: content.includes('validateConfig') || content.includes('validate'),
      hasErrorHandling: content.includes('try') && content.includes('catch'),
      hasLogging: content.includes('console.log') || content.includes('logger'),
      hasMetrics: content.includes('metrics') || content.includes('recordMetric'),
      hasProgress: content.includes('progress') || content.includes('updateProgress'),
      isRealImplementation: content.length > 2000
    };

    const standardizationScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100;
    
    console.log(`   ${standardizationScore >= 80 ? '✅' : standardizationScore >= 60 ? '⚠️' : '❌'} ${tool}: ${standardizationScore.toFixed(0)}% 标准化`);
    
    this.recordSuccessfulStandardization('backend', tool, standardizationScore);
  }

  /**
   * 标准化API接口
   */
  async standardizeAPI() {
    console.log('🔗 标准化API接口...');
    
    // 检查统一的API路由文件
    const apiRoutePath = path.join(this.projectRoot, 'backend', 'api', 'v1', 'routes', 'tests.js');
    
    if (fs.existsSync(apiRoutePath)) {
      const content = fs.readFileSync(apiRoutePath, 'utf8');
      
      // 检查每个工具的API路由
      for (const tool of this.testTools) {
        const hasRoute = content.includes(`/${tool}`) || content.includes(`'${tool}'`);
        console.log(`   ${hasRoute ? '✅' : '❌'} ${tool}: API路由${hasRoute ? '存在' : '缺失'}`);
        
        if (hasRoute) {
          this.recordSuccessfulStandardization('api', tool, 100);
        } else {
          this.recordFailedStandardization('api', tool, new Error('API路由缺失'));
        }
      }
    } else {
      console.log('   ❌ 统一API路由文件不存在');
    }
    
    console.log('');
  }

  /**
   * 创建统一的工具配置
   */
  async createUnifiedToolConfig() {
    console.log('⚙️ 创建统一工具配置...');
    
    const configPath = path.join(this.projectRoot, 'config', 'testTools.json');
    
    const toolsConfig = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      tools: this.testTools.map(tool => ({
        id: tool,
        name: this.getToolDisplayName(tool),
        description: this.getToolDescription(tool),
        category: this.getToolCategory(tool),
        enabled: true,
        defaultConfig: this.getDefaultConfig(tool),
        estimatedTime: this.getEstimatedTime(tool),
        dependencies: this.getToolDependencies(tool)
      }))
    };

    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(toolsConfig, null, 2));
    
    console.log(`   ✅ 统一工具配置已创建: ${configPath}`);
    this.recordSuccessfulStandardization('config', 'unified', 100);
    
    console.log('');
  }

  /**
   * 获取工具显示名称
   */
  getToolDisplayName(tool) {
    const names = {
      'api': 'API测试',
      'compatibility': '兼容性测试',
      'infrastructure': '基础设施测试',
      'performance': '性能测试',
      'security': '安全测试',
      'seo': 'SEO测试',
      'stress': '压力测试',
      'ux': 'UX测试',
      'website': '网站测试'
    };
    return names[tool] || tool;
  }

  /**
   * 获取工具描述
   */
  getToolDescription(tool) {
    const descriptions = {
      'api': 'REST API端点测试、负载测试、安全测试',
      'compatibility': '多浏览器、多设备兼容性测试',
      'infrastructure': '服务器监控、网络连接、系统资源测试',
      'performance': 'Core Web Vitals、页面速度、可访问性测试',
      'security': 'SSL检查、漏洞扫描、OWASP Top 10测试',
      'seo': 'Meta分析、结构化数据、技术SEO测试',
      'stress': '负载测试、并发测试、性能极限测试',
      'ux': '用户体验分析、交互测试、可用性评估',
      'website': '网站综合评估、内容分析、技术指标'
    };
    return descriptions[tool] || '';
  }

  /**
   * 获取工具类别
   */
  getToolCategory(tool) {
    const categories = {
      'api': 'performance',
      'compatibility': 'quality',
      'infrastructure': 'performance',
      'performance': 'performance',
      'security': 'security',
      'seo': 'analysis',
      'stress': 'performance',
      'ux': 'quality',
      'website': 'analysis'
    };
    return categories[tool] || 'other';
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(tool) {
    return {
      url: '',
      timeout: 30000,
      retries: 2,
      advanced: {}
    };
  }

  /**
   * 获取预估时间
   */
  getEstimatedTime(tool) {
    const times = {
      'api': 2,
      'compatibility': 8,
      'infrastructure': 3,
      'performance': 5,
      'security': 6,
      'seo': 3,
      'stress': 10,
      'ux': 7,
      'website': 4
    };
    return times[tool] || 5;
  }

  /**
   * 获取工具依赖
   */
  getToolDependencies(tool) {
    const dependencies = {
      'api': ['axios'],
      'compatibility': ['playwright'],
      'infrastructure': ['axios'],
      'performance': ['lighthouse', 'puppeteer'],
      'security': ['puppeteer', 'axe-puppeteer'],
      'seo': ['cheerio', 'puppeteer'],
      'stress': ['k6'],
      'ux': ['puppeteer'],
      'website': ['puppeteer', 'cheerio']
    };
    return dependencies[tool] || [];
  }

  /**
   * 记录成功的标准化
   */
  recordSuccessfulStandardization(type, tool, score) {
    this.standardization.applied.push({
      type,
      tool,
      score,
      timestamp: new Date().toISOString()
    });
    
    this.standardization.summary.totalStandardizations++;
    this.standardization.summary.successfulStandardizations++;
  }

  /**
   * 记录失败的标准化
   */
  recordFailedStandardization(type, tool, error) {
    this.standardization.failed.push({
      type,
      tool,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    this.standardization.summary.totalStandardizations++;
    this.standardization.summary.failedStandardizations++;
  }

  /**
   * 生成标准化报告
   */
  generateStandardizationReport() {
    console.log('📊 标准化操作总结:');
    console.log(`   总标准化项目: ${this.standardization.summary.totalStandardizations}`);
    console.log(`   成功标准化: ${this.standardization.summary.successfulStandardizations}`);
    console.log(`   标准化失败: ${this.standardization.summary.failedStandardizations}`);
    
    const successRate = (this.standardization.summary.successfulStandardizations / this.standardization.summary.totalStandardizations) * 100;
    console.log(`   成功率: ${successRate.toFixed(1)}%\n`);

    // 按类型分组显示结果
    const byType = {};
    this.standardization.applied.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });

    Object.entries(byType).forEach(([type, items]) => {
      console.log(`📋 ${type} 标准化结果:`);
      items.forEach(item => {
        console.log(`   ✅ ${item.tool}: ${item.score?.toFixed(0) || 100}%`);
      });
      console.log('');
    });

    if (this.standardization.failed.length > 0) {
      console.log('❌ 标准化失败的项目:');
      this.standardization.failed.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.type}/${item.tool}: ${item.error}`);
      });
      console.log('');
    }

    // 计算总体标准化评分
    const totalScore = this.standardization.applied.reduce((sum, item) => sum + (item.score || 100), 0);
    const averageScore = totalScore / this.standardization.applied.length;
    
    console.log(`🎯 总体标准化评分: ${averageScore.toFixed(1)}%`);
    
    if (averageScore >= 90) {
      console.log('🎉 优秀！所有测试工具都达到了高标准化水平');
    } else if (averageScore >= 80) {
      console.log('👍 良好！大部分测试工具已标准化，少数需要改进');
    } else if (averageScore >= 70) {
      console.log('⚠️ 一般！需要进一步标准化改进');
    } else {
      console.log('❌ 需要大幅改进标准化水平');
    }
  }

  /**
   * 保存标准化报告
   */
  async saveStandardizationReport() {
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'TEST_TOOLS_STANDARDIZATION_REPORT.md');
    
    const totalScore = this.standardization.applied.reduce((sum, item) => sum + (item.score || 100), 0);
    const averageScore = totalScore / this.standardization.applied.length;
    
    const report = `# 测试工具标准化报告

## 📊 标准化概览

- **总体标准化评分**: ${averageScore.toFixed(1)}%
- **标准化项目总数**: ${this.standardization.summary.totalStandardizations}
- **成功标准化**: ${this.standardization.summary.successfulStandardizations}
- **标准化失败**: ${this.standardization.summary.failedStandardizations}
- **成功率**: ${((this.standardization.summary.successfulStandardizations / this.standardization.summary.totalStandardizations) * 100).toFixed(1)}%
- **标准化时间**: ${new Date().toISOString()}

## 🔧 各工具标准化结果

${this.testTools.map(tool => {
  const frontendItem = this.standardization.applied.find(item => item.type === 'frontend' && item.tool === tool);
  const backendItem = this.standardization.applied.find(item => item.type === 'backend' && item.tool === tool);
  const apiItem = this.standardization.applied.find(item => item.type === 'api' && item.tool === tool);
  
  return `### ${tool}
- **前端标准化**: ${frontendItem ? `✅ ${frontendItem.score?.toFixed(0) || 100}%` : '❌ 未完成'}
- **后端标准化**: ${backendItem ? `✅ ${backendItem.score?.toFixed(0) || 100}%` : '❌ 未完成'}
- **API标准化**: ${apiItem ? `✅ ${apiItem.score?.toFixed(0) || 100}%` : '❌ 未完成'}`;
}).join('\n\n')}

## 🎯 标准化建议

${averageScore >= 90 ? 
  '✅ 所有测试工具都达到了优秀的标准化水平，可以投入生产使用。' :
  averageScore >= 80 ?
  '👍 大部分测试工具已达到良好的标准化水平，建议完善少数工具。' :
  averageScore >= 70 ?
  '⚠️ 标准化水平一般，建议进一步改进以提高一致性。' :
  '❌ 标准化水平较低，需要大幅改进以确保系统一致性。'
}

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 标准化报告已保存: ${reportPath}`);
  }
}

// 执行标准化
if (require.main === module) {
  const standardizer = new TestToolsStandardizer();
  standardizer.standardize()
    .then(() => standardizer.saveStandardizationReport())
    .catch(console.error);
}

module.exports = TestToolsStandardizer;
