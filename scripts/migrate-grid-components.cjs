#!/usr/bin/env node

/**
 * Grid 组件自动迁移脚本
 * 将旧版 MUI Grid 使用方式迁移到新的 GridWrapper
 * 
 * 使用方法:
 * node scripts/migrate-grid-components.js [--dry-run] [--file=path/to/file.tsx]
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  dryRun: process.argv.includes('--dry-run'),
  targetFile: process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1],
  searchDir: path.join(__dirname, '../frontend'),
  excludeDirs: ['node_modules', 'dist', '.git'],
};

// 统计信息
const stats = {
  filesScanned: 0,
  filesModified: 0,
  gridsReplaced: 0,
  errors: [],
};

/**
 * 检查文件是否应该处理
 */
function shouldProcessFile(filePath) {
  if (!filePath.match(/\.(tsx|jsx)$/)) return false;
  
  const relativePath = path.relative(config.searchDir, filePath);
  return !config.excludeDirs.some(dir => relativePath.includes(dir));
}

/**
 * 扫描目录查找所有符合条件的文件
 */
function scanDirectory(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!config.excludeDirs.includes(item)) {
          files.push(...scanDirectory(fullPath));
        }
      } else if (shouldProcessFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * 检查文件是否使用了 MUI Grid
 */
function usesGrid(content) {
  return content.includes('from \'@mui/material\'') && 
         (content.includes('<Grid') || content.includes('Grid item') || content.includes('Grid container'));
}

/**
 * 检查是否已经使用了 GridWrapper
 */
function usesGridWrapper(content) {
  return content.includes('from \'../components/ui/GridWrapper\'') ||
         content.includes('from \'@/components/ui/GridWrapper\'');
}

/**
 * 迁移文件内容
 */
function migrateContent(content, filePath) {
  let modified = false;
  let newContent = content;
  let replacements = 0;

  // 如果已经使用 GridWrapper，跳过
  if (usesGridWrapper(content)) {
    return { content: newContent, modified: false, replacements: 0 };
  }

  // 如果不使用 Grid，跳过
  if (!usesGrid(content)) {
    return { content: newContent, modified: false, replacements: 0 };
  }

  // 计算相对路径
  const fileDir = path.dirname(filePath);
  const uiDir = path.join(config.searchDir, 'components', 'ui');
  const relativePath = path.relative(fileDir, uiDir).replace(/\\/g, '/');
  const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;

  // Step 1: 更新导入语句
  const muiImportRegex = /import\s+{\s*([^}]*Grid[^}]*)\s*}\s+from\s+['"]@mui\/material['"]/g;
  const matches = [...content.matchAll(muiImportRegex)];
  
  if (matches.length > 0) {
    // 移除 Grid 从 MUI 导入
    newContent = newContent.replace(muiImportRegex, (match, imports) => {
      const importList = imports.split(',').map(i => i.trim()).filter(i => i && i !== 'Grid');
      if (importList.length === 0) {
        return ''; // 如果只导入了 Grid，删除整行
      }
      return `import { ${importList.join(', ')} } from '@mui/material'`;
    });

    // 添加 GridWrapper 导入
    const gridWrapperImport = `import { Grid } from '${importPath}/GridWrapper';\n`;
    
    // 找到第一个 import 语句的位置
    const firstImportMatch = newContent.match(/import\s+.*?from\s+['"].*?['"]/);
    if (firstImportMatch) {
      const insertPos = firstImportMatch.index + firstImportMatch[0].length + 1;
      newContent = newContent.slice(0, insertPos) + gridWrapperImport + newContent.slice(insertPos);
    } else {
      // 如果没有找到 import，插入到文件开头
      newContent = gridWrapperImport + newContent;
    }

    modified = true;
    replacements++;
  }

  return { content: newContent, modified, replacements };
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = migrateContent(content, filePath);
    
    if (result.modified) {
      stats.filesModified++;
      stats.gridsReplaced += result.replacements;
      
      console.log(`✓ ${path.relative(config.searchDir, filePath)}`);
      console.log(`  - ${result.replacements} Grid import(s) migrated`);
      
      if (!config.dryRun) {
        fs.writeFileSync(filePath, result.content, 'utf-8');
      }
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ ${path.relative(config.searchDir, filePath)}: ${error.message}`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 Grid Component Migration Tool\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }

  // 获取要处理的文件列表
  let files;
  if (config.targetFile) {
    const targetPath = path.resolve(config.targetFile);
    if (fs.existsSync(targetPath)) {
      files = [targetPath];
      console.log(`Processing single file: ${targetPath}\n`);
    } else {
      console.error(`Error: File not found: ${targetPath}`);
      process.exit(1);
    }
  } else {
    console.log(`Scanning directory: ${config.searchDir}\n`);
    files = scanDirectory(config.searchDir);
    console.log(`Found ${files.length} files to check\n`);
  }

  // 处理文件
  files.forEach(processFile);

  // 输出统计信息
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files scanned:    ${stats.filesScanned}`);
  console.log(`Files modified:   ${stats.filesModified}`);
  console.log(`Grids migrated:   ${stats.gridsReplaced}`);
  console.log(`Errors:           ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${path.relative(config.searchDir, file)}: ${error}`);
    });
  }

  if (config.dryRun && stats.filesModified > 0) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  console.log('='.repeat(60) + '\n');
}

// 运行脚本
main();

