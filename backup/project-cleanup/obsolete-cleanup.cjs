/**
 * 过时路径和无用文件清理工具
 * 系统性清理项目中的过时路径引用、无用文件、临时文件和备份文件
 */

const fs = require('fs');
const path = require('path');

class ObsoleteCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.cleanupResults = {
      obsoleteFiles: [],
      tempFiles: [],
      backupFiles: [],
      emptyFiles: [],
      reportFiles: [],
      obsoletePaths: [],
      totalCleaned: 0,
      spaceSaved: 0
    };

    // 需要清理的过时文件
    this.obsoleteFiles = [
      // 过时的脚本文件
      'scripts/test-backend.js',
      'scripts/import-path-fixer.cjs',
      'scripts/comprehensivePathFixer.cjs',
      'scripts/final-cleanup.cjs',
      'scripts/final-fixes.cjs',
      'scripts/fix-all-backslashes.cjs',
      'scripts/fix-backend-paths.cjs',
      'scripts/fix-build-issues.cjs',
      'scripts/fix-import-paths.cjs',
      'scripts/fix-import-paths.js',
      'scripts/fix-relative-paths.cjs',
      'scripts/fixNamingConventions.cjs',
      'scripts/fullProjectRestructure.cjs',
      'scripts/projectRestructure.cjs',
      'scripts/simpleRestructure.cjs',
      'scripts/updateFrontendImportPaths.cjs',
      'scripts/updateImportPaths.cjs',
      'scripts/updateProjectDocumentation.cjs',
      'scripts/validateProjectConfig.cjs',
      'scripts/backendRestructure.cjs',
      'scripts/completeTaskAnalysisImplementer.cjs',
      'scripts/createMissingFiles.cjs',
      'scripts/deepRestructure.cjs',
      'scripts/finishProjectRestructure.cjs',

      // 过时的报告文件
      'docs/reports/BACKEND_OPTIMIZATION_COMPLETE_REPORT.md',
      'docs/reports/BACKEND_RESTRUCTURE_REPORT.md',
      'docs/reports/BACKEND_STRUCTURE_ANALYSIS_REPORT.md',
      'docs/reports/COMPLETE_TASK_ANALYSIS_IMPLEMENTATION_REPORT.md',
      'docs/reports/COMPREHENSIVE_PATH_FIX_REPORT.md',
      'docs/reports/COMPREHENSIVE_PATH_ROUTING_FIX_COMPLETE_REPORT.md',
      'docs/reports/DEEP_RESTRUCTURE_COMPLETION_REPORT.md',
      'docs/reports/DOCUMENTATION_UPDATE_REPORT.md',
      'docs/reports/DUPLICATE_TEST_ANALYSIS_REPORT.md',
      'docs/reports/FINAL_FIXES_REPORT.json',
      'docs/reports/FINAL_PROJECT_STRUCTURE_REPORT.md',
      'docs/reports/FULL_PROJECT_RESTRUCTURE_COMPLETION_REPORT.md',
      'docs/reports/IMPORT_PATH_FIX_REPORT.json',
      'docs/reports/INTELLIGENT_PATH_FIX_REPORT.md',
      'docs/reports/MANUAL_TASKS_COMPLETION_REPORT.md',
      'docs/reports/MISSING_FILES_CREATION_REPORT.md',
      'docs/reports/NAMING_CONVENTION_FIX_REPORT.md',
      'docs/reports/NAMING_FIX_REPORT.json',
      'docs/reports/OBSOLETE_PATHS_CLEANUP_REPORT.json',
      'docs/reports/PROJECT_CHAOS_ANALYSIS.md',
      'docs/reports/PROJECT_CLEANUP_REPORT.md',
      'docs/reports/PROJECT_CLEANUP_SUMMARY.md',
      'docs/reports/PROJECT_CONFIG_VALIDATION_REPORT.md',
      'docs/reports/PROJECT_DOCUMENTATION_CLEANUP_COMPLETE_REPORT.md',
      'docs/reports/PROJECT_RESTRUCTURE_COMPLETION_REPORT.md',
      'docs/reports/PROJECT_STRUCTURE_ANALYSIS_REPORT.md',
      'docs/reports/QUICK_FIX_GUIDE.md',
      'docs/reports/RENAMED_IMPORTS_FIX_REPORT.json',
      'docs/reports/ROUTE_VALIDATION_REPORT.md',
      'docs/reports/TEST_PAGE_ANALYSIS_REPORT.md',

      // 过时的文档文件
      'docs/COMPLETE_TASK_ANALYSIS_PROJECT_PLAN.md',
      'docs/COMPLETE_TASK_ANALYSIS_PROJECT_STATUS.md',
      'docs/ENV_CONFIGURATION_GUIDE.md',
      'docs/FRONTEND_BACKEND_COMPLETION_AUDIT.md',
      'docs/FUNCTIONALITY_COMPLETENESS_AUDIT.md',
      'docs/PHASE3_FRONTEND_REFACTORING_SUMMARY.md',
      'docs/PHASE4_USER_EXPERIENCE_OPTIMIZATION_SUMMARY.md',
      'docs/PHASE5_TESTING_AND_DEPLOYMENT_SUMMARY.md',
      'docs/PROJECT_COMPLETION_SUMMARY.md',
      'docs/PROJECT_FINAL_STATUS.md',
      'docs/SYSTEM_IMPROVEMENTS_REPORT.md',
      'docs/TEST_FUNCTIONALITY_AUDIT_REPORT.md',
      'docs/TYPESCRIPT_REPAIR_STRATEGY.md'
    ];

    // 临时文件模式
    this.tempFilePatterns = [
      /\.tmp$/,
      /\.temp$/,
      /\.bak$/,
      /\.old$/,
      /~$/,
      /^temp-/,
      /^debug-/,
      /\.log$/,
      /\.cache$/,
      /^\.DS_Store$/,
      /^Thumbs\.db$/
    ];

    // 过时路径模式
    this.obsoletePathPatterns = [
      { from: /server\//g, to: 'backend/', description: 'server/ → backend/' },
      { from: /src\/server\//g, to: 'backend/src/', description: 'src/server/ → backend/src/' },
      { from: /\.\.\/\.\.\/utils\/ApiError/g, to: '../../utils/apiError', description: 'ApiError → apiError' },
      { from: /\.\.\/\.\.\/utils\/ApiResponse/g, to: '../../utils/apiResponse', description: 'ApiResponse → apiResponse' },
      { from: /\.\.\/utils\/ApiError/g, to: '../utils/apiError', description: 'ApiError → apiError' },
      { from: /\.\.\/utils\/ApiResponse/g, to: '../utils/apiResponse', description: 'ApiResponse → apiResponse' }
    ];
  }

  async execute(options = {}) {
    const { dryRun = true, cleanObsolete = true, cleanTemp = true, cleanPaths = true } = options;

    console.log('🧹 开始清理过时路径和无用文件...');
    console.log(`模式: ${dryRun ? '预览模式' : '实际清理'}`);
    console.log('==================================================');

    try {
      // 1. 清理过时文件
      if (cleanObsolete) {
        await this.cleanObsoleteFiles(dryRun);
      }

      // 2. 清理临时文件
      if (cleanTemp) {
        await this.cleanTempFiles(dryRun);
      }

      // 3. 修复过时路径
      if (cleanPaths) {
        await this.fixObsoletePaths(dryRun);
      }

      // 4. 清理空目录
      await this.cleanEmptyDirectories(dryRun);

      // 5. 生成清理报告
      await this.generateReport();

      console.log('\n✅ 清理完成！');
      return this.cleanupResults;

    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      throw error;
    }
  }

  async cleanObsoleteFiles(dryRun = true) {
    console.log('\n🗑️ 清理过时文件...');

    for (const file of this.obsoleteFiles) {
      const filePath = path.join(this.projectRoot, file);

      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);

          if (dryRun) {
            console.log(`  📄 [预览] 将删除: ${file} (${sizeKB}KB)`);
          } else {
            fs.unlinkSync(filePath);
            console.log(`  ✅ 已删除: ${file} (${sizeKB}KB)`);
            this.cleanupResults.spaceSaved += stats.size;
          }

          this.cleanupResults.obsoleteFiles.push({
            file,
            size: stats.size,
            deleted: !dryRun
          });
          this.cleanupResults.totalCleaned++;

        } catch (error) {
          console.error(`  ❌ 删除失败: ${file} - ${error.message}`);
        }
      }
    }

    console.log(`  📊 找到 ${this.cleanupResults.obsoleteFiles.length} 个过时文件`);
  }

  async cleanTempFiles(dryRun = true) {
    console.log('\n🗑️ 清理临时文件...');

    const allFiles = this.getAllFiles(this.projectRoot);
    const tempFiles = allFiles.filter(file => {
      const basename = path.basename(file);
      return this.tempFilePatterns.some(pattern => pattern.test(basename)) &&
        !this.isProtectedPath(file);
    });

    for (const file of tempFiles) {
      try {
        const stats = fs.statSync(file);
        const sizeKB = Math.round(stats.size / 1024);
        const relativePath = path.relative(this.projectRoot, file);

        if (dryRun) {
          console.log(`  📄 [预览] 将删除: ${relativePath} (${sizeKB}KB)`);
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除: ${relativePath} (${sizeKB}KB)`);
          this.cleanupResults.spaceSaved += stats.size;
        }

        this.cleanupResults.tempFiles.push({
          file: relativePath,
          size: stats.size,
          deleted: !dryRun
        });
        this.cleanupResults.totalCleaned++;

      } catch (error) {
        console.error(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }

    console.log(`  📊 找到 ${this.cleanupResults.tempFiles.length} 个临时文件`);
  }

  async fixObsoletePaths(dryRun = true) {
    console.log('\n🔧 修复过时路径引用...');

    const allFiles = this.getAllFiles(this.projectRoot, ['.js', '.ts', '.tsx', '.jsx', '.vue', '.md']);
    let pathsFixed = 0;

    for (const file of allFiles) {
      if (this.isProtectedPath(file)) continue;

      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        let hasChanges = false;

        for (const pattern of this.obsoletePathPatterns) {
          if (pattern.from.test(newContent)) {
            newContent = newContent.replace(pattern.from, pattern.to);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          const relativePath = path.relative(this.projectRoot, file);

          if (dryRun) {
            console.log(`  📄 [预览] 将修复: ${relativePath}`);
          } else {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`  ✅ 已修复: ${relativePath}`);
          }

          this.cleanupResults.obsoletePaths.push({
            file: relativePath,
            fixed: !dryRun
          });
          pathsFixed++;
        }

      } catch (error) {
        console.error(`  ❌ 修复失败: ${file} - ${error.message}`);
      }
    }

    console.log(`  📊 修复了 ${pathsFixed} 个文件的过时路径`);
  }

  async cleanEmptyDirectories(dryRun = true) {
    console.log('\n📁 清理空目录...');

    const emptyDirs = this.findEmptyDirectories(this.projectRoot);

    for (const dir of emptyDirs) {
      const relativePath = path.relative(this.projectRoot, dir);

      if (dryRun) {
        console.log(`  📁 [预览] 将删除空目录: ${relativePath}`);
      } else {
        try {
          fs.rmdirSync(dir);
          console.log(`  ✅ 已删除空目录: ${relativePath}`);
        } catch (error) {
          console.error(`  ❌ 删除失败: ${relativePath} - ${error.message}`);
        }
      }
    }

    console.log(`  📊 找到 ${emptyDirs.length} 个空目录`);
  }

  getAllFiles(dir, extensions = []) {
    const files = [];

    const scan = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
          if (item.startsWith('.') || this.isProtectedPath(item)) continue;

          const itemPath = path.join(currentDir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            scan(itemPath);
          } else if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
            files.push(itemPath);
          }
        }
      } catch (error) {
        // 忽略访问错误
      }
    };

    scan(dir);
    return files;
  }

  findEmptyDirectories(dir) {
    const emptyDirs = [];

    const scan = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        const nonHiddenItems = items.filter(item => !item.startsWith('.'));

        if (nonHiddenItems.length === 0) {
          emptyDirs.push(currentDir);
          return;
        }

        for (const item of nonHiddenItems) {
          const itemPath = path.join(currentDir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory() && !this.isProtectedPath(item)) {
            scan(itemPath);
          }
        }
      } catch (error) {
        // 忽略访问错误
      }
    };

    scan(dir);
    return emptyDirs.filter(dir => dir !== this.projectRoot);
  }

  isProtectedPath(filePath) {
    const protectedPaths = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.vscode', '.idea'];
    return protectedPaths.some(protectedPath => filePath.includes(protectedPath));
  }

  async generateReport() {
    console.log('\n📊 生成清理报告...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCleaned: this.cleanupResults.totalCleaned,
        spaceSaved: Math.round(this.cleanupResults.spaceSaved / 1024) + 'KB',
        obsoleteFiles: this.cleanupResults.obsoleteFiles.length,
        tempFiles: this.cleanupResults.tempFiles.length,
        pathsFixed: this.cleanupResults.obsoletePaths.length
      },
      details: this.cleanupResults
    };

    const reportPath = path.join(this.projectRoot, 'docs/reports/OBSOLETE_CLEANUP_FINAL_REPORT.json');

    // 确保目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`报告已保存到: ${reportPath}`);
    console.log(`\n📈 清理统计:`);
    console.log(`  清理文件: ${report.summary.totalCleaned}个`);
    console.log(`  节省空间: ${report.summary.spaceSaved}`);
    console.log(`  修复路径: ${report.summary.pathsFixed}个文件`);
  }
}

// 执行清理
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--execute'),
    cleanObsolete: !args.includes('--no-obsolete'),
    cleanTemp: !args.includes('--no-temp'),
    cleanPaths: !args.includes('--no-paths')
  };

  if (args.includes('--help')) {
    console.log(`
过时路径和无用文件清理工具

用法: node obsolete-cleanup.cjs [选项]

选项:
  --execute       实际执行清理（默认为预览模式）
  --no-obsolete   跳过过时文件清理
  --no-temp       跳过临时文件清理
  --no-paths      跳过过时路径修复
  --help          显示此帮助信息
`);
    process.exit(0);
  }

  const cleanup = new ObsoleteCleanup();
  cleanup.execute(options).catch(console.error);
}

module.exports = ObsoleteCleanup;
