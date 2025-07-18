#!/usr/bin/env node

/**
 * 废弃文件清理脚本
 * 用于识别和清理项目中的废弃文件、重复文件和未使用的文件
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 需要移动到docs/reports的报告文件
const REPORT_FILES_TO_MOVE = [
  'CLEANUP_REPORT_2025.md',
  'FILE_CLEANUP_AND_STANDARDIZATION_REPORT.md',
  'DEPRECATED_ROUTES_CLEANUP_REPORT.md',
  'BRANCH_MERGE_REPORT_2025-01-18.md',
  'CODE_CLEANUP_REPORT_2025-01-18.md',
  'BUTTON_DESIGN_IMPROVEMENTS.md',
  'PERFORMANCE_TESTING_REFACTOR.md',
  'SECURITY_TEST_BACKGROUND_FIX.md',
  'SECURITY_TEST_CLARITY_IMPROVEMENTS.md',
  'SECURITY_TEST_ENHANCEMENTS.md',
  'SECURITY_TEST_IMPLEMENTATION.md'
];

// 可以安全删除的废弃文件
const DEPRECATED_FILES_TO_DELETE = [
  // 构建产物（可重新生成）
  'dist',
  
  // 临时文件
  'temp',
  'tmp',
  
  // 日志文件
  'logs',
  '*.log',
  
  // 缓存文件
  'node_modules/.cache',
  '.npm',
  '.eslintcache',
  
  // 数据库文件（开发环境）
  '*.db',
  '*.sqlite',
  '*.sqlite3'
];

// 需要检查的重复组件
const DUPLICATE_COMPONENTS = [
  {
    keep: 'src/components/ui/EnhancedLoadingSpinner.tsx',
    remove: 'src/components/ui/LoadingSpinner.tsx',
    reason: 'EnhancedLoadingSpinner功能更完整，包含基础LoadingSpinner的所有功能'
  }
];

// 清理结果统计
const cleanupResults = {
  movedFiles: [],
  deletedFiles: [],
  mergedComponents: [],
  errors: []
};

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

/**
 * 移动文件
 */
function moveFile(sourceFile, targetFile) {
  try {
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf8');
      ensureDirectoryExists(path.dirname(targetFile));
      fs.writeFileSync(targetFile, content, 'utf8');
      fs.unlinkSync(sourceFile);
      console.log(`✅ 移动文件: ${path.basename(sourceFile)} -> ${path.relative(PROJECT_ROOT, targetFile)}`);
      return true;
    } else {
      console.log(`⚠️  文件不存在: ${sourceFile}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 移动文件失败: ${sourceFile} - ${error.message}`);
    cleanupResults.errors.push(`移动文件失败: ${sourceFile} - ${error.message}`);
    return false;
  }
}

/**
 * 删除文件或目录
 */
