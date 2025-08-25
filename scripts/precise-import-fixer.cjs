#!/usr/bin/env node

/**
 * 精确的导入问题修复工具
 * 只修复真正需要的导入问题
 */

const fs = require('fs');
const path = require('path');

class PreciseImportFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];
    
    // 精确的导入映射 - 只包含真正需要的
    this.importMappings = {
      // 页面组件需要的导入
      'pages/SecurityTest.tsx': {
        'UnifiedTestPageLayout': 'import UnifiedTestPageLayout from \'../components/testing/UnifiedTestPageLayout\';',
        'useTestProgress': 'import { useTestProgress } from \'../hooks/useTestProgress\';',
        'TestProgress': 'import type { TestProgress } from \'../services/api/testProgressService\';'
      },
      'pages/DatabaseTest.tsx': {
        'UnifiedTestPageLayout': 'import UnifiedTestPageLayout from \'../components/testing/UnifiedTestPageLayout\';'
      },
      'pages/UXTest.tsx': {
        'UnifiedTestPageLayout': 'import UnifiedTestPageLayout from \'../components/testing/UnifiedTestPageLayout\';'
      },
      'pages/StressTest.tsx': {
        'useTestProgress': 'import { useTestProgress } from \'../hooks/useTestProgress\';'
      },
      
      // 组件需要的导入
      'components/testing/TestPageLayout.tsx': {
        'TestHeader': 'import TestHeader from \'./TestHeader\';'
      }
    };
    
    // 需要添加状态的文件
    this.stateDefinitions = {
      'pages/SecurityTest.tsx': [
        'isTestRunning',
        'error', 
        'testProgress',
        'canStartTest'
      ]
    };
  }

  /**
   * 开始精确修复
   */
  async fix() {
    console.log('🎯 开始精确修复导入问题...\n');
    
    await this.fixSpecificFiles();
    await this.generateReport();
    
    console.log(`\n✅ 精确修复完成！`);
    console.log(`   修复问题: ${this.fixes.length} 个`);
  }

  /**
   * 修复特定文件
   */
  async fixSpecificFiles() {
    for (const [relativePath, imports] of Object.entries(this.importMappings)) {
      const fullPath = path.join(this.frontendPath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        await this.fixFile(fullPath, imports, relativePath);
      }
    }
    
    // 修复状态定义
    for (const [relativePath, states] of Object.entries(this.stateDefinitions)) {
      const fullPath = path.join(this.frontendPath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        await this.fixStates(fullPath, states, relativePath);
      }
    }
  }

  /**
   * 修复单个文件的导入
   */
  async fixFile(filePath, imports, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let hasChanges = false;
      
      for (const [name, importStatement] of Object.entries(imports)) {
        // 检查是否使用了这个名称但没有导入
        if (content.includes(name) && !this.hasImport(content, name)) {
          newContent = this.addImportStatement(newContent, importStatement);
          hasChanges = true;
          
          this.fixes.push({
            file: relativePath,
            type: 'import',
            fix: importStatement
          });
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复导入: ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ 修复失败: ${relativePath} - ${error.message}`);
    }
  }

  /**
   * 修复状态定义
   */
  async fixStates(filePath, states, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let hasChanges = false;
      
      for (const stateName of states) {
        // 检查是否使用了状态但没有定义
        if (content.includes(stateName) && !this.hasStateDefinition(content, stateName)) {
          const stateDefinition = this.generateStateDefinition(stateName);
          newContent = this.addStateDefinition(newContent, stateDefinition);
          hasChanges = true;
          
          this.fixes.push({
            file: relativePath,
            type: 'state',
            fix: stateDefinition
          });
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复状态: ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ 修复失败: ${relativePath} - ${error.message}`);
    }
  }

  /**
   * 检查是否已有导入
   */
  hasImport(content, name) {
    const importRegex = new RegExp(`import.*${name}.*from`, 'i');
    return importRegex.test(content);
  }

  /**
   * 检查是否已有状态定义
   */
  hasStateDefinition(content, stateName) {
    const stateRegex = new RegExp(`const\\s*\\[\\s*${stateName}\\s*,`, 'i');
    return stateRegex.test(content);
  }

  /**
   * 添加导入语句
   */
  addImportStatement(content, importStatement) {
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // 找到最后一个import语句的位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatement);
    return lines.join('\n');
  }

  /**
   * 生成状态定义
   */
  generateStateDefinition(stateName) {
    const stateDefinitions = {
      'isTestRunning': 'const [isTestRunning, setIsTestRunning] = useState(false);',
      'error': 'const [error, setError] = useState<string | null>(null);',
      'testProgress': 'const [testProgress, setTestProgress] = useState<any>(null);',
      'canStartTest': 'const [canStartTest, setCanStartTest] = useState(false);'
    };
    
    return stateDefinitions[stateName] || `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(null);`;
  }

  /**
   * 添加状态定义
   */
  addStateDefinition(content, stateDefinition) {
    // 在组件函数开始后添加状态定义
    const functionMatch = content.match(/(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/);
    if (functionMatch) {
      const insertPos = functionMatch.index + functionMatch[0].length;
      return content.slice(0, insertPos) + '\n  ' + stateDefinition + '\n' + content.slice(insertPos);
    }
    
    return content;
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('\n📊 精确修复报告:');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复:');
      this.fixes.forEach(fix => {
        console.log(`  📁 ${fix.file}`);
        console.log(`     ${fix.type}: ${fix.fix}`);
      });
    } else {
      console.log('\n✅ 没有发现需要修复的问题');
    }
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new PreciseImportFixer();
  fixer.fix().catch(console.error);
}

module.exports = PreciseImportFixer;
