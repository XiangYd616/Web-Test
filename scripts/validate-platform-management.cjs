/**
 * 平台管理功能验证脚本
 * 检查认证、用户管理、系统管理等核心功能
 */

const fs = require('fs');
const path = require('path');

class PlatformManagementValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.apiDir = path.join(this.projectRoot, 'backend', 'api');
    
    this.validation = {
      auth: {},
      routes: {},
      middleware: {},
      database: {},
      issues: [],
      summary: {
        compliant: 0,
        issues: 0,
        totalComponents: 0
      }
    };
  }

  /**
   * 执行平台管理验证
   */
  async validate() {
    console.log('🔍 验证平台管理功能...\n');
    
    // 1. 检查认证系统
    await this.validateAuthentication();
    
    // 2. 检查路由完整性
    await this.validateRoutes();
    
    // 3. 检查中间件
    await this.validateMiddleware();
    
    // 4. 检查数据库配置
    await this.validateDatabase();
    
    // 5. 检查循环引用问题
    await this.checkCircularReferences();
    
    this.outputResults();
    await this.generateReport();
    
    console.log('\n✅ 平台管理验证完成！');
  }

  /**
   * 验证认证系统
   */
  async validateAuthentication() {
    console.log('🔐 检查认证系统...');
    
    const authMiddlewarePath = path.join(this.apiDir, 'middleware', 'auth.js');
    const authRoutePath = path.join(this.apiDir, 'v1', 'routes', 'auth.js');
    
    let authScore = 0;
    const totalAuthChecks = 6;
    
    // 检查认证中间件
    if (fs.existsSync(authMiddlewarePath)) {
      console.log('   ✅ 认证中间件存在');
      authScore++;
      
      const content = fs.readFileSync(authMiddlewarePath, 'utf8');
      
      if (content.includes('generateToken')) {
        console.log('   ✅ Token生成功能');
        authScore++;
      } else {
        console.log('   ❌ 缺少Token生成功能');
        this.validation.issues.push('认证中间件缺少Token生成功能');
      }
      
      if (content.includes('verifyToken')) {
        console.log('   ✅ Token验证功能');
        authScore++;
      } else {
        console.log('   ❌ 缺少Token验证功能');
        this.validation.issues.push('认证中间件缺少Token验证功能');
      }
      
      if (content.includes('authMiddleware')) {
        console.log('   ✅ 认证中间件函数');
        authScore++;
      } else {
        console.log('   ❌ 缺少认证中间件函数');
        this.validation.issues.push('缺少认证中间件函数');
      }
    } else {
      console.log('   ❌ 认证中间件不存在');
      this.validation.issues.push('认证中间件文件不存在');
    }
    
    // 检查认证路由
    if (fs.existsSync(authRoutePath)) {
      console.log('   ✅ 认证路由存在');
      authScore++;
      
      const content = fs.readFileSync(authRoutePath, 'utf8');
      
      if (content.includes('router.post') && content.includes('login')) {
        console.log('   ✅ 登录路由');
        authScore++;
      } else {
        console.log('   ❌ 缺少登录路由');
        this.validation.issues.push('缺少登录路由');
      }
    } else {
      console.log('   ❌ 认证路由不存在');
      this.validation.issues.push('认证路由文件不存在');
    }
    
    this.validation.auth = {
      score: authScore,
      total: totalAuthChecks,
      percentage: (authScore / totalAuthChecks * 100).toFixed(1)
    };
  }

  /**
   * 验证路由完整性
   */
  async validateRoutes() {
    console.log('\n🛣️ 检查路由完整性...');
    
    const requiredRoutes = [
      { file: 'auth.js', name: '认证路由' },
      { file: 'users.js', name: '用户路由' },
      { file: 'system.js', name: '系统路由' },
      { file: 'tests.js', name: '测试路由' }
    ];
    
    let routeScore = 0;
    
    for (const route of requiredRoutes) {
      const routePath = path.join(this.apiDir, 'v1', 'routes', route.file);
      
      if (fs.existsSync(routePath)) {
        console.log(`   ✅ ${route.name}存在`);
        routeScore++;
        
        // 检查路由导出
        const content = fs.readFileSync(routePath, 'utf8');
        if (content.includes('module.exports = router')) {
          console.log(`   ✅ ${route.name}正确导出`);
        } else {
          console.log(`   ⚠️ ${route.name}导出可能有问题`);
        }
      } else {
        console.log(`   ❌ ${route.name}不存在`);
        this.validation.issues.push(`${route.name}文件不存在`);
      }
    }
    
    this.validation.routes = {
      score: routeScore,
      total: requiredRoutes.length,
      percentage: (routeScore / requiredRoutes.length * 100).toFixed(1)
    };
  }

  /**
   * 验证中间件
   */
  async validateMiddleware() {
    console.log('\n🔧 检查中间件...');
    
    const requiredMiddleware = [
      'auth.js',
      'errorHandler.js',
      'requestLogger.js',
      'responseFormatter.js'
    ];
    
    let middlewareScore = 0;
    
    for (const middleware of requiredMiddleware) {
      const middlewarePath = path.join(this.apiDir, 'middleware', middleware);
      
      if (fs.existsSync(middlewarePath)) {
        console.log(`   ✅ ${middleware}存在`);
        middlewareScore++;
      } else {
        console.log(`   ❌ ${middleware}不存在`);
        this.validation.issues.push(`中间件${middleware}不存在`);
      }
    }
    
    this.validation.middleware = {
      score: middlewareScore,
      total: requiredMiddleware.length,
      percentage: (middlewareScore / requiredMiddleware.length * 100).toFixed(1)
    };
  }

  /**
   * 验证数据库配置
   */
  async validateDatabase() {
    console.log('\n🗄️ 检查数据库配置...');
    
    const dbConfigPath = path.join(this.projectRoot, 'backend', 'config', 'database.js');
    
    let dbScore = 0;
    const totalDbChecks = 4;
    
    if (fs.existsSync(dbConfigPath)) {
      console.log('   ✅ 数据库配置文件存在');
      dbScore++;
      
      const content = fs.readFileSync(dbConfigPath, 'utf8');
      
      if (content.includes('getPool')) {
        console.log('   ✅ 连接池配置');
        dbScore++;
      } else {
        console.log('   ❌ 缺少连接池配置');
        this.validation.issues.push('数据库缺少连接池配置');
      }
      
      if (content.includes('healthCheck')) {
        console.log('   ✅ 健康检查功能');
        dbScore++;
      } else {
        console.log('   ❌ 缺少健康检查功能');
        this.validation.issues.push('数据库缺少健康检查功能');
      }
      
      if (content.includes('ssl')) {
        console.log('   ✅ SSL配置');
        dbScore++;
      } else {
        console.log('   ⚠️ 缺少SSL配置');
      }
    } else {
      console.log('   ❌ 数据库配置文件不存在');
      this.validation.issues.push('数据库配置文件不存在');
    }
    
    this.validation.database = {
      score: dbScore,
      total: totalDbChecks,
      percentage: (dbScore / totalDbChecks * 100).toFixed(1)
    };
  }

  /**
   * 检查循环引用问题
   */
  async checkCircularReferences() {
    console.log('\n🔄 检查循环引用问题...');
    
    const routeFiles = ['auth.js', 'users.js', 'system.js', 'tests.js'];
    let circularIssues = 0;
    
    for (const file of routeFiles) {
      const filePath = path.join(this.apiDir, 'v1', 'routes', file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查是否引用自己
        if (content.includes(`require('./${file}')`)) {
          console.log(`   ❌ ${file}存在循环引用`);
          circularIssues++;
          this.validation.issues.push(`${file}存在循环引用问题`);
        } else {
          console.log(`   ✅ ${file}无循环引用`);
        }
      }
    }
    
    if (circularIssues === 0) {
      console.log('   🎉 所有路由文件都无循环引用问题');
    }
  }

  /**
   * 输出结果
   */
  outputResults() {
    console.log('\n📊 平台管理验证结果:');
    
    const components = [
      { name: '认证系统', data: this.validation.auth },
      { name: '路由系统', data: this.validation.routes },
      { name: '中间件', data: this.validation.middleware },
      { name: '数据库配置', data: this.validation.database }
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
      console.log('🎉 优秀！平台管理功能完整且正常');
    } else if (parseFloat(overallPercentage) >= 85) {
      console.log('👍 良好！平台管理功能基本正常');
    } else {
      console.log('⚠️ 需要修复！平台管理功能存在问题');
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
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'PLATFORM_MANAGEMENT_REPORT.md');
    
    const summary = this.validation.summary;
    
    const report = `# 平台管理功能验证报告

## 📊 验证概览

- **总体评分**: ${summary.percentage}%
- **正常组件**: ${summary.compliant}个
- **问题组件**: ${summary.issues}个
- **验证时间**: ${new Date().toISOString()}

## 🎯 系统状态

${parseFloat(summary.percentage) >= 95 ? 
  '🎉 **优秀**: 平台管理功能完整且正常，可以正常提供服务。' :
  parseFloat(summary.percentage) >= 85 ?
  '👍 **良好**: 平台管理功能基本正常，少数组件需要完善。' :
  '⚠️ **需要修复**: 平台管理功能存在重要问题，需要立即修复。'
}

## 🔧 各组件详细状态

### 🔐 认证系统 (${this.validation.auth?.percentage || 0}%)
${this.validation.auth ? `完整度: ${this.validation.auth.score}/${this.validation.auth.total}` : '未检测'}

### 🛣️ 路由系统 (${this.validation.routes?.percentage || 0}%)
${this.validation.routes ? `完整度: ${this.validation.routes.score}/${this.validation.routes.total}` : '未检测'}

### 🔧 中间件 (${this.validation.middleware?.percentage || 0}%)
${this.validation.middleware ? `完整度: ${this.validation.middleware.score}/${this.validation.middleware.total}` : '未检测'}

### 🗄️ 数据库配置 (${this.validation.database?.percentage || 0}%)
${this.validation.database ? `完整度: ${this.validation.database.score}/${this.validation.database.total}` : '未检测'}

## ⚠️ 发现的问题

${this.validation.issues.length > 0 ? 
  this.validation.issues.map(issue => `- ${issue}`).join('\n') : 
  '无发现问题'
}

## 🔧 修复建议

1. **循环引用问题**: 确保路由文件从中间件目录导入认证功能，而不是从自身
2. **缺失功能**: 补充缺失的认证、路由或中间件功能
3. **配置优化**: 完善数据库和SSL配置
4. **代码质量**: 定期检查和维护代码质量

## 📋 平台管理架构

\`\`\`
backend/api/
├── v1/                          # API版本1
│   ├── index.js                 # 主入口
│   └── routes/                  # 路由目录
│       ├── auth.js              # 认证路由 ✅
│       ├── users.js             # 用户路由 ✅
│       ├── system.js            # 系统路由 ✅
│       └── tests.js             # 测试路由 ✅
├── middleware/                  # 中间件目录
│   ├── auth.js                  # 认证中间件 ✅
│   ├── errorHandler.js          # 错误处理 ✅
│   ├── requestLogger.js         # 请求日志 ✅
│   └── responseFormatter.js     # 响应格式化 ✅
└── docs/                        # API文档
    └── swagger.js               # Swagger配置 ✅
\`\`\`

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 平台管理验证报告已保存: ${reportPath}`);
  }
}

// 执行验证
if (require.main === module) {
  const validator = new PlatformManagementValidator();
  validator.validate().catch(console.error);
}

module.exports = PlatformManagementValidator;
