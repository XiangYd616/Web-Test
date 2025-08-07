/**
 * 代码清理工具
 * 本地化程度：100%
 * 自动识别和清理未使用的文件、函数和变量
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../server/utils/logger');

class CodeCleanupTool {
  constructor() {
    this.cleanupResults = {
      unusedFiles: [],
      obsoleteEndpoints: [],
      deprecatedComponents: [],
      emptyFiles: [],
      duplicateFiles: [],
      totalCleaned: 0
    };

    // 需要保护的文件和目录
    this.protectedPaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      'reports',
      'logs',
      'README.md',
      'package.json',
      'package-lock.json',
      '.env',
      '.gitignore'
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
      /^test-.*\.js$/,
      /^backup-/,
      /\.log$/,
      /\.cache$/
    ];

    // 需要保护的特殊文件
    this.protectedFiles = [
      'test-engines-api.js',
      'api-docs.js',
      'swagger.js'
    ];

    // 废弃标记
    this.deprecatedMarkers = [
      '@deprecated',
      'DEPRECATED',
      'TODO: remove',
      'FIXME: remove',
      'OBSOLETE',
      'LEGACY'
    ];
  }

  /**
   * 执行完整的代码清理
   */
  async runFullCleanup(options = {}) {
    const {
      dryRun = true,
      cleanTempFiles = true,
      cleanEmptyFiles = true,
      cleanObsoleteEndpoints = false,
      cleanDeprecatedComponents = false
    } = options;

    console.log('🧹 开始代码清理...');
    console.log(`模式: ${dryRun ? '预览模式' : '实际清理'}`);

    try {
      // 1. 清理临时文件
      if (cleanTempFiles) {
        await this.cleanTempFiles(dryRun);
      }

      // 2. 清理空文件
      if (cleanEmptyFiles) {
        await this.cleanEmptyFiles(dryRun);
      }

      // 3. 清理过时的API端点
      if (cleanObsoleteEndpoints) {
        await this.cleanObsoleteEndpoints(dryRun);
      }

      // 4. 清理废弃的组件
      if (cleanDeprecatedComponents) {
        await this.cleanDeprecatedComponents(dryRun);
      }

      // 5. 查找重复文件
      await this.findDuplicateFiles();

      // 6. 生成清理报告
      await this.generateCleanupReport();

      console.log('\n✅ 代码清理完成！');
      return this.cleanupResults;

    } catch (error) {
      Logger.error('代码清理失败', error);
      throw error;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanTempFiles(dryRun = true) {
    console.log('🗑️ 清理临时文件...');

    const allFiles = this.getAllFiles('.', []);
    const tempFiles = allFiles.filter(file =>
      this.tempFilePatterns.some(pattern => pattern.test(path.basename(file))) &&
      !this.isProtectedPath(file) &&
      !this.isProtectedFile(file)
    );

    console.log(`  发现 ${tempFiles.length} 个临时文件`);

    for (const file of tempFiles) {
      try {
        if (dryRun) {
          console.log(`  [预览] 将删除: ${file}`);
          this.cleanupResults.unusedFiles.push(file);
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除: ${file}`);
          this.cleanupResults.totalCleaned++;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 清理空文件
   */
  async cleanEmptyFiles(dryRun = true) {
    console.log('📄 清理空文件...');

    const allFiles = this.getAllFiles('.', ['.js', '.vue', '.jsx', '.ts', '.css', '.scss']);
    const emptyFiles = [];

    for (const file of allFiles) {
      if (this.isProtectedPath(file)) continue;

      try {
        const content = fs.readFileSync(file, 'utf8').trim();
        if (content.length === 0 || this.isEffectivelyEmpty(content)) {
          emptyFiles.push(file);
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${emptyFiles.length} 个空文件`);

    for (const file of emptyFiles) {
      try {
        if (dryRun) {
          console.log(`  [预览] 将删除空文件: ${file}`);
          this.cleanupResults.emptyFiles.push(file);
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除空文件: ${file}`);
          this.cleanupResults.totalCleaned++;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 清理过时的API端点
   */
  async cleanObsoleteEndpoints(dryRun = true) {
    console.log('🔗 检查过时的API端点...');

    const routeFiles = this.getAllFiles('server/routes', ['.js']);
    const obsoleteEndpoints = [];

    for (const file of routeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // 检查是否包含废弃标记
          if (this.deprecatedMarkers.some(marker => line.includes(marker))) {
            obsoleteEndpoints.push({
              file,
              line: i + 1,
              content: line.trim()
            });
          }

          // 检查过时的路径模式
          const obsoletePatterns = ['/old/', '/deprecated/', '/legacy/', '/v1/'];
          if (obsoletePatterns.some(pattern => line.includes(pattern))) {
            obsoleteEndpoints.push({
              file,
              line: i + 1,
              content: line.trim()
            });
          }
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${obsoleteEndpoints.length} 个过时的API端点`);

    for (const endpoint of obsoleteEndpoints) {
      console.log(`  [${dryRun ? '预览' : '发现'}] ${endpoint.file}:${endpoint.line} - ${endpoint.content}`);
      this.cleanupResults.obsoleteEndpoints.push(endpoint);
    }
  }

  /**
   * 清理废弃的组件
   */
  async cleanDeprecatedComponents(dryRun = true) {
    console.log('🧩 检查废弃的组件...');

    const componentFiles = [
      ...this.getAllFiles('client/src/components', ['.vue', '.jsx', '.js']),
      ...this.getAllFiles('src/components', ['.vue', '.jsx', '.js'])
    ];

    const deprecatedComponents = [];

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        // 检查是否包含废弃标记
        const hasDeprecatedMarker = this.deprecatedMarkers.some(marker =>
          content.includes(marker)
        );

        if (hasDeprecatedMarker) {
          deprecatedComponents.push(file);
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${deprecatedComponents.length} 个废弃的组件`);

    for (const component of deprecatedComponents) {
      console.log(`  [${dryRun ? '预览' : '发现'}] 废弃组件: ${component}`);
      this.cleanupResults.deprecatedComponents.push(component);
    }
  }

  /**
   * 查找重复文件
   */
  async findDuplicateFiles() {
    console.log('🔍 查找重复文件...');

    const allFiles = this.getAllFiles('.', ['.js', '.vue', '.jsx', '.ts']);
    const fileHashes = new Map();
    const duplicates = [];

    for (const file of allFiles) {
      if (this.isProtectedPath(file)) continue;

      try {
        const content = fs.readFileSync(file, 'utf8');
        const hash = this.generateContentHash(content);

        if (fileHashes.has(hash)) {
          duplicates.push({
            original: fileHashes.get(hash),
            duplicate: file
          });
        } else {
          fileHashes.set(hash, file);
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${duplicates.length} 组重复文件`);

    for (const dup of duplicates) {
      console.log(`  🔄 重复: ${dup.original} ↔ ${dup.duplicate}`);
      this.cleanupResults.duplicateFiles.push(dup);
    }
  }

  /**
   * 判断文件是否实际为空
   */
  isEffectivelyEmpty(content) {
    // 移除注释和空白后检查是否为空
    const cleanContent = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
      .replace(/\/\/.*$/gm, '')         // 移除行注释
      .replace(/\s+/g, '')              // 移除所有空白
      .replace(/^['"`]use strict['"`];?/g, ''); // 移除use strict

    return cleanContent.length === 0;
  }

  /**
   * 检查是否为受保护的路径
   */
  isProtectedPath(filePath) {
    return this.protectedPaths.some(protectedPath =>
      filePath.includes(protectedPath)
    );
  }

  /**
   * 检查是否为受保护的文件
   */
  isProtectedFile(filePath) {
    const fileName = path.basename(filePath);
    return this.protectedFiles.some(protectedFile =>
      fileName === protectedFile
    );
  }

  /**
   * 获取所有文件
   */
  getAllFiles(dir, extensions) {
    if (!fs.existsSync(dir)) return [];

    const files = [];

    function traverse(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            traverse(fullPath);
          } else if (stat.isFile()) {
            if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // 忽略访问错误
      }
    }

    traverse(dir);
    return files;
  }

  /**
   * 生成内容哈希
   */
  generateContentHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 生成清理报告
   */
  async generateCleanupReport() {
    const reportPath = 'reports/code-cleanup-report.md';
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = this.generateMarkdownReport();
    fs.writeFileSync(reportPath, report);

    console.log(`\n📄 清理报告已生成: ${reportPath}`);
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport() {
    const timestamp = new Date().toISOString();

    return `# 代码清理报告

**生成时间**: ${timestamp}
**清理项目总数**: ${this.cleanupResults.totalCleaned}

## 📊 清理结果概览

| 清理项目 | 数量 | 状态 |
|---------|------|------|
| 临时文件 | ${this.cleanupResults.unusedFiles.length} | ${this.cleanupResults.unusedFiles.length > 0 ? '⚠️' : '✅'} |
| 空文件 | ${this.cleanupResults.emptyFiles.length} | ${this.cleanupResults.emptyFiles.length > 0 ? '⚠️' : '✅'} |
| 过时API端点 | ${this.cleanupResults.obsoleteEndpoints.length} | ${this.cleanupResults.obsoleteEndpoints.length > 0 ? '⚠️' : '✅'} |
| 废弃组件 | ${this.cleanupResults.deprecatedComponents.length} | ${this.cleanupResults.deprecatedComponents.length > 0 ? '⚠️' : '✅'} |
| 重复文件 | ${this.cleanupResults.duplicateFiles.length} | ${this.cleanupResults.duplicateFiles.length > 0 ? '⚠️' : '✅'} |

## 🗑️ 临时文件清理

${this.cleanupResults.unusedFiles.length > 0 ?
        this.cleanupResults.unusedFiles.map(file => `- ${file}`).join('\n') :
        '✅ 未发现临时文件'}

## 📄 空文件清理

${this.cleanupResults.emptyFiles.length > 0 ?
        this.cleanupResults.emptyFiles.map(file => `- ${file}`).join('\n') :
        '✅ 未发现空文件'}

## 🔗 过时API端点

${this.cleanupResults.obsoleteEndpoints.length > 0 ?
        this.cleanupResults.obsoleteEndpoints.map(endpoint =>
          `- ${endpoint.file}:${endpoint.line} - \`${endpoint.content}\``
        ).join('\n') :
        '✅ 未发现过时API端点'}

## 🧩 废弃组件

${this.cleanupResults.deprecatedComponents.length > 0 ?
        this.cleanupResults.deprecatedComponents.map(component => `- ${component}`).join('\n') :
        '✅ 未发现废弃组件'}

## 🔄 重复文件

${this.cleanupResults.duplicateFiles.length > 0 ?
        this.cleanupResults.duplicateFiles.map(dup =>
          `- ${dup.original} ↔ ${dup.duplicate}`
        ).join('\n') :
        '✅ 未发现重复文件'}

## 📈 清理建议

${this.cleanupResults.unusedFiles.length + this.cleanupResults.emptyFiles.length > 0 ?
        '建议删除发现的临时文件和空文件以保持代码库整洁。' : ''}

${this.cleanupResults.obsoleteEndpoints.length > 0 ?
        '建议审查并移除过时的API端点，或添加适当的文档说明。' : ''}

${this.cleanupResults.deprecatedComponents.length > 0 ?
        '建议审查废弃的组件，确定是否可以安全移除。' : ''}

${this.cleanupResults.duplicateFiles.length > 0 ?
        '建议检查重复文件，保留必要的版本并删除冗余文件。' : ''}

---
*报告生成时间: ${timestamp}*
`;
  }
}

// 主执行函数
async function runCodeCleanup(options = {}) {
  const tool = new CodeCleanupTool();

  try {
    const results = await tool.runFullCleanup(options);

    console.log('\n' + '='.repeat(60));
    console.log('🧹 代码清理结果摘要');
    console.log('='.repeat(60));
    console.log(`🗑️ 临时文件: ${results.unusedFiles.length}`);
    console.log(`📄 空文件: ${results.emptyFiles.length}`);
    console.log(`🔗 过时API端点: ${results.obsoleteEndpoints.length}`);
    console.log(`🧩 废弃组件: ${results.deprecatedComponents.length}`);
    console.log(`🔄 重复文件: ${results.duplicateFiles.length}`);
    console.log(`✅ 总清理项目: ${results.totalCleaned}`);
    console.log('='.repeat(60));

    return results;

  } catch (error) {
    console.error('\n❌ 代码清理失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const options = {
    dryRun: process.argv.includes('--dry-run') || !process.argv.includes('--execute'),
    cleanTempFiles: true,
    cleanEmptyFiles: true,
    cleanObsoleteEndpoints: true,
    cleanDeprecatedComponents: true
  };

  console.log('使用参数: --execute 执行实际清理，默认为预览模式');
  runCodeCleanup(options);
}

module.exports = { CodeCleanupTool, runCodeCleanup };
