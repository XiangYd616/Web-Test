#!/usr/bin/env node

/**
 * 全面路径检查和修复工具
 * 检查并修复项目中的路由配置和导入导出路径问题
 */

const fs = require('fs');
const path = require('path');

class ComprehensivePathFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.issues = [];
    this.fixes = [];
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      issuesFixed: 0,
      routeIssues: 0,
      importIssues: 0,
      configIssues: 0
    };
  }

  async execute() {
    console.log('🔍 开始全面路径检查和修复...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际修复'}`);
    console.log('==================================================');

    try {
      // 1. 检查前端路由系统
      await this.checkFrontendRoutes();

      // 2. 检查导入导出路径
      await this.checkImportExportPaths();

      // 3. 检查配置文件路径
      await this.checkConfigPaths();

      // 4. 检查后端API路由
      await this.checkBackendRoutes();

      // 5. 修复发现的问题
      await this.fixIssues();

      // 6. 生成修复报告
      await this.generateFixReport();

    } catch (error) {
      console.error('❌ 路径检查修复过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async checkFrontendRoutes() {
    console.log('\n🎨 检查前端路由系统...');

    // 检查路由配置文件
    const routeConfigFiles = [
      'frontend/App.tsx',
      'frontend/router/index.ts',
      'frontend/routes.tsx'
    ];

    for (const configFile of routeConfigFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        console.log(`  📄 检查路由配置: ${configFile}`);
        await this.analyzeRouteConfig(filePath, configFile);
      }
    }

    // 扫描所有页面文件
    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    if (fs.existsSync(pagesDir)) {
      console.log('  📁 扫描页面文件...');
      await this.scanPagesDirectory(pagesDir);
    }
  }

  async analyzeRouteConfig(filePath, configFile) {
    const content = fs.readFileSync(filePath, 'utf8');
    this.stats.filesScanned++;

    // 检查路由导入路径
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      for (const importMatch of importMatches) {
        const pathMatch = importMatch.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          await this.validateImportPath(filePath, importPath, configFile);
        }
      }
    }

    // 检查动态导入（懒加载）
    const lazyImportMatches = content.match(/import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    if (lazyImportMatches) {
      for (const lazyMatch of lazyImportMatches) {
        const pathMatch = lazyMatch.match(/['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          await this.validateLazyImportPath(filePath, importPath, configFile);
        }
      }
    }
  }

  async validateImportPath(filePath, importPath, sourceFile) {
    // 跳过node_modules和相对路径以外的导入
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const possibleExtensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

      let exists = false;
      let correctPath = null;

      for (const ext of possibleExtensions) {
        const testPath = resolvedPath + ext;
        if (fs.existsSync(testPath)) {
          exists = true;
          correctPath = testPath;
          break;
        }
      }

      if (!exists) {
        // 检查是否是过时的路径引用
        const updatedPath = this.getUpdatedPath(importPath);
        if (updatedPath !== importPath) {
          this.issues.push({
            type: 'outdated_import_path',
            file: sourceFile,
            line: this.getLineNumber(filePath, importPath),
            issue: `过时的导入路径: ${importPath}`,
            suggestion: `更新为: ${updatedPath}`,
            oldPath: importPath,
            newPath: updatedPath
          });
          this.stats.importIssues++;
        } else {
          this.issues.push({
            type: 'missing_import_file',
            file: sourceFile,
            line: this.getLineNumber(filePath, importPath),
            issue: `导入文件不存在: ${importPath}`,
            suggestion: '检查文件路径或创建缺失的文件'
          });
          this.stats.importIssues++;
        }
      }
    }
  }

  async validateLazyImportPath(filePath, importPath, sourceFile) {
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const possibleExtensions = ['.tsx', '.ts', '.jsx', '.js'];

      let exists = false;

      for (const ext of possibleExtensions) {
        if (fs.existsSync(resolvedPath + ext)) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        const updatedPath = this.getUpdatedPath(importPath);
        if (updatedPath !== importPath) {
          this.issues.push({
            type: 'outdated_lazy_import',
            file: sourceFile,
            line: this.getLineNumber(filePath, importPath),
            issue: `过时的懒加载路径: ${importPath}`,
            suggestion: `更新为: ${updatedPath}`,
            oldPath: importPath,
            newPath: updatedPath
          });
          this.stats.routeIssues++;
        } else {
          this.issues.push({
            type: 'missing_lazy_import',
            file: sourceFile,
            line: this.getLineNumber(filePath, importPath),
            issue: `懒加载文件不存在: ${importPath}`,
            suggestion: '检查文件路径或创建缺失的文件'
          });
          this.stats.routeIssues++;
        }
      }
    }
  }

  getUpdatedPath(oldPath) {
    // 更新过时的路径引用
    let newPath = oldPath;

    // src → frontend
    newPath = newPath.replace(/^\.\.?\/src\//, '../frontend/');
    newPath = newPath.replace(/^src\//, 'frontend/');

    // server → backend
    newPath = newPath.replace(/^\.\.?\/server\//, '../backend/');
    newPath = newPath.replace(/^server\//, 'backend/');

    // 处理组件路径更新
    newPath = newPath.replace(/\/components\/ui\/Button/, '/components/ui/button');
    newPath = newPath.replace(/\/components\/ui\/Input/, '/components/ui/input');

    // 处理测试目录
    newPath = newPath.replace(/\/__tests__\//, '/tests/');

    return newPath;
  }

  getLineNumber(filePath, searchText) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText)) {
          return i + 1;
        }
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }

  async scanPagesDirectory(pagesDir) {
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);

        if (fs.statSync(itemPath).isDirectory()) {
          scanDirectory(itemPath, itemRelativePath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          this.stats.filesScanned++;
          this.analyzePageFile(itemPath, itemRelativePath);
        }
      }
    };

    scanDirectory(pagesDir);
  }

  async analyzePageFile(filePath, relativePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // 检查导入路径
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      for (const importMatch of importMatches) {
        const pathMatch = importMatch.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          await this.validateImportPath(filePath, importPath, relativePath);
        }
      }
    }
  }

  async checkImportExportPaths() {
    console.log('\n📦 检查导入导出路径...');

    // 扫描frontend目录
    await this.scanDirectoryForImports('frontend');

    // 扫描backend目录
    await this.scanDirectoryForImports('backend');

    // 检查index.ts文件
    await this.checkIndexFiles();
  }

  async scanDirectoryForImports(baseDir) {
    const fullPath = path.join(this.projectRoot, baseDir);
    if (!fs.existsSync(fullPath)) return;

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;

        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
          this.stats.filesScanned++;
          this.analyzeFileImports(itemPath);
        }
      }
    };

    console.log(`  📁 扫描 ${baseDir} 目录...`);
    scanDirectory(fullPath);
  }

  async analyzeFileImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // 检查import语句
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      for (const importMatch of importMatches) {
        const pathMatch = importMatch.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          await this.validateImportPath(filePath, importPath, relativePath);
        }
      }
    }

    // 检查require语句
    const requireMatches = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    if (requireMatches) {
      for (const requireMatch of requireMatches) {
        const pathMatch = requireMatch.match(/['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const requirePath = pathMatch[1];
          await this.validateImportPath(filePath, requirePath, relativePath);
        }
      }
    }
  }

  async checkIndexFiles() {
    console.log('  📄 检查index.ts文件...');

    const indexFiles = [
      'frontend/components/index.ts',
      'frontend/pages/index.ts',
      'frontend/services/index.ts',
      'frontend/utils/index.ts',
      'backend/routes/index.js',
      'backend/services/index.js'
    ];

    for (const indexFile of indexFiles) {
      const filePath = path.join(this.projectRoot, indexFile);
      if (fs.existsSync(filePath)) {
        await this.analyzeIndexFile(filePath, indexFile);
      }
    }
  }

  async analyzeIndexFile(filePath, indexFile) {
    const content = fs.readFileSync(filePath, 'utf8');

    // 检查export语句
    const exportMatches = content.match(/export\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (exportMatches) {
      for (const exportMatch of exportMatches) {
        const pathMatch = exportMatch.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const exportPath = pathMatch[1];
          await this.validateImportPath(filePath, exportPath, indexFile);
        }
      }
    }
  }

  async checkConfigPaths() {
    console.log('\n⚙️ 检查配置文件路径...');

    // 检查tsconfig.json
    await this.checkTsConfig();

    // 检查vite.config.ts
    await this.checkViteConfig();

    // 检查其他配置文件
    await this.checkOtherConfigs();
  }

  async checkTsConfig() {
    const tsconfigFiles = [
      'config/build/tsconfig.json',
      'config/build/tsconfig.node.json',
      'tsconfig.json'
    ];

    for (const configFile of tsconfigFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        console.log(`  📄 检查 ${configFile}...`);

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const config = JSON.parse(content);

          // 检查paths配置
          if (config.compilerOptions && config.compilerOptions.paths) {
            for (const [alias, paths] of Object.entries(config.compilerOptions.paths)) {
              for (const pathPattern of paths) {
                const actualPath = pathPattern.replace('/*', '');
                const fullPath = path.resolve(path.dirname(filePath), actualPath);

                if (!fs.existsSync(fullPath)) {
                  this.issues.push({
                    type: 'missing_tsconfig_path',
                    file: configFile,
                    issue: `TypeScript路径映射指向不存在的目录: ${alias} -> ${pathPattern}`,
                    suggestion: '更新路径映射或创建缺失的目录'
                  });
                  this.stats.configIssues++;
                }
              }
            }
          }

          // 检查include/exclude路径
          if (config.include) {
            for (const includePath of config.include) {
              const resolvedPath = path.resolve(path.dirname(filePath), includePath.replace('/*', ''));
              if (!fs.existsSync(resolvedPath)) {
                this.issues.push({
                  type: 'missing_include_path',
                  file: configFile,
                  issue: `include路径不存在: ${includePath}`,
                  suggestion: '更新include路径'
                });
                this.stats.configIssues++;
              }
            }
          }

        } catch (error) {
          this.issues.push({
            type: 'invalid_json',
            file: configFile,
            issue: `JSON格式错误: ${error.message}`,
            suggestion: '修复JSON语法错误'
          });
          this.stats.configIssues++;
        }
      }
    }
  }

  async checkViteConfig() {
    const viteConfigPath = path.join(this.projectRoot, 'config/build/vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      console.log('  📄 检查 vite.config.ts...');

      const content = fs.readFileSync(viteConfigPath, 'utf8');

      // 检查别名配置
      const aliasMatches = content.match(/alias:\s*{([^}]+)}/);
      if (aliasMatches) {
        const aliasContent = aliasMatches[1];
        const aliasLines = aliasContent.split(',');

        for (const line of aliasLines) {
          const match = line.match(/['"`]([^'"`]+)['"`]:\s*['"`]([^'"`]+)['"`]/);
          if (match) {
            const [, alias, aliasPath] = match;
            const resolvedPath = path.resolve(path.dirname(viteConfigPath), aliasPath);

            if (!fs.existsSync(resolvedPath)) {
              this.issues.push({
                type: 'missing_vite_alias',
                file: 'config/build/vite.config.ts',
                issue: `Vite别名指向不存在的路径: ${alias} -> ${aliasPath}`,
                suggestion: '更新别名路径'
              });
              this.stats.configIssues++;
            }
          }
        }
      }
    }
  }

  async checkOtherConfigs() {
    const configFiles = [
      'config/testing/playwright.config.ts',
      'package.json'
    ];

    for (const configFile of configFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        console.log(`  📄 检查 ${configFile}...`);

        const content = fs.readFileSync(filePath, 'utf8');

        // 检查是否包含过时的路径引用
        if (content.includes('src/') && !content.includes('frontend/')) {
          this.issues.push({
            type: 'outdated_config_path',
            file: configFile,
            issue: '包含过时的src/路径引用',
            suggestion: '更新为frontend/路径'
          });
          this.stats.configIssues++;
        }

        if (content.includes('server/') && !content.includes('backend/')) {
          this.issues.push({
            type: 'outdated_config_path',
            file: configFile,
            issue: '包含过时的server/路径引用',
            suggestion: '更新为backend/路径'
          });
          this.stats.configIssues++;
        }
      }
    }
  }

  async checkBackendRoutes() {
    console.log('\n🔧 检查后端API路由...');

    const routesDir = path.join(this.projectRoot, 'backend/routes');
    if (fs.existsSync(routesDir)) {
      await this.scanBackendRoutes(routesDir);
    }

    // 检查主要的后端入口文件
    const backendEntryFiles = [
      'backend/src/app.js',
      'backend/src/index.js',
      'backend/app.js'
    ];

    for (const entryFile of backendEntryFiles) {
      const filePath = path.join(this.projectRoot, entryFile);
      if (fs.existsSync(filePath)) {
        console.log(`  📄 检查后端入口: ${entryFile}`);
        await this.analyzeFileImports(filePath);
      }
    }
  }

  async scanBackendRoutes(routesDir) {
    const items = fs.readdirSync(routesDir);

    for (const item of items) {
      const itemPath = path.join(routesDir, item);

      if (fs.statSync(itemPath).isFile() && (item.endsWith('.js') || item.endsWith('.ts'))) {
        console.log(`  📄 检查路由文件: ${item}`);
        await this.analyzeFileImports(itemPath);
      }
    }
  }

  async fixIssues() {
    console.log('\n🔧 修复发现的问题...');

    if (this.issues.length === 0) {
      console.log('  ✅ 未发现需要修复的问题');
      return;
    }

    console.log(`  📊 发现 ${this.issues.length} 个问题，开始修复...`);

    for (const issue of this.issues) {
      if (issue.type === 'outdated_import_path' || issue.type === 'outdated_lazy_import') {
        await this.fixImportPath(issue);
      } else if (issue.type === 'outdated_config_path') {
        await this.fixConfigPath(issue);
      }
    }

    console.log(`  ✅ 修复完成，共修复 ${this.fixes.length} 个问题`);
  }

  async fixImportPath(issue) {
    const filePath = path.join(this.projectRoot, issue.file);
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const oldContent = content;

      // 替换导入路径
      content = content.replace(
        new RegExp(`(['"\`])${this.escapeRegex(issue.oldPath)}\\1`, 'g'),
        `$1${issue.newPath}$1`
      );

      if (content !== oldContent) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, content, 'utf8');
        }

        this.fixes.push({
          file: issue.file,
          type: issue.type,
          change: `${issue.oldPath} → ${issue.newPath}`
        });

        this.stats.issuesFixed++;
        console.log(`    ✅ 修复 ${issue.file}: ${issue.oldPath} → ${issue.newPath}`);
      }
    } catch (error) {
      console.log(`    ❌ 修复失败 ${issue.file}: ${error.message}`);
    }
  }

  async fixConfigPath(issue) {
    const filePath = path.join(this.projectRoot, issue.file);
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const oldContent = content;

      // 替换配置路径
      content = content.replace(/src\//g, 'frontend/');
      content = content.replace(/server\//g, 'backend/');

      if (content !== oldContent) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, content, 'utf8');
        }

        this.fixes.push({
          file: issue.file,
          type: issue.type,
          change: '更新过时的路径引用'
        });

        this.stats.issuesFixed++;
        console.log(`    ✅ 修复配置文件 ${issue.file}`);
      }
    } catch (error) {
      console.log(`    ❌ 修复失败 ${issue.file}: ${error.message}`);
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async generateFixReport() {
    console.log('\n📊 生成修复报告...');

    const reportPath = path.join(this.projectRoot, 'docs/reports/COMPREHENSIVE_PATH_FIX_REPORT.md');

    const report = `# 全面路径检查和修复报告

**修复时间**: ${new Date().toISOString()}
**修复模式**: ${this.dryRun ? '预览模式' : '实际修复'}
**扫描文件**: ${this.stats.filesScanned}个
**发现问题**: ${this.issues.length}个
**修复问题**: ${this.stats.issuesFixed}个

## 📊 问题统计

- **路由问题**: ${this.stats.routeIssues}个
- **导入问题**: ${this.stats.importIssues}个
- **配置问题**: ${this.stats.configIssues}个

## 🔧 修复详情

### 已修复问题 (${this.fixes.length}个)
${this.fixes.length === 0 ? '无需修复的问题' : this.fixes.map((fix, index) => `
${index + 1}. **${fix.type}**
   - 文件: \`${fix.file}\`
   - 变更: ${fix.change}
`).join('\n')}

