#!/usr/bin/env node

/**
 * API清理工具
 * 识别和移除未使用的API端点，减少维护负担
 */

const fs = require('fs');
const path = require('path');

class ApiCleanupTool {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.backendDir = path.join(this.projectRoot, 'backend');
    
    this.analysis = {
      frontendApiCalls: new Set(),
      backendApiDefinitions: new Map(),
      unusedApis: [],
      potentiallyUnused: [],
      cleanupRecommendations: []
    };
  }

  /**
   * 开始API清理分析
   */
  async analyzeAndCleanup() {
    console.log('🧹 开始API清理分析...');
    console.log('=' .repeat(60));

    // 扫描前端API调用
    await this.scanFrontendApiUsage();
    
    // 扫描后端API定义
    await this.scanBackendApiDefinitions();
    
    // 分析未使用的API
    this.analyzeUnusedApis();
    
    // 生成清理建议
    this.generateCleanupRecommendations();
    
    // 生成报告
    this.generateCleanupReport();

    console.log(`\n📊 API清理分析完成:`);
    console.log(`  前端API调用: ${this.analysis.frontendApiCalls.size} 个`);
    console.log(`  后端API定义: ${this.analysis.backendApiDefinitions.size} 个`);
    console.log(`  未使用API: ${this.analysis.unusedApis.length} 个`);
    console.log(`  可能未使用: ${this.analysis.potentiallyUnused.length} 个`);
  }

  /**
   * 扫描前端API使用情况
   */
  async scanFrontendApiUsage() {
    console.log('\n📱 扫描前端API使用情况...');
    
    const frontendFiles = this.findFiles(this.frontendDir, /\.(ts|tsx|js|jsx)$/, ['node_modules', 'dist', 'build']);
    
    for (const file of frontendFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // 匹配各种API调用模式
      const apiPatterns = [
        // fetch调用
        /fetch\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        // axios调用
        /axios\.[get|post|put|delete|patch]+\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        // 通用HTTP方法调用
        /\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        // 模板字符串中的API路径
        /[`'"](\/api\/[^`'"]*\$\{[^}]+\}[^`'"]*)[`'"]/g,
        // 配置中的API路径
        /BASE_URL\s*\+\s*[`'"](\/[^`'"]+)[`'"]/g,
        // 字符串拼接的API路径
        /[`'"]\/api\/[^`'"]+[`'"]/g
      ];

      apiPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          let endpoint = match[1] || match[2];
          if (endpoint) {
            // 清理端点路径
            endpoint = this.normalizeEndpoint(endpoint);
            this.analysis.frontendApiCalls.add(endpoint);
          }
        }
      });
    }
    
    console.log(`  发现前端API调用: ${this.analysis.frontendApiCalls.size} 个`);
  }

  /**
   * 扫描后端API定义
   */
  async scanBackendApiDefinitions() {
    console.log('\n🔧 扫描后端API定义...');
    
    const routeFiles = this.findFiles(path.join(this.backendDir, 'routes'), /\.js$/, []);
    
    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);
      
      // 匹配路由定义模式
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g,
        /app\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]*)[`'"]/g
      ];

      routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          let endpoint = match[2];
          
          // 标准化端点路径
          if (!endpoint.startsWith('/api')) {
            endpoint = '/api' + (endpoint.startsWith('/') ? '' : '/') + endpoint;
          }
          
          endpoint = this.normalizeEndpoint(endpoint);
          const key = `${method} ${endpoint}`;
          
          if (!this.analysis.backendApiDefinitions.has(key)) {
            this.analysis.backendApiDefinitions.set(key, []);
          }
          
          this.analysis.backendApiDefinitions.get(key).push({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            method: method,
            endpoint: endpoint
          });
        }
      });
    }
    
    console.log(`  发现后端API定义: ${this.analysis.backendApiDefinitions.size} 个`);
  }

  /**
   * 分析未使用的API
   */
  analyzeUnusedApis() {
    console.log('\n🔍 分析未使用的API...');
    
    // 检查后端定义但前端未使用的API
    for (const [backendKey, definitions] of this.analysis.backendApiDefinitions) {
      const [method, endpoint] = backendKey.split(' ', 2);
      
      // 检查前端是否使用了这个端点
      const isUsed = this.isEndpointUsedByFrontend(endpoint);
      
      if (!isUsed) {
        // 检查是否是系统内部API或特殊API
        if (this.isSystemInternalApi(endpoint)) {
          this.analysis.potentiallyUnused.push({
            endpoint: backendKey,
            reason: '系统内部API，可能被其他服务使用',
            definitions: definitions
          });
        } else {
          this.analysis.unusedApis.push({
            endpoint: backendKey,
            definitions: definitions
          });
        }
      }
    }
    
    console.log(`  未使用API: ${this.analysis.unusedApis.length} 个`);
    console.log(`  可能未使用API: ${this.analysis.potentiallyUnused.length} 个`);
  }

  /**
   * 生成清理建议
   */
  generateCleanupRecommendations() {
    console.log('\n💡 生成清理建议...');
    
    // 按文件分组未使用的API
    const apisByFile = new Map();
    
    [...this.analysis.unusedApis, ...this.analysis.potentiallyUnused].forEach(api => {
      api.definitions.forEach(def => {
        if (!apisByFile.has(def.file)) {
          apisByFile.set(def.file, []);
        }
        apisByFile.get(def.file).push({
          ...api,
          definition: def
        });
      });
    });
    
    // 生成清理建议
    for (const [file, apis] of apisByFile) {
      const unusedCount = apis.filter(api => this.analysis.unusedApis.includes(api)).length;
      const potentialCount = apis.filter(api => this.analysis.potentiallyUnused.includes(api)).length;
      
      if (unusedCount > 0 || potentialCount > 0) {
        this.analysis.cleanupRecommendations.push({
          file: file,
          unusedApis: unusedCount,
          potentiallyUnusedApis: potentialCount,
          totalApis: apis.length,
          cleanupPriority: this.calculateCleanupPriority(unusedCount, potentialCount, apis.length),
          apis: apis
        });
      }
    }
    
    // 按优先级排序
    this.analysis.cleanupRecommendations.sort((a, b) => b.cleanupPriority - a.cleanupPriority);
    
    console.log(`  生成清理建议: ${this.analysis.cleanupRecommendations.length} 个文件`);
  }

  /**
   * 标准化端点路径
   */
  normalizeEndpoint(endpoint) {
    // 移除查询参数
    endpoint = endpoint.split('?')[0];
    
    // 移除尾部斜杠
    endpoint = endpoint.replace(/\/$/, '');
    
    // 标准化参数占位符
    endpoint = endpoint.replace(/:([^\/]+)/g, ':param');
    endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':param');
    
    return endpoint;
  }

  /**
   * 检查端点是否被前端使用
   */
  isEndpointUsedByFrontend(endpoint) {
    // 直接匹配
    if (this.analysis.frontendApiCalls.has(endpoint)) {
      return true;
    }
    
    // 模糊匹配（考虑参数化路径）
    for (const frontendCall of this.analysis.frontendApiCalls) {
      if (this.isEndpointMatch(endpoint, frontendCall)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查两个端点是否匹配
   */
  isEndpointMatch(endpoint1, endpoint2) {
    // 简单的模式匹配
    const pattern1 = endpoint1.replace(/:param/g, '[^/]+');
    const pattern2 = endpoint2.replace(/:param/g, '[^/]+');
    
    const regex1 = new RegExp(`^${pattern1}$`);
    const regex2 = new RegExp(`^${pattern2}$`);
    
    return regex1.test(endpoint2) || regex2.test(endpoint1);
  }

  /**
   * 检查是否是系统内部API
   */
  isSystemInternalApi(endpoint) {
    const internalPatterns = [
      '/api/health',
      '/api/status',
      '/api/metrics',
      '/api/admin',
      '/api/system',
      '/api/internal'
    ];
    
    return internalPatterns.some(pattern => endpoint.startsWith(pattern));
  }

  /**
   * 计算清理优先级
   */
  calculateCleanupPriority(unusedCount, potentialCount, totalCount) {
    // 优先级计算：未使用API数量 * 2 + 可能未使用API数量
    return unusedCount * 2 + potentialCount;
  }

  /**
   * 工具方法：查找文件
   */
  findFiles(dir, pattern, excludeDirs = []) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item) && !item.startsWith('.')) {
            scan(fullPath);
          }
        } else if (stat.isFile() && pattern.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }

  /**
   * 获取行号
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 生成清理报告
   */
  generateCleanupReport() {
    const reportPath = path.join(this.projectRoot, 'api-cleanup-report.md');
    
    let report = '# API清理分析报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n\n`;

    // 概览统计
    report += '## 📊 清理统计概览\n\n';
    report += `- 前端API调用: ${this.analysis.frontendApiCalls.size} 个\n`;
    report += `- 后端API定义: ${this.analysis.backendApiDefinitions.size} 个\n`;
    report += `- 未使用API: ${this.analysis.unusedApis.length} 个\n`;
    report += `- 可能未使用API: ${this.analysis.potentiallyUnused.length} 个\n`;
    report += `- 需要清理的文件: ${this.analysis.cleanupRecommendations.length} 个\n\n`;

    // 未使用的API列表
    if (this.analysis.unusedApis.length > 0) {
      report += '## 🗑️ 确认未使用的API\n\n';
      report += '以下API在后端定义但前端未使用，建议删除：\n\n';
      
      this.analysis.unusedApis.forEach((api, index) => {
        report += `### ${index + 1}. ${api.endpoint}\n\n`;
        report += '**定义位置**:\n';
        api.definitions.forEach(def => {
          report += `- ${def.file}:${def.line}\n`;
        });
        report += '\n';
      });
    }

    // 可能未使用的API列表
    if (this.analysis.potentiallyUnused.length > 0) {
      report += '## ⚠️ 可能未使用的API\n\n';
      report += '以下API可能未被使用，需要进一步确认：\n\n';
      
      this.analysis.potentiallyUnused.forEach((api, index) => {
        report += `### ${index + 1}. ${api.endpoint}\n\n`;
        report += `**原因**: ${api.reason}\n\n`;
        report += '**定义位置**:\n';
        api.definitions.forEach(def => {
          report += `- ${def.file}:${def.line}\n`;
        });
        report += '\n';
      });
    }

    // 清理建议
    if (this.analysis.cleanupRecommendations.length > 0) {
      report += '## 💡 清理建议\n\n';
      report += '按优先级排序的文件清理建议：\n\n';
      
      this.analysis.cleanupRecommendations.forEach((rec, index) => {
        report += `### ${index + 1}. ${rec.file}\n\n`;
        report += `- 未使用API: ${rec.unusedApis} 个\n`;
        report += `- 可能未使用API: ${rec.potentiallyUnusedApis} 个\n`;
        report += `- 清理优先级: ${rec.cleanupPriority}\n\n`;
        
        if (rec.unusedApis > 0) {
          report += '**建议删除的API**:\n';
          rec.apis.filter(api => this.analysis.unusedApis.includes(api)).forEach(api => {
            report += `- ${api.endpoint}\n`;
          });
          report += '\n';
        }
      });
    }

    // 前端使用的API列表
    report += '## 📱 前端使用的API\n\n';
    const sortedFrontendCalls = Array.from(this.analysis.frontendApiCalls).sort();
    sortedFrontendCalls.forEach(call => {
      report += `- ${call}\n`;
    });
    report += '\n';

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 API清理报告已保存到: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const cleaner = new ApiCleanupTool();
  
  try {
    await cleaner.analyzeAndCleanup();
  } catch (error) {
    console.error('❌ API清理分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行清理分析
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ApiCleanupTool;
