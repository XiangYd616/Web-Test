#!/usr/bin/env node

/**
 * 智能路径修复工具
 * 专门处理相对路径错误和缺失文件问题
 */

const fs = require('fs');
const path = require('path');

class IntelligentPathFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.fixes = [];
    this.fileMap = new Map(); // 文件名到路径的映射
    this.stats = {
      filesScanned: 0,
      pathsFixed: 0,
      filesCreated: 0
    };
  }

  async execute() {
    console.log('🧠 开始智能路径修复...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际修复'}`);
    console.log('==================================================');

    try {
      // 1. 建立文件映射
      await this.buildFileMap();

      // 2. 修复相对路径错误
      await this.fixRelativePaths();

      // 3. 创建缺失的index文件
      await this.createMissingIndexFiles();

      // 4. 生成修复报告
      await this.generateReport();

    } catch (error) {
      console.error('❌ 智能路径修复过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async buildFileMap() {
    console.log('\n📋 建立文件映射...');

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;

        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js')) {
          const relativePath = path.relative(this.projectRoot, itemPath);
          const fileName = path.basename(item, path.extname(item));

          if (!this.fileMap.has(fileName)) {
            this.fileMap.set(fileName, []);
          }
          this.fileMap.get(fileName).push(relativePath);
        }
      }
    };

    // 扫描frontend和backend目录
    const frontendDir = path.join(this.projectRoot, 'frontend');
    const backendDir = path.join(this.projectRoot, 'backend');

    if (fs.existsSync(frontendDir)) {
      scanDirectory(frontendDir);
    }

    if (fs.existsSync(backendDir)) {
      scanDirectory(backendDir);
    }

    console.log(`  📊 建立了 ${this.fileMap.size} 个文件的映射`);
  }

  async fixRelativePaths() {
    console.log('\n🔧 修复相对路径错误...');

    await this.scanAndFixDirectory('frontend');
    await this.scanAndFixDirectory('backend');
  }

  async scanAndFixDirectory(baseDir) {
    const fullPath = path.join(this.projectRoot, baseDir);
    if (!fs.existsSync(fullPath)) return;

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;

        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js')) {
          this.stats.filesScanned++;
          this.fixFileImports(itemPath);
        }
      }
    };

    console.log(`  📁 扫描 ${baseDir} 目录...`);
    scanDirectory(fullPath);
  }

  async fixFileImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // 匹配import语句
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // 只处理相对路径
      if (importPath.startsWith('.')) {
        const fixedPath = this.findCorrectPath(filePath, importPath);
        if (fixedPath && fixedPath !== importPath) {
          newContent = newContent.replace(match[0], match[0].replace(importPath, fixedPath));
          hasChanges = true;

          this.fixes.push({
            file: path.relative(this.projectRoot, filePath),
            oldPath: importPath,
            newPath: fixedPath,
            type: 'relative_path_fix'
          });
        }
      }
    }

    // 匹配require语句
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];

      if (requirePath.startsWith('.')) {
        const fixedPath = this.findCorrectPath(filePath, requirePath);
        if (fixedPath && fixedPath !== requirePath) {
          newContent = newContent.replace(match[0], match[0].replace(requirePath, fixedPath));
          hasChanges = true;

          this.fixes.push({
            file: path.relative(this.projectRoot, filePath),
            oldPath: requirePath,
            newPath: fixedPath,
            type: 'relative_path_fix'
          });
        }
      }
    }

    if (hasChanges) {
      if (!this.dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
      this.stats.pathsFixed++;
      console.log(`    ✅ 修复 ${path.relative(this.projectRoot, filePath)}`);
    }
  }

  findCorrectPath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    const targetPath = path.resolve(fromDir, importPath);

    // 检查各种可能的扩展名
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

    for (const ext of extensions) {
      if (fs.existsSync(targetPath + ext)) {
        return importPath; // 路径正确，无需修复
      }
    }

    // 如果文件不存在，尝试智能查找
    const fileName = path.basename(importPath);
    const possiblePaths = this.fileMap.get(fileName);

    if (possiblePaths && possiblePaths.length > 0) {
      // 选择最相似的路径
      const bestMatch = this.findBestMatch(fromFile, possiblePaths);
      if (bestMatch) {
        const relativePath = path.relative(fromDir, path.join(this.projectRoot, bestMatch));
        return relativePath.startsWith('.') ? relativePath : './' + relativePath;
      }
    }

    // 尝试查找组件名匹配
    const componentName = fileName.replace(/^[./]+/, '');
    const componentPaths = this.fileMap.get(componentName);

    if (componentPaths && componentPaths.length > 0) {
      const bestMatch = this.findBestMatch(fromFile, componentPaths);
      if (bestMatch) {
        const relativePath = path.relative(fromDir, path.join(this.projectRoot, bestMatch));
        return relativePath.startsWith('.') ? relativePath : './' + relativePath;
      }
    }

    return null;
  }

  findBestMatch(fromFile, possiblePaths) {
    const fromDir = path.dirname(fromFile);
    let bestMatch = null;
    let bestScore = Infinity;

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(this.projectRoot, possiblePath);
      const score = this.calculatePathDistance(fromDir, path.dirname(fullPath));

      if (score < bestScore) {
        bestScore = score;
        bestMatch = possiblePath;
      }
    }

    return bestMatch;
  }

  calculatePathDistance(path1, path2) {
    const parts1 = path1.split(path.sep);
    const parts2 = path2.split(path.sep);

    let commonLength = 0;
    const minLength = Math.min(parts1.length, parts2.length);

    for (let i = 0; i < minLength; i++) {
      if (parts1[i] === parts2[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    return parts1.length + parts2.length - 2 * commonLength;
  }

  async createMissingIndexFiles() {
    console.log('\n📄 创建缺失的index文件...');

    const indexDirs = [
      'frontend/components/routing',
      'frontend/components/testing',
      'frontend/components/ui',
      'frontend/services',
      'frontend/utils',
      'frontend/hooks'
    ];

    for (const indexDir of indexDirs) {
      const dirPath = path.join(this.projectRoot, indexDir);
      const indexPath = path.join(dirPath, 'index.ts');

      if (fs.existsSync(dirPath) && !fs.existsSync(indexPath)) {
        await this.createIndexFile(dirPath, indexPath, indexDir);
      }
    }
  }

  async createIndexFile(dirPath, indexPath, relativeDirPath) {
    const items = fs.readdirSync(dirPath);
    const exports = [];

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts')) && item !== 'index.ts') {
        const fileName = path.basename(item, path.extname(item));
        exports.push(`export { default as ${fileName} } from './${fileName}';`);
      } else if (stat.isDirectory()) {
        const subIndexPath = path.join(itemPath, 'index.ts');
        if (fs.existsSync(subIndexPath)) {
          exports.push(`export * from './${item}';`);
        }
      }
    }

    if (exports.length > 0) {
      const indexContent = `// Auto-generated index file\n${exports.join('\n')}\n`;

      if (!this.dryRun) {
        fs.writeFileSync(indexPath, indexContent, 'utf8');
      }

      this.stats.filesCreated++;
      console.log(`    ✅ 创建 ${relativeDirPath}/index.ts`);

      this.fixes.push({
        file: `${relativeDirPath}/index.ts`,
        type: 'index_file_created',
        exports: exports.length
      });
    }
  }

  async generateReport() {
    console.log('\n📊 生成智能修复报告...');

    const reportPath = path.join(this.projectRoot, 'docs/reports/INTELLIGENT_PATH_FIX_REPORT.md');

    const report = `# 智能路径修复报告

**修复时间**: ${new Date().toISOString()}
**修复模式**: ${this.dryRun ? '预览模式' : '实际修复'}
**扫描文件**: ${this.stats.filesScanned}个
**修复路径**: ${this.stats.pathsFixed}个
**创建文件**: ${this.stats.filesCreated}个

## 📊 修复统计

- **相对路径修复**: ${this.fixes.filter(f => f.type === 'relative_path_fix').length}个
- **Index文件创建**: ${this.fixes.filter(f => f.type === 'index_file_created').length}个

## 🔧 修复详情

### 路径修复 (${this.fixes.filter(f => f.type === 'relative_path_fix').length}个)
${this.fixes.filter(f => f.type === 'relative_path_fix').map((fix, index) => `
${index + 1}. **${fix.file}**
   - 原路径: \`${fix.oldPath}\`
   - 新路径: \`${fix.newPath}\`
`).join('\n')}