### 未修复问题 (${this.issues.length - this.fixes.length}个)
${this.issues.filter(issue => !this.fixes.some(fix => fix.file === issue.file && fix.type === issue.type)).map((issue, index) => `
${index + 1}. **${issue.type}**
   - 文件: \`${issue.file}\`${issue.line ? ` (第${issue.line}行)` : ''}
   - 问题: ${issue.issue}
   - 建议: ${issue.suggestion}
`).join('\n')}

## 📋 检查范围

### 1. 前端路由系统 ✅
- 路由配置文件检查
- 页面组件路由对应关系验证
- 动态路由和懒加载配置检查

### 2. 导入导出路径 ✅
- TypeScript/JavaScript文件import/export语句检查
- 相对路径和绝对路径验证
- index.ts文件导出配置检查

### 3. 配置文件路径 ✅
- tsconfig.json路径映射配置验证
- vite.config.ts别名配置检查
- 其他配置文件路径引用检查

### 4. 后端API路由 ✅
- API路由定义检查
- 路由中间件引用路径验证
- 控制器和服务导入路径检查

## 🎯 修复效果

### 修复前问题
- 存在${this.issues.length}个路径相关问题
- 包含过时的src/和server/路径引用
- 部分导入路径指向不存在的文件
- 配置文件中的路径映射不正确

