#!/usr/bin/env node

/**
 * 重复导入检查工具
 * 检测项目中的重复导入、循环导入和无用导入
 */

const fs = require('fs');
const path = require('path');

class DuplicateImportChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = {
      duplicateImports: [],
      circularImports: [],
      unusedImports: [],
      conflictingImports: [],
      selfImports: []
    };
    this.fileImports = new Map();
    this.importGraph = new Map();
  }

  /**
   * 开始检查
   */
  async check() {
    console.log('🔍 开始检查重复导入问题...\n');
    
    // 1. 扫描所有文件的导入
    await this.scanAllImports();
    
    // 2. 检测各种导入问题
    this.detectDuplicateImports();
    this.detectCircularImports();
    this.detectSelfImports();
    this.detectConflictingImports();
    
    // 3. 生成报告
    this.generateReport();
    
    console.log(`\n✅ 检查完成！`);
    console.log(`   检查文件: ${this.fileImports.size} 个`);
    console.log(`   发现问题: ${this.getTotalIssues()} 个`);
  }

  /**
   * 扫描所有文件的导入
   */
  async scanAllImports() {
    console.log('📂 扫描文件导入...');
    
    const files = this.getAllTSXFiles();
    let scannedCount = 0;
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content, file);
        const relativePath = path.relative(this.frontendPath, file);
        
        this.fileImports.set(relativePath, imports);
        this.buildImportGraph(relativePath, imports);
        
        scannedCount++;
      } catch (error) {
        console.log(`   ⚠️ 无法读取文件: ${file}`);
      }
    }
    
    console.log(`   ✅ 扫描了 ${scannedCount} 个文件\n`);
  }

  /**
   * 提取文件中的导入语句
   */
  extractImports(content, filePath) {
    const imports = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配各种导入格式
      const importPatterns = [
        /^import\s+(.+?)\s+from\s+['"`](.+?)['"`]/,
        /^import\s+['"`](.+?)['"`]/,
        /^import\s*\(\s*['"`](.+?)['"`]\s*\)/
      ];
      
      for (const pattern of importPatterns) {
        const match = line.match(pattern);
        if (match) {
          const importPath = match[2] || match[1];
          const importNames = match[1] ? this.parseImportNames(match[1]) : [];
          
          imports.push({
            line: i + 1,
            raw: line,
            path: importPath,
            names: importNames,
            isRelative: importPath.startsWith('.'),
            isTypeOnly: line.includes('import type')
          });
          break;
        }
      }
    }
    
    return imports;
  }

  /**
   * 解析导入的名称
   */
  parseImportNames(importStr) {
    const names = [];
    
    // 默认导入
    const defaultMatch = importStr.match(/^([^{,]+?)(?:\s*,|$)/);
    if (defaultMatch && !defaultMatch[1].includes('{')) {
      names.push({
        name: defaultMatch[1].trim(),
        type: 'default'
      });
    }
    
    // 命名导入
    const namedMatch = importStr.match(/\{([^}]+)\}/);
    if (namedMatch) {
      const namedImports = namedMatch[1].split(',');
      for (const namedImport of namedImports) {
        const cleanName = namedImport.trim().split(' as ')[0].trim();
        if (cleanName) {
          names.push({
            name: cleanName,
            type: 'named'
          });
        }
      }
    }
    
    return names;
  }

  /**
   * 构建导入图
   */
  buildImportGraph(filePath, imports) {
    if (!this.importGraph.has(filePath)) {
      this.importGraph.set(filePath, new Set());
    }
    
    for (const imp of imports) {
      if (imp.isRelative) {
        const resolvedPath = this.resolveImportPath(filePath, imp.path);
        if (resolvedPath) {
          this.importGraph.get(filePath).add(resolvedPath);
        }
      }
    }
  }

  /**
   * 解析相对导入路径
   */
  resolveImportPath(fromFile, importPath) {
    try {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(path.join(this.frontendPath, fromDir), importPath);
      const relativePath = path.relative(this.frontendPath, resolved);
      
      // 尝试不同的扩展名
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const fullPath = path.join(this.frontendPath, relativePath + ext);
        if (fs.existsSync(fullPath)) {
          return relativePath + ext;
        }
      }
      
      // 尝试index文件
      const indexPath = path.join(this.frontendPath, relativePath, 'index.ts');
      if (fs.existsSync(indexPath)) {
        return path.join(relativePath, 'index.ts');
      }
      
      const indexTsxPath = path.join(this.frontendPath, relativePath, 'index.tsx');
      if (fs.existsSync(indexTsxPath)) {
        return path.join(relativePath, 'index.tsx');
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检测重复导入
   */
  detectDuplicateImports() {
    console.log('🔍 检测重复导入...');
    
    for (const [filePath, imports] of this.fileImports) {
      const importPaths = new Map();
      
      for (const imp of imports) {
        const key = imp.path;
        
        if (importPaths.has(key)) {
          this.issues.duplicateImports.push({
            file: filePath,
            path: imp.path,
            lines: [importPaths.get(key), imp.line],
            imports: [importPaths.get(key), imp]
          });
        } else {
          importPaths.set(key, imp.line);
        }
      }
    }
    
    console.log(`   发现重复导入: ${this.issues.duplicateImports.length} 个`);
  }

  /**
   * 检测循环导入
   */
  detectCircularImports() {
    console.log('🔍 检测循环导入...');
    
    const visited = new Set();
    const recursionStack = new Set();
    
    for (const filePath of this.importGraph.keys()) {
      if (!visited.has(filePath)) {
        this.detectCircularImportsRecursive(filePath, visited, recursionStack, []);
      }
    }
    
    console.log(`   发现循环导入: ${this.issues.circularImports.length} 个`);
  }

  /**
   * 递归检测循环导入
   */
  detectCircularImportsRecursive(filePath, visited, recursionStack, path) {
    visited.add(filePath);
    recursionStack.add(filePath);
    path.push(filePath);
    
    const dependencies = this.importGraph.get(filePath) || new Set();
    
    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        this.detectCircularImportsRecursive(dep, visited, recursionStack, [...path]);
      } else if (recursionStack.has(dep)) {
        // 找到循环
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart).concat([dep]);
        
        this.issues.circularImports.push({
          cycle: cycle,
          description: `循环导入: ${cycle.join(' → ')}`
        });
      }
    }
    
    recursionStack.delete(filePath);
  }

  /**
   * 检测自导入
   */
  detectSelfImports() {
    console.log('🔍 检测自导入...');
    
    for (const [filePath, imports] of this.fileImports) {
      for (const imp of imports) {
        if (imp.isRelative) {
          const resolvedPath = this.resolveImportPath(filePath, imp.path);
          if (resolvedPath === filePath) {
            this.issues.selfImports.push({
              file: filePath,
              line: imp.line,
              import: imp.raw
            });
          }
        }
      }
    }
    
    console.log(`   发现自导入: ${this.issues.selfImports.length} 个`);
  }

  /**
   * 检测冲突导入
   */
  detectConflictingImports() {
    console.log('🔍 检测冲突导入...');
    
    for (const [filePath, imports] of this.fileImports) {
      const nameMap = new Map();
      
      for (const imp of imports) {
        for (const name of imp.names) {
          const key = name.name;
          
          if (nameMap.has(key)) {
            const existing = nameMap.get(key);
            if (existing.path !== imp.path) {
              this.issues.conflictingImports.push({
                file: filePath,
                name: key,
                imports: [existing, { path: imp.path, line: imp.line }]
              });
            }
          } else {
            nameMap.set(key, { path: imp.path, line: imp.line });
          }
        }
      }
    }
    
    console.log(`   发现冲突导入: ${this.issues.conflictingImports.length} 个`);
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSXFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 获取总问题数
   */
  getTotalIssues() {
    return this.issues.duplicateImports.length +
           this.issues.circularImports.length +
           this.issues.selfImports.length +
           this.issues.conflictingImports.length;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 重复导入检查报告:');
    console.log('='.repeat(60));
    
    // 重复导入
    if (this.issues.duplicateImports.length > 0) {
      console.log('\n❌ 重复导入问题:');
      this.issues.duplicateImports.forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}`);
        console.log(`     路径: ${issue.path}`);
        console.log(`     行号: ${issue.lines.join(', ')}`);
      });
    }
    
    // 循环导入
    if (this.issues.circularImports.length > 0) {
      console.log('\n🔄 循环导入问题:');
      this.issues.circularImports.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.description}`);
      });
    }
    
    // 自导入
    if (this.issues.selfImports.length > 0) {
      console.log('\n🔁 自导入问题:');
      this.issues.selfImports.forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.import}`);
      });
    }
    
    // 冲突导入
    if (this.issues.conflictingImports.length > 0) {
      console.log('\n⚡ 冲突导入问题:');
      this.issues.conflictingImports.forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}`);
        console.log(`     名称: ${issue.name}`);
        console.log(`     冲突路径: ${issue.imports.map(i => `${i.path}:${i.line}`).join(' vs ')}`);
      });
    }
    
    // 总结
    if (this.getTotalIssues() === 0) {
      console.log('\n✅ 没有发现重复导入问题！');
    } else {
      console.log('\n📈 问题统计:');
      console.log(`   重复导入: ${this.issues.duplicateImports.length} 个`);
      console.log(`   循环导入: ${this.issues.circularImports.length} 个`);
      console.log(`   自导入: ${this.issues.selfImports.length} 个`);
      console.log(`   冲突导入: ${this.issues.conflictingImports.length} 个`);
      console.log(`   总计: ${this.getTotalIssues()} 个问题`);
    }
  }
}

// 运行检查工具
if (require.main === module) {
  const checker = new DuplicateImportChecker();
  checker.check().catch(console.error);
}

module.exports = DuplicateImportChecker;
