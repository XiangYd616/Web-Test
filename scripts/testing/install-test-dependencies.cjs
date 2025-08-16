/**
 * 测试工具依赖安装脚本
 * 检查并安装所有测试工具需要的依赖包
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestDependencyInstaller {
  constructor() {
    this.projectRoot = process.cwd();
    this.dependencies = {
      frontend: {
        required: {
          'axios': '^1.6.0',
          'react': '^18.0.0',
          'react-dom': '^18.0.0',
          'recharts': '^2.8.0',
          'react-router-dom': '^6.8.0'
        },
        devRequired: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          '@types/node': '^20.0.0',
          'typescript': '^5.0.0',
          'tailwindcss': '^3.3.0'
        }
      },
      backend: {
        required: {
          'express': '^4.18.0',
          'axios': '^1.6.0',
          'puppeteer': '^21.0.0',
          'playwright': '^1.40.0',
          'cheerio': '^1.0.0',
          'ws': '^8.14.0',
          'cors': '^2.8.5',
          'helmet': '^7.1.0',
          'express-rate-limit': '^7.1.0'
        },
        optional: {
          'lighthouse': '^11.0.0',
          'axe-puppeteer': '^4.0.0',
          'k6': '^0.47.0',
          'node-cron': '^3.0.3',
          'nodemailer': '^6.9.0'
        }
      }
    };
    
    this.installResults = {
      installed: [],
      failed: [],
      skipped: []
    };
  }

  /**
   * 执行依赖安装
   */
  async install() {
    console.log('📦 开始检查和安装测试工具依赖...\n');
    
    // 1. 检查前端依赖
    await this.checkFrontendDependencies();
    
    // 2. 检查后端依赖
    await this.checkBackendDependencies();
    
    // 3. 安装缺失的依赖
    await this.installMissingDependencies();
    
    // 4. 验证安装结果
    await this.verifyInstallation();
    
    // 5. 生成安装报告
    this.generateInstallReport();
    
    console.log('\n✅ 测试工具依赖安装完成！');
  }

  /**
   * 检查前端依赖
   */
  async checkFrontendDependencies() {
    console.log('🎨 检查前端依赖...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('   ❌ 前端package.json不存在');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const installed = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    // 检查必需依赖
    for (const [dep, version] of Object.entries(this.dependencies.frontend.required)) {
      if (!installed[dep]) {
        console.log(`   ❌ 缺少必需依赖: ${dep}`);
        this.installResults.failed.push({ type: 'frontend', dep, version, required: true });
      } else {
        console.log(`   ✅ ${dep}: ${installed[dep]}`);
        this.installResults.installed.push({ type: 'frontend', dep, version: installed[dep] });
      }
    }

    // 检查开发依赖
    for (const [dep, version] of Object.entries(this.dependencies.frontend.devRequired)) {
      if (!installed[dep]) {
        console.log(`   ⚠️ 缺少开发依赖: ${dep}`);
        this.installResults.failed.push({ type: 'frontend', dep, version, required: false });
      } else {
        this.installResults.installed.push({ type: 'frontend', dep, version: installed[dep] });
      }
    }
    
    console.log('');
  }

  /**
   * 检查后端依赖
   */
  async checkBackendDependencies() {
    console.log('⚙️ 检查后端依赖...');
    
    const packageJsonPath = path.join(this.projectRoot, 'backend', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('   ❌ 后端package.json不存在');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const installed = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    // 检查必需依赖
    for (const [dep, version] of Object.entries(this.dependencies.backend.required)) {
      if (!installed[dep]) {
        console.log(`   ❌ 缺少必需依赖: ${dep}`);
        this.installResults.failed.push({ type: 'backend', dep, version, required: true });
      } else {
        console.log(`   ✅ ${dep}: ${installed[dep]}`);
        this.installResults.installed.push({ type: 'backend', dep, version: installed[dep] });
      }
    }

    // 检查可选依赖
    for (const [dep, version] of Object.entries(this.dependencies.backend.optional)) {
      if (!installed[dep]) {
        console.log(`   ⚠️ 缺少可选依赖: ${dep} (某些测试功能可能受限)`);
        this.installResults.skipped.push({ type: 'backend', dep, version, optional: true });
      } else {
        this.installResults.installed.push({ type: 'backend', dep, version: installed[dep] });
      }
    }
    
    console.log('');
  }

  /**
   * 安装缺失的依赖
   */
  async installMissingDependencies() {
    console.log('📥 安装缺失的依赖...');
    
    const frontendMissing = this.installResults.failed.filter(item => item.type === 'frontend');
    const backendMissing = this.installResults.failed.filter(item => item.type === 'backend');

    // 安装前端依赖
    if (frontendMissing.length > 0) {
      console.log('   🎨 安装前端依赖...');
      
      const deps = frontendMissing.map(item => `${item.dep}@${item.version}`).join(' ');
      
      try {
        execSync(`npm install ${deps}`, { 
          cwd: this.projectRoot,
          stdio: 'inherit'
        });
        console.log('   ✅ 前端依赖安装完成');
      } catch (error) {
        console.log(`   ❌ 前端依赖安装失败: ${error.message}`);
      }
    }

    // 安装后端依赖
    if (backendMissing.length > 0) {
      console.log('   ⚙️ 安装后端依赖...');
      
      const deps = backendMissing.map(item => `${item.dep}@${item.version}`).join(' ');
      
      try {
        execSync(`npm install ${deps}`, { 
          cwd: path.join(this.projectRoot, 'backend'),
          stdio: 'inherit'
        });
        console.log('   ✅ 后端依赖安装完成');
      } catch (error) {
        console.log(`   ❌ 后端依赖安装失败: ${error.message}`);
      }
    }

    if (frontendMissing.length === 0 && backendMissing.length === 0) {
      console.log('   ✅ 所有必需依赖都已安装');
    }
    
    console.log('');
  }

  /**
   * 验证安装结果
   */
  async verifyInstallation() {
    console.log('🔍 验证安装结果...');
    
    // 验证关键测试工具
    const verifications = [
      { name: 'Puppeteer', command: 'node -e "require(\'puppeteer\')"' },
      { name: 'Playwright', command: 'node -e "require(\'playwright\')"' },
      { name: 'Axios', command: 'node -e "require(\'axios\')"' },
      { name: 'Cheerio', command: 'node -e "require(\'cheerio\')"' }
    ];

    for (const verification of verifications) {
      try {
        execSync(verification.command, { 
          cwd: path.join(this.projectRoot, 'backend'),
          stdio: 'pipe'
        });
        console.log(`   ✅ ${verification.name} 验证成功`);
      } catch (error) {
        console.log(`   ❌ ${verification.name} 验证失败`);
      }
    }
    
    console.log('');
  }

  /**
   * 生成安装报告
   */
  generateInstallReport() {
    console.log('📊 依赖安装报告:');
    console.log(`   已安装依赖: ${this.installResults.installed.length}`);
    console.log(`   安装失败: ${this.installResults.failed.length}`);
    console.log(`   跳过的可选依赖: ${this.installResults.skipped.length}\n`);

    if (this.installResults.failed.length > 0) {
      console.log('❌ 安装失败的依赖:');
      this.installResults.failed.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.dep}@${item.version} (${item.type})`);
      });
      console.log('');
    }

    if (this.installResults.skipped.length > 0) {
      console.log('⚠️ 跳过的可选依赖:');
      this.installResults.skipped.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.dep}@${item.version} (${item.type})`);
      });
      console.log('');
    }

    // 生成安装建议
    this.generateInstallSuggestions();
  }

  /**
   * 生成安装建议
   */
  generateInstallSuggestions() {
    console.log('💡 安装建议:');
    
    if (this.installResults.failed.length === 0 && this.installResults.skipped.length === 0) {
      console.log('   ✅ 所有依赖都已正确安装，测试工具可以正常使用');
      return;
    }

    if (this.installResults.skipped.length > 0) {
      console.log('   📦 建议安装可选依赖以获得完整功能:');
      console.log('   npm install lighthouse axe-puppeteer k6 --save');
      console.log('');
    }

    if (this.installResults.failed.length > 0) {
      console.log('   🔧 请手动安装失败的依赖:');
      const frontendFailed = this.installResults.failed.filter(item => item.type === 'frontend');
      const backendFailed = this.installResults.failed.filter(item => item.type === 'backend');
      
      if (frontendFailed.length > 0) {
        const deps = frontendFailed.map(item => `${item.dep}@${item.version}`).join(' ');
        console.log(`   前端: npm install ${deps}`);
      }
      
      if (backendFailed.length > 0) {
        const deps = backendFailed.map(item => `${item.dep}@${item.version}`).join(' ');
        console.log(`   后端: cd backend && npm install ${deps}`);
      }
    }
  }
}

// 执行安装
if (require.main === module) {
  const installer = new TestDependencyInstaller();
  installer.install().catch(console.error);
}

module.exports = TestDependencyInstaller;
