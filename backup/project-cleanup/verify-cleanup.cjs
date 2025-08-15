/**
 * 验证重复文件清理结果
 * 检查是否有导入错误或引用问题
 */

const fs = require('fs');
const path = require('path');

class CleanupVerifier {
  constructor() {
    this.projectRoot = process.cwd();
    this.deletedFiles = [
      'frontend/pages/data/reports/Analytics.tsx',
      'frontend/services/analytics/index.ts',
      'frontend/components/charts/TestCharts.tsx',
      'frontend/components/features/DataBackupManager.tsx',
      'frontend/services/api/testApiService.ts',
      'frontend/services/history/historyService.ts',
      'backend/engines/security/SecurityEngine.js'
    ];
    this.issues = [];
  }

  /**
   * 执行验证
   */
  async verify() {
    console.log('🔍 开始验证重复文件清理结果...\n');

    // 检查删除的文件是否确实被删除
    this.checkDeletedFiles();

    // 检查是否有断开的导入引用
    await this.checkBrokenImports();

    // 检查TypeScript编译
    await this.checkTypeScriptCompilation();

    // 生成验证报告
    this.generateReport();

    console.log('\n✅ 验证完成！');
  }

  /**
   * 检查删除的文件
   */
  checkDeletedFiles() {
    console.log('📋 检查删除的文件...');

    this.deletedFiles.forEach(filePath => {
      const fullPath = path.join(this.projectRoot, filePath);
      const exists = fs.existsSync(fullPath);

      if (exists) {
        console.log(`   ❌ ${filePath} - 仍然存在（应该已删除）`);
        this.issues.push({
          type: 'file_not_deleted',
          file: filePath,
          severity: 'high'
        });
      } else {
        console.log(`   ✅ ${filePath} - 已成功删除`);
      }
    });
  }

  /**
   * 检查断开的导入引用
   */
  async checkBrokenImports() {
    console.log('\n🔗 检查断开的导入引用...');

    const projectFiles = this.getAllProjectFiles();
    let brokenImports = 0;

    for (const projectFile of projectFiles) {
      try {
        const fullPath = path.join(this.projectRoot, projectFile);
        const content = fs.readFileSync(fullPath, 'utf8');

        // 检查对已删除文件的引用
        for (const deletedFile of this.deletedFiles) {
          const fileName = path.basename(deletedFile, path.extname(deletedFile));
          const relativePath = deletedFile.replace(/\\/g, '/');

          // 搜索导入语句
          const importPatterns = [
            new RegExp(`import.*from.*['"\`].*${fileName}.*['"\`]`, 'g'),
            new RegExp(`import.*['"\`].*${fileName}.*['"\`]`, 'g'),
            new RegExp(`require\\(['"\`].*${fileName}.*['"\`]\\)`, 'g'),
            new RegExp(`from.*['"\`].*${relativePath}.*['"\`]`, 'g')
          ];

          for (const pattern of importPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              console.log(`   ❌ ${projectFile} - 引用已删除的文件: ${deletedFile}`);
              matches.forEach(match => {
                console.log(`     导入语句: ${match}`);
              });

              brokenImports++;
              this.issues.push({
                type: 'broken_import',
                file: projectFile,
                deletedFile: deletedFile,
                imports: matches,
                severity: 'high'
              });
            }
          }
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    if (brokenImports === 0) {
      console.log('   ✅ 没有发现断开的导入引用');
    } else {
      console.log(`   ❌ 发现 ${brokenImports} 个断开的导入引用`);
    }
  }

  /**
   * 检查TypeScript编译
   */
  async checkTypeScriptCompilation() {
    console.log('\n📝 检查TypeScript编译...');

    // 检查是否有tsconfig.json
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      console.log('   ⚠️  未找到tsconfig.json，跳过TypeScript编译检查');
      return;
    }

    try {
      // 这里可以添加实际的TypeScript编译检查
      // 由于需要安装TypeScript编译器，这里只做基本检查
      console.log('   ℹ️  TypeScript编译检查需要手动运行: npm run type-check');

      // 检查package.json中是否有type-check脚本
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.scripts && packageJson.scripts['type-check']) {
          console.log('   ✅ 找到type-check脚本，建议运行: npm run type-check');
        }
      }
    } catch (error) {
      console.log(`   ❌ TypeScript编译检查失败: ${error.message}`);
      this.issues.push({
        type: 'typescript_check_failed',
        error: error.message,
        severity: 'medium'
      });
    }
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];

    const scanDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;

        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
            files.push(relativeFilePath.replace(/\\/g, '/'));
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));

    return files;
  }

  /**
   * 工具方法
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'cleanup-verification-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        highSeverityIssues: this.issues.filter(i => i.severity === 'high').length,
        mediumSeverityIssues: this.issues.filter(i => i.severity === 'medium').length,
        lowSeverityIssues: this.issues.filter(i => i.severity === 'low').length,
        deletedFiles: this.deletedFiles.length,
        verificationPassed: this.issues.length === 0
      },
      deletedFiles: this.deletedFiles,
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 验证报告:');
    console.log(`   删除文件数: ${report.summary.deletedFiles}`);
    console.log(`   发现问题数: ${report.summary.totalIssues}`);
    console.log(`   高严重性: ${report.summary.highSeverityIssues}`);
    console.log(`   中严重性: ${report.summary.mediumSeverityIssues}`);
    console.log(`   低严重性: ${report.summary.lowSeverityIssues}`);
    console.log(`   验证结果: ${report.summary.verificationPassed ? '✅ 通过' : '❌ 有问题需要处理'}`);
    console.log(`   报告已保存: ${reportPath}`);
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.issues.length === 0) {
      recommendations.push('✅ 重复文件清理成功，没有发现问题');
      recommendations.push('建议运行完整的测试套件验证功能正常');
    } else {
      if (this.issues.some(i => i.type === 'broken_import')) {
        recommendations.push('❌ 发现断开的导入引用，需要更新相关文件的导入语句');
      }

      if (this.issues.some(i => i.type === 'file_not_deleted')) {
        recommendations.push('❌ 部分文件未成功删除，需要手动检查');
      }

      recommendations.push('建议运行 npm run type-check 检查TypeScript编译');
      recommendations.push('建议运行 npm run test 验证功能正常');
    }

    return recommendations;
  }
}

// 执行验证
if (require.main === module) {
  const verifier = new CleanupVerifier();
  verifier.verify().catch(console.error);
}

module.exports = CleanupVerifier;
