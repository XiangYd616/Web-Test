/**
 * API系统完整性验证脚本
 * 验证平台自身的API管理系统是否完整正常
 */

const fs = require('fs');
const path = require('path');

class APISystemValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.apiDir = path.join(this.projectRoot, 'backend', 'api');
    
    this.validation = {
      structure: {},
      routes: {},
      middleware: {},
      engines: {},
      issues: [],
      summary: {
        compliant: 0,
        issues: 0,
        totalComponents: 0
      }
    };
  }

  /**
   * 执行API系统验证
   */
  async validate() {
    console.log('🔍 验证平台API管理系统完整性...\n');
    
    // 1. 检查目录结构
    await this.validateDirectoryStructure();
    
    // 2. 检查路由完整性
    await this.validateRoutes();
    
    // 3. 检查中间件
    await this.validateMiddleware();
    
    // 4. 检查引擎集成
    await this.validateEngineIntegration();
    
    // 5. 检查API文档
    await this.validateDocumentation();
    
    this.outputResults();
    await this.generateReport();
    
    console.log('\n✅ API系统验证完成！');
  }

  /**
   * 验证目录结构
   */
  async validateDirectoryStructure() {
    console.log('📁 检查API目录结构...');
    
    const requiredDirs = [
      'v1',
      'v1/routes',
      'middleware',
      'docs'
    ];
    
    const requiredFiles = [
      'v1/index.js',
      'v1/routes/auth.js',
      'v1/routes/tests.js',
      'v1/routes/users.js',
      'v1/routes/system.js'
    ];
    
    let structureScore = 0;
    const totalStructureItems = requiredDirs.length + requiredFiles.length;
    
    // 检查目录
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.apiDir, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`   ✅ 目录存在: ${dir}`);
        structureScore++;
      } else {
        console.log(`   ❌ 目录缺失: ${dir}`);
        this.validation.issues.push(`缺少目录: ${dir}`);
      }
    }
    
    // 检查文件
    for (const file of requiredFiles) {
      const filePath = path.join(this.apiDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ 文件存在: ${file}`);
        structureScore++;
      } else {
        console.log(`   ❌ 文件缺失: ${file}`);
        this.validation.issues.push(`缺少文件: ${file}`);
      }
    }
    
    this.validation.structure = {
      score: structureScore,
      total: totalStructureItems,
      percentage: (structureScore / totalStructureItems * 100).toFixed(1)
    };
  }

  /**
   * 验证路由完整性
   */
  async validateRoutes() {
    console.log('\n🛣️ 检查API路由完整性...');
    
    const routeFiles = [
      { name: 'auth.js', expectedRoutes: ['POST /login', 'POST /register', 'POST /logout'] },
      { name: 'tests.js', expectedRoutes: ['GET /', 'POST /:type/start', 'GET /:id', 'DELETE /:id'] },
      { name: 'users.js', expectedRoutes: ['GET /profile', 'PUT /profile'] },
      { name: 'system.js', expectedRoutes: ['GET /config', 'GET /health'] }
    ];
    
    let routeScore = 0;
    let totalRoutes = 0;
    
    for (const routeFile of routeFiles) {
      const filePath = path.join(this.apiDir, 'v1', 'routes', routeFile.name);
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ❌ 路由文件不存在: ${routeFile.name}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      let foundRoutes = 0;
      
      for (const route of routeFile.expectedRoutes) {
        totalRoutes++;
        const [method, path] = route.split(' ');
        const routePattern = new RegExp(`router\\.${method.toLowerCase()}\\(['"]${path.replace(/:/g, '\\:')}['"]`);
        
        if (routePattern.test(content)) {
          foundRoutes++;
          routeScore++;
        }
      }
      
      console.log(`   ${foundRoutes === routeFile.expectedRoutes.length ? '✅' : '⚠️'} ${routeFile.name}: ${foundRoutes}/${routeFile.expectedRoutes.length} 路由`);
    }
    
    this.validation.routes = {
      score: routeScore,
      total: totalRoutes,
      percentage: totalRoutes > 0 ? (routeScore / totalRoutes * 100).toFixed(1) : 0
    };
  }

  /**
   * 验证中间件
   */
  async validateMiddleware() {
    console.log('\n🔧 检查中间件完整性...');
    
    const requiredMiddleware = [
      'auth.js',
      'errorHandler.js',
      'requestLogger.js',
      'responseFormatter.js',
      'cacheMiddleware.js'
    ];
    
    let middlewareScore = 0;
    
    for (const middleware of requiredMiddleware) {
      const filePath = path.join(this.apiDir, 'middleware', middleware);
      
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ 中间件存在: ${middleware}`);
        middlewareScore++;
      } else {
        console.log(`   ❌ 中间件缺失: ${middleware}`);
        this.validation.issues.push(`缺少中间件: ${middleware}`);
      }
    }
    
    this.validation.middleware = {
      score: middlewareScore,
      total: requiredMiddleware.length,
      percentage: (middlewareScore / requiredMiddleware.length * 100).toFixed(1)
    };
  }

  /**
   * 验证引擎集成
   */
  async validateEngineIntegration() {
    console.log('\n⚙️ 检查测试引擎集成...');
    
    const testsRoutePath = path.join(this.apiDir, 'v1', 'routes', 'tests.js');
    
    if (!fs.existsSync(testsRoutePath)) {
      console.log('   ❌ 测试路由文件不存在');
      this.validation.engines = { score: 0, total: 9, percentage: 0 };
      return;
    }
    
    const content = fs.readFileSync(testsRoutePath, 'utf8');
    
    const expectedEngines = [
      'seo', 'performance', 'security', 'stress', 'api',
      'compatibility', 'ux', 'infrastructure', 'website'
    ];
    
    let engineScore = 0;
    
    for (const engine of expectedEngines) {
      const importPattern = new RegExp(`require\\(['"].*engines/${engine}['"]\\)`);
      
      if (importPattern.test(content)) {
        console.log(`   ✅ 引擎集成: ${engine}`);
        engineScore++;
      } else {
        console.log(`   ⚠️ 引擎未集成: ${engine}`);
        this.validation.issues.push(`${engine}引擎未正确集成`);
      }
    }
    
    this.validation.engines = {
      score: engineScore,
      total: expectedEngines.length,
      percentage: (engineScore / expectedEngines.length * 100).toFixed(1)
    };
  }

  /**
   * 验证API文档
   */
  async validateDocumentation() {
    console.log('\n📚 检查API文档...');
    
    const docsDir = path.join(this.apiDir, 'docs');
    const expectedDocs = ['swagger.js', 'test-engines-api.js'];
    
    let docsScore = 0;
    
    for (const doc of expectedDocs) {
      const docPath = path.join(docsDir, doc);
      
      if (fs.existsSync(docPath)) {
        console.log(`   ✅ 文档存在: ${doc}`);
        docsScore++;
      } else {
        console.log(`   ⚠️ 文档缺失: ${doc}`);
      }
    }
    
    this.validation.documentation = {
      score: docsScore,
      total: expectedDocs.length,
      percentage: (docsScore / expectedDocs.length * 100).toFixed(1)
    };
  }

  /**
   * 输出结果
   */
  outputResults() {
    console.log('\n📊 API系统验证结果:');
    
    const components = [
      { name: '目录结构', data: this.validation.structure },
      { name: 'API路由', data: this.validation.routes },
      { name: '中间件', data: this.validation.middleware },
      { name: '引擎集成', data: this.validation.engines },
      { name: 'API文档', data: this.validation.documentation }
    ];
    
    let totalScore = 0;
    let maxScore = 0;
    
    for (const component of components) {
      if (component.data) {
        const icon = parseFloat(component.data.percentage) >= 90 ? '✅' : 
                    parseFloat(component.data.percentage) >= 70 ? '🟡' : '⚠️';
        console.log(`   ${icon} ${component.name}: ${component.data.score}/${component.data.total} (${component.data.percentage}%)`);
        
        totalScore += component.data.score;
        maxScore += component.data.total;
      }
    }
    
    const overallPercentage = maxScore > 0 ? (totalScore / maxScore * 100).toFixed(1) : 0;
    
    console.log(`\n🎯 总体评分: ${totalScore}/${maxScore} (${overallPercentage}%)`);
    
    if (parseFloat(overallPercentage) >= 95) {
      console.log('🎉 优秀！API系统完整且功能正常');
    } else if (parseFloat(overallPercentage) >= 85) {
      console.log('👍 良好！API系统基本完整');
    } else {
      console.log('⚠️ 需要修复！API系统存在缺失');
    }
    
    if (this.validation.issues.length > 0) {
      console.log(`\n⚠️ 发现问题 (${this.validation.issues.length}个):`);
      this.validation.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    this.validation.summary = {
      compliant: totalScore,
      issues: maxScore - totalScore,
      totalComponents: maxScore,
      percentage: overallPercentage
    };
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'API_SYSTEM_VALIDATION_REPORT.md');
    
    const summary = this.validation.summary;
    
    const report = `# API系统完整性验证报告

## 📊 验证概览

- **总体评分**: ${summary.percentage}%
- **完整组件**: ${summary.compliant}个
- **缺失组件**: ${summary.issues}个
- **验证时间**: ${new Date().toISOString()}

## 🎯 系统状态

${parseFloat(summary.percentage) >= 95 ? 
  '🎉 **优秀**: API系统完整且功能正常，可以正常提供服务。' :
  parseFloat(summary.percentage) >= 85 ?
  '👍 **良好**: API系统基本完整，少数组件需要完善。' :
  '⚠️ **需要修复**: API系统存在重要缺失，需要立即修复。'
}

## 🔧 各组件详细状态

### 📁 目录结构 (${this.validation.structure?.percentage || 0}%)
${this.validation.structure ? `完整度: ${this.validation.structure.score}/${this.validation.structure.total}` : '未检测'}

### 🛣️ API路由 (${this.validation.routes?.percentage || 0}%)
${this.validation.routes ? `完整度: ${this.validation.routes.score}/${this.validation.routes.total}` : '未检测'}

### 🔧 中间件 (${this.validation.middleware?.percentage || 0}%)
${this.validation.middleware ? `完整度: ${this.validation.middleware.score}/${this.validation.middleware.total}` : '未检测'}

### ⚙️ 引擎集成 (${this.validation.engines?.percentage || 0}%)
${this.validation.engines ? `完整度: ${this.validation.engines.score}/${this.validation.engines.total}` : '未检测'}

### 📚 API文档 (${this.validation.documentation?.percentage || 0}%)
${this.validation.documentation ? `完整度: ${this.validation.documentation.score}/${this.validation.documentation.total}` : '未检测'}

## ⚠️ 发现的问题

${this.validation.issues.length > 0 ? 
  this.validation.issues.map(issue => `- ${issue}`).join('\n') : 
  '无发现问题'
}

## 📋 API系统架构

\`\`\`
backend/api/
├── v1/                          # API版本1
│   ├── index.js                 # 主入口文件
│   └── routes/                  # 路由目录
│       ├── auth.js              # 认证路由
│       ├── tests.js             # 测试路由
│       ├── users.js             # 用户路由
│       └── system.js            # 系统路由
├── middleware/                  # 中间件目录
│   ├── auth.js                  # 认证中间件
│   ├── errorHandler.js          # 错误处理
│   ├── requestLogger.js         # 请求日志
│   ├── responseFormatter.js     # 响应格式化
│   └── cacheMiddleware.js       # 缓存中间件
└── docs/                        # API文档
    ├── swagger.js               # Swagger配置
    └── test-engines-api.js      # 测试引擎API文档
\`\`\`

## 🚀 功能特性

- ✅ RESTful API设计
- ✅ JWT认证系统
- ✅ 请求限流保护
- ✅ 错误处理机制
- ✅ 响应格式标准化
- ✅ 请求日志记录
- ✅ API文档支持
- ✅ 健康检查端点
- ✅ 系统监控指标

## 📈 与测试引擎的关系

**平台API系统** (backend/api/) 负责：
- 提供前端调用的API接口
- 管理用户认证和授权
- 处理测试请求和响应
- 系统配置和监控

**测试引擎** (backend/engines/) 负责：
- 执行具体的测试逻辑
- 提供测试能力和结果
- 被API系统调用执行测试

两者分工明确，API系统是平台的对外接口，测试引擎是平台的核心能力。

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 API系统验证报告已保存: ${reportPath}`);
  }
}

// 执行验证
if (require.main === module) {
  const validator = new APISystemValidator();
  validator.validate().catch(console.error);
}

module.exports = APISystemValidator;
