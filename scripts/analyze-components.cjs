#!/usr/bin/env node

/**
 * 组件分析工具
 * 扫描项目中的所有组件，分析其复杂度并生成拆分建议
 * 
 * 使用方法:
 * node scripts/analyze-components.cjs [--min-lines=300] [--output=report.json]
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  searchDir: path.join(__dirname, '../frontend/components'),
  minLines: parseInt(process.argv.find(arg => arg.startsWith('--min-lines='))?.split('=')[1]) || 300,
  outputFile: process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1],
  excludeDirs: ['node_modules', 'dist', '.git'],
};

// 分析结果
const results = {
  totalComponents: 0,
  largeComponents: [],
  statistics: {
    totalLines: 0,
    averageLines: 0,
    maxLines: 0,
    minLines: Infinity,
  },
  recommendations: [],
};

/**
 * 检查文件是否应该处理
 */
function shouldProcessFile(filePath) {
  return filePath.match(/\.(tsx|jsx)$/) && !filePath.includes('.test.') && !filePath.includes('.stories.');
}

/**
 * 扫描目录
 */
function scanDirectory(dir, depth = 0) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!config.excludeDirs.includes(item)) {
          files.push(...scanDirectory(fullPath, depth + 1));
        }
      } else if (shouldProcessFile(fullPath)) {
        files.push({ path: fullPath, depth });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * 分析组件文件
 */
function analyzeComponent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // 基本统计
    const analysis = {
      path: path.relative(config.searchDir, filePath),
      fullPath: filePath,
      lines: lineCount,
      complexity: 0,
      issues: [],
      suggestions: [],
    };

    // 计算复杂度指标
    let stateCount = 0;
    let effectCount = 0;
    let functionCount = 0;
    let jsxElements = 0;
    let imports = 0;
    let exportCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 统计 useState
      if (trimmed.includes('useState')) {
        stateCount++;
      }
      
      // 统计 useEffect
      if (trimmed.includes('useEffect') || trimmed.includes('useCallback') || trimmed.includes('useMemo')) {
        effectCount++;
      }
      
      // 统计函数定义
      if (trimmed.match(/^(const|function|export\s+(const|function))\s+\w+\s*=/)) {
        functionCount++;
      }
      
      // 统计 JSX 元素
      if (trimmed.match(/<[A-Z]\w+/)) {
        jsxElements++;
      }
      
      // 统计导入
      if (trimmed.startsWith('import ')) {
        imports++;
      }
      
      // 统计导出
      if (trimmed.startsWith('export ')) {
        exportCount++;
      }
    }

    // 计算复杂度分数
    analysis.complexity = 
      lineCount * 0.5 +
      stateCount * 10 +
      effectCount * 8 +
      functionCount * 5 +
      jsxElements * 2 +
      imports * 1;

    analysis.metrics = {
      states: stateCount,
      effects: effectCount,
      functions: functionCount,
      jsxElements,
      imports,
      exports: exportCount,
    };

    // 生成问题和建议
    if (lineCount > 500) {
      analysis.issues.push('组件过大（超过 500 行）');
      analysis.suggestions.push('考虑将组件拆分为多个子组件');
    }

    if (stateCount > 10) {
      analysis.issues.push(`状态过多（${stateCount} 个 useState）`);
      analysis.suggestions.push('考虑使用 useReducer 或状态管理库');
    }

    if (effectCount > 8) {
      analysis.issues.push(`副作用过多（${effectCount} 个 hooks）`);
      analysis.suggestions.push('将副作用逻辑提取到自定义 hooks');
    }

    if (functionCount > 15) {
      analysis.issues.push(`函数定义过多（${functionCount} 个）`);
      analysis.suggestions.push('将辅助函数提取到 utils 文件');
    }

    if (imports > 30) {
      analysis.issues.push(`导入过多（${imports} 个）`);
      analysis.suggestions.push('检查是否有未使用的导入，考虑模块化');
    }

    // 生成拆分建议
    if (analysis.issues.length > 0) {
      analysis.refactorPriority = analysis.complexity > 1000 ? 'high' : 
                                   analysis.complexity > 500 ? 'medium' : 'low';
      
      analysis.suggestedStructure = generateRefactorStructure(filePath, analysis);
    }

    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 生成重构结构建议
 */
