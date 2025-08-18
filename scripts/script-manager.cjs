#!/usr/bin/env node

/**
 * 脚本管理工具
 * 提供统一的脚本执行和管理界面
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class ScriptManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.scriptsDir = path.join(this.projectRoot, 'scripts');
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🛠️  脚本管理工具

用法: node scripts/script-manager.cjs <命令> [选项]

📋 可用命令:

🚀 开发命令:
  dev              启动前端开发服务器（安全模式）
  dev-standard     启动前端开发服务器（标准模式）
  backend          启动后端服务器
  fullstack        同时启动前后端服务器

🏗️ 构建命令:
  build            构建前端项目（安全模式）
  build-standard   构建前端项目（标准模式）
  preview          预览构建结果

🔍 代码质量:
  check            运行所有代码检查
  lint             ESLint代码检查
  format           格式化代码
  type-check       TypeScript类型检查（智能模式）

🧪 测试命令:
  test             运行测试
  test-ui          启动测试UI界面
  test-coverage    生成测试覆盖率报告

🧹 维护命令:
  clean            清理构建文件
  cleanup          项目深度清理
  deps-check       检查依赖更新
  deps-update      更新依赖

📊 信息命令:
  status           显示项目状态
  scripts          列出所有可用脚本
  help             显示此帮助信息

示例:
  node scripts/script-manager.cjs dev
  node scripts/script-manager.cjs build
  node scripts/script-manager.cjs check
`);
  }

  /**
   * 执行命令
   */
  async execute(command, args = []) {
    try {
      switch (command) {
        case 'dev':
          await this.runFrontendCommand('dev-safe');
          break;
        case 'dev-standard':
          await this.runFrontendCommand('dev');
          break;
        case 'backend':
          await this.runBackendCommand('dev');
          break;
        case 'fullstack':
          await this.runFullstack();
          break;
        case 'build':
          await this.runFrontendCommand('build-safe');
          break;
        case 'build-standard':
          await this.runFrontendCommand('build');
          break;
        case 'preview':
          await this.runFrontendCommand('preview-safe');
          break;
        case 'check':
          await this.runCodeCheck();
          break;
        case 'lint':
          await this.runFrontendCommand('lint');
          break;
        case 'format':
          await this.runFrontendCommand('format');
          break;
        case 'type-check':
          await this.runFrontendCommand('type-ignore');
          break;
        case 'test':
          await this.runFrontendCommand('test');
          break;
        case 'test-ui':
          await this.runFrontendCommand('test:ui');
          break;
        case 'test-coverage':
          await this.runFrontendCommand('test:coverage');
          break;
        case 'clean':
          await this.runFrontendCommand('clean');
          break;
        case 'cleanup':
          await this.runProjectCleanup();
          break;
        case 'deps-check':
          await this.runFrontendCommand('deps:check');
          break;
        case 'deps-update':
          await this.runFrontendCommand('deps:update');
          break;
        case 'status':
          await this.showProjectStatus();
          break;
        case 'scripts':
          await this.listAvailableScripts();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error(`❌ 执行命令失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 运行前端命令
   */
  async runFrontendCommand(script) {
    console.log(`🚀 运行前端命令: npm run ${script}`);
    try {
      execSync(`npm run ${script}`, {
        cwd: this.frontendDir,
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`前端命令执行失败: ${script}`);
    }
  }

  /**
   * 运行后端命令
   */
  async runBackendCommand(script) {
    console.log(`🚀 运行后端命令: npm run ${script}`);
    const backendDir = path.join(this.projectRoot, 'backend');
    
    if (!fs.existsSync(backendDir)) {
      throw new Error('后端目录不存在');
    }

    try {
      execSync(`npm run ${script}`, {
        cwd: backendDir,
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`后端命令执行失败: ${script}`);
    }
  }

  /**
   * 运行全栈开发
   */
  async runFullstack() {
    console.log('🚀 启动全栈开发环境...');
    console.log('注意: 这将在后台启动后端，前端在前台运行');
    
    // 启动后端（后台）
    const { spawn } = require('child_process');
    const backendDir = path.join(this.projectRoot, 'backend');
    
    if (fs.existsSync(backendDir)) {
      console.log('📡 启动后端服务器...');
      spawn('npm', ['run', 'dev'], {
        cwd: backendDir,
        detached: true,
        stdio: 'ignore'
      });
    }

    // 等待一下让后端启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 启动前端（前台）
    console.log('🎨 启动前端开发服务器...');
    await this.runFrontendCommand('dev-safe');
  }

  /**
   * 运行代码检查
   */
  async runCodeCheck() {
    console.log('🔍 运行完整代码检查...');
    
    const checks = [
      { name: '类型检查', command: 'type-ignore' },
      { name: '代码规范检查', command: 'lint' },
      { name: '格式检查', command: 'format:check' }
    ];

    for (const check of checks) {
      console.log(`\n📋 ${check.name}...`);
      try {
        await this.runFrontendCommand(check.command);
        console.log(`✅ ${check.name}通过`);
      } catch (error) {
        console.log(`⚠️ ${check.name}发现问题`);
      }
    }
  }

  /**
   * 运行项目清理
   */
  async runProjectCleanup() {
    console.log('🧹 运行项目清理...');
    try {
      execSync('node scripts/cleanup-project.cjs', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error('项目清理失败');
    }
  }

  /**
   * 显示项目状态
   */
  async showProjectStatus() {
    console.log('📊 项目状态检查...\n');

    // 检查前端状态
    console.log('🎨 前端状态:');
    try {
      const packagePath = path.join(this.frontendDir, 'package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`  版本: ${pkg.version}`);
        console.log(`  依赖数量: ${Object.keys(pkg.dependencies || {}).length}`);
        console.log('  ✅ 前端配置正常');
      }
    } catch (error) {
      console.log('  ❌ 前端配置异常');
    }

    // 检查后端状态
    console.log('\n📡 后端状态:');
    const backendDir = path.join(this.projectRoot, 'backend');
    if (fs.existsSync(backendDir)) {
      console.log('  ✅ 后端目录存在');
    } else {
      console.log('  ⚠️ 后端目录不存在');
    }

    // 检查脚本状态
    console.log('\n🛠️ 脚本状态:');
    const scriptCount = fs.readdirSync(this.scriptsDir).length;
    console.log(`  脚本数量: ${scriptCount}`);
    console.log('  ✅ 脚本目录正常');

    console.log('\n💡 建议使用: node scripts/script-manager.cjs dev');
  }

  /**
   * 列出可用脚本
   */
  async listAvailableScripts() {
    console.log('📋 可用的npm脚本:\n');

    try {
      const packagePath = path.join(this.frontendDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const scripts = pkg.scripts || {};

      const categories = {
        '🚀 开发脚本': ['dev', 'dev-safe', 'start', 'start-safe'],
        '🏗️ 构建脚本': ['build', 'build-safe', 'preview', 'preview-safe'],
        '🔍 代码质量': ['type-check', 'type-ignore', 'lint', 'lint:fix', 'format'],
        '🧪 测试脚本': ['test', 'test:ui', 'test:run', 'test:coverage'],
        '🧹 维护脚本': ['clean', 'cleanup', 'deps:check', 'deps:update']
      };

      for (const [category, scriptNames] of Object.entries(categories)) {
        console.log(category);
        scriptNames.forEach(name => {
          if (scripts[name]) {
            console.log(`  ${name.padEnd(20)} ${scripts[name]}`);
          }
        });
        console.log('');
      }

    } catch (error) {
      console.error('❌ 无法读取package.json');
    }
  }
}

// 主程序
if (require.main === module) {
  const manager = new ScriptManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  manager.execute(command, args);
}

module.exports = { ScriptManager };
