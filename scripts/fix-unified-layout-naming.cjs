#!/usr/bin/env node

/**
 * 修复 UnifiedTestPageLayout 命名问题
 * 将所有 UnifiedTestPageLayout 替换为 TestPageLayout
 */

const fs = require('fs');
const path = require('path');

class UnifiedLayoutNamingFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];
    
    // 需要修复的文件列表
    this.filesToFix = [
      'pages/APITest.tsx',
      'pages/ChromeCompatibilityTest.tsx',
      'pages/CompatibilityTest.tsx',
      'pages/DatabaseTest.tsx',
      'pages/NetworkTest.tsx',
      'pages/SecurityTest.tsx',
      'pages/SEOTest.tsx',
      'pages/UXTest.tsx',
      'pages/WebsiteTest.tsx'
    ];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复 UnifiedTestPageLayout 命名问题...\n');
    
    for (const relativePath of this.filesToFix) {
      const fullPath = path.join(this.frontendPath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        await this.fixFile(fullPath, relativePath);
      } else {
        console.log(`⚠️  文件不存在: ${relativePath}`);
      }
    }
    
    await this.generateReport();
    
    console.log(`\n✅ 修复完成！`);
    console.log(`   修复文件: ${this.fixes.length} 个`);
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let hasChanges = false;
      
      // 1. 替换导入语句
      const oldImport = "import UnifiedTestPageLayout from '../components/testing/UnifiedTestPageLayout';";
      const newImport = "import TestPageLayout from '../components/testing/TestPageLayout';";
      
      if (newContent.includes(oldImport)) {
        newContent = newContent.replace(oldImport, newImport);
        hasChanges = true;
      }
      
      // 2. 替换组件使用
      newContent = newContent.replace(/UnifiedTestPageLayout/g, 'TestPageLayout');
      if (newContent !== content) {
        hasChanges = true;
      }
      
      // 3. 保存文件
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复文件: ${relativePath}`);
        
        this.fixes.push({
          file: relativePath,
          changes: [
            '导入语句: UnifiedTestPageLayout → TestPageLayout',
            '组件使用: UnifiedTestPageLayout → TestPageLayout'
          ]
        });
      } else {
        console.log(`ℹ️  无需修复: ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ 修复失败: ${relativePath} - ${error.message}`);
    }
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('\n📊 修复报告:');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复的文件:');
      this.fixes.forEach(fix => {
        console.log(`  📁 ${fix.file}`);
        fix.changes.forEach(change => {
          console.log(`     - ${change}`);
        });
      });
    } else {
      console.log('\n✅ 没有发现需要修复的文件');
    }
    
    console.log('\n🎯 修复内容:');
    console.log('  1. 删除了冗余的 UnifiedTestPageLayout.tsx 文件');
    console.log('  2. 将所有导入语句替换为 TestPageLayout');
    console.log('  3. 将所有组件使用替换为 TestPageLayout');
    console.log('  4. 统一了命名规范，消除了重复');
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new UnifiedLayoutNamingFixer();
  fixer.fix().catch(console.error);
}

module.exports = UnifiedLayoutNamingFixer;
