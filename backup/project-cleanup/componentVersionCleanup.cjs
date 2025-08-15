/**
 * 组件版本清理脚本
 * 分析和清理项目中的重复版本组件
 */

const fs = require('fs');
const path = require('path');

class ComponentVersionCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.duplicateComponents = new Map();
    this.recommendations = [];
    this.conflictingImports = [];
  }

  /**
   * 分析重复组件
   */
  analyzeDuplicateComponents() {
    console.log('🔍 分析重复组件版本...\n');

    // 定义组件分组规则
    const componentGroups = {
      'RouteManager': [
        'backend/src/EnhancedRouteManager.js',
        'backend/src/UnifiedRouteManager.js'
      ],
      'TestEngineManager': [
        'backend/engines/core/EnhancedTestEngineManager.js',
        'backend/engines/UnifiedTestEngineManager.js'
      ],
      'ErrorHandler': [
        'backend/utils/UnifiedErrorHandler.js'
      ],
      'DataManager': [
        'frontend/components/data/EnhancedDataManager.tsx'
      ],
      'TestInterface': [
        'frontend/components/testing/UnifiedTestInterface.tsx',
        'frontend/components/testing/UnifiedTestPageTemplate.tsx',
        'frontend/components/testing/UnifiedTestPageWithHistory.tsx'
      ],
      'ErrorBoundary': [
        'frontend/components/system/EnhancedErrorBoundary.tsx'
      ],
      'ConfigManager': [
        'frontend/config/EnhancedConfigManager.ts'
      ],
      'SecurityEngine': [
        'backend/engines/security/AdvancedSecurityEngine.js'
      ],
      'Analytics': [
        'frontend/components/analytics/AdvancedAnalytics.tsx',
        'frontend/pages/analytics/AdvancedAnalyticsPage.tsx',
        'frontend/services/analytics/advancedAnalyticsService.ts'
      ]
    };

    // 分析每个组件组
    Object.entries(componentGroups).forEach(([groupName, files]) => {
      const existingFiles = files.filter(file => {
        const fullPath = path.join(this.projectRoot, file);
        return fs.existsSync(fullPath);
      });

      if (existingFiles.length > 1) {
        this.duplicateComponents.set(groupName, existingFiles);
      }
    });

    this.generateRecommendations();
    this.analyzeImportConflicts();
  }

  /**
   * 生成清理建议
   */
  generateRecommendations() {
    console.log('📋 生成清理建议...\n');

    // RouteManager 清理建议
    if (this.duplicateComponents.has('RouteManager')) {
      this.recommendations.push({
        component: 'RouteManager',
        action: 'consolidate',
        keepFile: 'backend/src/UnifiedRouteManager.js',
        removeFiles: ['backend/src/EnhancedRouteManager.js'],
        reason: 'UnifiedRouteManager是最新版本，功能更完整',
        impact: 'low',
        steps: [
          '1. 确认UnifiedRouteManager包含所有EnhancedRouteManager的功能',
          '2. 更新所有导入引用',
          '3. 删除EnhancedRouteManager.js',
          '4. 测试路由功能'
        ]
      });
    }

    // TestEngineManager 清理建议
    if (this.duplicateComponents.has('TestEngineManager')) {
      this.recommendations.push({
        component: 'TestEngineManager',
        action: 'consolidate',
        keepFile: 'backend/engines/UnifiedTestEngineManager.js',
        removeFiles: ['backend/engines/core/EnhancedTestEngineManager.js'],
        reason: 'UnifiedTestEngineManager提供了统一的引擎管理接口',
        impact: 'medium',
        steps: [
          '1. 迁移EnhancedTestEngineManager的特有功能到UnifiedTestEngineManager',
          '2. 更新所有引擎相关的导入',
          '3. 删除旧版本文件',
          '4. 运行测试引擎测试'
        ]
      });
    }

    // TestInterface 清理建议
    if (this.duplicateComponents.has('TestInterface')) {
      this.recommendations.push({
        component: 'TestInterface',
        action: 'organize',
        keepFile: 'frontend/components/testing/UnifiedTestInterface.tsx',
        organizeFiles: [
          'frontend/components/testing/UnifiedTestPageTemplate.tsx',
          'frontend/components/testing/UnifiedTestPageWithHistory.tsx'
        ],
        reason: '保持核心接口，其他作为专用模板',
        impact: 'low',
        steps: [
          '1. 确认UnifiedTestInterface为主要接口',
          '2. 将Template和WithHistory作为特定用途的组件',
          '3. 优化组件间的依赖关系',
          '4. 更新文档说明各组件用途'
        ]
      });
    }
  }

  /**
   * 分析导入冲突
   */
  analyzeImportConflicts() {
    console.log('🔍 分析导入冲突...\n');

    const importPatterns = [
      {
        pattern: /import.*from.*['"].*Enhanced.*['"]|import.*Enhanced.*/g,
        type: 'Enhanced imports'
      },
      {
        pattern: /import.*from.*['"].*Unified.*['"]|import.*Unified.*/g,
        type: 'Unified imports'
      },
      {
        pattern: /import.*from.*['"].*Advanced.*['"]|import.*Advanced.*/g,
        type: 'Advanced imports'
      }
    ];

    // 扫描所有TypeScript和JavaScript文件
    this.scanFilesForImports(this.projectRoot, importPatterns);
  }

  /**
   * 扫描文件中的导入语句
   */
  scanFilesForImports(dir, patterns) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
        this.scanFilesForImports(filePath, patterns);
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          patterns.forEach(({ pattern, type }) => {
            const matches = content.match(pattern);
            if (matches) {
              this.conflictingImports.push({
                file: path.relative(this.projectRoot, filePath),
                type,
                matches: matches.slice(0, 3) // 只显示前3个匹配
              });
            }
          });
        } catch (error) {
          // 忽略读取错误
        }
      }
    });
  }

  /**
   * 生成清理报告
   */
  generateCleanupReport() {
    console.log('📊 组件版本清理分析报告\n');
    console.log('=' .repeat(50));

    // 重复组件统计
    console.log(`\n🔍 发现的重复组件组: ${this.duplicateComponents.size}`);
    
    if (this.duplicateComponents.size > 0) {
      this.duplicateComponents.forEach((files, groupName) => {
        console.log(`\n📦 ${groupName}:`);
        files.forEach(file => {
          console.log(`   - ${file}`);
        });
      });
    }

    // 清理建议
    console.log(`\n💡 清理建议: ${this.recommendations.length} 项`);
    
    this.recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.component} (影响: ${rec.impact})`);
      console.log(`   操作: ${rec.action}`);
      console.log(`   保留: ${rec.keepFile}`);
      if (rec.removeFiles) {
        console.log(`   删除: ${rec.removeFiles.join(', ')}`);
      }
      if (rec.organizeFiles) {
        console.log(`   整理: ${rec.organizeFiles.join(', ')}`);
      }
      console.log(`   原因: ${rec.reason}`);
    });

    // 导入冲突统计
    console.log(`\n🔗 导入引用统计:`);
    const importStats = {};
    this.conflictingImports.forEach(conflict => {
      importStats[conflict.type] = (importStats[conflict.type] || 0) + 1;
    });

    Object.entries(importStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 个文件`);
    });

    // 清理优先级
    console.log(`\n🎯 建议清理优先级:`);
    const priorityOrder = this.recommendations
      .sort((a, b) => {
        const impactOrder = { low: 1, medium: 2, high: 3 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      });

    priorityOrder.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.component} (${rec.impact} impact)`);
    });

    console.log('\n' + '='.repeat(50));
  }

  /**
   * 执行自动清理（安全模式）
   */
  executeAutoCleanup() {
    console.log('🧹 执行自动清理（安全模式）...\n');

    // 只执行低风险的清理操作
    const lowRiskRecommendations = this.recommendations.filter(rec => rec.impact === 'low');

    if (lowRiskRecommendations.length === 0) {
      console.log('✅ 没有可以安全自动清理的项目');
      return;
    }

    lowRiskRecommendations.forEach(rec => {
      console.log(`🔧 处理 ${rec.component}...`);
      
      if (rec.action === 'consolidate' && rec.removeFiles) {
        rec.removeFiles.forEach(file => {
          const fullPath = path.join(this.projectRoot, file);
          if (fs.existsSync(fullPath)) {
            // 创建备份
            const backupPath = fullPath + '.backup';
            fs.copyFileSync(fullPath, backupPath);
            console.log(`   📋 已备份: ${file}.backup`);
            
            // 注释：实际删除操作需要手动确认
            console.log(`   ⚠️  建议手动删除: ${file}`);
          }
        });
      }
    });

    console.log('\n✅ 自动清理完成（已创建备份文件）');
  }

  /**
   * 生成迁移脚本
   */
  generateMigrationScript() {
    const scriptContent = `#!/bin/bash