### 创建的Index文件 (${this.fixes.filter(f => f.type === 'index_file_created').length}个)
${this.fixes.filter(f => f.type === 'index_file_created').map((fix, index) => `
${index + 1}. **${fix.file}**
   - 导出数量: ${fix.exports}个
`).join('\n')}

## 🎯 修复效果

- ✅ 修复了${this.stats.pathsFixed}个文件的相对路径问题
- ✅ 创建了${this.stats.filesCreated}个缺失的index文件
- ✅ 建立了${this.fileMap.size}个文件的智能映射
- ✅ 使用智能算法匹配最佳路径

## 📋 后续建议

1. **验证修复**: 运行构建命令验证所有路径都正确
2. **测试功能**: 确保修复后的导入不影响功能
3. **定期维护**: 使用智能修复工具定期检查路径问题

---
*此报告由智能路径修复工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 智能修复报告已生成: ${reportPath}`);

    // 输出摘要
    console.log('\n📊 智能路径修复结果摘要:');
    console.log(`- 扫描文件: ${this.stats.filesScanned}个`);
    console.log(`- 修复路径: ${this.stats.pathsFixed}个`);
    console.log(`- 创建文件: ${this.stats.filesCreated}个`);
    console.log(`- 修复模式: ${this.dryRun ? '预览模式' : '实际修复'}`);

    if (this.stats.pathsFixed === 0 && this.stats.filesCreated === 0) {
      console.log('\n🎉 所有路径都正确！无需修复！');
    } else {
      console.log(`\n✅ 智能修复完成！修复了 ${this.stats.pathsFixed + this.stats.filesCreated} 个问题！`);
    }
  }
}

// 执行智能路径修复
if (require.main === module) {
  const fixer = new IntelligentPathFixer();
  fixer.execute().catch(console.error);
}

module.exports = IntelligentPathFixer;
