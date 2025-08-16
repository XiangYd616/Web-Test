#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConfigConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.configs = {};
  }

  /**
   * 执行配置文件一致性检查
   */
  async execute() {
    console.log('⚙️ 开始配置文件一致性检查...\n');

    try {
      // 1. 检查package.json一致性
      await this.checkPackageJsonConsistency();

      // 2. 检查TypeScript配置一致性
      await this.checkTypeScriptConfigConsistency();

      // 3. 检查环境变量配置
      await this.checkEnvironmentVariables();

      // 4. 检查构建配置一致性
      await this.checkBuildConfigConsistency();

      // 5. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 配置一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查package.json一致性
   */
  async checkPackageJsonConsistency() {
    console.log('📦 检查package.json一致性...');

    const packageFiles = [
      path.join(this.projectRoot, 'package.json'),
      path.join(this.projectRoot, 'frontend/package.json'),
      path.join(this.projectRoot, 'backend/package.json')
    ];

    let inconsistencies = 0;

    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          this.configs[path.relative(this.projectRoot, file)] = content;

          // 检查必要字段
          const requiredFields = ['name', 'version', 'description'];
          for (const field of requiredFields) {
            if (!content[field]) {
              this.addIssue('package_json', 'missing_field', file,
                `缺少必要字段: ${field}`);
              inconsistencies++;
            }
          }

          // 检查脚本命名一致性
          if (content.scripts) {
            const scripts = Object.keys(content.scripts);
            
            // 检查常见脚本是否存在
            const commonScripts = ['start', 'build', 'test'];
            for (const script of commonScripts) {
              if (!scripts.includes(script)) {
                this.addIssue('package_json', 'missing_script', file,
                  `缺少常见脚本: ${script}`);
                inconsistencies++;
              }
            }

            // 检查脚本命名规范
            for (const script of scripts) {
              if (script.includes('_') && script.includes('-')) {
                this.addIssue('package_json', 'inconsistent_script_naming', file,
                  `脚本命名不一致: ${script} (混合使用下划线和连字符)`);
                inconsistencies++;
              }
            }
          }

          // 检查依赖版本一致性
          if (content.dependencies) {
            for (const [dep, version] of Object.entries(content.dependencies)) {
              if (version.includes('^') && version.includes('~')) {
                this.addIssue('package_json', 'inconsistent_version_prefix', file,
                  `依赖版本前缀不一致: ${dep}@${version}`);
                inconsistencies++;
              }
            }
          }

        } catch (error) {
          this.addIssue('package_json', 'invalid_json', file,
            `无效的JSON格式: ${error.message}`);
          inconsistencies++;
        }
      }
    }

    // 检查跨package.json的版本一致性
    await this.checkCrossDependencyConsistency();

    console.log(`   发现 ${inconsistencies} 个package.json一致性问题\n`);
  }

  /**
   * 检查跨package.json的依赖版本一致性
   */
  async checkCrossDependencyConsistency() {
    const packageConfigs = Object.entries(this.configs).filter(([file]) => 
      file.endsWith('package.json')
    );

    const allDependencies = {};

    // 收集所有依赖
    for (const [file, config] of packageConfigs) {
      const deps = { ...config.dependencies, ...config.devDependencies };
      for (const [name, version] of Object.entries(deps || {})) {
        if (!allDependencies[name]) {
          allDependencies[name] = [];
        }
        allDependencies[name].push({ file, version });
      }
    }

    // 检查版本一致性
    for (const [depName, occurrences] of Object.entries(allDependencies)) {
      if (occurrences.length > 1) {
        const versions = [...new Set(occurrences.map(o => o.version))];
        if (versions.length > 1) {
          this.addIssue('package_json', 'version_mismatch', 'multiple_files',
            `依赖 ${depName} 在不同文件中版本不一致: ${versions.join(', ')}`);
        }
      }
    }
  }

  /**
   * 检查TypeScript配置一致性
   */
  async checkTypeScriptConfigConsistency() {
    console.log('📝 检查TypeScript配置一致性...');

    const tsConfigFiles = [
      path.join(this.projectRoot, 'tsconfig.json'),
      path.join(this.projectRoot, 'frontend/tsconfig.json'),
      path.join(this.projectRoot, 'backend/tsconfig.json')
    ];

    let inconsistencies = 0;

    for (const file of tsConfigFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          this.configs[path.relative(this.projectRoot, file)] = content;

          // 检查编译选项一致性
          const compilerOptions = content.compilerOptions || {};
          
          // 检查必要的编译选项
          const requiredOptions = {
            'target': ['es2020', 'es2021', 'es2022'],
            'module': ['esnext', 'commonjs'],
            'strict': [true]
          };

          for (const [option, validValues] of Object.entries(requiredOptions)) {
            if (compilerOptions[option] === undefined) {
              this.addIssue('typescript', 'missing_compiler_option', file,
                `缺少编译选项: ${option}`);
              inconsistencies++;
            } else if (!validValues.includes(compilerOptions[option])) {
              this.addIssue('typescript', 'invalid_compiler_option', file,
                `编译选项值不推荐: ${option}=${compilerOptions[option]}`);
              inconsistencies++;
            }
          }

          // 检查路径映射一致性
          if (compilerOptions.paths) {
            for (const [alias, paths] of Object.entries(compilerOptions.paths)) {
              if (!alias.startsWith('@/') && !alias.startsWith('~/')) {
                this.addIssue('typescript', 'inconsistent_path_alias', file,
                  `路径别名不符合规范: ${alias}`);
                inconsistencies++;
              }
            }
          }

        } catch (error) {
          this.addIssue('typescript', 'invalid_json', file,
            `无效的JSON格式: ${error.message}`);
          inconsistencies++;
        }
      }
    }

    console.log(`   发现 ${inconsistencies} 个TypeScript配置问题\n`);
  }

  /**
   * 检查环境变量配置
   */
  async checkEnvironmentVariables() {
    console.log('🌍 检查环境变量配置...');

    const envFiles = [
      path.join(this.projectRoot, '.env'),
      path.join(this.projectRoot, '.env.example'),
      path.join(this.projectRoot, '.env.local'),
      path.join(this.projectRoot, '.env.development'),
      path.join(this.projectRoot, '.env.production')
    ];

    let inconsistencies = 0;
    const envVariables = {};

    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const variables = this.parseEnvFile(content);
          envVariables[path.relative(this.projectRoot, file)] = variables;

          // 检查变量命名规范
          for (const varName of Object.keys(variables)) {
            if (!varName.match(/^[A-Z][A-Z0-9_]*$/)) {
              this.addIssue('environment', 'invalid_variable_name', file,
                `环境变量命名不规范: ${varName}`);
              inconsistencies++;
            }
          }

        } catch (error) {
          this.addIssue('environment', 'read_error', file,
            `无法读取环境文件: ${error.message}`);
          inconsistencies++;
        }
      }
    }

    // 检查.env.example是否包含所有必要变量
    if (envVariables['.env.example']) {
      const exampleVars = Object.keys(envVariables['.env.example']);
      const requiredVars = ['NODE_ENV', 'PORT', 'DATABASE_URL'];
      
      for (const required of requiredVars) {
        if (!exampleVars.includes(required)) {
          this.addIssue('environment', 'missing_example_variable', '.env.example',
            `示例环境文件缺少必要变量: ${required}`);
          inconsistencies++;
        }
      }
    }

    console.log(`   发现 ${inconsistencies} 个环境变量配置问题\n`);
  }

  /**
   * 检查构建配置一致性
   */
  async checkBuildConfigConsistency() {
    console.log('🏗️ 检查构建配置一致性...');

    const buildConfigFiles = [
      path.join(this.projectRoot, 'vite.config.ts'),
      path.join(this.projectRoot, 'vite.config.js'),
      path.join(this.projectRoot, 'webpack.config.js'),
      path.join(this.projectRoot, 'rollup.config.js'),
      path.join(this.projectRoot, 'frontend/vite.config.ts')
    ];

    let inconsistencies = 0;

    for (const file of buildConfigFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          
          // 检查构建配置的一致性
          if (content.includes('defineConfig')) {
            // Vite配置检查
            if (!content.includes('build:') && !content.includes('build ')) {
              this.addIssue('build_config', 'missing_build_config', file,
                'Vite配置缺少构建配置');
              inconsistencies++;
            }
          }

          // 检查输出目录一致性
          if (content.includes('outDir') || content.includes('output')) {
            const outputMatches = content.match(/outDir\s*:\s*['"`]([^'"`]+)['"`]/);
            if (outputMatches && outputMatches[1] !== 'dist') {
              this.addIssue('build_config', 'inconsistent_output_dir', file,
                `输出目录不一致: ${outputMatches[1]} (推荐使用 'dist')`);
              inconsistencies++;
            }
          }

        } catch (error) {
          this.addIssue('build_config', 'read_error', file,
            `无法读取构建配置: ${error.message}`);
          inconsistencies++;
        }
      }
    }

    console.log(`   发现 ${inconsistencies} 个构建配置问题\n`);
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

  addIssue(category, type, file, message) {
    this.issues.push({
      category,
      type,
      file: typeof file === 'string' ? path.relative(this.projectRoot, file) : file,
      message,
      severity: this.getSeverity(category, type)
    });
  }

  getSeverity(category, type) {
    const severityMap = {
      package_json: { 
        missing_field: 'medium', 
        missing_script: 'low', 
        version_mismatch: 'high',
        invalid_json: 'high'
      },
      typescript: { 
        missing_compiler_option: 'medium', 
        invalid_compiler_option: 'low',
        invalid_json: 'high'
      },
      environment: { 
        invalid_variable_name: 'low', 
        missing_example_variable: 'medium',
        read_error: 'medium'
      },
      build_config: { 
        missing_build_config: 'medium', 
        inconsistent_output_dir: 'low',
        read_error: 'medium'
      }
    };
    return severityMap[category]?.[type] || 'low';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'config-consistency-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        categories: {
          package_json: this.issues.filter(i => i.category === 'package_json').length,
          typescript: this.issues.filter(i => i.category === 'typescript').length,
          environment: this.issues.filter(i => i.category === 'environment').length,
          build_config: this.issues.filter(i => i.category === 'build_config').length
        }
      },
      configs: this.configs,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 配置文件一致性检查报告:');
    console.log(`   总问题数: ${report.summary.totalIssues}`);
    console.log(`   - Package.json问题: ${report.summary.categories.package_json}`);
    console.log(`   - TypeScript配置问题: ${report.summary.categories.typescript}`);
    console.log(`   - 环境变量问题: ${report.summary.categories.environment}`);
    console.log(`   - 构建配置问题: ${report.summary.categories.build_config}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new ConfigConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ 配置一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = ConfigConsistencyChecker;
