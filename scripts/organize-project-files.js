#!/usr/bin/env node

/**
 * 项目文件整理脚本
 * 用于整理项目结构，移动文档文件到合适的目录
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 需要移动的报告文件列表
const REPORT_FILES = [
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
  'SECURITY_TEST_IMPLEMENTATION.md',
  'PROJECT_CLEANUP_SUMMARY.md',
  'PROJECT_STATUS_SUMMARY.md',
  'CLEANUP_REPORT.md',
  'CHANGELOG.md'
];

// 需要保留在根目录的核心文档
const KEEP_IN_ROOT = [
  'README.md',
  'README-DEPLOY.md',
  'AUTHENTICATION_GUIDE.md',
  'ENVIRONMENT_SETUP.md',
  'STARTUP_GUIDE.md'
];

// 目标目录
const REPORTS_DIR = path.join(PROJECT_ROOT, 'docs', 'reports');

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
      fs.writeFileSync(targetFile, content, 'utf8');
      fs.unlinkSync(sourceFile);
      console.log(`✅ 移动文件: ${path.basename(sourceFile)} -> docs/reports/`);
      return true;
    } else {
      console.log(`⚠️  文件不存在: ${sourceFile}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 移动文件失败: ${sourceFile} - ${error.message}`);
    return false;
  }
}

/**
 * 整理报告文件
 */
function organizeReportFiles() {
  console.log('🗂️  开始整理报告文件...\n');

  // 确保目标目录存在
  ensureDirectoryExists(REPORTS_DIR);

  let movedCount = 0;
  let skippedCount = 0;

  // 移动报告文件
  REPORT_FILES.forEach(fileName => {
    const sourceFile = path.join(PROJECT_ROOT, fileName);
    const targetFile = path.join(REPORTS_DIR, fileName);

    if (moveFile(sourceFile, targetFile)) {
      movedCount++;
    } else {
      skippedCount++;
    }
  });

  console.log(`\n📊 整理统计:`);
  console.log(`   移动文件: ${movedCount} 个`);
  console.log(`   跳过文件: ${skippedCount} 个`);

  return { movedCount, skippedCount };
}

/**
 * 检查废弃文件
 */
function checkDeprecatedFiles() {
  console.log('\n🔍 检查废弃文件...\n');

  const deprecatedFiles = [
    'test-seo-sample.html',
    'dist',
    'node_modules/.cache'
  ];

  deprecatedFiles.forEach(fileName => {
    const filePath = path.join(PROJECT_ROOT, fileName);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`📁 发现废弃目录: ${fileName}`);
      } else {
        console.log(`📄 发现废弃文件: ${fileName}`);
      }
    }
  });
}

/**
 * 生成整理报告
 */
function generateOrganizationReport(results) {
  const timestamp = new Date().toISOString();
  const reportContent = `# 项目文件整理报告

## 📅 整理日期
${timestamp.split('T')[0]}

## 🎯 整理目标
整理项目文件结构，将报告文档移动到docs/reports目录，提高项目组织性。

## 📊 整理统计
- **移动文件**: ${results.movedCount} 个
- **跳过文件**: ${results.skippedCount} 个

## 📁 文件移动记录
${REPORT_FILES.map(file => `- \`${file}\` -> \`docs/reports/${file}\``).join('\n')}

## 🔄 保留在根目录的文件
${KEEP_IN_ROOT.map(file => `- \`${file}\` - 核心项目文档`).join('\n')}

## ✅ 整理完成
项目文件结构已优化，报告文档已统一移动到docs/reports目录。

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(REPORTS_DIR, 'PROJECT_ORGANIZATION_REPORT.md');
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n📄 整理报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🧹 开始项目文件整理...\n');

    // 整理报告文件
    const results = organizeReportFiles();

    // 检查废弃文件
    checkDeprecatedFiles();

    // 生成整理报告
    generateOrganizationReport(results);

    console.log('\n🎉 项目文件整理完成！');

  } catch (error) {
    console.error('\n💥 整理过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  organizeReportFiles,
  checkDeprecatedFiles,
  generateOrganizationReport
};