function deleteFileOrDirectory(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️  删除目录: ${path.relative(PROJECT_ROOT, filePath)}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`🗑️  删除文件: ${path.relative(PROJECT_ROOT, filePath)}`);
      }
      return true;
    } else {
      console.log(`⚠️  文件/目录不存在: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 删除失败: ${filePath} - ${error.message}`);
    cleanupResults.errors.push(`删除失败: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * 移动报告文件到docs/reports目录
 */
function moveReportFiles() {
  console.log('📋 移动报告文件到docs/reports目录...\n');
  
  const reportsDir = path.join(PROJECT_ROOT, 'docs', 'reports');
  ensureDirectoryExists(reportsDir);
  
  let movedCount = 0;
  
  REPORT_FILES_TO_MOVE.forEach(fileName => {
    const sourceFile = path.join(PROJECT_ROOT, fileName);
    const targetFile = path.join(reportsDir, fileName);
    
    if (moveFile(sourceFile, targetFile)) {
      cleanupResults.movedFiles.push(fileName);
      movedCount++;
    }
  });
  
  console.log(`\n📊 移动报告文件统计: ${movedCount} 个文件已移动\n`);
}

/**
 * 删除废弃文件
 */
function deleteDeprecatedFiles() {
  console.log('🗑️  删除废弃文件...\n');
  
  let deletedCount = 0;
  
  DEPRECATED_FILES_TO_DELETE.forEach(pattern => {
    const filePath = path.join(PROJECT_ROOT, pattern);
    
    // 处理通配符
    if (pattern.includes('*')) {
      // 简单的通配符处理
      const dir = path.dirname(filePath);
      const fileName = path.basename(pattern);
      
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (fileName.replace('*', '').split('.').every(part => file.includes(part))) {
            const fullPath = path.join(dir, file);
            if (deleteFileOrDirectory(fullPath)) {
              cleanupResults.deletedFiles.push(path.relative(PROJECT_ROOT, fullPath));
              deletedCount++;
            }
          }
        });
      }
    } else {
      if (deleteFileOrDirectory(filePath)) {
        cleanupResults.deletedFiles.push(pattern);
        deletedCount++;
      }
    }
  });
  
  console.log(`\n📊 删除废弃文件统计: ${deletedCount} 个文件/目录已删除\n`);
}

/**
 * 处理重复组件
 */
function handleDuplicateComponents() {
  console.log('🔄 处理重复组件...\n');
  
  let mergedCount = 0;
  
  DUPLICATE_COMPONENTS.forEach(({ keep, remove, reason }) => {
    const keepPath = path.join(PROJECT_ROOT, keep);
    const removePath = path.join(PROJECT_ROOT, remove);
    
    if (fs.existsSync(keepPath) && fs.existsSync(removePath)) {
      console.log(`🔄 合并组件: ${remove} -> ${keep}`);
      console.log(`   原因: ${reason}`);
      
      // 备份要删除的文件内容（以防需要恢复）
      const backupDir = path.join(PROJECT_ROOT, 'docs', 'reports', 'component-backups');
      ensureDirectoryExists(backupDir);
      
      const backupFile = path.join(backupDir, `${path.basename(remove)}.backup`);
      const removeContent = fs.readFileSync(removePath, 'utf8');
      fs.writeFileSync(backupFile, removeContent, 'utf8');
      
      // 删除重复组件
      if (deleteFileOrDirectory(removePath)) {
        cleanupResults.mergedComponents.push({
          removed: remove,
          kept: keep,
          reason: reason
        });
        mergedCount++;
      }
    } else {
      console.log(`⚠️  组件文件不存在: ${!fs.existsSync(keepPath) ? keep : remove}`);
    }
  });
  
  console.log(`\n📊 组件合并统计: ${mergedCount} 个重复组件已处理\n`);
}

/**
 * 更新导入引用
 */
function updateImportReferences() {
  console.log('🔧 更新导入引用...\n');
  
  // 更新ui/index.ts中的导出
  const uiIndexPath = path.join(PROJECT_ROOT, 'src', 'components', 'ui', 'index.ts');
  
  if (fs.existsSync(uiIndexPath)) {
    let content = fs.readFileSync(uiIndexPath, 'utf8');
    
    // 移除基础LoadingSpinner的导出，因为EnhancedLoadingSpinner包含了所有功能
    if (content.includes("export { default as LoadingSpinner } from './LoadingSpinner';")) {
      content = content.replace(
        "export { default as LoadingSpinner } from './LoadingSpinner';",
        "// LoadingSpinner已合并到EnhancedLoadingSpinner中"
      );
      
      fs.writeFileSync(uiIndexPath, content, 'utf8');
      console.log('✅ 更新 src/components/ui/index.ts');
    }
  }
}

/**
 * 生成清理报告
 */
function generateCleanupReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# 废弃文件清理报告

## 📅 清理日期
${timestamp.split('T')[0]}

## 🎯 清理目标
清理项目中的废弃文件、重复文件和未使用的文件，提高项目结构的整洁性和可维护性。

## 📊 清理统计

### 移动的报告文件 (${cleanupResults.movedFiles.length}个)
${cleanupResults.movedFiles.map(file => `- \`${file}\` -> \`docs/reports/${file}\``).join('\n')}

### 删除的废弃文件 (${cleanupResults.deletedFiles.length}个)
${cleanupResults.deletedFiles.map(file => `- \`${file}\``).join('\n')}

### 合并的重复组件 (${cleanupResults.mergedComponents.length}个)
${cleanupResults.mergedComponents.map(comp => `- 移除: \`${comp.removed}\`\n  保留: \`${comp.kept}\`\n  原因: ${comp.reason}`).join('\n\n')}

## ❌ 错误记录 (${cleanupResults.errors.length}个)
${cleanupResults.errors.length > 0 ? cleanupResults.errors.map(error => `- ${error}`).join('\n') : '无错误'}

## ✅ 清理完成

项目废弃文件清理已完成，项目结构更加整洁，可维护性得到提升。

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'reports', 'DEPRECATED_FILES_CLEANUP_REPORT.md');
  ensureDirectoryExists(path.dirname(reportPath));
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 清理报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🧹 开始废弃文件清理...\n');
    
    // 移动报告文件
    moveReportFiles();
    
    // 删除废弃文件
    deleteDeprecatedFiles();
    
    // 处理重复组件
    handleDuplicateComponents();
    
    // 更新导入引用
    updateImportReferences();
    
    // 生成清理报告
    generateCleanupReport();
    
    console.log('\n🎉 废弃文件清理完成！');
    
    if (cleanupResults.errors.length === 0) {
      console.log('✅ 清理过程中无错误');
    } else {
      console.log(`⚠️  清理过程中发现 ${cleanupResults.errors.length} 个错误，请检查报告`);
    }
    
  } catch (error) {
    console.error('\n💥 清理过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  moveReportFiles,
  deleteDeprecatedFiles,
  handleDuplicateComponents,
  updateImportReferences,
  generateCleanupReport
};
