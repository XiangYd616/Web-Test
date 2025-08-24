#!/usr/bin/env node

/**
 * 导入导出分析工具
 * 分析项目中的导入导出关系，检测问题并提供修复建议
 */

const fs = require('fs');
const path = require('path');

class ImportExportAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.issues = [];
    this.dependencies = new Map(); // file -> [dependencies]
    this.exports = new Map(); // file -> [exports]
    this.unusedExports = new Set();
    this.missingImports = new Set();
  }

  /**
   * 开始分析
   */
  async analyze() {
    console.log('📦 开始分析导入导出关系...');
    console.log('='.repeat(60));

    const files = this.scanFiles();
    console.log(`📊 扫描到 ${files.length} 个文件`);

    // 分析每个文件
    for (const file of files) {
      await this.analyzeFile(file);
    }

    // 检测问题
    this.detectIssues();

    // 生成报告
    this.generateReport();

    console.log(`\n📊 分析完成:`);
    console.log(`  发现问题: ${this.issues.length} 个`);
    console.log(`  未使用导出: ${this.unusedExports.size} 个`);
    console.log(`  缺失导入: ${this.missingImports.size} 个`);
  }

  /**
   * 扫描文件
   */
  scanFiles() {
    const files = [];

    const scan = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scan(this.frontendDir);
    return files;
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendDir, filePath);

      // 分析导入
      const imports = this.extractImports(content);
      this.dependencies.set(relativePath, imports);

      // 分析导出
      const exports = this.extractExports(content);
      this.exports.set(relativePath, exports);

    } catch (error) {
      console.warn(`⚠️ 分析文件失败: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 提取导入语句
   */
  extractImports(content) {
    const imports = [];

    // ES6 import语句
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const line = content.substring(0, match.index).split('\n').length;

      imports.push({
        path: importPath,
        line,
        raw: match[0],
        isRelative: importPath.startsWith('.'),
        isAbsolute: !importPath.startsWith('.') && !importPath.startsWith('@')
      });
    }

    // require语句
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1];
      const line = content.substring(0, match.index).split('\n').length;

      imports.push({
        path: importPath,
        line,
        raw: match[0],
        isRelative: importPath.startsWith('.'),
        isAbsolute: !importPath.startsWith('.') && !importPath.startsWith('@'),
        isRequire: true
      });
    }

    return imports;
  }

  /**
   * 提取导出语句
   */
  extractExports(content) {
    const exports = [];

    // export default
    const defaultExportRegex = /export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|const\s+(\w+)|(\w+))/g;
    let match;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3] || match[4];
      const line = content.substring(0, match.index).split('\n').length;

      exports.push({
        name,
        type: 'default',
        line,
        raw: match[0]
      });
    }

    // export named
    const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const name = match[1];
      const line = content.substring(0, match.index).split('\n').length;

      exports.push({
        name,
        type: 'named',
        line,
        raw: match[0]
      });
    }

    // export { ... }
    const exportListRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportListRegex.exec(content)) !== null) {
      const exportList = match[1];
      const line = content.substring(0, match.index).split('\n').length;

      const names = exportList.split(',').map(name => name.trim().split(' as ')[0].trim());
      names.forEach(name => {
        if (name) {
          exports.push({
            name,
            type: 'named',
            line,
            raw: match[0]
          });
        }
      });
    }

    return exports;
  }

  /**
   * 检测问题
   */
  detectIssues() {
    console.log('\n🔍 检测导入导出问题...');

    for (const [filePath, imports] of this.dependencies) {
      for (const imp of imports) {
        // 检查相对路径导入
        if (imp.isRelative) {
          const resolvedPath = this.resolveImportPath(filePath, imp.path);

          if (!resolvedPath || !fs.existsSync(path.join(this.frontendDir, resolvedPath))) {
            this.issues.push({
              type: 'missing_file',
              file: filePath,
              line: imp.line,
              import: imp.path,
              message: `导入的文件不存在: ${imp.path}`
            });
            this.missingImports.add(`${filePath}:${imp.line}`);
          }
        }

        // 检查路径规范
        if (imp.path.includes('..')) {
          const depth = (imp.path.match(/\.\./g) || []).length;
          if (depth > 2) {
            this.issues.push({
              type: 'deep_relative_path',
              file: filePath,
              line: imp.line,
              import: imp.path,
              message: `相对路径过深 (${depth}层): ${imp.path}`
            });
          }
        }

        // 检查混合导入风格
        if (imp.isRequire && filePath.endsWith('.tsx')) {
          this.issues.push({
            type: 'mixed_import_style',
            file: filePath,
            line: imp.line,
            import: imp.raw,
            message: 'TypeScript文件中使用require语法'
          });
        }
      }
    }

    // 检查未使用的导出
    this.detectUnusedExports();
  }

  /**
   * 检测未使用的导出
   */
  detectUnusedExports() {
    const allImports = new Set();

    // 收集所有导入的名称
    for (const [, imports] of this.dependencies) {
      for (const imp of imports) {
        if (imp.isRelative) {
          // 简化处理，只检查文件名
          const fileName = path.basename(imp.path, path.extname(imp.path));
          allImports.add(fileName);
        }
      }
    }

    // 检查导出是否被使用
    for (const [filePath, exports] of this.exports) {
      for (const exp of exports) {
        const fileName = path.basename(filePath, path.extname(filePath));
        if (!allImports.has(fileName) && !allImports.has(exp.name)) {
          this.unusedExports.add(`${filePath}:${exp.name}`);
        }
      }
    }
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);

    // 如果已经有扩展名，直接检查
    if (path.extname(importPath)) {
      const resolved = path.resolve(fromDir, importPath);
      const relativePath = path.relative(this.frontendDir, resolved);

      if (fs.existsSync(path.join(this.frontendDir, relativePath))) {
        return relativePath;
      }
      return null;
    }

    // 没有扩展名，尝试不同的扩展名
    const resolved = path.resolve(fromDir, importPath);
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

    // 先尝试直接文件
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      const relativePath = path.relative(this.frontendDir, fullPath);

      if (fs.existsSync(path.join(this.frontendDir, relativePath))) {
        return relativePath;
      }
    }

    // 再尝试index文件
    for (const ext of indexExtensions) {
      const fullPath = resolved + ext;
      const relativePath = path.relative(this.frontendDir, fullPath);

      if (fs.existsSync(path.join(this.frontendDir, relativePath))) {
        return relativePath;
      }
    }

    return null;
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'import-export-analysis.md');

    let report = '# 导入导出分析报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n`;
    report += `**分析文件数**: ${this.dependencies.size}\n`;
    report += `**发现问题数**: ${this.issues.length}\n\n`;

    if (this.issues.length > 0) {
      report += '## 🚨 发现的问题\n\n';

      const groupedIssues = this.groupIssuesByType();

      for (const [type, issues] of Object.entries(groupedIssues)) {
        report += `### ${this.getIssueTypeTitle(type)} (${issues.length}个)\n\n`;

        issues.forEach((issue, index) => {
          report += `${index + 1}. **${issue.file}:${issue.line}**\n`;
          report += `   ${issue.message}\n`;
          if (issue.import) {
            report += `   \`${issue.import}\`\n`;
          }
          report += '\n';
        });
      }
    }

    if (this.unusedExports.size > 0) {
      report += '## 📤 可能未使用的导出\n\n';
      Array.from(this.unusedExports).forEach((exp, index) => {
        report += `${index + 1}. ${exp}\n`;
      });
      report += '\n';
    }

    // 统计信息
    report += '## 📊 统计信息\n\n';
    report += `- 总文件数: ${this.dependencies.size}\n`;
    report += `- 总导入数: ${Array.from(this.dependencies.values()).reduce((sum, imports) => sum + imports.length, 0)}\n`;
    report += `- 总导出数: ${Array.from(this.exports.values()).reduce((sum, exports) => sum + exports.length, 0)}\n`;
    report += `- 相对导入数: ${Array.from(this.dependencies.values()).reduce((sum, imports) => sum + imports.filter(i => i.isRelative).length, 0)}\n`;
    report += `- 绝对导入数: ${Array.from(this.dependencies.values()).reduce((sum, imports) => sum + imports.filter(i => i.isAbsolute).length, 0)}\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 分析报告已保存到: ${reportPath}`);
  }

  /**
   * 按类型分组问题
   */
  groupIssuesByType() {
    const grouped = {};

    for (const issue of this.issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }

    return grouped;
  }

  /**
   * 获取问题类型标题
   */
  getIssueTypeTitle(type) {
    const titles = {
      'missing_file': '🔍 缺失文件',
      'deep_relative_path': '📁 深层相对路径',
      'mixed_import_style': '🔄 混合导入风格',
      'circular_dependency': '🔄 循环依赖',
      'unused_import': '📤 未使用导入'
    };

    return titles[type] || type;
  }
}

// 主函数
async function main() {
  const analyzer = new ImportExportAnalyzer();

  try {
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行分析
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ImportExportAnalyzer;
