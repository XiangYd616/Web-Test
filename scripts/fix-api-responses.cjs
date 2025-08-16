#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ApiResponseFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
    this.totalReplacements = 0;
  }

  /**
   * 执行API响应格式修复
   */
  async execute() {
    console.log('🔧 开始修复API响应格式...\n');

    try {
      // 获取所有需要修复的文件
      const files = this.getApiFiles();
      
      for (const file of files) {
        await this.fixFile(file);
      }

      this.generateReport();

    } catch (error) {
      console.error('❌ API响应格式修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let replacements = 0;

      // 修复模式1: res.status(401).json({ success: false, ... }) -> res.unauthorized(...)
      const unauthorizedPattern = /res\.status\(401\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(unauthorizedPattern, (match, message) => {
        replacements++;
        return `res.unauthorized('${message}')`;
      });

      // 修复模式2: res.status(403).json({ success: false, ... }) -> res.forbidden(...)
      const forbiddenPattern = /res\.status\(403\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(forbiddenPattern, (match, message) => {
        replacements++;
        return `res.forbidden('${message}')`;
      });

      // 修复模式3: res.status(404).json({ success: false, ... }) -> res.notFound(...)
      const notFoundPattern = /res\.status\(404\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(notFoundPattern, (match, message) => {
        replacements++;
        return `res.notFound('资源', '${message}')`;
      });

      // 修复模式4: res.status(400).json({ success: false, ... }) -> res.validationError(...)
      const validationPattern = /res\.status\(400\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(validationPattern, (match, message) => {
        replacements++;
        return `res.validationError([], '${message}')`;
      });

      // 修复模式5: res.status(409).json({ success: false, ... }) -> res.conflict(...)
      const conflictPattern = /res\.status\(409\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(conflictPattern, (match, message) => {
        replacements++;
        return `res.conflict('资源', '${message}')`;
      });

      // 修复模式6: res.status(500).json({ success: false, ... }) -> res.serverError(...)
      const serverErrorPattern = /res\.status\(500\)\.json\(\s*{\s*success:\s*false,\s*(?:error:\s*['"`][^'"`]*['"`],\s*)?message:\s*['"`]([^'"`]*)['"`][^}]*}\s*\)/g;
      newContent = newContent.replace(serverErrorPattern, (match, message) => {
        replacements++;
        return `res.serverError('${message}')`;
      });

      // 修复模式7: res.json({ success: true, ... }) -> res.success(...)
      const successPattern = /res\.json\(\s*{\s*success:\s*true,\s*(?:message:\s*['"`]([^'"`]*)['"`],\s*)?([^}]+)}\s*\)/g;
      newContent = newContent.replace(successPattern, (match, message, dataContent) => {
        replacements++;
        // 提取数据部分
        const dataMatch = dataContent.match(/(\w+):\s*([^,}]+)/);
        if (dataMatch) {
          const dataValue = dataMatch[2].trim();
          return message ? 
            `res.success(${dataValue}, '${message}')` : 
            `res.success(${dataValue})`;
        }
        return message ? 
          `res.success(null, '${message}')` : 
          `res.success(null)`;
      });

      // 修复模式8: 简单的成功响应
      const simpleSuccessPattern = /res\.json\(\s*{\s*success:\s*true,\s*message:\s*['"`]([^'"`]*)['"`]\s*}\s*\)/g;
      newContent = newContent.replace(simpleSuccessPattern, (match, message) => {
        replacements++;
        return `res.success(null, '${message}')`;
      });

      if (replacements > 0) {
        fs.writeFileSync(filePath, newContent);
        this.fixedFiles.push({
          file: path.relative(this.projectRoot, filePath),
          replacements
        });
        this.totalReplacements += replacements;
        console.log(`✅ 修复 ${path.relative(this.projectRoot, filePath)}: ${replacements} 处替换`);
      }

    } catch (error) {
      console.log(`❌ 修复文件失败: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 获取所有API文件
   */
  getApiFiles() {
    const files = [];
    const apiDirs = [
      path.join(this.projectRoot, 'backend/routes'),
      path.join(this.projectRoot, 'backend/controllers'),
      path.join(this.projectRoot, 'backend/api')
    ];

    for (const dir of apiDirs) {
      if (fs.existsSync(dir)) {
        this.walkDir(dir, files);
      }
    }

    return files;
  }

  /**
   * 递归遍历目录
   */
  walkDir(dir, files) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (this.shouldSkipDirectory(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.walkDir(fullPath, files);
        } else if (/\.(js|ts)$/.test(item)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'api-response-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.fixedFiles.length,
        totalReplacements: this.totalReplacements
      },
      fixedFiles: this.fixedFiles
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 API响应格式修复报告:');
    console.log(`   修复文件数: ${this.fixedFiles.length}`);
    console.log(`   总替换数: ${this.totalReplacements}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.fixedFiles.length > 0) {
      console.log('📋 修复详情:');
      this.fixedFiles.forEach(({ file, replacements }) => {
        console.log(`   ${file}: ${replacements} 处修复`);
      });
    }
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new ApiResponseFixer();
  fixer.execute().catch(error => {
    console.error('❌ API响应格式修复失败:', error);
    process.exit(1);
  });
}

module.exports = ApiResponseFixer;
