/**
 * 测试工具依赖安装脚本
 * 安装所有测试工具所需的依赖包
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyInstaller {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    // 核心依赖列表
    this.dependencies = [
      // 基础依赖
      'axios',           // HTTP客户端
      'joi',             // 数据验证
      'cheerio',         // HTML解析
      
      // 性能测试
      'lighthouse',      // Google Lighthouse
      'chrome-launcher', // Chrome启动器
      
      // 浏览器自动化
      'puppeteer',       // Chrome自动化
      'playwright',      // 跨浏览器测试
      
      // 开发依赖
      '@types/node'      // Node.js类型定义
    ];
    
    this.devDependencies = [
      '@types/node',
      'nodemon'
    ];
  }

  /**
   * 执行依赖安装
   */
  async install() {
    console.log('🚀 开始安装测试工具依赖...\n');
    
    // 1. 检查package.json
    await this.checkPackageJson();
    
    // 2. 安装生产依赖
    await this.installProductionDependencies();
    
    // 3. 安装开发依赖
    await this.installDevDependencies();
    
    // 4. 验证安装
    await this.verifyInstallation();
    
    console.log('\n✅ 依赖安装完成！');
  }

  /**
   * 检查package.json
   */
  async checkPackageJson() {
    console.log('📋 检查package.json...');
    
    if (!fs.existsSync(this.packageJsonPath)) {
      console.log('   ⚠️ package.json不存在，创建基础配置...');
      await this.createPackageJson();
    } else {
      console.log('   ✅ package.json存在');
    }
  }

  /**
   * 创建基础package.json
   */
  async createPackageJson() {
    const packageConfig = {
      "name": "test-web-platform",
      "version": "1.0.0",
      "description": "Web测试平台",
      "main": "backend/server.js",
      "scripts": {
        "start": "node backend/server.js",
        "dev": "nodemon backend/server.js",
        "test": "node scripts/test-all-engines.cjs"
      },
      "keywords": ["web", "testing", "automation", "performance", "seo", "security"],
      "author": "Test Web Platform",
      "license": "MIT",
      "dependencies": {},
      "devDependencies": {}
    };

    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageConfig, null, 2));
    console.log('   ✅ 基础package.json已创建');
  }

  /**
   * 安装生产依赖
   */
  async installProductionDependencies() {
    console.log('\n📦 安装生产依赖...');
    
    const productionDeps = this.dependencies.filter(dep => dep !== '@types/node');
    
    for (const dep of productionDeps) {
      console.log(`   📥 安装 ${dep}...`);
      await this.installPackage(dep, false);
    }
  }

  /**
   * 安装开发依赖
   */
  async installDevDependencies() {
    console.log('\n🛠️ 安装开发依赖...');
    
    for (const dep of this.devDependencies) {
      console.log(`   📥 安装 ${dep} (dev)...`);
      await this.installPackage(dep, true);
    }
  }

  /**
   * 安装单个包
   */
  installPackage(packageName, isDev = false) {
    return new Promise((resolve, reject) => {
      const args = ['install', packageName];
      if (isDev) {
        args.push('--save-dev');
      }

      const npm = spawn('npm', args, {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      npm.stdout.on('data', (data) => {
        output += data.toString();
      });

      npm.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log(`      ✅ ${packageName} 安装成功`);
          resolve();
        } else {
          console.log(`      ❌ ${packageName} 安装失败: ${errorOutput}`);
          reject(new Error(`Failed to install ${packageName}: ${errorOutput}`));
        }
      });

      npm.on('error', (error) => {
        console.log(`      ❌ ${packageName} 安装错误: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * 验证安装
   */
  async verifyInstallation() {
    console.log('\n🔍 验证依赖安装...');
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    let verified = 0;
    let failed = 0;

    for (const dep of this.dependencies) {
      try {
        require.resolve(dep);
        console.log(`   ✅ ${dep}: 已安装`);
        verified++;
      } catch (error) {
        console.log(`   ❌ ${dep}: 未找到`);
        failed++;
      }
    }

    console.log(`\n📊 验证结果:`);
    console.log(`   ✅ 成功: ${verified}个`);
    console.log(`   ❌ 失败: ${failed}个`);

    if (failed === 0) {
      console.log('   🎉 所有依赖验证通过！');
    } else {
      console.log('   ⚠️ 部分依赖安装失败，请手动检查');
    }
  }
}

// 执行安装
if (require.main === module) {
  const installer = new DependencyInstaller();
  installer.install().catch(console.error);
}

module.exports = DependencyInstaller;
