/**
 * 最终项目状态检查
 * 综合评估整个项目的完成度和质量
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

class FinalProjectChecker {
  constructor() {
    this.projectPath = process.cwd();
    this.results = {
      summary: {},
      frontend: {},
      backend: {},
      integration: {},
      testing: {},
      deployment: {},
      recommendations: []
    };
  }

  /**
   * 检查文件是否存在
   */
  checkFileExists(filePath) {
    try {
      return fs.existsSync(path.join(this.projectPath, filePath));
    } catch (error) {
      return false;
    }
  }

  /**
   * 读取文件内容
   */
  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(this.projectPath, filePath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查前端组件
   */
  checkFrontendComponents() {
    console.log('🔍 检查前端组件...');
    
    const frontendPages = [
      'frontend/pages/WebsiteTest.tsx',
      'frontend/pages/SEOTest.tsx', 
      'frontend/pages/PerformanceTest.tsx',
      'frontend/pages/SecurityTest.tsx',
      'frontend/pages/APITest.tsx',
      'frontend/pages/CompatibilityTest.tsx',
      'frontend/pages/UnifiedStressTest.tsx',
      'frontend/pages/UXTest.tsx'
    ];

    const components = [
      'frontend/components/auth/withAuthCheck.tsx',
      'frontend/components/testing/UniversalTestPage.tsx',
      'frontend/components/testing/TestRunner.tsx'
    ];

    this.results.frontend = {
      pages: {
        total: frontendPages.length,
        existing: 0,
        missing: []
      },
      components: {
        total: components.length,
        existing: 0,
        missing: []
      }
    };

    // 检查页面
    frontendPages.forEach(page => {
      if (this.checkFileExists(page)) {
        this.results.frontend.pages.existing++;
      } else {
        this.results.frontend.pages.missing.push(page);
      }
    });

    // 检查组件
    components.forEach(component => {
      if (this.checkFileExists(component)) {
        this.results.frontend.components.existing++;
      } else {
        this.results.frontend.components.missing.push(component);
      }
    });

    console.log(`✅ 前端页面: ${this.results.frontend.pages.existing}/${this.results.frontend.pages.total}`);
    console.log(`✅ 前端组件: ${this.results.frontend.components.existing}/${this.results.frontend.components.total}`);
  }

  /**
   * 检查后端路由和API
   */
  checkBackendRoutes() {
    console.log('🔍 检查后端路由...');
    
    const routes = [
      'backend/routes/auth.js',
      'backend/routes/oauth.js',
      'backend/routes/test.js',
      'backend/routes/tests.js',
      'backend/routes/seo.js',
      'backend/routes/security.js',
      'backend/routes/performance.js'
    ];

    this.results.backend.routes = {
      total: routes.length,
      existing: 0,
      missing: [],
      endpointCount: 0
    };

    routes.forEach(route => {
      if (this.checkFileExists(route)) {
        this.results.backend.routes.existing++;
        
        // 统计API端点数量
        const content = this.readFile(route);
        if (content) {
          const endpoints = (content.match(/router\.(get|post|put|delete|patch)/g) || []).length;
          this.results.backend.routes.endpointCount += endpoints;
        }
      } else {
        this.results.backend.routes.missing.push(route);
      }
    });

    console.log(`✅ 后端路由: ${this.results.backend.routes.existing}/${this.results.backend.routes.total}`);
    console.log(`✅ API端点总数: ${this.results.backend.routes.endpointCount}`);
  }

  /**
   * 检查测试引擎
   */
  checkTestEngines() {
    console.log('🔍 检查测试引擎...');
    
    const engines = [
      'backend/engines/api/APIAnalyzer.js',
      'backend/engines/security/securityTestEngine.js',
      'backend/engines/stress/stressTestEngine.js',
      'backend/engines/compatibility/compatibilityTestEngine.js',
      'backend/engines/api/UXAnalyzer.js',
      'backend/engines/api/apiTestEngine.js'
    ];

    this.results.backend.engines = {
      total: engines.length,
      existing: 0,
      missing: []
    };

    engines.forEach(engine => {
      if (this.checkFileExists(engine)) {
        this.results.backend.engines.existing++;
      } else {
        this.results.backend.engines.missing.push(engine);
      }
    });

    console.log(`✅ 测试引擎: ${this.results.backend.engines.existing}/${this.results.backend.engines.total}`);
  }

  /**
   * 检查数据库配置
   */
  checkDatabase() {
    console.log('🔍 检查数据库配置...');
    
    const dbFiles = [
      'backend/database/sequelize.js',
      'backend/migrations/001-add-mfa-fields.js',
      'backend/migrations/002-add-oauth-tables.js'
    ];

    this.results.backend.database = {
      total: dbFiles.length,
      existing: 0,
      missing: []
    };

    dbFiles.forEach(file => {
      if (this.checkFileExists(file)) {
        this.results.backend.database.existing++;
      } else {
        this.results.backend.database.missing.push(file);
      }
    });

    console.log(`✅ 数据库文件: ${this.results.backend.database.existing}/${this.results.backend.database.total}`);
  }

  /**
   * 检查配置文件
   */
  checkConfiguration() {
    console.log('🔍 检查配置文件...');
    
    const configFiles = [
      'backend/package.json',
      'backend/server.js',
      'backend/.env.example',
      'frontend/config/testTypes.ts',
      'frontend/services/api.ts'
    ];

    this.results.configuration = {
      total: configFiles.length,
      existing: 0,
      missing: []
    };

    configFiles.forEach(file => {
      if (this.checkFileExists(file)) {
        this.results.configuration.existing++;
      } else {
        this.results.configuration.missing.push(file);
      }
    });

    console.log(`✅ 配置文件: ${this.results.configuration.existing}/${this.results.configuration.total}`);
  }

  /**
   * 检查项目启动能力
   */
  async checkProjectStartability() {
    console.log('🔍 检查项目启动能力...');
    
    this.results.deployment = {
      backendReady: false,
      frontendReady: false,
      dependenciesInstalled: false
    };

    // 检查后端package.json
    const backendPackage = this.readFile('backend/package.json');
    if (backendPackage) {
      try {
        const pkg = JSON.parse(backendPackage);
        this.results.deployment.backendReady = !!(pkg.scripts && pkg.scripts.start);
      } catch (e) {
        this.results.deployment.backendReady = false;
      }
    }

    // 检查node_modules是否存在
    this.results.deployment.dependenciesInstalled = this.checkFileExists('backend/node_modules');
    
    console.log(`✅ 后端启动就绪: ${this.results.deployment.backendReady ? '是' : '否'}`);
    console.log(`✅ 依赖已安装: ${this.results.deployment.dependenciesInstalled ? '是' : '否'}`);
  }

  /**
   * 生成完成度评分
   */
  calculateCompletionScore() {
    console.log('📊 计算完成度评分...');
    
    const weights = {
      frontend: 0.3,
      backend: 0.4,
      configuration: 0.2,
      deployment: 0.1
    };

    let totalScore = 0;

    // 前端评分
    const frontendScore = (
      (this.results.frontend.pages.existing / this.results.frontend.pages.total) * 0.7 +
      (this.results.frontend.components.existing / this.results.frontend.components.total) * 0.3
    ) * 100;

    // 后端评分
    const backendScore = (
      (this.results.backend.routes.existing / this.results.backend.routes.total) * 0.4 +
      (this.results.backend.engines.existing / this.results.backend.engines.total) * 0.4 +
      (this.results.backend.database.existing / this.results.backend.database.total) * 0.2
    ) * 100;

    // 配置评分
    const configScore = (this.results.configuration.existing / this.results.configuration.total) * 100;

    // 部署评分
    const deployScore = (
      (this.results.deployment.backendReady ? 50 : 0) +
      (this.results.deployment.dependenciesInstalled ? 50 : 0)
    );

    totalScore = (
      frontendScore * weights.frontend +
      backendScore * weights.backend +
      configScore * weights.configuration +
      deployScore * weights.deployment
    );

    this.results.summary = {
      totalScore: Math.round(totalScore),
      frontendScore: Math.round(frontendScore),
      backendScore: Math.round(backendScore),
      configScore: Math.round(configScore),
      deployScore: Math.round(deployScore)
    };

    console.log(`🎯 总体完成度: ${this.results.summary.totalScore}%`);
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    console.log('💡 生成改进建议...');
    
    // 根据缺失项目生成建议
    if (this.results.frontend.pages.missing.length > 0) {
      this.results.recommendations.push({
        type: 'frontend',
        priority: 'high',
        message: `缺少前端页面: ${this.results.frontend.pages.missing.join(', ')}`
      });
    }

    if (this.results.backend.routes.missing.length > 0) {
      this.results.recommendations.push({
        type: 'backend',
        priority: 'high', 
        message: `缺少后端路由: ${this.results.backend.routes.missing.join(', ')}`
      });
    }

    if (!this.results.deployment.dependenciesInstalled) {
      this.results.recommendations.push({
        type: 'deployment',
        priority: 'medium',
        message: '需要安装依赖包: 运行 npm install'
      });
    }

    if (this.results.summary.totalScore >= 95) {
      this.results.recommendations.push({
        type: 'success',
        priority: 'info',
        message: '🎉 项目完成度极高，可以投入生产使用！'
      });
    } else if (this.results.summary.totalScore >= 80) {
      this.results.recommendations.push({
        type: 'success',
        priority: 'info',
        message: '✨ 项目完成度良好，建议补充少量缺失功能'
      });
    } else {
      this.results.recommendations.push({
        type: 'warning',
        priority: 'high',
        message: '⚠️ 项目还需要重要功能的补充'
      });
    }
  }

  /**
   * 生成详细报告
   */
  generateDetailedReport() {
    const reportPath = path.join(this.projectPath, 'final-project-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      projectName: 'Test-Web Platform',
      ...this.results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 详细报告已保存到: ${reportPath}`);
    
    return report;
  }

  /**
   * 运行完整检查
   */
  async runFullCheck() {
    console.log('🚀 开始最终项目状态检查...\n');
    
    this.checkFrontendComponents();
    console.log('');
    
    this.checkBackendRoutes();
    console.log('');
    
    this.checkTestEngines();
    console.log('');
    
    this.checkDatabase();
    console.log('');
    
    this.checkConfiguration();
    console.log('');
    
    await this.checkProjectStartability();
    console.log('');
    
    this.calculateCompletionScore();
    console.log('');
    
    this.generateRecommendations();
    console.log('');

    // 打印总结
    console.log('📋 最终检查结果:');
    console.log('==================');
    console.log(`总体完成度: ${this.results.summary.totalScore}%`);
    console.log(`前端模块: ${this.results.summary.frontendScore}%`);
    console.log(`后端模块: ${this.results.summary.backendScore}%`);
    console.log(`配置文件: ${this.results.summary.configScore}%`);
    console.log(`部署就绪: ${this.results.summary.deployScore}%`);
    console.log('');

    // 打印建议
    if (this.results.recommendations.length > 0) {
      console.log('💡 改进建议:');
      console.log('============');
      this.results.recommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'high' ? '🔴' : 
                            rec.priority === 'medium' ? '🟡' : '🔵';
        console.log(`${priorityIcon} ${rec.message}`);
      });
    }

    return this.generateDetailedReport();
  }
}

// 运行检查
const checker = new FinalProjectChecker();
checker.runFullCheck().then(() => {
  console.log('\n✅ 最终项目检查完成！');
}).catch(error => {
  console.error('❌ 检查过程中出现错误:', error);
});

export default FinalProjectChecker;
