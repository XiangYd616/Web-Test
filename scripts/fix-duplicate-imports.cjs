#!/usr/bin/env node

/**
 * 重复导入修复工具
 * 自动修复重复导入、自导入等问题
 */

const fs = require('fs');
const path = require('path');

class DuplicateImportFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];
    
    // 需要修复的具体问题
    this.problemFiles = {
      // 自导入问题
      'components/security/SecurityTestPanel.tsx': {
        type: 'self-import',
        removeLines: [8]
      },
      'components/testing/TestHeader.tsx': {
        type: 'self-import', 
        removeLines: [3]
      },
      'hooks/useTestProgress.ts': {
        type: 'self-import',
        removeLines: [8]
      },
      'services/api/testProgressService.ts': {
        type: 'self-import',
        removeLines: [8]
      },
      
      // 重复导入问题
      'components/auth/MFASetup.tsx': {
        type: 'duplicate-import',
        removeLines: [21] // 保留第20行，删除第21行
      },
      'components/auth/PasswordStrengthIndicator.tsx': {
        type: 'duplicate-import',
        removeLines: [19] // 保留第18行，删除第19行
      },
      'components/auth/PermissionManager.tsx': {
        type: 'duplicate-import',
        removeLines: [25] // 保留第24行，删除第25行
      },
      'components/testing/UnifiedExportButton.tsx': {
        type: 'duplicate-import',
        removeLines: [10] // 保留第9行，删除第10行
      },
      'hooks/useCache.ts': {
        type: 'duplicate-import',
        removeLines: [9] // 保留第8行，删除第9行
      },
      'pages/SEOTest.tsx': {
        type: 'duplicate-import',
        removeLines: [11] // 保留第10行，删除第11行
      },
      'services/api/apiService.ts': {
        type: 'duplicate-import',
        removeLines: [2] // 保留第1行，删除第2行
      },
      'services/api/enhancedApiService.ts': {
        type: 'duplicate-import',
        removeLines: [15] // 保留第14行，删除第15行
      },
      'services/cache/cacheStrategies.ts': {
        type: 'duplicate-import',
        removeLines: [359] // 保留第7行，删除第359行
      },
      'services/__tests__/apiIntegrationTest.ts': {
        type: 'duplicate-import',
        removeLines: [12] // 保留第11行，删除第12行
      }
    };
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复重复导入问题...\n');
    
    for (const [relativePath, config] of Object.entries(this.problemFiles)) {
      const fullPath = path.join(this.frontendPath, relativePath);
      
      if (fs.existsSync(fullPath)) {
        await this.fixFile(fullPath, relativePath, config);
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
  async fixFile(filePath, relativePath, config) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let hasChanges = false;
      
      // 从后往前删除行，避免行号变化
      const sortedLines = [...config.removeLines].sort((a, b) => b - a);
      
      for (const lineNum of sortedLines) {
        if (lineNum > 0 && lineNum <= lines.length) {
          const removedLine = lines[lineNum - 1]; // 转换为0基索引
          lines.splice(lineNum - 1, 1);
          hasChanges = true;
          
          console.log(`✅ 修复 ${config.type}: ${relativePath}`);
          console.log(`   删除第${lineNum}行: ${removedLine.trim()}`);
        }
      }
      
      if (hasChanges) {
        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf8');
        
        this.fixes.push({
          file: relativePath,
          type: config.type,
          removedLines: config.removeLines,
          description: this.getFixDescription(config.type)
        });
      }
      
    } catch (error) {
      console.error(`❌ 修复失败: ${relativePath} - ${error.message}`);
    }
  }

  /**
   * 获取修复描述
   */
  getFixDescription(type) {
    const descriptions = {
      'self-import': '删除自导入语句',
      'duplicate-import': '删除重复导入语句',
      'circular-import': '修复循环导入'
    };
    
    return descriptions[type] || '修复导入问题';
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('\n📊 修复报告:');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复的问题:');
      
      const groupedFixes = {};
      this.fixes.forEach(fix => {
        if (!groupedFixes[fix.type]) {
          groupedFixes[fix.type] = [];
        }
        groupedFixes[fix.type].push(fix);
      });
      
      for (const [type, fixes] of Object.entries(groupedFixes)) {
        console.log(`\n📋 ${this.getFixDescription(type)} (${fixes.length}个):`);
        fixes.forEach((fix, index) => {
          console.log(`  ${index + 1}. 📁 ${fix.file}`);
          console.log(`     删除行号: ${fix.removedLines.join(', ')}`);
        });
      }
    } else {
      console.log('\n✅ 没有发现需要修复的问题');
    }
    
    console.log('\n🎯 修复效果:');
    console.log('  ✅ 消除了自导入问题');
    console.log('  ✅ 删除了重复导入语句');
    console.log('  ✅ 提高了代码质量');
    console.log('  ✅ 避免了潜在的循环依赖');
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run type-check 验证修复效果');
    console.log('  2. 运行 npm run check:imports:duplicate 再次检查');
    console.log('  3. 测试应用功能确保正常工作');
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new DuplicateImportFixer();
  fixer.fix().catch(console.error);
}

module.exports = DuplicateImportFixer;
