#!/usr/bin/env node

/**
 * CSS清理分析脚本
 * 分析项目中的CSS文件使用情况，识别冗余和可清理的样式
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 递归查找文件
 */
function findFiles(dir, extensions) {
  const files = [];

  function walkDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过node_modules等目录
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            walkDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }
  }

  walkDir(dir);
  return files;
}

// 分析结果
const analysisResults = {
  cssFiles: [],
  unusedCssFiles: [],
  redundantStyles: [],
  conflictingStyles: [],
  migrationCandidates: [],
  cleanupRecommendations: [],
  statistics: {
    totalCssFiles: 0,
    totalCssLines: 0,
    unusedFiles: 0,
    redundantLines: 0,
    migrationReady: 0
  }
};

/**
 * 分析CSS文件使用情况
 */
function analyzeCSSUsage() {
  console.log('🔍 开始分析CSS文件使用情况...\n');

  const srcDir = path.join(PROJECT_ROOT, 'src');
  const cssFiles = findFiles(srcDir, ['.css']);
  const tsxFiles = findFiles(srcDir, ['.tsx', '.ts']);

  // 读取所有TSX文件内容
  const tsxContent = tsxFiles.map(file => ({
    path: file,
    content: fs.readFileSync(file, 'utf8')
  }));

  cssFiles.forEach(cssFile => {
    const relativePath = path.relative(PROJECT_ROOT, cssFile);
    const content = fs.readFileSync(cssFile, 'utf8');
    const lines = content.split('\n').length;

    // 检查CSS文件是否被使用
    const isUsed = checkCSSFileUsage(cssFile, tsxContent);

    const fileAnalysis = {
      path: relativePath,
      fullPath: cssFile,
      lines: lines,
      size: fs.statSync(cssFile).size,
      isUsed: isUsed,
      importedBy: findImportingFiles(cssFile, tsxContent),
      classes: extractCSSClasses(content),
      migrationStatus: assessMigrationStatus(relativePath, content)
    };

    analysisResults.cssFiles.push(fileAnalysis);

    if (!isUsed) {
      analysisResults.unusedCssFiles.push(fileAnalysis);
    }

    // 更新统计
    analysisResults.statistics.totalCssFiles++;
    analysisResults.statistics.totalCssLines += lines;

    if (!isUsed) {
      analysisResults.statistics.unusedFiles++;
    }
  });

  return analysisResults;
}

/**
 * 检查CSS文件是否被使用
 */
function checkCSSFileUsage(cssFile, tsxContent) {
  const fileName = path.basename(cssFile);
  const relativePath = path.relative(PROJECT_ROOT, cssFile);

  // 检查是否在index.css中被导入
  const indexCssPath = path.join(PROJECT_ROOT, 'src/index.css');
  if (fs.existsSync(indexCssPath)) {
    const indexContent = fs.readFileSync(indexCssPath, 'utf8');
    if (indexContent.includes(relativePath) || indexContent.includes(fileName)) {
      return true;
    }
  }

  // 检查是否在TSX文件中被导入
  return tsxContent.some(file =>
    file.content.includes(fileName) ||
    file.content.includes(relativePath.replace(/\\/g, '/'))
  );
}

/**
 * 找到导入CSS文件的文件
 */
function findImportingFiles(cssFile, tsxContent) {
  const fileName = path.basename(cssFile);
  const relativePath = path.relative(PROJECT_ROOT, cssFile);

  const importingFiles = [];

  // 检查index.css
  const indexCssPath = path.join(PROJECT_ROOT, 'src/index.css');
  if (fs.existsSync(indexCssPath)) {
    const indexContent = fs.readFileSync(indexCssPath, 'utf8');
    if (indexContent.includes(relativePath) || indexContent.includes(fileName)) {
      importingFiles.push('src/index.css');
    }
  }

  // 检查TSX文件
  tsxContent.forEach(file => {
    if (file.content.includes(fileName) ||
      file.content.includes(relativePath.replace(/\\/g, '/'))) {
      importingFiles.push(path.relative(PROJECT_ROOT, file.path));
    }
  });

  return importingFiles;
}

