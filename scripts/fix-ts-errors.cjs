const fs = require('fs');
const path = require('path');

// 递归查找所有 TypeScript 和 JSX 文件
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules') {
      findTsFiles(fullPath, files);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 移除未使用的导入
function removeUnusedImports(content) {
  const lines = content.split('\n');
  const usedImports = new Set();
  const importLines = [];
  const nonImportLines = [];
  
  // 分离导入行和非导入行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('import ')) {
      importLines.push({ line, index: i });
    } else {
      nonImportLines.push(line);
    }
  }
  
  const bodyContent = nonImportLines.join('\n');
  
  // 处理导入行
  const filteredImportLines = [];
  
  for (const { line } of importLines) {
    // 跳过整个模块导入（如 import './styles.css'）
    if (line.match(/import\s+['"][^'"]+['"];?\s*$/)) {
      filteredImportLines.push(line);
      continue;
    }
    
    // 跳过 type-only 导入中的完全未使用的导入
    if (line.includes('import type {') && line.includes('} from')) {
      const match = line.match(/import type \{([^}]+)\} from/);
      if (match) {
        const imports = match[1].split(',').map(imp => imp.trim());
        const usedInBody = imports.filter(imp => {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
          return bodyContent.includes(cleanImp);
        });
        
        if (usedInBody.length === 0) {
          continue; // 跳过完全未使用的 type import
        } else if (usedInBody.length < imports.length) {
          // 只保留使用的导入
          const newLine = line.replace(/\{[^}]+\}/, `{ ${usedInBody.join(', ')} }`);
          filteredImportLines.push(newLine);
        } else {
          filteredImportLines.push(line);
        }
      } else {
        filteredImportLines.push(line);
      }
      continue;
    }
    
    // 处理普通导入
    if (line.includes('import {') && line.includes('} from')) {
      const match = line.match(/import \{([^}]+)\} from (.+)/);
      if (match) {
        const imports = match[1].split(',').map(imp => imp.trim());
        const fromPart = match[2];
        const usedInBody = imports.filter(imp => {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
          return bodyContent.includes(cleanImp);
        });
        
        if (usedInBody.length === 0) {
          continue; // 跳过完全未使用的导入
        } else if (usedInBody.length < imports.length) {
          // 只保留使用的导入
          const newLine = `import { ${usedInBody.join(', ')} } from ${fromPart}`;
          filteredImportLines.push(newLine);
        } else {
          filteredImportLines.push(line);
        }
      } else {
        filteredImportLines.push(line);
      }
    } else {
      // 其他类型的导入（default, namespace 等）
      filteredImportLines.push(line);
    }
  }
  
  return [...filteredImportLines, ...nonImportLines].join('\n');
}

// 修复未使用变量问题
function fixUnusedVariables(content) {
  const fixes = [
    // 未使用的参数，添加下划线前缀
    { 
      pattern: /\(([^)]+)\)\s*=>\s*\{/g,
      fix: (match, params) => {
        const fixedParams = params.split(',').map(p => {
          const trimmed = p.trim();
          if (trimmed && !trimmed.startsWith('_')) {
            return '_' + trimmed;
          }
          return trimmed;
        }).join(', ');
        return `(${fixedParams}) => {`;
      }
    },
    // useCallback, useMemo 等未使用的变量
    { 
      pattern: /const\s+\[([^,]+),\s*([^]]+)\]\s*=\s*useState/g,
      fix: (match, getter, setter) => {
        if (content.includes(setter.trim()) || content.includes(getter.trim())) {
          return match; // 如果使用了就不改
        }
        return `const [_${getter.trim()}, _${setter.trim()}] = useState`;
      }
    }
  ];

  let result = content;
  for (const { pattern, fix } of fixes) {
    if (typeof fix === 'function') {
      result = result.replace(pattern, fix);
    } else {
      result = result.replace(pattern, fix);
    }
  }
  
  return result;
}

// 修复空值检查问题
function fixNullCheckIssues(content) {
  const fixes = [
    // 修复可能为 undefined 的数组访问
    { 
      pattern: /(\w+)\[(\d+)\]\.(\w+)/g,
      fix: '$1[$2]?.$3'
    },
    // 修复可能为 undefined 的对象访问
    { 
      pattern: /(\w+)\.split\('T'\)\[0\]\.replace/g,
      fix: '$1.split(\'T\')[0]?.replace'
    }
  ];

  let result = content;
  for (const { pattern, fix } of fixes) {
    result = result.replace(pattern, fix);
  }
  
  return result;
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let fixedContent = content;
    
    // 应用修复
    fixedContent = removeUnusedImports(fixedContent);
    // fixedContent = fixUnusedVariables(fixedContent); // 暂时禁用，可能过于激进
    // fixedContent = fixNullCheckIssues(fixedContent);
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      console.log(`✅ 修复: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 错误处理文件 ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🔧 开始自动修复 TypeScript 错误...\n');
  
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ frontend 目录不存在');
    process.exit(1);
  }
  
  const tsFiles = findTsFiles(frontendDir);
  console.log(`📄 找到 ${tsFiles.length} 个 TypeScript 文件\n`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    if (processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ 自动修复完成！共处理 ${fixedCount} 个文件`);
  console.log('\n⚠️ 建议运行 `yarn type-check` 检查剩余错误');
}

main();
