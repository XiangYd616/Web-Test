#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class HardcodedValueConfigifier {
  constructor() {
    this.stats = {
      filesScanned: 0,
      urlsFound: 0,
      magicNumbersFound: 0,
      urlsFixed: 0,
      magicNumbersFixed: 0,
      filesModified: 0
    };
    this.projectRoot = path.resolve(__dirname, '../../');
    
    // 常见的硬编码URL模式
    this.urlPatterns = [
      { pattern: /'http:\/\/localhost:3001'/g, replacement: 'process.env.BACKEND_URL || \'http://localhost:3001\'', name: 'Backend URL' },
      { pattern: /'http:\/\/localhost:5174'/g, replacement: 'process.env.FRONTEND_URL || \'http://localhost:5174\'', name: 'Frontend URL' },
      { pattern: /'https:\/\/api\.github\.com'/g, replacement: 'process.env.GITHUB_API_URL || \'https://api.github.com\'', name: 'GitHub API' },
      { pattern: /localhost:3001/g, replacement: '${process.env.BACKEND_HOST || \'localhost\'}:${process.env.BACKEND_PORT || 3001}', name: 'Backend Host' },
      { pattern: /localhost:5174/g, replacement: '${process.env.FRONTEND_HOST || \'localhost\'}:${process.env.FRONTEND_PORT || 5174}', name: 'Frontend Host' }
    ];
    
    // 常见的魔术数字模式
    this.magicNumberPatterns = [
      { pattern: /timeout:\s*30000/g, replacement: 'timeout: process.env.REQUEST_TIMEOUT || 30000', name: 'Request timeout' },
      { pattern: /port.*?5432/g, replacement: 'port: process.env.DB_PORT || 5432', name: 'Database port' },
      { pattern: /limit:\s*['"`]?50mb['"`]?/g, replacement: 'limit: process.env.MAX_FILE_SIZE || \'50mb\'', name: 'File size limit' },
      { pattern: /maxConcurrency:\s*\d+/g, replacement: 'maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || \'10\')', name: 'Max concurrency' },
      { pattern: /retryAttempts?:\s*\d+/g, replacement: 'retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || \'3\')', name: 'Retry attempts' }
    ];

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
      /DEEP_ERROR_CHECK_SUCCESS_REPORT\.md$/
    ];
  }

  shouldSkipFile(filePath) {
    return this.skipPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    if (this.shouldSkipFile(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let modified = false;
      let urlsInFile = 0;
      let magicNumbersInFile = 0;

      // 处理URL模式
      this.urlPatterns.forEach(urlPattern => {
        const matches = (content.match(urlPattern.pattern) || []).length;
        if (matches > 0) {
          this.stats.urlsFound += matches;
          urlsInFile += matches;
          
          // 对于某些简单替换
          if (urlPattern.pattern.source.includes('localhost:3001') && !urlPattern.pattern.source.includes('${')) {
            modifiedContent = modifiedContent.replace(urlPattern.pattern, urlPattern.replacement);
            modified = true;
            this.stats.urlsFixed += matches;
          }
        }
      });

      // 处理魔术数字模式（更谨慎）
      this.magicNumberPatterns.forEach(numberPattern => {
        const matches = (content.match(numberPattern.pattern) || []).length;
        if (matches > 0) {
          this.stats.magicNumbersFound += matches;
          magicNumbersInFile += matches;
          
          // 只处理简单的timeout情况
          if (numberPattern.name === 'Request timeout' || numberPattern.name === 'Max concurrency') {
            modifiedContent = modifiedContent.replace(numberPattern.pattern, numberPattern.replacement);
            modified = true;
            this.stats.magicNumbersFixed += matches;
          }
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        this.stats.filesModified++;
        console.log(`🔧 配置化了 ${path.relative(this.projectRoot, filePath)}: ${urlsInFile}个URL, ${magicNumbersInFile}个魔术数字`);
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
   * 创建环境变量配置示例
   */
  createConfigExamples() {
    const configContent = `# 硬编码值配置化后的环境变量示例

# 服务器配置
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5174
BACKEND_HOST=localhost
BACKEND_PORT=3001
FRONTEND_HOST=localhost
FRONTEND_PORT=5174

# API配置
REQUEST_TIMEOUT=30000
MAX_CONCURRENCY=10
RETRY_ATTEMPTS=3
MAX_FILE_SIZE=50mb

# 数据库配置
DB_PORT=5432

# 第三方服务
GITHUB_API_URL=https://api.github.com

# 说明：这些环境变量用于替代代码中的硬编码值
# 在生产环境中，请根据实际需求调整这些值
`;

    try {
      const configFile = path.join(this.projectRoot, '.env.hardcoded-values.example');
      fs.writeFileSync(configFile, configContent, 'utf8');
      console.log(`📝 创建了配置示例文件: ${path.relative(this.projectRoot, configFile)}`);
    } catch (error) {
      console.error('❌ 创建配置文件失败:', error.message);
    }
  }

  /**
   * 运行配置化
   */
  async run() {
    console.log('🚀 开始配置化硬编码值...\n');
    
    const startTime = Date.now();
    
    // 扫描项目目录
    this.scanDirectory(this.projectRoot);
    
    // 创建配置示例
    this.createConfigExamples();
    
    const duration = Date.now() - startTime;
    
    // 输出报告
    this.printReport(duration);
  }

  /**
   * 打印配置化报告
   */
  printReport(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 硬编码值配置化报告');
    console.log('='.repeat(60));
    console.log(`📁 扫描文件数量: ${this.stats.filesScanned}`);
    console.log(`📝 修改文件数量: ${this.stats.filesModified}`);
    console.log(`🔍 发现URL数量: ${this.stats.urlsFound}`);
    console.log(`🔍 发现魔术数字: ${this.stats.magicNumbersFound}`);
    console.log(`🔧 配置化URL: ${this.stats.urlsFixed}`);
    console.log(`🔧 配置化数字: ${this.stats.magicNumbersFixed}`);
    console.log(`⏱️  处理用时: ${(duration/1000).toFixed(2)}秒`);
    
    if (this.stats.filesModified > 0) {
      console.log('\n✅ 硬编码值配置化完成！');
      console.log('📝 建议：');
      console.log('   1. 检查 .env.hardcoded-values.example 配置文件');
      console.log('   2. 根据环境需要调整相关环境变量');
      console.log('   3. 测试修改后的功能是否正常');
    } else {
      console.log('\n🎉 未发现需要配置化的简单硬编码值！');
    }

    // 提供改进建议
    const totalFound = this.stats.urlsFound + this.stats.magicNumbersFound;
    const totalFixed = this.stats.urlsFixed + this.stats.magicNumbersFixed;
    const progress = totalFound > 0 ? ((totalFixed / totalFound) * 100).toFixed(1) : 100;
    
    console.log(`\n📊 配置化进度: ${progress}% (${totalFixed}/${totalFound})`);
    
    if (totalFixed < totalFound) {
      console.log('💡 剩余的硬编码值可能需要手动处理，包括：');
      console.log('   - 复杂的URL构造逻辑');
      console.log('   - 业务相关的数字常量');
      console.log('   - 第三方服务特定配置');
    }
    
    console.log('='.repeat(60));
  }
}

// 运行配置化
if (require.main === module) {
  const configifier = new HardcodedValueConfigifier();
  configifier.run().catch(console.error);
}

module.exports = HardcodedValueConfigifier;
