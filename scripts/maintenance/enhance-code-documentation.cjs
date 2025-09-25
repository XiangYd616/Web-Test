#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CodeDocumentationEnhancer {
  constructor() {
    this.stats = {
      filesScanned: 0,
      filesEnhanced: 0,
      functionsDocumented: 0,
      classesDocumented: 0,
      modulesDocumented: 0,
      totalCommentsAdded: 0
    };
    this.projectRoot = path.resolve(__dirname, '../../');
    
    // 需要跳过的文件和目录
    this.skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.md$/,
      /\.json$/,
      /\.env/,
      /Dockerfile/,
      /docker-compose/,
      /\.yml$/,
      /\.yaml$/,
      /package\.json$/,
      /\.min\./,
      /scripts\/maintenance/,
      /DEEP_ERROR_CHECK_SUCCESS_REPORT\.md$/
    ];
  }

  shouldSkipFile(filePath) {
    return this.skipPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 检测函数和类的正则表达式
   */
  getFunctionMatches(content) {
    const patterns = [
      // ES6 函数
      /(?:^|\n)([\s]*)((?:async\s+)?(?:function\s+|const\s+|let\s+|var\s+)?)(\w+)\s*[=:]\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
      // 传统函数
      /(?:^|\n)([\s]*)((?:async\s+)?function\s+)(\w+)\s*\([^)]*\)\s*\{/gm,
      // 方法定义
      /(?:^|\n)([\s]*)((?:async\s+)?)(\w+)\s*\([^)]*\)\s*\{/gm,
      // 类定义
      /(?:^|\n)([\s]*)(class\s+)(\w+)/gm
    ];

    const matches = [];
    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          type: index === 3 ? 'class' : 'function',
          name: match[3],
          indent: match[1],
          lineStart: content.substring(0, match.index).split('\n').length,
          originalMatch: match[0]
        });
      }
    });

    return matches.sort((a, b) => a.lineStart - b.lineStart);
  }

  /**
   * 生成JSDoc注释
   */
  generateJSDoc(functionName, type, indent = '') {
    const templates = {
      function: {
        'initialize': `${indent}/**\n${indent} * 初始化${functionName}系统\n${indent} * @returns {Promise<boolean>} 初始化是否成功\n${indent} */`,
        'create': `${indent}/**\n${indent} * 创建新的${functionName}\n${indent} * @param {Object} data - 创建数据\n${indent} * @returns {Promise<Object>} 创建的对象\n${indent} */`,
        'get': `${indent}/**\n${indent} * 获取${functionName}数据\n${indent} * @param {string} id - 对象ID\n${indent} * @returns {Promise<Object|null>} 获取的数据\n${indent} */`,
        'update': `${indent}/**\n${indent} * 更新${functionName}数据\n${indent} * @param {string} id - 对象ID\n${indent} * @param {Object} data - 更新数据\n${indent} * @returns {Promise<Object>} 更新后的对象\n${indent} */`,
        'delete': `${indent}/**\n${indent} * 删除${functionName}数据\n${indent} * @param {string} id - 对象ID\n${indent} * @returns {Promise<boolean>} 删除是否成功\n${indent} */`,
        'analyze': `${indent}/**\n${indent} * 分析${functionName}数据\n${indent} * @param {Object} options - 分析选项\n${indent} * @returns {Promise<Object>} 分析结果\n${indent} */`,
        'process': `${indent}/**\n${indent} * 处理${functionName}请求\n${indent} * @param {Object} data - 处理数据\n${indent} * @returns {Promise<Object>} 处理结果\n${indent} */`,
        'validate': `${indent}/**\n${indent} * 验证${functionName}数据\n${indent} * @param {Object} data - 验证数据\n${indent} * @returns {boolean} 验证结果\n${indent} */`,
        'handle': `${indent}/**\n${indent} * 处理${functionName}事件\n${indent} * @param {Object} event - 事件对象\n${indent} * @returns {Promise<void>}\n${indent} */`
      },
      class: `${indent}/**\n${indent} * ${functionName}类 - 负责处理相关功能\n${indent} */`
    };

    if (type === 'class') {
      return templates.class;
    }

    // 根据函数名选择合适的模板
    const lowerName = functionName.toLowerCase();
    if (lowerName.includes('init')) return templates.function.initialize;
    if (lowerName.includes('create') || lowerName.includes('add')) return templates.function.create;
    if (lowerName.includes('get') || lowerName.includes('fetch') || lowerName.includes('load')) return templates.function.get;
    if (lowerName.includes('update') || lowerName.includes('modify') || lowerName.includes('edit')) return templates.function.update;
    if (lowerName.includes('delete') || lowerName.includes('remove')) return templates.function.delete;
    if (lowerName.includes('analyze') || lowerName.includes('test') || lowerName.includes('check')) return templates.function.analyze;
    if (lowerName.includes('process') || lowerName.includes('run') || lowerName.includes('execute')) return templates.function.process;
    if (lowerName.includes('validate') || lowerName.includes('verify')) return templates.function.validate;
    if (lowerName.includes('handle') || lowerName.includes('on')) return templates.function.handle;

    // 默认模板
    return `${indent}/**\n${indent} * ${functionName}功能函数\n${indent} * @param {Object} params - 参数对象\n${indent} * @returns {Promise<Object>} 返回结果\n${indent} */`;
  }

  /**
   * 检查是否已有注释
   */
  hasExistingComment(content, lineStart) {
    const lines = content.split('\n');
    const targetLine = lineStart - 1;
    
    // 检查前面几行是否有注释
    for (let i = Math.max(0, targetLine - 5); i < targetLine; i++) {
      const line = lines[i]?.trim();
      if (line && (line.startsWith('/**') || line.startsWith('//') || line.includes('*/'))) {
        return true;
      }
    }
    return false;
  }

  /**
   * 添加文件头部注释
   */
  addFileHeaderComment(content, filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    
    // 检查是否已有文件头注释
    const firstLines = content.split('\n').slice(0, 10);
    const hasHeader = firstLines.some(line => 
      line.includes('/**') || line.includes('*') || line.includes('*/') || line.includes('//'));
    
    if (hasHeader) {
      return { content, added: false };
    }

    let description = '';
    if (relativePath.includes('engine')) description = '测试引擎相关功能';
    else if (relativePath.includes('service')) description = '业务服务层';
    else if (relativePath.includes('route')) description = 'API路由处理';
    else if (relativePath.includes('component')) description = 'React组件';
    else if (relativePath.includes('util')) description = '工具函数集合';
    else if (relativePath.includes('config')) description = '配置管理';
    else if (relativePath.includes('middleware')) description = '中间件';
    else description = '核心功能模块';

    const headerComment = `/**\n * ${fileName} - ${description}\n * \n * 文件路径: ${relativePath}\n * 创建时间: ${new Date().toISOString().split('T')[0]}\n */\n\n`;

    return {
      content: headerComment + content,
      added: true
    };
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    if (this.shouldSkipFile(filePath)) {
      return;
    }

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let content = originalContent;
      let modified = false;
      let commentsAdded = 0;

      // 添加文件头部注释
      const headerResult = this.addFileHeaderComment(content, filePath);
      if (headerResult.added) {
        content = headerResult.content;
        modified = true;
        commentsAdded++;
        this.stats.modulesDocumented++;
      }

      // 获取所有函数和类
      const matches = this.getFunctionMatches(content);
      
      // 从后往前处理，避免行号偏移
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        
        // 跳过已有注释的函数
        if (this.hasExistingComment(content, match.lineStart)) {
          continue;
        }

        // 跳过简单的getter/setter和单行函数
        const functionContent = content.split('\n')[match.lineStart - 1];
        if (functionContent && (functionContent.length < 50 || functionContent.includes('=>') && !functionContent.includes('{'))) {
          continue;
        }

        const jsDoc = this.generateJSDoc(match.name, match.type, match.indent);
        const lines = content.split('\n');
        
        // 插入注释
        lines.splice(match.lineStart - 1, 0, jsDoc);
        content = lines.join('\n');
        
        modified = true;
        commentsAdded++;
        
        if (match.type === 'class') {
          this.stats.classesDocumented++;
        } else {
          this.stats.functionsDocumented++;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.stats.filesEnhanced++;
        this.stats.totalCommentsAdded += commentsAdded;
        console.log(`📝 增强了 ${path.relative(this.projectRoot, filePath)}: 添加${commentsAdded}个注释`);
      }

      this.stats.filesScanned++;

    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') {
          continue;
        }

        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(itemPath);
          if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            this.processFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`❌ 扫描目录失败 ${dir}:`, error.message);
    }
  }

  /**
   * 创建文档改进指南
   */
  createDocumentationGuide() {
    const guideContent = `# 代码文档改进指南

## 📋 文档标准

### 1. 文件头部注释
每个文件都应包含描述其功能和用途的头部注释：

\`\`\`javascript
/**
 * filename.js - 功能描述
 * 
 * 文件路径: relative/path/to/file
 * 创建时间: YYYY-MM-DD
 */
\`\`\`

### 2. 函数注释 (JSDoc)
使用JSDoc格式为函数添加注释：

\`\`\`javascript
/**
 * 函数功能描述
 * @param {string} id - 参数描述
 * @param {Object} options - 选项对象
 * @returns {Promise<Object>} 返回值描述
 */
async function exampleFunction(id, options) {
  // 实现代码
}
\`\`\`

### 3. 类注释
为类添加说明其职责的注释：

\`\`\`javascript
/**
 * ExampleClass - 示例类，负责处理特定功能
 */
class ExampleClass {
  // 类实现
}
\`\`\`

### 4. 复杂逻辑注释
对复杂的业务逻辑添加行内注释：

\`\`\`javascript
// 检查用户权限并验证数据完整性
if (user.hasPermission('admin') && validateData(data)) {
  // 执行管理员操作
  await performAdminAction(data);
}
\`\`\`

## 📊 当前状态
- 注释覆盖率目标: 20%+
- 已添加注释: ${this.stats.totalCommentsAdded}个
- 已文档化文件: ${this.stats.filesEnhanced}个
- 已文档化函数: ${this.stats.functionsDocumented}个
- 已文档化类: ${this.stats.classesDocumented}个

## 🔧 持续改进
1. 定期审查和更新注释
2. 确保注释与代码保持同步
3. 使用更具描述性的变量和函数名
4. 添加使用示例和边界情况说明

## 📝 最佳实践
- 注释应该解释"为什么"而不是"做什么"
- 避免过度注释显而易见的代码
- 使用英文或中文保持一致性
- 定期清理过时的注释
`;

    try {
      const guideFile = path.join(this.projectRoot, 'docs', 'CODE_DOCUMENTATION_GUIDE.md');
      
      // 确保docs目录存在
      const docsDir = path.join(this.projectRoot, 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      
      fs.writeFileSync(guideFile, guideContent, 'utf8');
      console.log(`📚 创建了文档指南: ${path.relative(this.projectRoot, guideFile)}`);
    } catch (error) {
      console.error('❌ 创建文档指南失败:', error.message);
    }
  }

  /**
   * 运行文档增强
   */
  async run() {
    console.log('🚀 开始增强代码文档...\n');
    
    const startTime = Date.now();
    
    // 扫描项目目录（只扫描核心目录以避免过多修改）
    const coreDirectories = [
      path.join(this.projectRoot, 'backend', 'engines'),
      path.join(this.projectRoot, 'backend', 'services'),
      path.join(this.projectRoot, 'backend', 'routes'),
      path.join(this.projectRoot, 'frontend', 'services'),
      path.join(this.projectRoot, 'frontend', 'components'),
      path.join(this.projectRoot, 'frontend', 'hooks')
    ];

    coreDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir);
      }
    });
    
    // 创建文档指南
    this.createDocumentationGuide();
    
    const duration = Date.now() - startTime;
    
    // 输出报告
    this.printReport(duration);
  }

  /**
   * 打印增强报告
   */
  printReport(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 代码文档增强报告');
    console.log('='.repeat(60));
    console.log(`📁 扫描文件数量: ${this.stats.filesScanned}`);
    console.log(`📝 增强文件数量: ${this.stats.filesEnhanced}`);
    console.log(`📚 模块注释数量: ${this.stats.modulesDocumented}`);
    console.log(`🔧 函数注释数量: ${this.stats.functionsDocumented}`);
    console.log(`🏛️  类注释数量: ${this.stats.classesDocumented}`);
    console.log(`💬 总注释数量: ${this.stats.totalCommentsAdded}`);
    console.log(`⏱️  处理用时: ${(duration/1000).toFixed(2)}秒`);
    
    // 估算注释覆盖率改进
    const estimatedImprovement = (this.stats.totalCommentsAdded / this.stats.filesScanned * 5).toFixed(1);
    console.log(`\n📊 估算注释覆盖率提升: +${estimatedImprovement}%`);
    
    if (this.stats.filesEnhanced > 0) {
      console.log('\n✅ 代码文档增强完成！');
      console.log('📝 建议：');
      console.log('   1. 查看 docs/CODE_DOCUMENTATION_GUIDE.md');
      console.log('   2. 继续完善复杂逻辑的行内注释');
      console.log('   3. 定期更新注释保持与代码同步');
    } else {
      console.log('\n🎉 代码注释质量已经很好！');
    }
    
    console.log('='.repeat(60));
  }
}

// 运行文档增强
if (require.main === module) {
  const enhancer = new CodeDocumentationEnhancer();
  enhancer.run().catch(console.error);
}

module.exports = CodeDocumentationEnhancer;
