#!/usr/bin/env node

/**
 * 文件命名规范修复工具
 * 自动修复项目中不符合命名规范的文件和目录
 */

const fs = require('fs');
const path = require('path');

class NamingConventionFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.fixes = [];
    
    // 命名修复规则
    this.fixRules = {
      // 测试目录：__tests__ → tests
      testDirectories: {
        from: '__tests__',
        to: 'tests'
      },
      
      // 样式文件：PascalCase.css → kebab-case.css
      styleFiles: {
        pattern: /^[A-Z][a-zA-Z0-9]*\.css$/,
        transform: (name) => this.pascalToKebab(name)
      },
      
      // TypeScript服务文件：PascalCase.ts → camelCase.ts
      serviceFiles: {
        pattern: /^[A-Z][a-zA-Z0-9]*\.ts$/,
        transform: (name) => this.pascalToCamel(name),
        directories: ['services', 'utils']
      },
      
      // 文档文件：kebab-case-with-dash.md → kebab-case.md
      docFiles: {
        pattern: /^[a-z][a-z0-9-]*-[a-z][a-z0-9-]*\.md$/,
        transform: (name) => name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
      }
    };
  }

  async execute() {
    console.log('🔧 开始修复文件命名规范...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 修复测试目录命名
      await this.fixTestDirectories();
      
      // 2. 修复样式文件命名
      await this.fixStyleFiles();
      
      // 3. 修复TypeScript文件命名
      await this.fixTypeScriptFiles();
      
      // 4. 修复文档文件命名
      await this.fixDocFiles();
      
      // 5. 生成修复报告
      await this.generateFixReport();
      
    } catch (error) {
      console.error('❌ 修复过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async fixTestDirectories() {
    console.log('\n📁 修复测试目录命名...');
    
    await this.walkDirectory('frontend', (itemPath, item, isDirectory) => {
      if (isDirectory && item === '__tests__') {
        const parentDir = path.dirname(itemPath);
        const newPath = path.join(parentDir, 'tests');
        
        this.fixes.push({
          type: '目录重命名',
          from: path.relative(this.projectRoot, itemPath),
          to: path.relative(this.projectRoot, newPath),
          reason: '__tests__ → tests (规范化测试目录名)'
        });
        
        if (!this.dryRun) {
          fs.renameSync(itemPath, newPath);
        }
        console.log(`  ✅ ${path.relative(this.projectRoot, itemPath)} → ${path.relative(this.projectRoot, newPath)}`);
      }
    });
  }

  async fixStyleFiles() {
    console.log('\n🎨 修复样式文件命名...');
    
    await this.walkDirectory('frontend', (itemPath, item, isDirectory) => {
      if (!isDirectory && item.endsWith('.css')) {
        const rule = this.fixRules.styleFiles;
        if (rule.pattern.test(item)) {
          const newName = rule.transform(item);
          const newPath = path.join(path.dirname(itemPath), newName);
          
          this.fixes.push({
            type: '样式文件重命名',
            from: path.relative(this.projectRoot, itemPath),
            to: path.relative(this.projectRoot, newPath),
            reason: 'PascalCase.css → kebab-case.css'
          });
          
          if (!this.dryRun) {
            fs.renameSync(itemPath, newPath);
          }
          console.log(`  ✅ ${item} → ${newName}`);
        }
      }
    });
  }

  async fixTypeScriptFiles() {
    console.log('\n📝 修复TypeScript文件命名...');
    
    await this.walkDirectory('frontend', (itemPath, item, isDirectory) => {
      if (!isDirectory && item.endsWith('.ts') && !item.includes('.test.') && !item.includes('.spec.') && !item.includes('.d.')) {
        const rule = this.fixRules.serviceFiles;
        const parentDir = path.basename(path.dirname(itemPath));
        
        // 只修复services和utils目录中的文件
        if (rule.directories.includes(parentDir) && rule.pattern.test(item)) {
          const newName = rule.transform(item);
          const newPath = path.join(path.dirname(itemPath), newName);
          
          this.fixes.push({
            type: 'TypeScript文件重命名',
            from: path.relative(this.projectRoot, itemPath),
            to: path.relative(this.projectRoot, newPath),
            reason: 'PascalCase.ts → camelCase.ts (服务文件)'
          });
          
          if (!this.dryRun) {
            fs.renameSync(itemPath, newPath);
          }
          console.log(`  ✅ ${item} → ${newName}`);
        }
      }
    });
  }

  async fixDocFiles() {
    console.log('\n📚 修复文档文件命名...');
    
    await this.walkDirectory('frontend', (itemPath, item, isDirectory) => {
      if (!isDirectory && item.endsWith('.md')) {
        const rule = this.fixRules.docFiles;
        if (rule.pattern.test(item)) {
          const newName = rule.transform(item);
          const newPath = path.join(path.dirname(itemPath), newName);
          
          this.fixes.push({
            type: '文档文件重命名',
            from: path.relative(this.projectRoot, itemPath),
            to: path.relative(this.projectRoot, newPath),
            reason: '规范化文档文件命名'
          });
          
          if (!this.dryRun) {
            fs.renameSync(itemPath, newPath);
          }
          console.log(`  ✅ ${item} → ${newName}`);
        }
      }
    });
  }

  async walkDirectory(basePath, callback) {
    const fullPath = path.join(this.projectRoot, basePath);
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const isDirectory = fs.statSync(itemPath).isDirectory();
      
      callback(itemPath, item, isDirectory);
      
      if (isDirectory) {
        await this.walkDirectory(path.relative(this.projectRoot, itemPath), callback);
      }
    }
  }

  pascalToKebab(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  pascalToCamel(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  async generateFixReport() {
    console.log('\n📊 生成修复报告...');
    
    const reportPath = path.join(this.projectRoot, 'docs/reports/NAMING_CONVENTION_FIX_REPORT.md');
    
    const report = `# 文件命名规范修复报告

**修复时间**: ${new Date().toISOString()}
**修复模式**: ${this.dryRun ? '预览模式' : '实际执行'}
**修复数量**: ${this.fixes.length}个

## 📊 修复摘要

${this.fixes.length === 0 ? '无需修复的命名问题 🎉' : `共修复 ${this.fixes.length} 个命名问题`}

## 🔧 修复详情

${this.fixes.length === 0 ? '所有文件命名都符合规范' : this.fixes.map((fix, index) => `
### ${index + 1}. ${fix.type}
- **原文件**: \`${fix.from}\`
- **新文件**: \`${fix.to}\`
- **修复原因**: ${fix.reason}
`).join('\n')}

## 📋 修复规则

### 1. 测试目录命名
- **规则**: \`__tests__\` → \`tests\`
- **原因**: 统一测试目录命名规范

### 2. 样式文件命名
- **规则**: \`PascalCase.css\` → \`kebab-case.css\`
- **原因**: 样式文件使用kebab-case命名

### 3. TypeScript服务文件命名
- **规则**: \`PascalCase.ts\` → \`camelCase.ts\`
- **原因**: 服务文件使用camelCase命名
- **适用目录**: services/, utils/

### 4. 文档文件命名
- **规则**: 规范化文档文件命名
- **原因**: 统一文档命名格式

## 🎯 修复效果

### 修复前问题
- 测试目录使用 \`__tests__\` 命名
- 样式文件使用 PascalCase 命名
- 服务文件使用 PascalCase 命名
- 文档文件命名不一致

### 修复后状态
- ✅ 测试目录统一使用 \`tests\` 命名
- ✅ 样式文件统一使用 kebab-case 命名
- ✅ 服务文件统一使用 camelCase 命名
- ✅ 文档文件命名规范化

## 📋 后续建议

1. **建立命名规范文档** - 为团队制定详细的命名规范
2. **配置ESLint规则** - 自动检查文件命名规范
3. **定期检查** - 使用分析工具定期检查命名规范
4. **团队培训** - 确保团队成员了解命名规范

---
*此报告由文件命名规范修复工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 修复报告已生成: ${reportPath}`);
    
    // 输出摘要
    console.log('\n📊 修复结果摘要:');
    console.log(`- 修复数量: ${this.fixes.length}`);
    console.log(`- 修复模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    
    if (this.fixes.length === 0) {
      console.log('\n🎉 所有文件命名都符合规范！');
    } else {
      console.log(`\n✅ 成功修复 ${this.fixes.length} 个命名问题！`);
    }
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new NamingConventionFixer();
  fixer.execute().catch(console.error);
}

module.exports = NamingConventionFixer;