# 组件版本清理迁移脚本
# 自动生成于 ${new Date().toISOString()}

echo "🚀 开始组件版本清理迁移..."

${this.recommendations.map(rec => {
  if (rec.action === 'consolidate' && rec.removeFiles) {
    return rec.removeFiles.map(file => `
# 清理 ${rec.component}
echo "🔧 处理 ${rec.component}..."
if [ -f "${file}" ]; then
  echo "   📋 备份 ${file}"
  cp "${file}" "${file}.backup"
  echo "   ⚠️  请手动确认后删除: ${file}"
fi`).join('\n');
  }
  return '';
}).join('\n')}

echo "✅ 迁移脚本执行完成"
echo "📝 请检查备份文件并手动确认删除操作"
`;

    fs.writeFileSync(path.join(this.projectRoot, 'cleanup-migration.sh'), scriptContent);
    console.log('📝 已生成迁移脚本: cleanup-migration.sh');
  }
}

// 执行清理分析
if (require.main === module) {
  const cleanup = new ComponentVersionCleanup();
  cleanup.analyzeDuplicateComponents();
  cleanup.generateCleanupReport();
  cleanup.generateMigrationScript();
  
  // 询问是否执行自动清理
  console.log('\n❓ 是否执行安全的自动清理？(y/N)');
  process.stdin.once('data', (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      cleanup.executeAutoCleanup();
    } else {
      console.log('⏭️  跳过自动清理，请手动执行清理操作');
    }
    process.exit(0);
  });
}

module.exports = ComponentVersionCleanup;
