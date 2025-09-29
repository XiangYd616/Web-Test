#!/usr/bin/env node
/**
 * 项目错误修复脚本
 * 自动检测和修复项目中的常见问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectErrorFixer {
  constructor() {
    this.rootDir = process.cwd();
    this.errors = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${type.toUpperCase()}] ${message}${colors.reset}`);
  }

  async checkESLintConfig() {
    this.log('检查 ESLint 配置...');
    
    const eslintrcPath = path.join(this.rootDir, '.eslintrc.cjs');
    const eslintConfigPath = path.join(this.rootDir, 'eslint.config.js');
    const packageJsonPath = path.join(this.rootDir, 'package.json');

    // 检查是否存在新的配置文件
    if (fs.existsSync(eslintConfigPath)) {
      this.log('发现新的 eslint.config.js，检查依赖...');
      
      // 检查 package.json 中的 ESLint 相关依赖
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const eslintVersion = packageJson.devDependencies?.eslint;
      
      if (eslintVersion && eslintVersion.startsWith('^9.')) {
        // 检查是否缺少新的依赖
        const requiredDeps = ['@eslint/js', 'globals'];
        const missingDeps = [];
        
        requiredDeps.forEach(dep => {
          if (!packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]) {
            missingDeps.push(dep);
          }
        });

        if (missingDeps.length > 0) {
          this.errors.push(`缺少 ESLint 9.x 依赖: ${missingDeps.join(', ')}`);
          this.fixes.push(() => {
            this.log(`安装缺失的依赖: ${missingDeps.join(', ')}`, 'warning');
            try {
              execSync(`npm install --save-dev ${missingDeps.join(' ')} --legacy-peer-deps`, { 
                stdio: 'inherit',
                cwd: this.rootDir 
              });
              this.log('依赖安装成功', 'success');
            } catch (error) {
              this.log(`依赖安装失败: ${error.message}`, 'error');
            }
          });
        }

        // 检查是否有不兼容的依赖版本
        const reactHooksVersion = packageJson.devDependencies?.['eslint-plugin-react-hooks'];
        if (reactHooksVersion && reactHooksVersion.startsWith('^4.')) {
          this.errors.push('eslint-plugin-react-hooks 版本与 ESLint 9.x 不兼容');
          this.fixes.push(() => {
            this.log('升级 eslint-plugin-react-hooks 到兼容版本', 'warning');
            try {
              execSync(`npm install --save-dev eslint-plugin-react-hooks@^5.0.0 --legacy-peer-deps`, { 
                stdio: 'inherit',
                cwd: this.rootDir 
              });
              this.log('React Hooks 插件升级成功', 'success');
            } catch (error) {
              this.log(`React Hooks 插件升级失败: ${error.message}`, 'error');
            }
          });
        }
      }
    }

    // 如果存在旧的配置文件，建议迁移
    if (fs.existsSync(eslintrcPath) && fs.existsSync(eslintConfigPath)) {
      this.errors.push('同时存在旧的 .eslintrc.cjs 和新的 eslint.config.js');
      this.fixes.push(() => {
        this.log('备份并移除旧的 ESLint 配置文件', 'warning');
        try {
          fs.renameSync(eslintrcPath, `${eslintrcPath}.backup`);
          this.log('旧的 ESLint 配置已备份为 .eslintrc.cjs.backup', 'success');
        } catch (error) {
          this.log(`备份配置文件失败: ${error.message}`, 'error');
        }
      });
    }
  }

  async checkTypeScriptConfig() {
    this.log('检查 TypeScript 配置...');
    
    const tsconfigPath = path.join(this.rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        
        // 检查路径映射是否正确
        if (tsconfig.compilerOptions?.paths) {
          const paths = tsconfig.compilerOptions.paths;
          const invalidPaths = [];
          
          Object.entries(paths).forEach(([alias, pathArray]) => {
            pathArray.forEach(pathPattern => {
              const actualPath = path.join(this.rootDir, pathPattern.replace('/*', ''));
              if (!fs.existsSync(actualPath)) {
                invalidPaths.push({ alias, path: pathPattern });
              }
            });
          });

          if (invalidPaths.length > 0) {
            this.errors.push(`TypeScript 路径映射中存在无效路径: ${invalidPaths.map(p => `${p.alias} -> ${p.path}`).join(', ')}`);
            this.fixes.push(() => {
              this.log('修复 TypeScript 路径映射', 'warning');
              // 这里可以添加自动修复逻辑
              this.log('请手动检查并修复 tsconfig.json 中的路径映射', 'warning');
            });
          }
        }
      } catch (error) {
        this.errors.push(`TypeScript 配置文件格式错误: ${error.message}`);
      }
    }
  }

  async checkMissingFiles() {
    this.log('检查缺失的重要文件...');
    
    const importantFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.js',
      'frontend/main.tsx',
      'frontend/App.tsx'
    ];

    const missingFiles = [];
    importantFiles.forEach(filePath => {
      if (!fs.existsSync(path.join(this.rootDir, filePath))) {
        missingFiles.push(filePath);
      }
    });

    if (missingFiles.length > 0) {
      this.errors.push(`缺失重要文件: ${missingFiles.join(', ')}`);
      this.log(`缺失的文件: ${missingFiles.join(', ')}`, 'warning');
    }
  }

  async checkDuplicateComponents() {
    this.log('检查重复组件...');
    
    const frontendDirs = [
      'frontend/components',
      'frontend/frontend-standalone/components'
    ].map(dir => path.join(this.rootDir, dir)).filter(dir => fs.existsSync(dir));

    if (frontendDirs.length > 1) {
      this.errors.push('存在多个组件目录，可能导致混淆');
      this.log(`发现多个组件目录: ${frontendDirs.join(', ')}`, 'warning');
    }
  }

  async checkPackageJsonIssues() {
    this.log('检查 package.json 配置...');
    
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查脚本命令
      if (packageJson.scripts) {
        const problematicScripts = [];
        Object.entries(packageJson.scripts).forEach(([name, command]) => {
          if (typeof command === 'string' && command.includes('&&') && !command.includes('cross-env')) {
            // Windows 上可能有问题的脚本
            problematicScripts.push(name);
          }
        });

        if (problematicScripts.length > 0) {
          this.errors.push(`脚本可能在 Windows 上有问题: ${problematicScripts.join(', ')}`);
        }
      }

      // 检查依赖版本冲突
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const versionConflicts = [];
      
      // 检查 React 版本一致性
      const reactVersion = deps.react;
      const reactDomVersion = deps['react-dom'];
      if (reactVersion && reactDomVersion && reactVersion !== reactDomVersion) {
        versionConflicts.push('React 和 React-DOM 版本不一致');
      }

      if (versionConflicts.length > 0) {
        this.errors.push(`依赖版本冲突: ${versionConflicts.join(', ')}`);
      }
    }
  }

  async fixIssues() {
    this.log('开始修复问题...');
    
    for (const fix of this.fixes) {
      try {
        await fix();
      } catch (error) {
        this.log(`修复过程中出错: ${error.message}`, 'error');
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      fixesApplied: this.fixes.length,
      summary: {
        totalErrors: this.errors.length,
        criticalErrors: this.errors.filter(e => 
          e.includes('缺少') || e.includes('冲突') || e.includes('不兼容')
        ).length
      }
    };

    const reportPath = path.join(this.rootDir, 'project-error-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`错误报告已保存到: ${reportPath}`, 'info');

    return report;
  }

  async run() {
    this.log('开始项目错误检查...', 'info');
    
    try {
      await this.checkESLintConfig();
      await this.checkTypeScriptConfig();
      await this.checkMissingFiles();
      await this.checkDuplicateComponents();
      await this.checkPackageJsonIssues();

      this.log(`\n发现 ${this.errors.length} 个问题:`);
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'warning');
      });

      if (this.fixes.length > 0) {
        this.log(`\n准备应用 ${this.fixes.length} 个修复...`);
        await this.fixIssues();
      }

      const report = await this.generateReport();
      
      if (report.errors.length === 0) {
        this.log('\n🎉 项目状态良好，没有发现问题！', 'success');
      } else {
        this.log(`\n📋 项目检查完成，发现 ${report.errors.length} 个问题`, 'info');
        if (report.summary.criticalErrors > 0) {
          this.log(`⚠️  其中 ${report.summary.criticalErrors} 个为关键问题`, 'warning');
        }
      }

    } catch (error) {
      this.log(`检查过程中出现错误: ${error.message}`, 'error');
    }
  }
}

// 运行脚本
if (require.main === module) {
  const fixer = new ProjectErrorFixer();
  fixer.run().catch(console.error);
}

module.exports = ProjectErrorFixer;
