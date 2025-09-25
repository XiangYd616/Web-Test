#!/usr/bin/env node

/**
 * 依赖检查脚本
 * 检查项目中的循环依赖、未使用导入等问题
 */

const fs = require('fs');
const path = require('path');

class DependencyChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = {
      circularDeps: [],
      unusedImports: [],
      missingFiles: [],
      inconsistentPaths: []
    };
  }

  /**
   * 检查所有依赖问题
   */
  async checkAll() {
    console.log('🔍 开始检查项目依赖...\n');

    await this.checkImportPaths();
    await this.checkUnusedImports();
    await this.generateReport();
  }

  /**
   * 检查导入路径
   */
  async checkImportPaths() {
    
    const files = this.getAllTSFiles();
    let checkedCount = 0;
    let issueCount = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content);
        
        for (const importInfo of imports) {
          const resolvedPath = this.resolveImportPath(file, importInfo.path);
          
          if (!this.fileExists(resolvedPath)) {
            this.issues.missingFiles.push({
              file: path.relative(this.projectRoot, file),
              import: importInfo.path,
              line: importInfo.line
            });
            issueCount++;
          }
        }
        
        checkedCount++;
      } catch (error) {
      }
    }

  }

  /**
   * 检查未使用的导入
   */
  async checkUnusedImports() {
    
    const files = this.getAllTSFiles();
    let checkedCount = 0;
    let unusedCount = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content);
        
        for (const importInfo of imports) {
          if (importInfo.named && importInfo.named.length > 0) {
            for (const namedImport of importInfo.named) {
              if (!this.isImportUsed(content, namedImport, importInfo.line)) {
                this.issues.unusedImports.push({
                  file: path.relative(this.projectRoot, file),
                  import: namedImport,
                  line: importInfo.line
                });
                unusedCount++;
              }
            }
          }
        }
        
        checkedCount++;
      } catch (error) {
      }
    }

  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSFiles() {
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
   * 提取文件中的导入语句
   */
  extractImports(content) {
    const imports = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配 import 语句
      const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"`](.+?)['"`]/);
      if (importMatch) {
        const importClause = importMatch[1];
        const importPath = importMatch[2];
        
        const importInfo = {
          line: i + 1,
          path: importPath,
          raw: line
        };

        // 解析命名导入
        const namedMatch = importClause.match(/\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
          importInfo.named = namedMatch[1]
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        }

        // 解析默认导入
        const defaultMatch = importClause.match(/^([^{,]+)/);
        if (defaultMatch) {
          importInfo.default = defaultMatch[1].trim();
        }

        imports.push(importInfo);
      }
    }
    
    return imports;
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(fromFile, importPath) {
    if (importPath.startsWith('.')) {
      // 相对路径
      const fromDir = path.dirname(fromFile);
      let resolved = path.resolve(fromDir, importPath);
      
      // 尝试添加扩展名
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved;
      }
      
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
      
      // 尝试 index 文件
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        for (const ext of extensions) {
          const indexFile = path.join(resolved, 'index' + ext);
          if (fs.existsSync(indexFile)) {
            return indexFile;
          }
        }
      }
    }
    
    return null; // 无法解析的路径
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath) {
    return filePath && fs.existsSync(filePath);
  }

  /**
   * 检查导入是否被使用
   */
  isImportUsed(content, importName, importLine) {
    const lines = content.split('\n');
    
    // 跳过导入行本身
    for (let i = 0; i < lines.length; i++) {
      if (i + 1 === importLine) continue;
      
      const line = lines[i];
      
      // 简单的使用检查（可能有误报）
      if (line.includes(importName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 生成检查报告
   */
  async generateReport() {
    console.log('📊 生成依赖检查报告...\n');

    const totalIssues = 
      this.issues.missingFiles.length + 
      this.issues.unusedImports.length;


    // 缺失文件
    if (this.issues.missingFiles.length > 0) {
      this.issues.missingFiles.slice(0, 10).forEach(issue => {
      });
      if (this.issues.missingFiles.length > 10) {
      }
    }

    // 可能未使用的导入
    if (this.issues.unusedImports.length > 0) {
      this.issues.unusedImports.slice(0, 10).forEach(issue => {
      });
      if (this.issues.unusedImports.length > 10) {
      }
    }

    // 总结
    console.log('📊 检查总结:');

    if (totalIssues === 0) {
    } else {
      if (this.issues.missingFiles.length > 0) {
      }
      if (this.issues.unusedImports.length > 0) {
      }
    }

  }
}

// 运行检查
if (require.main === module) {
  const checker = new DependencyChecker();
  checker.checkAll().catch(console.error);
}

module.exports = DependencyChecker;
