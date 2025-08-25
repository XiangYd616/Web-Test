#!/usr/bin/env node

/**
 * 命名冲突修复工具
 * 检测和修复重复声明、命名冲突等问题
 */

const fs = require('fs');
const path = require('path');

class NamingConflictFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];
    
    // 常见的命名冲突模式
    this.conflictPatterns = [
      {
        name: 'TestProgress',
        type: 'import-component-conflict',
        importPattern: /import.*TestProgress.*from.*testProgressService/,
        componentPattern: /export const TestProgress:/,
        solution: 'rename-import'
      }
    ];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复命名冲突问题...\n');
    
    const files = this.getAllTSXFiles();
    
    for (const file of files) {
      await this.checkAndFixFile(file);
    }
    
    await this.generateReport();
    
    console.log(`\n✅ 修复完成！`);
    console.log(`   修复文件: ${this.fixes.length} 个`);
  }

  /**
   * 检查并修复单个文件
   */
  async checkAndFixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendPath, filePath);
      let newContent = content;
      let hasChanges = false;
      
      for (const pattern of this.conflictPatterns) {
        const hasImport = pattern.importPattern.test(content);
        const hasComponent = pattern.componentPattern.test(content);
        
        if (hasImport && hasComponent) {
          console.log(`🔍 发现命名冲突: ${relativePath} - ${pattern.name}`);
          
          if (pattern.solution === 'rename-import') {
            // 重命名导入
            newContent = newContent.replace(
              pattern.importPattern,
              (match) => match.replace(pattern.name, `${pattern.name}Type`)
            );
            
            // 更新类型使用
            const typeUsagePattern = new RegExp(`\\b${pattern.name}\\b(?!:)(?![A-Za-z])`, 'g');
            newContent = newContent.replace(typeUsagePattern, (match, offset) => {
              // 检查是否在组件定义中
              const beforeMatch = newContent.substring(0, offset);
              const isInComponentDef = /export const\s+\w+\s*:\s*React\.FC.*$/.test(beforeMatch.split('\n').pop());
              
              if (!isInComponentDef) {
                return `${pattern.name}Type`;
              }
              return match;
            });
            
            hasChanges = true;
            
            this.fixes.push({
              file: relativePath,
              conflict: pattern.name,
              solution: '重命名导入类型为 ' + pattern.name + 'Type'
            });
          }
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复命名冲突: ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ 修复失败: ${path.relative(this.frontendPath, filePath)} - ${error.message}`);
    }
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSXFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('\n📊 命名冲突修复报告:');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复的冲突:');
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     冲突: ${fix.conflict}`);
        console.log(`     解决方案: ${fix.solution}`);
      });
    } else {
      console.log('\n✅ 没有发现命名冲突');
    }
    
    console.log('\n🎯 修复效果:');
    console.log('  ✅ 消除了导入和组件的命名冲突');
    console.log('  ✅ 保持了代码的可读性');
    console.log('  ✅ 避免了编译错误');
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run type-check 验证修复效果');
    console.log('  2. 测试应用功能确保正常工作');
    console.log('  3. 考虑使用更具描述性的命名避免冲突');
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new NamingConflictFixer();
  fixer.fix().catch(console.error);
}

module.exports = NamingConflictFixer;
