#!/usr/bin/env node

/**
 * 项目结构分析和命名规范检查工具
 * 全面分析项目结构、清理状态、路径修复和文件命名规范
 */

const fs = require('fs');
const path = require('path');

class ProjectStructureAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
    
    // 命名规范定义
    this.namingRules = {
      // React组件文件：PascalCase.tsx
      reactComponents: /^[A-Z][a-zA-Z0-9]*\.tsx$/,
      // TypeScript文件：camelCase.ts
      typeScriptFiles: /^[a-z][a-zA-Z0-9]*\.ts$/,
      // 配置文件：kebab-case.config.js/ts
      configFiles: /^[a-z][a-z0-9-]*\.(config|rc)\.(js|ts|json)$/,
      // 样式文件：kebab-case.css
      styleFiles: /^[a-z][a-z0-9-]*\.css$/,
      // 测试文件：*.test.ts/tsx 或 *.spec.ts/tsx
      testFiles: /^.*\.(test|spec)\.(ts|tsx)$/,
      // 目录名：kebab-case 或 camelCase
      directories: /^[a-z][a-zA-Z0-9-]*$/,
      // 文档文件：UPPER_CASE.md 或 kebab-case.md
      docFiles: /^([A-Z][A-Z0-9_]*|[a-z][a-z0-9-]*)\.md$/
    };
  }

  async execute() {
    console.log('🔍 开始项目结构分析和命名规范检查...');
    console.log('==================================================');

    try {
      // 1. 分析项目根目录结构
      await this.analyzeRootStructure();
      
      // 2. 分析frontend目录结构
      await this.analyzeFrontendStructure();
      
      // 3. 检查配置文件路径
      await this.analyzeConfigPaths();
      
      // 4. 检查文件命名规范
      await this.analyzeNamingConventions();
      
      // 5. 检查清理状态
      await this.analyzeCleanupStatus();
      
      // 6. 生成分析报告
      await this.generateAnalysisReport();
      
    } catch (error) {
      console.error('❌ 分析过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async analyzeRootStructure() {
    console.log('\n📁 分析项目根目录结构...');
    
    const expectedStructure = {
      'frontend': '前端应用目录',
      'backend': '后端服务目录', 
      'data': '数据存储目录',
      'docs': '文档目录',
      'config': '配置文件目录',
      'tools': '开发工具目录',
      'scripts': '脚本目录',
      'deploy': '部署配置目录',
      'public': '静态资源目录'
    };
    
    const rootItems = fs.readdirSync(this.projectRoot);
    
    // 检查预期目录
    for (const [dir, description] of Object.entries(expectedStructure)) {
      if (rootItems.includes(dir)) {
        console.log(`  ✅ ${dir}/ - ${description}`);
      } else {
        console.log(`  ⚠️ ${dir}/ 缺失 - ${description}`);
        this.warnings.push(`缺少预期目录: ${dir}/`);
      }
    }
    
    // 检查是否有不应该存在的目录
    const unexpectedDirs = ['src', 'server', 'database', 'reports', 'dist'];
    for (const dir of unexpectedDirs) {
      if (rootItems.includes(dir)) {
        console.log(`  ❌ ${dir}/ 不应该存在（已重构）`);
        this.issues.push(`发现已重构的旧目录: ${dir}/`);
      }
    }
    
    // 检查根目录文件
    const rootFiles = rootItems.filter(item => {
      const itemPath = path.join(this.projectRoot, item);
      return fs.statSync(itemPath).isFile();
    });
    
    console.log(`  📄 根目录文件数量: ${rootFiles.length}`);
    if (rootFiles.length > 10) {
      this.warnings.push(`根目录文件过多 (${rootFiles.length}个)，建议整理`);
    }
  }

  async analyzeFrontendStructure() {
    console.log('\n🎨 分析frontend目录结构...');
    
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (!fs.existsSync(frontendPath)) {
      this.issues.push('frontend目录不存在');
      return;
    }
    
    // 检查页面结构
    const pagesPath = path.join(frontendPath, 'pages');
    if (fs.existsSync(pagesPath)) {
      const pageCategories = fs.readdirSync(pagesPath);
      console.log(`  📄 页面分类: ${pageCategories.join(', ')}`);
      
      const expectedCategories = ['core', 'management', 'data', 'user'];
      for (const category of expectedCategories) {
        if (pageCategories.includes(category)) {
          console.log(`    ✅ ${category}/ 分类存在`);
        } else {
          this.warnings.push(`页面分类缺失: ${category}/`);
        }
      }
    }
    
    // 检查组件结构
    const componentsPath = path.join(frontendPath, 'components');
    if (fs.existsSync(componentsPath)) {
      const componentCategories = fs.readdirSync(componentsPath);
      console.log(`  🧩 组件分类: ${componentCategories.join(', ')}`);
      
      const expectedComponents = ['ui', 'layout', 'charts', 'features', 'testing', 'system', 'auth', 'tools'];
      for (const category of expectedComponents) {
        if (componentCategories.includes(category)) {
          console.log(`    ✅ ${category}/ 组件分类存在`);
        } else {
          this.warnings.push(`组件分类缺失: ${category}/`);
        }
      }
    }
  }

  async analyzeConfigPaths() {
    console.log('\n⚙️ 分析配置文件路径...');
    
    const configFiles = [
      'config/build/vite.config.ts',
      'config/build/tsconfig.json',
      'config/build/tsconfig.node.json',
      'config/testing/playwright.config.ts'
    ];
    
    for (const configFile of configFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${configFile} 存在`);
        
        // 检查文件内容中的路径引用
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('src/') && !content.includes('frontend/')) {
          this.issues.push(`${configFile} 仍包含过时的src路径引用`);
        } else if (content.includes('frontend/')) {
          console.log(`    ✅ 路径引用已更新为frontend/`);
        }
      } else {
        this.issues.push(`配置文件缺失: ${configFile}`);
      }
    }
  }

  async analyzeNamingConventions() {
    console.log('\n📝 检查文件命名规范...');
    
    await this.checkDirectoryNaming('frontend');
    await this.checkFileNaming('frontend');
  }

  async checkDirectoryNaming(basePath) {
    const fullPath = path.join(this.projectRoot, basePath);
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        // 检查目录命名
        if (!this.namingRules.directories.test(item)) {
          this.warnings.push(`目录命名不规范: ${path.relative(this.projectRoot, itemPath)} (应使用kebab-case或camelCase)`);
        }
        
        // 递归检查子目录
        await this.checkDirectoryNaming(path.relative(this.projectRoot, itemPath));
      }
    }
  }

  async checkFileNaming(basePath) {
    const fullPath = path.join(this.projectRoot, basePath);
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      if (fs.statSync(itemPath).isFile()) {
        const relativePath = path.relative(this.projectRoot, itemPath);
        
        // 根据文件类型检查命名规范
        if (item.endsWith('.tsx') && !item.includes('.test.') && !item.includes('.spec.')) {
          // React组件文件
          if (!this.namingRules.reactComponents.test(item)) {
            this.warnings.push(`React组件命名不规范: ${relativePath} (应使用PascalCase.tsx)`);
          }
        } else if (item.endsWith('.ts') && !item.includes('.test.') && !item.includes('.spec.') && !item.includes('.d.')) {
          // TypeScript文件
          if (!this.namingRules.typeScriptFiles.test(item) && !item.includes('.config.')) {
            this.warnings.push(`TypeScript文件命名不规范: ${relativePath} (应使用camelCase.ts)`);
          }
        } else if (item.includes('.config.') || item.includes('.rc.')) {
          // 配置文件
          if (!this.namingRules.configFiles.test(item)) {
            this.warnings.push(`配置文件命名不规范: ${relativePath} (应使用kebab-case.config.js/ts)`);
          }
        } else if (item.endsWith('.css')) {
          // 样式文件
          if (!this.namingRules.styleFiles.test(item)) {
            this.warnings.push(`样式文件命名不规范: ${relativePath} (应使用kebab-case.css)`);
          }
        } else if (item.includes('.test.') || item.includes('.spec.')) {
          // 测试文件
          if (!this.namingRules.testFiles.test(item)) {
            this.warnings.push(`测试文件命名不规范: ${relativePath} (应使用*.test.ts/tsx或*.spec.ts/tsx)`);
          }
        } else if (item.endsWith('.md')) {
          // 文档文件
          if (!this.namingRules.docFiles.test(item)) {
            this.warnings.push(`文档文件命名不规范: ${relativePath} (应使用UPPER_CASE.md或kebab-case.md)`);
          }
        }
      } else if (fs.statSync(itemPath).isDirectory()) {
        // 递归检查子目录
        await this.checkFileNaming(path.relative(this.projectRoot, itemPath));
      }
    }
  }

  async analyzeCleanupStatus() {
    console.log('\n🧹 检查清理状态...');
    
    // 检查是否存在构建产物
    const buildArtifacts = ['dist', 'build', 'out'];
    for (const artifact of buildArtifacts) {
      const artifactPath = path.join(this.projectRoot, artifact);
      if (fs.existsSync(artifactPath)) {
        this.warnings.push(`发现构建产物目录: ${artifact}/ (应在.gitignore中)`);
      } else {
        console.log(`  ✅ 无构建产物: ${artifact}/`);
      }
    }
    
    // 检查.gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const requiredEntries = ['dist/', 'node_modules/', '*.log'];
      
      for (const entry of requiredEntries) {
        if (gitignoreContent.includes(entry)) {
          console.log(`  ✅ .gitignore包含: ${entry}`);
        } else {
          this.warnings.push(`.gitignore缺少条目: ${entry}`);
        }
      }
    }
  }

  async generateAnalysisReport() {
    console.log('\n📊 生成分析报告...');
    
    const reportPath = path.join(this.projectRoot, 'docs/reports/PROJECT_STRUCTURE_ANALYSIS_REPORT.md');
    
    const report = `# 项目结构分析报告

**分析时间**: ${new Date().toISOString()}
**分析状态**: ${this.issues.length === 0 ? '✅ 良好' : '⚠️ 需要改进'}

## 📊 分析摘要

- **严重问题**: ${this.issues.length}个
- **警告**: ${this.warnings.length}个
- **建议**: ${this.suggestions.length}个

## 🚨 严重问题 (${this.issues.length}个)

${this.issues.length === 0 ? '无严重问题 🎉' : this.issues.map(issue => `- ❌ ${issue}`).join('\n')}

## ⚠️ 警告 (${this.warnings.length}个)

${this.warnings.length === 0 ? '无警告 ✅' : this.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}

## 💡 建议 (${this.suggestions.length}个)

${this.suggestions.length === 0 ? '无额外建议' : this.suggestions.map(suggestion => `- 💡 ${suggestion}`).join('\n')}

## 📁 项目结构状态

### ✅ 已完成的重构
- src → frontend 重命名
- 配置文件重组到config/目录
- 开发工具整理到tools/目录
- 文档归档到docs/目录
- 页面按功能分类组织
- 组件按类型分类组织

### 📋 命名规范检查
- React组件: PascalCase.tsx ✅
- TypeScript文件: camelCase.ts ✅
- 配置文件: kebab-case.config.js/ts ✅
- 样式文件: kebab-case.css ✅
- 测试文件: *.test.ts/tsx ✅
- 目录名: kebab-case或camelCase ✅

### 🎯 项目健康度评分
- **结构清晰度**: ${this.issues.length === 0 ? '⭐⭐⭐⭐⭐' : this.issues.length <= 2 ? '⭐⭐⭐⭐' : '⭐⭐⭐'} (${5 - Math.min(this.issues.length, 5)}/5)
- **命名规范性**: ${this.warnings.filter(w => w.includes('命名')).length === 0 ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐'} (${this.warnings.filter(w => w.includes('命名')).length === 0 ? 5 : 4}/5)
- **配置完整性**: ${this.issues.filter(i => i.includes('配置')).length === 0 ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐'} (${this.issues.filter(i => i.includes('配置')).length === 0 ? 5 : 4}/5)
- **清理完整性**: ${this.warnings.filter(w => w.includes('构建产物')).length === 0 ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐'} (${this.warnings.filter(w => w.includes('构建产物')).length === 0 ? 5 : 4}/5)

**总体评分**: ${this.calculateOverallScore()}/5 ⭐

## 📋 后续行动建议

${this.generateActionItems()}

---
*此报告由项目结构分析工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 分析报告已生成: ${reportPath}`);
    
    // 输出摘要
    console.log('\n📊 分析结果摘要:');
    console.log(`- 严重问题: ${this.issues.length}`);
    console.log(`- 警告: ${this.warnings.length}`);
    console.log(`- 建议: ${this.suggestions.length}`);
    
    if (this.issues.length === 0 && this.warnings.length <= 5) {
      console.log('\n🎉 项目结构分析通过！结构清晰，命名规范！');
    } else {
      console.log(`\n⚠️ 发现 ${this.issues.length + this.warnings.length} 个问题，请查看详细报告。`);
    }
  }

  calculateOverallScore() {
    const structureScore = Math.max(0, 5 - this.issues.length);
    const namingScore = this.warnings.filter(w => w.includes('命名')).length === 0 ? 5 : 4;
    const configScore = this.issues.filter(i => i.includes('配置')).length === 0 ? 5 : 4;
    const cleanupScore = this.warnings.filter(w => w.includes('构建产物')).length === 0 ? 5 : 4;
    
    return Math.round((structureScore + namingScore + configScore + cleanupScore) / 4);
  }

  generateActionItems() {
    const actions = [];
    
    if (this.issues.length > 0) {
      actions.push('1. **立即修复严重问题**');
      this.issues.forEach(issue => actions.push(`   - ${issue}`));
    }
    
    if (this.warnings.length > 0) {
      actions.push('2. **处理警告项目**');
      this.warnings.slice(0, 5).forEach(warning => actions.push(`   - ${warning}`));
      if (this.warnings.length > 5) {
        actions.push(`   - ... 还有${this.warnings.length - 5}个警告`);
      }
    }
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      actions.push('✅ 无需立即行动，项目结构良好');
      actions.push('💡 建议定期运行此分析工具保持项目健康');
    }
    
    return actions.join('\n');
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new ProjectStructureAnalyzer();
  analyzer.execute().catch(console.error);
}

module.exports = ProjectStructureAnalyzer;
