#!/usr/bin/env node

/**
 * 检查测试引擎依赖项
 * 确保所有必要的npm包都已安装
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EngineDependencyChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.missingDependencies = [];
    this.installedDependencies = [];
    
    // 各引擎所需的依赖项
    this.engineDependencies = {
      api: [
        'axios',
        'joi'
      ],
      performance: [
        'lighthouse',
        'chrome-launcher',
        'puppeteer'
      ],
      security: [
        'axios',
        'joi',
        'ssl-checker',
        'helmet'
      ],
      seo: [
        'cheerio',
        'axios',
        'joi',
        'robots-parser'
      ],
      stress: [
        'axios',
        'joi'
      ],
      infrastructure: [
        'axios',
        'joi'
      ],
      ux: [
        'puppeteer',
        'joi'
      ],
      compatibility: [
        'playwright',
        'joi'
      ],
      website: [
        'cheerio',
        'axios',
        'joi'
      ],
      common: [
        'express',
        'cors',
        'helmet',
        'compression',
        'morgan',
        'dotenv',
        'joi',
        'uuid'
      ]
    };
  }

  /**
   * 执行依赖项检查
   */
  async check() {
    console.log('🔍 检查测试引擎依赖项...\n');

    try {
      // 1. 读取package.json
      await this.readPackageJson();

      // 2. 检查各引擎依赖
      await this.checkEngineDependencies();

      // 3. 生成报告
      this.generateReport();

      // 4. 如果有缺失依赖，提供安装建议
      if (this.missingDependencies.length > 0) {
        this.suggestInstallation();
      }

    } catch (error) {
      console.error('❌ 依赖项检查失败:', error);
      process.exit(1);
    }
  }

  /**
   * 读取package.json
   */
  async readPackageJson() {
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json文件不存在');
    }

    this.packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    this.allDependencies = {
      ...this.packageJson.dependencies || {},
      ...this.packageJson.devDependencies || {}
    };

    console.log(`📦 已读取package.json，共${Object.keys(this.allDependencies).length}个依赖项`);
  }

  /**
   * 检查各引擎依赖
   */
  async checkEngineDependencies() {
    console.log('\n🔧 检查各引擎依赖项:');

    for (const [engineName, dependencies] of Object.entries(this.engineDependencies)) {
      console.log(`\n   📋 检查 ${engineName} 引擎:`);

      const engineMissing = [];
      const engineInstalled = [];

      for (const dep of dependencies) {
        if (this.allDependencies[dep]) {
          engineInstalled.push({
            name: dep,
            version: this.allDependencies[dep],
            engine: engineName
          });
          console.log(`      ✅ ${dep} (${this.allDependencies[dep]})`);
        } else {
          engineMissing.push({
            name: dep,
            engine: engineName
          });
          console.log(`      ❌ ${dep} - 缺失`);
        }
      }

      this.installedDependencies.push(...engineInstalled);
      this.missingDependencies.push(...engineMissing);
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 依赖项检查报告');
    console.log('='.repeat(50));

    const totalDeps = this.installedDependencies.length + this.missingDependencies.length;
    const installedCount = this.installedDependencies.length;
    const missingCount = this.missingDependencies.length;

    console.log(`总依赖项: ${totalDeps}`);
    console.log(`已安装: ${installedCount} (${Math.round(installedCount / totalDeps * 100)}%)`);
    console.log(`缺失: ${missingCount} (${Math.round(missingCount / totalDeps * 100)}%)`);

    if (missingCount === 0) {
      console.log('\n✅ 所有依赖项都已安装！');
    } else {
      console.log(`\n⚠️  发现 ${missingCount} 个缺失的依赖项:`);
      
      // 按引擎分组显示缺失依赖
      const missingByEngine = {};
      this.missingDependencies.forEach(dep => {
        if (!missingByEngine[dep.engine]) {
          missingByEngine[dep.engine] = [];
        }
        missingByEngine[dep.engine].push(dep.name);
      });

      for (const [engine, deps] of Object.entries(missingByEngine)) {
        console.log(`   ${engine}: ${deps.join(', ')}`);
      }
    }

    // 显示已安装的关键依赖
    console.log('\n📦 关键依赖项状态:');
    const keyDeps = ['express', 'axios', 'joi', 'lighthouse', 'puppeteer', 'playwright'];
    keyDeps.forEach(dep => {
      const installed = this.allDependencies[dep];
      if (installed) {
        console.log(`   ✅ ${dep}: ${installed}`);
      } else {
        console.log(`   ❌ ${dep}: 未安装`);
      }
    });
  }

  /**
   * 提供安装建议
   */
  suggestInstallation() {
    console.log('\n🚀 安装建议:');

    // 获取唯一的缺失依赖
    const uniqueMissing = [...new Set(this.missingDependencies.map(dep => dep.name))];

    console.log('\n1. 安装所有缺失依赖:');
    console.log(`   npm install ${uniqueMissing.join(' ')}`);

    console.log('\n2. 或者按引擎分别安装:');
    const missingByEngine = {};
    this.missingDependencies.forEach(dep => {
      if (!missingByEngine[dep.engine]) {
        missingByEngine[dep.engine] = [];
      }
      if (!missingByEngine[dep.engine].includes(dep.name)) {
        missingByEngine[dep.engine].push(dep.name);
      }
    });

    for (const [engine, deps] of Object.entries(missingByEngine)) {
      console.log(`   # ${engine} 引擎:`);
      console.log(`   npm install ${deps.join(' ')}`);
    }

    console.log('\n3. 开发依赖 (可选):');
    console.log('   npm install --save-dev jest supertest nodemon');
  }

  /**
   * 自动安装缺失依赖
   */
  async autoInstall() {
    if (this.missingDependencies.length === 0) {
      console.log('✅ 没有需要安装的依赖项');
      return;
    }

    const uniqueMissing = [...new Set(this.missingDependencies.map(dep => dep.name))];
    
    console.log(`\n🔄 自动安装 ${uniqueMissing.length} 个缺失依赖...`);
    console.log(`依赖项: ${uniqueMissing.join(', ')}`);

    try {
      const installCommand = `npm install ${uniqueMissing.join(' ')}`;
      console.log(`执行命令: ${installCommand}`);
      
      execSync(installCommand, { 
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      console.log('✅ 依赖项安装完成！');
    } catch (error) {
      console.error('❌ 自动安装失败:', error.message);
      console.log('请手动执行安装命令');
    }
  }

  /**
   * 验证引擎可用性
   */
  async validateEngines() {
    console.log('\n🔍 验证引擎可用性...');

    const enginePaths = {
      api: '../backend/engines/api/apiTestEngine.js',
      performance: '../backend/engines/performance/performanceTestEngine.js',
      security: '../backend/engines/security/securityTestEngine.js',
      seo: '../backend/engines/seo/seoTestEngine.js',
      stress: '../backend/engines/stress/stressTestEngine.js',
      infrastructure: '../backend/engines/infrastructure/infrastructureTestEngine.js',
      ux: '../backend/engines/ux/uxTestEngine.js',
      compatibility: '../backend/engines/compatibility/compatibilityTestEngine.js',
      website: '../backend/engines/website/websiteTestEngine.js'
    };

    for (const [engineName, enginePath] of Object.entries(enginePaths)) {
      const fullPath = path.join(this.projectRoot, enginePath);
      
      if (fs.existsSync(fullPath)) {
        try {
          // 尝试加载引擎
          require(fullPath);
          console.log(`   ✅ ${engineName} 引擎可用`);
        } catch (error) {
          console.log(`   ❌ ${engineName} 引擎加载失败: ${error.message}`);
        }
      } else {
        console.log(`   ❌ ${engineName} 引擎文件不存在: ${enginePath}`);
      }
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const autoInstall = args.includes('--install') || args.includes('-i');
const validateEngines = args.includes('--validate') || args.includes('-v');

// 执行检查
async function main() {
  const checker = new EngineDependencyChecker();
  
  await checker.check();
  
  if (validateEngines) {
    await checker.validateEngines();
  }
  
  if (autoInstall) {
    await checker.autoInstall();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EngineDependencyChecker;