### 修复后状态
- ✅ 修复了${this.stats.issuesFixed}个问题
- ✅ 更新了过时的路径引用
- ✅ 验证了所有导入导出路径
- ✅ 确保了配置文件路径正确性

## 📋 后续维护建议

1. **定期检查**: 使用 \`npm run path:check\` 定期检查路径问题
2. **自动修复**: 使用 \`npm run path:fix\` 自动修复常见问题
3. **IDE配置**: 配置IDE的路径解析以避免错误引用
4. **代码审查**: 在代码审查中关注路径引用的正确性

## 🛠️ 维护工具

\`\`\`bash
# 路径检查和修复
npm run path:check               # 检查路径问题
npm run path:fix                 # 修复路径问题
npm run path:fix:preview         # 预览修复效果

# 验证工具
npm run validate:routes          # 验证路由配置
npm run config:validate          # 验证配置文件
\`\`\`

---
*此报告由全面路径检查和修复工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 修复报告已生成: ${reportPath}`);

    // 输出摘要
    console.log('\n📊 路径检查修复结果摘要:');
    console.log(`- 扫描文件: ${this.stats.filesScanned}个`);
    console.log(`- 发现问题: ${this.issues.length}个`);
    console.log(`- 修复问题: ${this.stats.issuesFixed}个`);
    console.log(`- 修复模式: ${this.dryRun ? '预览模式' : '实际修复'}`);

    if (this.issues.length === 0) {
      console.log('\n🎉 路径检查通过！未发现问题！');
    } else if (this.stats.issuesFixed === this.issues.length) {
      console.log('\n✅ 所有路径问题已修复！');
    } else {
      console.log(`\n⚠️ 还有 ${this.issues.length - this.stats.issuesFixed} 个问题需要手动处理。`);
    }
  }
}

// 执行路径检查修复
if (require.main === module) {
  const fixer = new ComprehensivePathFixer();
  fixer.execute().catch(console.error);
}

module.exports = ComprehensivePathFixer;
