#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DocumentationMaintenance {
  constructor() {
    this.projectRoot = process.cwd();
    this.docsDir = path.join(this.projectRoot, 'docs');
    this.archiveDir = path.join(this.docsDir, 'archive');
    this.dryRun = process.argv.includes('--dry-run');
    this.actions = [];
  }

  /**
   * 执行文档维护
   */
  async execute() {
    console.log(`📚 开始文档维护${this.dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      // 1. 检查文档结构
      await this.checkDocumentStructure();

      // 2. 清理临时文件
      await this.cleanupTemporaryFiles();

      // 3. 验证文档链接
      await this.validateDocumentLinks();

      // 4. 更新文档索引
      await this.updateDocumentIndex();

      // 5. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 文档维护过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查文档结构
   */
  async checkDocumentStructure() {
    console.log('🔍 检查文档结构...');

    const requiredDocs = [
      'README.md',
      'INDEX.md',
      'PROJECT_STRUCTURE.md',
      'API_DOCUMENTATION.md',
      'DEVELOPMENT_GUIDELINES.md',
      'DEPLOYMENT_README.md'
    ];

    const missingDocs = [];
    
    for (const doc of requiredDocs) {
      const docPath = path.join(this.docsDir, doc);
      if (!fs.existsSync(docPath)) {
        missingDocs.push(doc);
      }
    }

    if (missingDocs.length > 0) {
      console.log(`   ⚠️  缺少文档: ${missingDocs.join(', ')}`);
      this.actions.push({
        type: 'warning',
        message: `缺少必要文档: ${missingDocs.join(', ')}`
      });
    } else {
      console.log('   ✅ 所有必要文档都存在');
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTemporaryFiles() {
    console.log('🧹 清理临时文件...');

    const temporaryPatterns = [
      /.*REPORT.*\.md$/,
      /.*COMPLETION.*\.md$/,
      /.*CLEANUP.*\.md$/,
      /.*TEMP.*\.md$/,
      /.*\.tmp$/,
      /.*\.bak$/
    ];

    const files = fs.readdirSync(this.docsDir);
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.docsDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const isTemporary = temporaryPatterns.some(pattern => pattern.test(file));
        
        if (isTemporary) {
          const archivePath = path.join(this.archiveDir, file);
          
          if (!this.dryRun) {
            // 确保archive目录存在
            if (!fs.existsSync(this.archiveDir)) {
              fs.mkdirSync(this.archiveDir, { recursive: true });
            }
            
            // 移动到archive目录
            fs.renameSync(filePath, archivePath);
          }
          
          console.log(`   ${this.dryRun ? '[预览]' : '✅'} 归档临时文件: ${file}`);
          cleanedCount++;
          
          this.actions.push({
            type: 'archive',
            file: file,
            reason: '临时报告文件'
          });
        }
      }
    }

    console.log(`   📊 处理了 ${cleanedCount} 个临时文件\n`);
  }

  /**
   * 验证文档链接
   */
  async validateDocumentLinks() {
    console.log('🔗 验证文档链接...');

    const markdownFiles = this.getMarkdownFiles(this.docsDir);
    let brokenLinks = 0;

    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const links = this.extractMarkdownLinks(content);
      
      for (const link of links) {
        if (this.isInternalLink(link)) {
          const linkPath = this.resolveLinkPath(file, link);
          
          if (!fs.existsSync(linkPath)) {
            console.log(`   ❌ 断开的链接: ${path.relative(this.docsDir, file)} -> ${link}`);
            brokenLinks++;
            
            this.actions.push({
              type: 'broken_link',
              file: path.relative(this.docsDir, file),
              link: link
            });
          }
        }
      }
    }

    if (brokenLinks === 0) {
      console.log('   ✅ 所有内部链接都有效');
    } else {
      console.log(`   ⚠️  发现 ${brokenLinks} 个断开的链接`);
    }
  }

  /**
   * 更新文档索引
   */
  async updateDocumentIndex() {
    console.log('📋 更新文档索引...');

    const indexPath = path.join(this.docsDir, 'INDEX.md');
    if (!fs.existsSync(indexPath)) {
      console.log('   ⚠️  INDEX.md 不存在，跳过更新');
      return;
    }

    // 获取所有文档文件
    const docs = this.getMarkdownFiles(this.docsDir)
      .filter(file => !file.includes('archive'))
      .map(file => path.relative(this.docsDir, file))
      .filter(file => file !== 'INDEX.md')
      .sort();

    console.log(`   📊 发现 ${docs.length} 个文档文件`);
    
    this.actions.push({
      type: 'index_update',
      count: docs.length,
      files: docs
    });
  }

  /**
   * 获取所有Markdown文件
   */
  getMarkdownFiles(dir) {
    const files = [];
    
    const walkDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
          walkDir(fullPath);
        } else if (stat.isFile() && item.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    };

    walkDir(dir);
    return files;
  }

  /**
   * 提取Markdown链接
   */
  extractMarkdownLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }

    return links;
  }

  /**
   * 判断是否为内部链接
   */
  isInternalLink(link) {
    return !link.startsWith('http') && !link.startsWith('mailto:') && !link.startsWith('#');
  }

  /**
   * 解析链接路径
   */
  resolveLinkPath(fromFile, link) {
    const fromDir = path.dirname(fromFile);
    return path.resolve(fromDir, link);
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'docs-maintenance-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalActions: this.actions.length,
        archives: this.actions.filter(a => a.type === 'archive').length,
        warnings: this.actions.filter(a => a.type === 'warning').length,
        brokenLinks: this.actions.filter(a => a.type === 'broken_link').length
      },
      actions: this.actions
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 文档维护报告:');
    console.log(`   总操作数: ${report.summary.totalActions}`);
    console.log(`   归档文件: ${report.summary.archives}`);
    console.log(`   警告数量: ${report.summary.warnings}`);
    console.log(`   断开链接: ${report.summary.brokenLinks}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行脚本
if (require.main === module) {
  const maintenance = new DocumentationMaintenance();
  maintenance.execute().catch(error => {
    console.error('❌ 文档维护失败:', error);
    process.exit(1);
  });
}

module.exports = DocumentationMaintenance;
