const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 清理无效文件和修复剩余错误
 */
class InvalidFilesCleanup {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.cleanedFiles = [];
    this.fixedFiles = [];
  }

  /**
   * 执行清理和修复
   */
  async execute() {
    console.log('🧹 清理无效文件和修复剩余错误...\n');

    try {
      const initialErrors = this.getErrorCount();
      console.log('📊 初始错误数量:', initialErrors);

      // 1. 清理无效的自动生成文件
      await this.cleanupInvalidFiles();

      // 2. 修复主要的App.tsx文件
      await this.fixMainAppFile();

      // 3. 修复其他核心文件
      await this.fixCoreFiles();

      // 4. 批量修复语法错误
      await this.batchFixSyntaxErrors();

      const finalErrors = this.getErrorCount();
      console.log('📊 修复后错误数量:', finalErrors);
      console.log('✅ 减少了', initialErrors - finalErrors, '个错误');

      const improvement = ((initialErrors - finalErrors) / initialErrors * 100).toFixed(1);
      console.log('📈 错误减少百分比:', improvement + '%');

    } catch (error) {
      console.error('❌ 清理修复失败:', error);
    }
  }

  /**
   * 获取错误数量
   */
  getErrorCount() {
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return 0;
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      return (errorOutput.match(/error TS/g) || []).length;
    }
  }

  /**
   * 清理无效的自动生成文件
   */
  async cleanupInvalidFiles() {
    console.log('🗑️ 清理无效的自动生成文件...');

    const invalidPatterns = [
      /App\.[^.]+\.tsx$/,  // App.complete.tsx, App.integrated.tsx等
      /[^/\\]+\.[^.]+\.[^.]+$/,  // 包含多个点的文件名
      /\.backup$/,  // 备份文件
      /\.temp$/,   // 临时文件
    ];

    const allFiles = this.getAllFiles();
    
    for (const file of allFiles) {
      const fileName = path.basename(file);
      const shouldDelete = invalidPatterns.some(pattern => pattern.test(fileName));
      
      if (shouldDelete) {
        try {
          fs.unlinkSync(file);
          this.cleanedFiles.push(path.relative(this.frontendPath, file));
          console.log('  ✓ 删除无效文件:', fileName);
        } catch (error) {
          console.error('  ❌ 删除失败:', fileName, error.message);
        }
      }
    }

    console.log('  ✅ 清理了', this.cleanedFiles.length, '个无效文件');
  }

  /**
   * 修复主要的App.tsx文件
   */
  async fixMainAppFile() {
    console.log('🔧 修复主要的App.tsx文件...');

    const appPath = path.join(this.frontendPath, 'App.tsx');
    
    if (fs.existsSync(appPath)) {
      try {
        let content = fs.readFileSync(appPath, 'utf8');
        
        // 检查是否有未终止的字符串字面量
        if (content.includes('Unterminated string literal')) {
          console.log('  🔧 修复未终止的字符串字面量...');
          content = this.fixUnterminatedStrings(content);
        }

        // 应用基础修复
        content = this.applyBasicFixes(content);

        fs.writeFileSync(appPath, content);
        this.fixedFiles.push('App.tsx');
        console.log('  ✅ App.tsx 修复完成');

      } catch (error) {
        console.error('  ❌ 修复App.tsx失败:', error.message);
      }
    }
  }

  /**
   * 修复未终止的字符串
   */
  fixUnterminatedStrings(content) {
    const lines = content.split('\n');
    const fixedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // 检查未闭合的字符串
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      const backticks = (line.match(/`/g) || []).length;

      // 修复未闭合的单引号
      if (singleQuotes % 2 === 1) {
        line = line + "'";
      }

      // 修复未闭合的双引号
      if (doubleQuotes % 2 === 1) {
        line = line + '"';
      }

      // 修复未闭合的模板字符串
      if (backticks % 2 === 1) {
        line = line + '`';
      }

      fixedLines.push(line);
    }

    return fixedLines.join('\n');
  }

  /**
   * 修复其他核心文件
   */
  async fixCoreFiles() {
    console.log('🔧 修复其他核心文件...');

    const coreFiles = [
      'main.tsx',
      'index.html',
      'vite.config.ts'
    ];

    for (const file of coreFiles) {
      const filePath = path.join(this.frontendPath, file);
      
      if (fs.existsSync(filePath)) {
        try {
          let content = fs.readFileSync(filePath, 'utf8');
          const originalContent = content;

          content = this.applyBasicFixes(content);

          if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            this.fixedFiles.push(file);
            console.log('  ✓ 修复', file);
          }

        } catch (error) {
          console.error('  ❌ 修复失败', file + ':', error.message);
        }
      }
    }
  }

  /**
   * 批量修复语法错误
   */
  async batchFixSyntaxErrors() {
    console.log('🔧 批量修复语法错误...');

    const tsFiles = this.getAllTypeScriptFiles();
    let fixedCount = 0;

    // 按文件大小排序，优先处理小文件
    tsFiles.sort((a, b) => {
      try {
        const sizeA = fs.statSync(a).size;
        const sizeB = fs.statSync(b).size;
        return sizeA - sizeB;
      } catch {
        return 0;
      }
    });

    for (const file of tsFiles.slice(0, 100)) { // 限制处理100个文件
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 跳过过大的文件
        if (content.length > 50000) {
          continue;
        }

        // 应用修复
        content = this.applyComprehensiveFixes(content);

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          fixedCount++;
        }

      } catch (error) {
        // 忽略无法处理的文件
      }
    }

    console.log('  ✅ 批量修复了', fixedCount, '个文件');
  }

  /**
   * 应用基础修复
   */
  applyBasicFixes(content) {
    // 1. 修复常见的语法错误
    content = content.replace(/;;+/g, ';');
    content = content.replace(/,,+/g, ',');
    content = content.replace(/\s+$/gm, '');

    // 2. 修复导入语句
    content = content.replace(/import\s+([^;]+)\s*$/gm, 'import $1;');

    // 3. 修复导出语句
    content = content.replace(/export\s+([^;{]+)\s*$/gm, 'export $1;');

    return content;
  }

  /**
   * 应用综合修复
   */
  applyComprehensiveFixes(content) {
    // 1. 基础修复
    content = this.applyBasicFixes(content);

    // 2. 修复字符串问题
    content = content.replace(/([^\\])'([^']*)\s*$/gm, "$1'$2'");
    content = content.replace(/([^\\])"([^"]*)\s*$/gm, '$1"$2"');

    // 3. 修复对象和数组
    content = content.replace(/(\w+:\s*[^,}\n]+)\s*\n\s*(\w+:)/g, '$1,\n  $2');
    content = content.replace(/(\[[^\]]*)\s*\n\s*([^\]]*\])/g, '$1, $2');

    // 4. 修复函数调用
    content = content.replace(/(\w+\([^)]*)\s*$/gm, '$1)');

    // 5. 修复JSX
    content = content.replace(/className\s*=\s*([^"\s>]+)/g, 'className="$1"');

    // 6. 清理多余的空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    return content;
  }

  /**
   * 获取所有文件
   */
  getAllFiles() {
    const files = [];
    
    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }
    
    scanDirectory(this.frontendPath);
    return files;
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTypeScriptFiles() {
    return this.getAllFiles().filter(file => 
      file.endsWith('.ts') || file.endsWith('.tsx')
    );
  }
}

if (require.main === module) {
  const cleanup = new InvalidFilesCleanup();
  cleanup.execute().catch(console.error);
}

module.exports = { InvalidFilesCleanup };