function generateRefactorStructure(filePath, analysis) {
  const componentName = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  
  const structure = {
    directory: `${componentName}/`,
    files: [
      `${componentName}/index.tsx (主组件，< 200 行)`,
      `${componentName}/types.ts (类型定义)`,
    ],
  };

  // 根据复杂度添加建议文件
  if (analysis.metrics.states > 5) {
    structure.files.push(`${componentName}/hooks/ (自定义 hooks)`);
  }

  if (analysis.metrics.functions > 10) {
    structure.files.push(`${componentName}/utils.ts (辅助函数)`);
  }

  if (analysis.metrics.jsxElements > 50) {
    structure.files.push(`${componentName}/components/ (子组件)`);
  }

  return structure;
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 组件分析报告');
  console.log('='.repeat(80));

  // 总体统计
  console.log('\n📈 总体统计:');
  console.log(`  总组件数: ${results.totalComponents}`);
  console.log(`  需要重构的组件: ${results.largeComponents.length}`);
  console.log(`  平均行数: ${Math.round(results.statistics.averageLines)}`);
  console.log(`  最大行数: ${results.statistics.maxLines}`);
  console.log(`  最小行数: ${results.statistics.minLines}`);

  // 大型组件列表
  if (results.largeComponents.length > 0) {
    console.log('\n🔴 需要重构的组件 (按复杂度排序):');
    console.log('');

    results.largeComponents
      .sort((a, b) => b.complexity - a.complexity)
      .forEach((comp, index) => {
        const priority = comp.refactorPriority === 'high' ? '🔴' :
                        comp.refactorPriority === 'medium' ? '🟡' : '🟢';
        
        console.log(`${index + 1}. ${priority} ${comp.path}`);
        console.log(`   行数: ${comp.lines} | 复杂度: ${Math.round(comp.complexity)}`);
        console.log(`   指标: ${comp.metrics.states} states, ${comp.metrics.effects} effects, ${comp.metrics.functions} functions`);
        
        if (comp.issues.length > 0) {
          console.log(`   问题: ${comp.issues.join(', ')}`);
        }
        
        if (comp.suggestions.length > 0) {
          console.log(`   建议: ${comp.suggestions.join('; ')}`);
        }
        
        if (comp.suggestedStructure) {
          console.log(`   建议结构:`);
          console.log(`   ${comp.suggestedStructure.directory}`);
          comp.suggestedStructure.files.forEach(file => {
            console.log(`   ├── ${file}`);
          });
        }
        
        console.log('');
      });
  }

  // 重构建议摘要
  console.log('\n💡 重构建议摘要:');
  const highPriority = results.largeComponents.filter(c => c.refactorPriority === 'high');
  const mediumPriority = results.largeComponents.filter(c => c.refactorPriority === 'medium');
  const lowPriority = results.largeComponents.filter(c => c.refactorPriority === 'low');

  if (highPriority.length > 0) {
    console.log(`\n  🔴 高优先级 (${highPriority.length} 个):`);
    highPriority.forEach(c => console.log(`     - ${c.path} (${c.lines} 行)`));
  }

  if (mediumPriority.length > 0) {
    console.log(`\n  🟡 中优先级 (${mediumPriority.length} 个):`);
    mediumPriority.forEach(c => console.log(`     - ${c.path} (${c.lines} 行)`));
  }

  if (lowPriority.length > 0) {
    console.log(`\n  🟢 低优先级 (${lowPriority.length} 个):`);
    lowPriority.forEach(c => console.log(`     - ${c.path} (${c.lines} 行)`));
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 正在分析组件...\n');
  console.log(`搜索目录: ${config.searchDir}`);
  console.log(`最小行数阈值: ${config.minLines}\n`);

  // 扫描文件
  const files = scanDirectory(config.searchDir);
  console.log(`找到 ${files.length} 个组件文件\n`);

  // 分析每个组件
  for (const { path: filePath } of files) {
    const analysis = analyzeComponent(filePath);
    
    if (analysis) {
      results.totalComponents++;
      results.statistics.totalLines += analysis.lines;
      results.statistics.maxLines = Math.max(results.statistics.maxLines, analysis.lines);
      results.statistics.minLines = Math.min(results.statistics.minLines, analysis.lines);

      if (analysis.lines >= config.minLines || analysis.issues.length > 0) {
        results.largeComponents.push(analysis);
      }
    }
  }

  // 计算平均值
  results.statistics.averageLines = results.statistics.totalLines / results.totalComponents;

  // 生成报告
  generateReport();

  // 保存到文件
  if (config.outputFile) {
    const output = {
      timestamp: new Date().toISOString(),
      config,
      ...results,
    };
    fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));
    console.log(`📄 详细报告已保存到: ${config.outputFile}\n`);
  }
}

// 运行分析
main();