/**
 * 提取CSS类名
 */
function extractCSSClasses(content) {
  const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const classes = [];
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    if (!classes.includes(match[1])) {
      classes.push(match[1]);
    }
  }

  return classes;
}

/**
 * 评估迁移状态
 */
function assessMigrationStatus(filePath, content) {
  const status = {
    canMigrate: false,
    reason: '',
    priority: 'low',
    components: []
  };

  // 检查是否包含组件相关的样式
  const componentPatterns = [
    'button', 'btn', 'card', 'modal', 'input', 'form',
    'badge', 'tag', 'checkbox', 'radio', 'select'
  ];

  const foundComponents = componentPatterns.filter(pattern =>
    content.toLowerCase().includes(pattern)
  );

  if (foundComponents.length > 0) {
    status.canMigrate = true;
    status.reason = `包含可迁移的组件样式: ${foundComponents.join(', ')}`;
    status.priority = foundComponents.length > 3 ? 'high' : 'medium';
    status.components = foundComponents;
  }

  // 检查是否包含冲突的样式
  if (content.includes('!important')) {
    status.priority = 'high';
    status.reason += ' (包含!important，可能有冲突)';
  }

  // 检查是否是测试页面相关
  if (filePath.includes('test') || filePath.includes('stress') ||
    filePath.includes('seo') || filePath.includes('security')) {
    if (!status.canMigrate) {
      status.canMigrate = true;
      status.reason = '测试页面相关，已有迁移版本';
    }
    status.priority = 'high';
  }

  return status;
}

/**
 * 生成清理建议
 */
function generateCleanupRecommendations() {
  console.log('💡 生成清理建议...\n');

  const recommendations = [];

  // 1. 未使用的CSS文件
  if (analysisResults.unusedCssFiles.length > 0) {
    recommendations.push({
      type: 'unused_files',
      priority: 'high',
      title: '删除未使用的CSS文件',
      description: `发现 ${analysisResults.unusedCssFiles.length} 个未使用的CSS文件`,
      files: analysisResults.unusedCssFiles.map(f => f.path),
      action: 'delete',
      impact: 'high'
    });
  }

  // 2. 可迁移的组件样式
  const migrationCandidates = analysisResults.cssFiles.filter(f =>
    f.migrationStatus.canMigrate && f.isUsed
  );

  if (migrationCandidates.length > 0) {
    recommendations.push({
      type: 'migration_candidates',
      priority: 'medium',
      title: '迁移到组件库',
      description: `发现 ${migrationCandidates.length} 个可迁移到组件库的CSS文件`,
      files: migrationCandidates.map(f => ({
        path: f.path,
        components: f.migrationStatus.components,
        priority: f.migrationStatus.priority
      })),
      action: 'migrate',
      impact: 'medium'
    });
  }

  // 3. 大文件优化
  const largeFiles = analysisResults.cssFiles.filter(f =>
    f.size > 10000 && f.isUsed // 大于10KB
  );

  if (largeFiles.length > 0) {
    recommendations.push({
      type: 'large_files',
      priority: 'low',
      title: '优化大型CSS文件',
      description: `发现 ${largeFiles.length} 个较大的CSS文件需要优化`,
      files: largeFiles.map(f => ({
        path: f.path,
        size: `${(f.size / 1024).toFixed(1)}KB`,
        lines: f.lines
      })),
      action: 'optimize',
      impact: 'low'
    });
  }

  // 4. 测试页面相关文件
  const testFiles = analysisResults.cssFiles.filter(f =>
    (f.path.includes('test') || f.path.includes('stress') ||
      f.path.includes('seo') || f.path.includes('security')) && f.isUsed
  );

  if (testFiles.length > 0) {
    recommendations.push({
      type: 'test_pages',
      priority: 'high',
      title: '测试页面CSS清理',
      description: `发现 ${testFiles.length} 个测试页面相关的CSS文件，已有迁移版本`,
      files: testFiles.map(f => f.path),
      action: 'replace_with_migrated',
      impact: 'high'
    });
  }

  analysisResults.cleanupRecommendations = recommendations;
  return recommendations;
}

