#!/usr/bin/env node

/**
 * package.json 使用分析工具
 * 检查根目录和 server 目录的 package.json 配置是否合理
 */

const fs = require('fs');
const path = require('path');

class PackageJsonAnalyzer {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * 分析 package.json 配置
   */
  analyze() {
    console.log('📦 package.json 配置分析');
    console.log('=' .repeat(60));

    // 解析配置文件
    const rootPackage = this.parsePackageJson('package.json');
    const serverPackage = this.parsePackageJson('server/package.json');

    if (!rootPackage || !serverPackage) {
      console.log('❌ 无法读取 package.json 文件');
      return;
    }

    // 检查脚本分工
    this.checkScriptSeparation(rootPackage, serverPackage);
    
    // 检查依赖分离
    this.checkDependencySeparation(rootPackage, serverPackage);
    
    // 检查脚本命名规范
    this.checkScriptNaming(rootPackage, serverPackage);
    
    // 检查脚本功能分类
    this.checkScriptCategories(rootPackage, serverPackage);
    
    // 生成报告
    this.generateReport();
  }

  /**
   * 解析 package.json 文件
   */
  parsePackageJson(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.log(`❌ 解析失败: ${filePath} - ${error.message}`);
      return null;
    }
  }

  /**
   * 检查脚本分工
   */
  checkScriptSeparation(rootPackage, serverPackage) {
    console.log('🔍 检查脚本分工...');
    
    const rootScripts = Object.keys(rootPackage.scripts || {});
    const serverScripts = Object.keys(serverPackage.scripts || {});
    
    // 检查根目录应有的脚本
    const expectedRootScripts = [
      'start', 'dev', 'build', 'frontend', 'backend', 'backend:dev',
      'electron:start', 'electron:dev', 'electron:build'
    ];
    
    expectedRootScripts.forEach(script => {
      if (!rootScripts.includes(script)) {
        this.warnings.push(`⚠️  根目录缺少脚本: ${script}`);
      } else {
        console.log(`✅ 根目录脚本: ${script}`);
      }
    });
    
    // 检查 server 应有的脚本
    const expectedServerScripts = [
      'start', 'dev', 'test', 'lint', 'validate-env'
    ];
    
    expectedServerScripts.forEach(script => {
      if (!serverScripts.includes(script)) {
        this.warnings.push(`⚠️  server 缺少脚本: ${script}`);
      } else {
        console.log(`✅ server 脚本: ${script}`);
      }
    });
    
    // 检查脚本委托
    this.checkScriptDelegation(rootPackage);
  }

  /**
   * 检查脚本委托
   */
  checkScriptDelegation(rootPackage) {
    const scripts = rootPackage.scripts || {};
    
    // 检查后端脚本是否正确委托
    if (scripts.backend && !scripts.backend.includes('cd server')) {
      this.issues.push('❌ backend 脚本应该委托给 server 目录');
    }
    
    if (scripts['backend:dev'] && !scripts['backend:dev'].includes('cd server')) {
      this.issues.push('❌ backend:dev 脚本应该委托给 server 目录');
    }
    
    // 检查数据库脚本是否正确委托
    Object.keys(scripts).forEach(scriptName => {
      if (scriptName.startsWith('db:') && !scripts[scriptName].includes('cd server')) {
        this.issues.push(`❌ ${scriptName} 脚本应该委托给 server 目录`);
      }
    });
  }

  /**
   * 检查依赖分离
   */
  checkDependencySeparation(rootPackage, serverPackage) {
    console.log('\n📦 检查依赖分离...');
    
    const rootDeps = Object.keys(rootPackage.dependencies || {});
    const rootDevDeps = Object.keys(rootPackage.devDependencies || {});
    const serverDeps = Object.keys(serverPackage.dependencies || {});
    const serverDevDeps = Object.keys(serverPackage.devDependencies || {});
    
    // 检查重复依赖
    const duplicateDeps = rootDeps.filter(dep => serverDeps.includes(dep));
    if (duplicateDeps.length > 0) {
      this.issues.push(`❌ 重复的生产依赖: ${duplicateDeps.join(', ')}`);
    }
    
    const duplicateDevDeps = rootDevDeps.filter(dep => serverDevDeps.includes(dep));
    if (duplicateDevDeps.length > 0) {
      this.warnings.push(`⚠️  重复的开发依赖: ${duplicateDevDeps.join(', ')}`);
    }
    
    // 检查前端依赖是否在后端
    const frontendDeps = ['vite', 'react', 'vue', '@types/react'];
    const frontendInServer = serverDeps.filter(dep => 
      frontendDeps.some(frontend => dep.includes(frontend))
    );
    if (frontendInServer.length > 0) {
      this.issues.push(`❌ 前端依赖在后端: ${frontendInServer.join(', ')}`);
    }
    
    // 检查后端依赖是否在前端
    const backendDeps = ['express', 'sequelize', 'bcryptjs', 'jsonwebtoken'];
    const backendInRoot = rootDeps.filter(dep => 
      backendDeps.some(backend => dep.includes(backend))
    );
    if (backendInRoot.length > 0) {
      this.issues.push(`❌ 后端依赖在前端: ${backendInRoot.join(', ')}`);
    }
    
    console.log(`✅ 根目录依赖: ${rootDeps.length} 个生产依赖, ${rootDevDeps.length} 个开发依赖`);
    console.log(`✅ server 依赖: ${serverDeps.length} 个生产依赖, ${serverDevDeps.length} 个开发依赖`);
  }

  /**
   * 检查脚本命名规范
   */
  checkScriptNaming(rootPackage, serverPackage) {
    console.log('\n📝 检查脚本命名规范...');
    
    const allScripts = {
      ...rootPackage.scripts,
      ...Object.fromEntries(
        Object.entries(serverPackage.scripts || {}).map(([key, value]) => [`server:${key}`, value])
      )
    };
    
    Object.keys(allScripts).forEach(scriptName => {
      // 检查是否使用了注释脚本
      if (scriptName.startsWith('_comment')) {
        console.log(`✅ 注释脚本: ${scriptName}`);
        return;
      }
      
      // 检查命名规范
      if (!/^[a-z][a-z0-9]*(:?[a-z][a-z0-9]*)*$/.test(scriptName)) {
        this.warnings.push(`⚠️  脚本命名不规范: ${scriptName}`);
      }
      
      // 检查常见的命名模式
      const commonPatterns = [
        /^(start|dev|build|test|lint|format)$/,
        /^(start|dev|build|test|lint|format):.+$/,
        /^[a-z]+:(start|dev|build|test|check|fix|clean)$/
      ];
      
      const isCommonPattern = commonPatterns.some(pattern => pattern.test(scriptName));
      if (!isCommonPattern && !scriptName.startsWith('_')) {
        this.suggestions.push(`💡 考虑重命名脚本: ${scriptName}`);
      }
    });
  }

  /**
   * 检查脚本功能分类
   */
  checkScriptCategories(rootPackage, serverPackage) {
    console.log('\n📋 检查脚本功能分类...');
    
    const categories = {
      '启动服务': ['start', 'dev', 'frontend', 'backend'],
      '构建打包': ['build', 'preview', 'electron:build'],
      '测试相关': ['test', 'test:watch', 'test:coverage'],
      '代码质量': ['lint', 'lint:fix', 'format', 'type-check'],
      '数据库操作': ['db:setup', 'db:check', 'init-db', 'reset-db'],
      '环境配置': ['env:check', 'env:validate', 'validate-env'],
      '缓存管理': ['cache:stats', 'cache:flush', 'redis:check'],
      '安全相关': ['security:audit', 'security:fix'],
      '项目维护': ['clean', 'deps:check', 'ci:check']
    };
    
    const rootScripts = Object.keys(rootPackage.scripts || {});
    const serverScripts = Object.keys(serverPackage.scripts || {});
    const allScripts = [...rootScripts, ...serverScripts.map(s => `server:${s}`)];
    
    Object.entries(categories).forEach(([category, scripts]) => {
      const foundScripts = scripts.filter(script => 
        allScripts.includes(script) || allScripts.includes(`server:${script}`)
      );
      
      if (foundScripts.length > 0) {
        console.log(`✅ ${category}: ${foundScripts.join(', ')}`);
      } else {
        this.warnings.push(`⚠️  ${category} 类别缺少脚本`);
      }
    });
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 分析报告');
    console.log('=' .repeat(60));
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('✅ package.json 配置完全正确！');
      return;
    }
    
    if (this.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      this.issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (this.suggestions.length > 0) {
      console.log('\n💡 建议:');
      this.suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    }
    
    console.log('\n📋 最佳实践总结:');
    console.log('   根目录 package.json:');
    console.log('     • 前端依赖和构建工具');
    console.log('     • 全局启动和构建脚本');
    console.log('     • Electron 相关配置');
    console.log('     • 委托后端脚本到 server 目录');
    console.log('');
    console.log('   server/package.json:');
    console.log('     • 后端依赖和运行时');
    console.log('     • 后端专用脚本');
    console.log('     • 数据库和缓存操作');
    console.log('     • 安全和维护工具');
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new PackageJsonAnalyzer();
  analyzer.analyze();
}

module.exports = PackageJsonAnalyzer;
