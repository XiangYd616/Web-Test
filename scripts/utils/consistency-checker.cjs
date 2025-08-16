#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.stats = {
      filesChecked: 0,
      issuesFound: 0,
      categories: {
        naming: 0,
        imports: 0,
        exports: 0,
        functions: 0,
        variables: 0,
        components: 0
      }
    };
  }

  /**
   * 执行一致性检查
   */
  async execute() {
    console.log('🔍 开始项目一致性检查...\n');

    try {
      // 1. 文件命名规范检查
      await this.checkFileNaming();

      // 2. 导入导出一致性检查
      await this.checkImportExportConsistency();

      // 3. 组件命名规范检查
      await this.checkComponentNaming();

      // 4. 函数和变量命名检查
      await this.checkFunctionVariableNaming();

      // 5. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查文件命名规范
   */
  async checkFileNaming() {
    console.log('📁 检查文件命名规范...');

    const files = this.getAllProjectFiles();
    let namingIssues = 0;

    for (const file of files) {
      const fileName = path.basename(file);
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      
      // 检查React组件文件命名 (应该是PascalCase)
      if (['.tsx', '.jsx'].includes(ext) && this.isComponentFile(file)) {
        if (!this.isPascalCase(baseName)) {
          this.addIssue('naming', 'component_file', file, 
            `组件文件应使用PascalCase命名: ${fileName}`);
          namingIssues++;
        }
      }

      // 检查工具函数文件命名 (应该是camelCase)
      if (['.ts', '.js'].includes(ext) && this.isUtilityFile(file)) {
        if (!this.isCamelCase(baseName) && !this.isKebabCase(baseName)) {
          this.addIssue('naming', 'utility_file', file,
            `工具文件应使用camelCase或kebab-case命名: ${fileName}`);
          namingIssues++;
        }
      }

      // 检查类型定义文件命名
      if (fileName.includes('.types.') || fileName.includes('.d.')) {
        if (!this.isCamelCase(baseName.replace('.types', '').replace('.d', ''))) {
          this.addIssue('naming', 'type_file', file,
            `类型文件应使用camelCase命名: ${fileName}`);
          namingIssues++;
        }
      }
    }

    this.stats.categories.naming = namingIssues;
    console.log(`   发现 ${namingIssues} 个文件命名问题\n`);
  }

  /**
   * 检查导入导出一致性
   */
  async checkImportExportConsistency() {
    console.log('📦 检查导入导出一致性...');

    const files = this.getAllProjectFiles().filter(f => 
      ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(f))
    );

    let importIssues = 0;
    let exportIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查导入语句格式一致性
        const imports = this.extractImports(content);
        for (const imp of imports) {
          // 检查相对路径导入是否使用一致的格式
          if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
            if (!imp.source.endsWith('.ts') && !imp.source.endsWith('.tsx') && 
                !imp.source.endsWith('.js') && !imp.source.endsWith('.jsx') &&
                !this.isDirectoryImport(imp.source)) {
              // 检查是否应该有文件扩展名
              const resolvedPath = this.resolveImportPath(file, imp.source);
              if (resolvedPath && !fs.existsSync(resolvedPath)) {
                this.addIssue('imports', 'missing_extension', file,
                  `导入路径可能缺少文件扩展名: ${imp.source}`);
                importIssues++;
              }
            }
          }

          // 检查导入语句的花括号格式
          if (imp.named.length > 0) {
            const hasSpaces = imp.raw.includes('{ ') && imp.raw.includes(' }');
            if (!hasSpaces && imp.named.length <= 3) {
              this.addIssue('imports', 'formatting', file,
                `导入语句应在花括号内添加空格: ${imp.raw}`);
              importIssues++;
            }
          }
        }

        // 检查导出语句一致性
        const exports = this.extractExports(content);
        for (const exp of exports) {
          // 检查默认导出和命名导出的一致性
          if (exp.type === 'default' && this.isComponentFile(file)) {
            const componentName = this.getComponentNameFromFile(file);
            if (componentName && exp.name !== componentName) {
              this.addIssue('exports', 'component_name_mismatch', file,
                `组件默认导出名称与文件名不匹配: ${exp.name} vs ${componentName}`);
              exportIssues++;
            }
          }
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取文件: ${file}`);
      }
    }

    this.stats.categories.imports = importIssues;
    this.stats.categories.exports = exportIssues;
    console.log(`   发现 ${importIssues} 个导入问题，${exportIssues} 个导出问题\n`);
  }

  /**
   * 检查组件命名规范
   */
  async checkComponentNaming() {
    console.log('🧩 检查组件命名规范...');

    const componentFiles = this.getAllProjectFiles().filter(f => 
      this.isComponentFile(f)
    );

    let componentIssues = 0;

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查组件定义
        const components = this.extractComponentDefinitions(content);
        
        for (const component of components) {
          // 检查组件名称是否为PascalCase
          if (!this.isPascalCase(component.name)) {
            this.addIssue('components', 'naming', file,
              `组件名称应使用PascalCase: ${component.name}`);
            componentIssues++;
          }

          // 检查组件props接口命名
          if (component.propsInterface) {
            const expectedName = `${component.name}Props`;
            if (component.propsInterface !== expectedName) {
              this.addIssue('components', 'props_interface', file,
                `Props接口应命名为 ${expectedName}: ${component.propsInterface}`);
              componentIssues++;
            }
          }
        }

      } catch (error) {
        console.log(`   ⚠️  无法分析组件文件: ${file}`);
      }
    }

    this.stats.categories.components = componentIssues;
    console.log(`   发现 ${componentIssues} 个组件命名问题\n`);
  }

  /**
   * 检查函数和变量命名
   */
  async checkFunctionVariableNaming() {
    console.log('🔧 检查函数和变量命名...');

    const files = this.getAllProjectFiles().filter(f => 
      ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(f))
    );

    let functionIssues = 0;
    let variableIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查函数命名
        const functions = this.extractFunctionDefinitions(content);
        for (const func of functions) {
          if (!this.isCamelCase(func.name) && !this.isPascalCase(func.name)) {
            this.addIssue('functions', 'naming', file,
              `函数名称应使用camelCase: ${func.name}`);
            functionIssues++;
          }
        }

        // 检查变量命名
        const variables = this.extractVariableDefinitions(content);
        for (const variable of variables) {
          if (!this.isCamelCase(variable.name) && !this.isConstantCase(variable.name)) {
            this.addIssue('variables', 'naming', file,
              `变量名称应使用camelCase或CONSTANT_CASE: ${variable.name}`);
            variableIssues++;
          }
        }

      } catch (error) {
        console.log(`   ⚠️  无法分析文件: ${file}`);
      }
    }

    this.stats.categories.functions = functionIssues;
    this.stats.categories.variables = variableIssues;
    console.log(`   发现 ${functionIssues} 个函数命名问题，${variableIssues} 个变量命名问题\n`);
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (this.shouldSkipDirectory(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (this.isProjectFile(item)) {
            files.push(fullPath);
            this.stats.filesChecked++;
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    walkDir(path.join(this.projectRoot, 'frontend'));
    walkDir(path.join(this.projectRoot, 'backend'));
    return files;
  }

  /**
   * 工具方法
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  isProjectFile(fileName) {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  isComponentFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return /export\s+default\s+\w+|export\s+{\s*\w+\s+as\s+default\s*}/.test(content) &&
           /React|JSX\.Element|ReactNode/.test(content);
  }

  isUtilityFile(filePath) {
    return filePath.includes('/utils/') || filePath.includes('/helpers/');
  }

  isPascalCase(str) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  isCamelCase(str) {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  isKebabCase(str) {
    return /^[a-z][a-z0-9-]*$/.test(str);
  }

  isConstantCase(str) {
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }

  addIssue(category, type, file, message) {
    this.issues.push({
      category,
      type,
      file: path.relative(this.projectRoot, file),
      message,
      severity: this.getSeverity(category, type)
    });
    this.stats.issuesFound++;
  }

  getSeverity(category, type) {
    const severityMap = {
      naming: { component_file: 'medium', utility_file: 'low', type_file: 'low' },
      imports: { missing_extension: 'high', formatting: 'low' },
      exports: { component_name_mismatch: 'medium' },
      components: { naming: 'medium', props_interface: 'low' },
      functions: { naming: 'low' },
      variables: { naming: 'low' }
    };
    return severityMap[category]?.[type] || 'low';
  }

  // 简化的解析方法（实际项目中可能需要更复杂的AST解析）
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{\s*([^}]+)\s*\})?\s*from\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [raw, defaultImport, namedImports, source] = match;
      const named = namedImports ? namedImports.split(',').map(s => s.trim()) : [];
      
      imports.push({
        raw,
        default: defaultImport,
        named,
        source
      });
    }

    return imports;
  }

  extractExports(content) {
    const exports = [];
    
    // 默认导出
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    let match;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push({ type: 'default', name: match[1] });
    }

    return exports;
  }

  extractComponentDefinitions(content) {
    const components = [];
    
    // React函数组件
    const funcComponentRegex = /(?:export\s+)?(?:const|function)\s+(\w+).*?(?::\s*React\.FC|:\s*FC|=\s*\([^)]*\)\s*(?::\s*JSX\.Element)?\s*=>)/g;
    let match;
    while ((match = funcComponentRegex.exec(content)) !== null) {
      components.push({ name: match[1], type: 'function' });
    }

    return components;
  }

  extractFunctionDefinitions(content) {
    const functions = [];
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({ name: match[1] || match[2] });
    }
    return functions;
  }

  extractVariableDefinitions(content) {
    const variables = [];
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    let match;
    while ((match = varRegex.exec(content)) !== null) {
      variables.push({ name: match[1] });
    }
    return variables;
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'consistency-check-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.stats,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 代码一致性检查报告:');
    console.log(`   检查文件数: ${this.stats.filesChecked}`);
    console.log(`   发现问题数: ${this.stats.issuesFound}`);
    console.log(`   - 命名问题: ${this.stats.categories.naming}`);
    console.log(`   - 导入问题: ${this.stats.categories.imports}`);
    console.log(`   - 导出问题: ${this.stats.categories.exports}`);
    console.log(`   - 组件问题: ${this.stats.categories.components}`);
    console.log(`   - 函数问题: ${this.stats.categories.functions}`);
    console.log(`   - 变量问题: ${this.stats.categories.variables}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new ConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ 一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = ConsistencyChecker;