/**
 * 显示分析结果
 */
function displayResults() {
  console.log('📊 CSS清理分析结果\n');
  console.log('='.repeat(50));

  // 统计信息
  console.log('\n📈 统计信息:');
  console.log(`总CSS文件数: ${analysisResults.statistics.totalCssFiles}`);
  console.log(`总CSS行数: ${analysisResults.statistics.totalCssLines}`);
  console.log(`未使用文件: ${analysisResults.statistics.unusedFiles}`);
  console.log(`可迁移文件: ${analysisResults.cssFiles.filter(f => f.migrationStatus.canMigrate).length}`);

  // 未使用的文件
  if (analysisResults.unusedCssFiles.length > 0) {
    console.log('\n🗑️ 未使用的CSS文件:');
    analysisResults.unusedCssFiles.forEach(file => {
      console.log(`  ❌ ${file.path} (${file.lines} 行, ${(file.size / 1024).toFixed(1)}KB)`);
    });
  }

  // 迁移候选
  const migrationCandidates = analysisResults.cssFiles.filter(f =>
    f.migrationStatus.canMigrate && f.isUsed
  );

  if (migrationCandidates.length > 0) {
    console.log('\n🔄 可迁移到组件库的文件:');
    migrationCandidates.forEach(file => {
      console.log(`  🔧 ${file.path}`);
      console.log(`     组件: ${file.migrationStatus.components.join(', ')}`);
      console.log(`     优先级: ${file.migrationStatus.priority}`);
      console.log(`     原因: ${file.migrationStatus.reason}`);
    });
  }

  // 清理建议
  if (analysisResults.cleanupRecommendations.length > 0) {
    console.log('\n💡 清理建议:');
    analysisResults.cleanupRecommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title} (${rec.priority}优先级)`);
      console.log(`   ${rec.description}`);
      console.log(`   影响: ${rec.impact}`);
      console.log(`   操作: ${rec.action}`);

      if (Array.isArray(rec.files)) {
        const displayFiles = rec.files.slice(0, 5);
        displayFiles.forEach(file => {
          if (typeof file === 'string') {
            console.log(`   📄 ${file}`);
          } else {
            console.log(`   📄 ${file.path} ${file.size ? `(${file.size})` : ''}`);
          }
        });
        if (rec.files.length > 5) {
          console.log(`   ... 还有 ${rec.files.length - 5} 个文件`);
        }
      }
    });
  }
}

/**
 * 生成详细报告
 */
function generateDetailedReport() {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      totalFiles: analysisResults.statistics.totalCssFiles,
      totalLines: analysisResults.statistics.totalCssLines,
      unusedFiles: analysisResults.statistics.unusedFiles,
      migrationCandidates: analysisResults.cssFiles.filter(f => f.migrationStatus.canMigrate).length,
      cleanupRecommendations: analysisResults.cleanupRecommendations.length
    },
    files: analysisResults.cssFiles,
    unusedFiles: analysisResults.unusedCssFiles,
    recommendations: analysisResults.cleanupRecommendations
  };

  const reportPath = path.join(PROJECT_ROOT, 'css-cleanup-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📋 详细报告已保存到: ${path.relative(PROJECT_ROOT, reportPath)}`);

  return report;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🧹 CSS清理分析工具\n');

    // 分析CSS使用情况
    analyzeCSSUsage();

    // 生成清理建议
    generateCleanupRecommendations();

    // 显示结果
    displayResults();

    // 生成详细报告
    generateDetailedReport();

    console.log('\n✅ CSS清理分析完成！');

    // 设置退出码
    const hasUnusedFiles = analysisResults.unusedCssFiles.length > 0;
    const hasMigrationCandidates = analysisResults.cssFiles.filter(f => f.migrationStatus.canMigrate).length > 0;

    if (hasUnusedFiles || hasMigrationCandidates) {
      console.log('\n💡 建议执行清理操作以优化项目结构');
      process.exit(1);
    } else {
      console.log('\n🎉 项目CSS结构良好，无需清理');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  analyzeCSSUsage,
  generateCleanupRecommendations,
  analysisResults
};
