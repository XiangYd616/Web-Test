#!/usr/bin/env node

/**
 * 导入路径分析脚本
 * 检查项目中的导入路径使用情况，识别绝对路径和相对路径的混合使用
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

// 分析结果
const analysisResults = {
  totalFiles: 0,
  absolutePathImports: [],
  relativePathImports: [],
  mixedUsageFiles: [],
  pathAliasUsage: [],
  inconsistentPaths: [],
  errors: []
};

/**
 * 获取所有需要分析的文件
 */
function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过不需要的目录
        if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'].includes(file)) {
          getAllFiles(filePath, fileList);
        }
      } else {
        // 只处理指定扩展名的文件
        if (FILE_EXTENSIONS.includes(path.extname(file))) {
          fileList.push(filePath);
        }
      }
    });
  } catch (error) {
    analysisResults.errors.push(`扫描目录失败 ${dir}: ${error.message}`);
  }
  
  return fileList;
}

/**
 * 分析单个文件的导入路径
 */
function analyzeFileImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    // 匹配所有导入语句
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
    
    const imports = [];
    let match;
    
    // 提取静态导入
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // 提取动态导入
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    if (imports.length === 0) return null;
    
    const fileAnalysis = {
      file: relativePath,
      imports: [],
      hasAbsolutePaths: false,
      hasRelativePaths: false,
      hasPathAliases: false,
      inconsistencies: []
    };
    
    imports.forEach(importPath => {
      const importInfo = analyzeImportPath(importPath, filePath);
      fileAnalysis.imports.push(importInfo);
      
      if (importInfo.type === 'absolute') {
        fileAnalysis.hasAbsolutePaths = true;
      } else if (importInfo.type === 'relative') {
        fileAnalysis.hasRelativePaths = true;
      } else if (importInfo.type === 'alias') {
        fileAnalysis.hasPathAliases = true;
      }
    });
    
    // 检查混合使用
    if ((fileAnalysis.hasAbsolutePaths || fileAnalysis.hasPathAliases) && fileAnalysis.hasRelativePaths) {
      analysisResults.mixedUsageFiles.push(fileAnalysis);
    }
    
    return fileAnalysis;
    
  } catch (error) {
    analysisResults.errors.push(`分析文件失败 ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * 分析单个导入路径
 */
function analyzeImportPath(importPath, filePath) {
  const importInfo = {
    path: importPath,
    type: 'unknown',
    isLocal: false,
    resolvedPath: null
  };
  
  // 第三方包
  if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
    importInfo.type = 'package';
    return importInfo;
  }
  
  // 路径别名 (@/ 开头)
  if (importPath.startsWith('@/')) {
    importInfo.type = 'alias';
    importInfo.isLocal = true;
    importInfo.resolvedPath = importPath.replace('@/', 'src/');
    analysisResults.pathAliasUsage.push({
      file: path.relative(PROJECT_ROOT, filePath),
      import: importPath
    });
    return importInfo;
  }
  
  // 绝对路径 (/ 开头)
  if (importPath.startsWith('/')) {
    importInfo.type = 'absolute';
    importInfo.isLocal = true;
    analysisResults.absolutePathImports.push({
      file: path.relative(PROJECT_ROOT, filePath),
      import: importPath
    });
    return importInfo;
  }
  
  // 相对路径 (./ 或 ../ 开头)
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    importInfo.type = 'relative';
    importInfo.isLocal = true;
    
    try {
      const currentDir = path.dirname(filePath);
      const resolvedPath = path.resolve(currentDir, importPath);
      importInfo.resolvedPath = path.relative(PROJECT_ROOT, resolvedPath);
    } catch (error) {
      // 忽略解析错误
    }
    
    analysisResults.relativePathImports.push({
      file: path.relative(PROJECT_ROOT, filePath),
      import: importPath,
      resolved: importInfo.resolvedPath
    });
    return importInfo;
  }
  
  return importInfo;
}

/**
 * 检查路径一致性
 */
function checkPathConsistency() {
  const pathMappings = new Map();
  
  // 收集所有导入的目标文件
  [...analysisResults.relativePathImports, ...analysisResults.pathAliasUsage].forEach(item => {
    const targetFile = item.resolved || item.import.replace('@/', 'src/');
    
    if (!pathMappings.has(targetFile)) {
      pathMappings.set(targetFile, []);
    }
    
    pathMappings.get(targetFile).push({
      sourceFile: item.file,
      importPath: item.import,
      type: item.import.startsWith('@/') ? 'alias' : 'relative'
    });
  });
  
  // 检查同一文件是否被不同方式导入
  pathMappings.forEach((imports, targetFile) => {
    const hasAlias = imports.some(imp => imp.type === 'alias');
    const hasRelative = imports.some(imp => imp.type === 'relative');
    
    if (hasAlias && hasRelative) {
      analysisResults.inconsistentPaths.push({
        targetFile,
        imports: imports
      });
    }
  });
}

/**
 * 生成分析报告
 */
function generateReport() {
  console.log('\n📊 导入路径分析报告\n');
  console.log('='.repeat(50));
  
  console.log(`\n📈 总体统计:`);
  console.log(`- 分析文件总数: ${analysisResults.totalFiles}`);
  console.log(`- 使用相对路径的导入: ${analysisResults.relativePathImports.length}`);
  console.log(`- 使用路径别名的导入: ${analysisResults.pathAliasUsage.length}`);
  console.log(`- 使用绝对路径的导入: ${analysisResults.absolutePathImports.length}`);
  console.log(`- 混合使用路径的文件: ${analysisResults.mixedUsageFiles.length}`);
  console.log(`- 路径不一致的文件: ${analysisResults.inconsistentPaths.length}`);
  
  if (analysisResults.pathAliasUsage.length > 0) {
    console.log(`\n🔗 路径别名使用情况:`);
    const aliasFiles = [...new Set(analysisResults.pathAliasUsage.map(item => item.file))];
    aliasFiles.slice(0, 10).forEach(file => {
      const aliases = analysisResults.pathAliasUsage
        .filter(item => item.file === file)
        .map(item => item.import);
      console.log(`  📄 ${file}`);
      aliases.slice(0, 3).forEach(alias => {
        console.log(`    - ${alias}`);
      });
      if (aliases.length > 3) {
        console.log(`    ... 还有 ${aliases.length - 3} 个别名导入`);
      }
    });
    
    if (aliasFiles.length > 10) {
      console.log(`  ... 还有 ${aliasFiles.length - 10} 个文件使用路径别名`);
    }
  }
  
  if (analysisResults.mixedUsageFiles.length > 0) {
    console.log(`\n⚠️  混合使用路径的文件:`);
    analysisResults.mixedUsageFiles.slice(0, 5).forEach(file => {
      console.log(`  📄 ${file.file}`);
      console.log(`    - 相对路径: ${file.hasRelativePaths ? '✓' : '✗'}`);
      console.log(`    - 路径别名: ${file.hasPathAliases ? '✓' : '✗'}`);
      console.log(`    - 绝对路径: ${file.hasAbsolutePaths ? '✓' : '✗'}`);
    });
    
    if (analysisResults.mixedUsageFiles.length > 5) {
      console.log(`  ... 还有 ${analysisResults.mixedUsageFiles.length - 5} 个文件`);
    }
  }
  
  if (analysisResults.inconsistentPaths.length > 0) {
    console.log(`\n🚨 路径不一致的文件:`);
    analysisResults.inconsistentPaths.slice(0, 3).forEach(inconsistency => {
      console.log(`  🎯 目标文件: ${inconsistency.targetFile}`);
      inconsistency.imports.forEach(imp => {
        console.log(`    📄 ${imp.sourceFile} -> ${imp.importPath} (${imp.type})`);
      });
      console.log('');
    });
  }
  
  if (analysisResults.errors.length > 0) {
    console.log(`\n❌ 错误信息:`);
    analysisResults.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  console.log(`\n💡 建议:`);
  if (analysisResults.pathAliasUsage.length > 0 && analysisResults.relativePathImports.length > 0) {
    console.log(`  - 项目同时使用了路径别名(@/)和相对路径`);
    console.log(`  - 建议统一使用相对路径以提高可移植性`);
    console.log(`  - 或者完全迁移到路径别名以简化导入`);
  }
  
  if (analysisResults.mixedUsageFiles.length > 0) {
    console.log(`  - 发现 ${analysisResults.mixedUsageFiles.length} 个文件混合使用不同的导入方式`);
    console.log(`  - 建议在单个文件内保持导入方式的一致性`);
  }
  
  if (analysisResults.inconsistentPaths.length > 0) {
    console.log(`  - 发现 ${analysisResults.inconsistentPaths.length} 个文件被不同方式导入`);
    console.log(`  - 建议统一同一文件的导入方式`);
  }
  
  console.log('\n='.repeat(50));
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始分析项目导入路径...\n');
  
  // 获取所有文件
  const allFiles = getAllFiles(path.join(PROJECT_ROOT, 'src'));
  analysisResults.totalFiles = allFiles.length;
  
  console.log(`📁 找到 ${allFiles.length} 个源文件`);
  
  // 分析每个文件
  allFiles.forEach(filePath => {
    analyzeFileImports(filePath);
  });
  
  // 检查路径一致性
  checkPathConsistency();
  
  // 生成报告
  generateReport();
}

// 运行分析
if (require.main === module) {
  main();
}

module.exports = {
  analyzeFileImports,
  analyzeImportPath,
  checkPathConsistency
};
