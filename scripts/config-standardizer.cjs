#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConfigStandardizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.standardVersions = {
      // 标准化的依赖版本
      'axios': '^1.11.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.20.1',
      'recharts': '^2.15.3',
      'typescript': '^5.0.0',
      '@types/node': '^20.0.0',
      'vite': '^5.0.0',
      'vitest': '^1.0.0'
    };
  }

  /**
   * 执行配置标准化
   */
  async execute() {
    console.log('🔧 开始配置文件标准化...\n');

    try {
      // 1. 修复package.json版本不一致问题
      await this.fixPackageJsonVersions();

      // 2. 修复TypeScript配置问题
      await this.fixTypeScriptConfig();

      // 3. 修复环境变量配置
      await this.fixEnvironmentConfig();

      // 4. 添加缺失的脚本
      await this.addMissingScripts();

      // 5. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 配置标准化过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复package.json版本不一致问题
   */
  async fixPackageJsonVersions() {
    console.log('📦 修复package.json版本不一致...');

    const packageFiles = [
      path.join(this.projectRoot, 'package.json'),
      path.join(this.projectRoot, 'frontend/package.json'),
      path.join(this.projectRoot, 'backend/package.json')
    ];

    let fixes = 0;

    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          let modified = false;

          // 修复dependencies版本
          if (content.dependencies) {
            for (const [dep, currentVersion] of Object.entries(content.dependencies)) {
              if (this.standardVersions[dep] && this.standardVersions[dep] !== currentVersion) {
                content.dependencies[dep] = this.standardVersions[dep];
                modified = true;
                fixes++;
                this.addFix('package_json', 'version_updated', file, 
                  `更新 ${dep}: ${currentVersion} -> ${this.standardVersions[dep]}`);
              }
            }
          }

          // 修复devDependencies版本
          if (content.devDependencies) {
            for (const [dep, currentVersion] of Object.entries(content.devDependencies)) {
              if (this.standardVersions[dep] && this.standardVersions[dep] !== currentVersion) {
                content.devDependencies[dep] = this.standardVersions[dep];
                modified = true;
                fixes++;
                this.addFix('package_json', 'version_updated', file, 
                  `更新 ${dep}: ${currentVersion} -> ${this.standardVersions[dep]}`);
              }
            }
          }

          if (modified) {
            fs.writeFileSync(file, JSON.stringify(content, null, 2));
          }

        } catch (error) {
          console.log(`   ❌ 修复失败: ${file} - ${error.message}`);
        }
      }
    }

    console.log(`   ✅ 修复了 ${fixes} 个版本不一致问题\n`);
  }

  /**
   * 修复TypeScript配置问题
   */
  async fixTypeScriptConfig() {
    console.log('📝 修复TypeScript配置...');

    const tsConfigPath = path.join(this.projectRoot, 'frontend/tsconfig.json');
    let fixes = 0;

    if (fs.existsSync(tsConfigPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
        let modified = false;

        // 确保有compilerOptions
        if (!content.compilerOptions) {
          content.compilerOptions = {};
          modified = true;
        }

        // 添加缺失的编译选项
        const requiredOptions = {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          allowJs: false,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx'
        };

        for (const [option, value] of Object.entries(requiredOptions)) {
          if (content.compilerOptions[option] === undefined) {
            content.compilerOptions[option] = value;
            modified = true;
            fixes++;
            this.addFix('typescript', 'option_added', tsConfigPath, 
              `添加编译选项: ${option} = ${JSON.stringify(value)}`);
          }
        }

        // 添加路径映射
        if (!content.compilerOptions.paths) {
          content.compilerOptions.paths = {
            '@/*': ['./src/*'],
            '@/components/*': ['./src/components/*'],
            '@/services/*': ['./src/services/*'],
            '@/utils/*': ['./src/utils/*'],
            '@/types/*': ['./src/types/*'],
            '@/hooks/*': ['./src/hooks/*']
          };
          modified = true;
          fixes++;
          this.addFix('typescript', 'paths_added', tsConfigPath, '添加路径映射配置');
        }

        if (modified) {
          fs.writeFileSync(tsConfigPath, JSON.stringify(content, null, 2));
        }

      } catch (error) {
        console.log(`   ❌ 修复失败: ${tsConfigPath} - ${error.message}`);
      }
    }

    console.log(`   ✅ 修复了 ${fixes} 个TypeScript配置问题\n`);
  }

  /**
   * 修复环境变量配置
   */
  async fixEnvironmentConfig() {
    console.log('🌍 修复环境变量配置...');

    const envExamplePath = path.join(this.projectRoot, '.env.example');
    let fixes = 0;

    // 创建或更新.env.example文件
    const requiredEnvVars = {
      'NODE_ENV': 'development',
      'PORT': '3000',
      'DATABASE_URL': 'sqlite:./data/database.sqlite',
      'JWT_SECRET': 'your-jwt-secret-key-here',
      'CORS_ORIGIN': 'http://localhost:5174',
      'LOG_LEVEL': 'info',
      'UPLOAD_MAX_SIZE': '10MB',
      'SESSION_SECRET': 'your-session-secret-here'
    };

    let envContent = '';
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }

    const existingVars = this.parseEnvFile(envContent);
    let modified = false;

    for (const [key, defaultValue] of Object.entries(requiredEnvVars)) {
      if (!existingVars[key]) {
        envContent += `\n# ${this.getEnvVarDescription(key)}\n${key}=${defaultValue}\n`;
        modified = true;
        fixes++;
        this.addFix('environment', 'variable_added', envExamplePath, 
          `添加环境变量: ${key}`);
      }
    }

    if (modified) {
      fs.writeFileSync(envExamplePath, envContent.trim() + '\n');
    }

    console.log(`   ✅ 修复了 ${fixes} 个环境变量问题\n`);
  }

  /**
   * 添加缺失的脚本
   */
  async addMissingScripts() {
    console.log('📜 添加缺失的脚本...');

    const packageFiles = [
      { path: path.join(this.projectRoot, 'frontend/package.json'), type: 'frontend' },
      { path: path.join(this.projectRoot, 'backend/package.json'), type: 'backend' }
    ];

    let fixes = 0;

    for (const { path: file, type } of packageFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          let modified = false;

          if (!content.scripts) {
            content.scripts = {};
            modified = true;
          }

          const requiredScripts = this.getRequiredScripts(type);

          for (const [scriptName, scriptCommand] of Object.entries(requiredScripts)) {
            if (!content.scripts[scriptName]) {
              content.scripts[scriptName] = scriptCommand;
              modified = true;
              fixes++;
              this.addFix('package_json', 'script_added', file, 
                `添加脚本: ${scriptName}`);
            }
          }

          if (modified) {
            fs.writeFileSync(file, JSON.stringify(content, null, 2));
          }

        } catch (error) {
          console.log(`   ❌ 修复失败: ${file} - ${error.message}`);
        }
      }
    }

    console.log(`   ✅ 添加了 ${fixes} 个缺失的脚本\n`);
  }

  /**
   * 获取必需的脚本
   */
  getRequiredScripts(type) {
    if (type === 'frontend') {
      return {
        'start': 'vite',
        'build': 'vite build',
        'preview': 'vite preview'
      };
    } else if (type === 'backend') {
      return {
        'start': 'node server.js',
        'build': 'tsc',
        'dev': 'nodemon server.js'
      };
    }
    return {};
  }

  /**
   * 解析环境变量文件
   */
  parseEnvFile(content) {
    const variables = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          variables[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return variables;
  }

  /**
   * 获取环境变量描述
   */
  getEnvVarDescription(key) {
    const descriptions = {
      'NODE_ENV': '运行环境 (development/production)',
      'PORT': '服务器端口号',
      'DATABASE_URL': '数据库连接URL',
      'JWT_SECRET': 'JWT令牌密钥',
      'CORS_ORIGIN': 'CORS允许的源',
      'LOG_LEVEL': '日志级别',
      'UPLOAD_MAX_SIZE': '文件上传最大大小',
      'SESSION_SECRET': '会话密钥'
    };
    return descriptions[key] || '配置项';
  }

  /**
   * 添加修复记录
   */
  addFix(category, type, file, message) {
    this.fixes.push({
      category,
      type,
      file: path.relative(this.projectRoot, file),
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'config-standardization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length,
        categories: {
          package_json: this.fixes.filter(f => f.category === 'package_json').length,
          typescript: this.fixes.filter(f => f.category === 'typescript').length,
          environment: this.fixes.filter(f => f.category === 'environment').length
        }
      },
      fixes: this.fixes,
      standardVersions: this.standardVersions
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 配置标准化修复报告:');
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   - Package.json修复: ${report.summary.categories.package_json}`);
    console.log(`   - TypeScript配置修复: ${report.summary.categories.typescript}`);
    console.log(`   - 环境变量修复: ${report.summary.categories.environment}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.fixes.length > 0) {
      console.log('📋 修复详情:');
      this.fixes.forEach(({ category, file, message }) => {
        console.log(`   [${category.toUpperCase()}] ${file}: ${message}`);
      });
    }
  }
}

// 执行脚本
if (require.main === module) {
  const standardizer = new ConfigStandardizer();
  standardizer.execute().catch(error => {
    console.error('❌ 配置标准化失败:', error);
    process.exit(1);
  });
}

module.exports = ConfigStandardizer;
