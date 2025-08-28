#!/usr/bin/env node

/**
 * Test-Web项目清理计划执行脚本
 * 基于项目分析报告执行系统性的代码清理和重构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectCleanupPlan {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.cleanupTasks = [];
    this.completedTasks = [];
    this.errors = [];
  }

  /**
   * 执行完整的清理计划
   */
  async execute() {
    console.log('🚀 开始执行Test-Web项目清理计划...\n');

    // 阶段1: 简化页面识别和标记
    await this.identifySimplifiedPages();

    // 阶段2: 重复引擎代码分析
    await this.analyzeEngineCodeDuplication();

    // 阶段3: API路由重复清理
    await this.cleanupDuplicateRoutes();

    // 阶段4: 前端组件重复清理
    await this.cleanupDuplicateComponents();

    // 阶段5: 生成清理报告
    await this.generateCleanupReport();

    console.log('\n✅ 项目清理计划执行完成!');
    this.printSummary();
  }

  /**
   * 识别简化页面
   */
  async identifySimplifiedPages() {
    console.log('🔍 阶段1: 识别简化页面...');

    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    const simplifiedPages = [];

    if (fs.existsSync(pagesDir)) {
      const pageFiles = this.getAllTsxFiles(pagesDir);

      for (const pageFile of pageFiles) {
        const content = fs.readFileSync(pageFile, 'utf8');
        const lineCount = content.split('\n').length;

        // 识别简化页面 (少于50行且包含"正在开发中"文本)
        if (lineCount < 50 && content.includes('正在开发中')) {
          const relativePath = path.relative(this.projectRoot, pageFile);
          simplifiedPages.push({
            path: relativePath,
            lines: lineCount,
            needsImplementation: true
          });
        }
      }
    }

    console.log(`   发现 ${simplifiedPages.length} 个简化页面需要完善`);
    this.cleanupTasks.push({
      type: 'simplified-pages',
      count: simplifiedPages.length,
      items: simplifiedPages
    });
  }

  /**
   * 分析引擎代码重复
   */
  async analyzeEngineCodeDuplication() {
    console.log('🔍 阶段2: 分析测试引擎代码重复...');

    const enginesDir = path.join(this.projectRoot, 'backend/engines');
    const duplicatedMethods = [];

    if (fs.existsSync(enginesDir)) {
      const engineDirs = fs.readdirSync(enginesDir)
        .filter(dir => fs.statSync(path.join(enginesDir, dir)).isDirectory());

      // 分析每个引擎的通用方法
      const commonMethods = [
        'validateConfig',
        'updateTestProgress',
        'activeTests',
        'healthCheck',
        'executeTest'
      ];

      for (const method of commonMethods) {
        const implementingEngines = [];

        for (const engineDir of engineDirs) {
          const engineFiles = this.getAllJsFiles(path.join(enginesDir, engineDir));

          for (const engineFile of engineFiles) {
            const content = fs.readFileSync(engineFile, 'utf8');
            if (content.includes(method)) {
              implementingEngines.push({
                engine: engineDir,
                file: path.relative(this.projectRoot, engineFile)
              });
            }
          }
        }

        if (implementingEngines.length > 1) {
          duplicatedMethods.push({
            method,
            implementations: implementingEngines.length,
            engines: implementingEngines
          });
        }
      }
    }

    console.log(`   发现 ${duplicatedMethods.length} 个重复的引擎方法`);
    this.cleanupTasks.push({
      type: 'engine-duplication',
      count: duplicatedMethods.length,
      items: duplicatedMethods
    });
  }

  /**
   * 清理重复路由
   */
  async cleanupDuplicateRoutes() {
    console.log('🔍 阶段3: 分析API路由重复...');

    const routeFiles = [
      'backend/routes/test.js',
      'backend/routes/tests.js',
      'backend/routes/testEngine.js',
      'backend/api/v1/routes/tests.js'
    ];

    const duplicateEndpoints = [];
    const endpointMap = new Map();

    for (const routeFile of routeFiles) {
      const fullPath = path.join(this.projectRoot, routeFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const endpoints = this.extractRouteEndpoints(content);

        for (const endpoint of endpoints) {
          const key = `${endpoint.method}:${endpoint.path}`;

          if (endpointMap.has(key)) {
            duplicateEndpoints.push({
              endpoint: key,
              files: [endpointMap.get(key).file, routeFile],
              conflict: true
            });
          } else {
            endpointMap.set(key, { endpoint, file: routeFile });
          }
        }
      }
    }

    console.log(`   发现 ${duplicateEndpoints.length} 个重复的API端点`);
    this.cleanupTasks.push({
      type: 'route-duplication',
      count: duplicateEndpoints.length,
      items: duplicateEndpoints
    });
  }

  /**
   * 清理重复组件
   */
  async cleanupDuplicateComponents() {
    console.log('🔍 阶段4: 分析前端组件重复...');

    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    const duplicateComponents = [];

    // 检查可能重复的组件
    const suspiciousPatterns = [
      'DataTable',
      'Chart',
      'Modal',
      'Button',
      'Form'
    ];

    for (const pattern of suspiciousPatterns) {
      const matchingFiles = [];

      if (fs.existsSync(componentsDir)) {
        const allComponents = this.getAllTsxFiles(componentsDir);

        for (const componentFile of allComponents) {
          const fileName = path.basename(componentFile, '.tsx');
          if (fileName.includes(pattern)) {
            matchingFiles.push({
              file: path.relative(this.projectRoot, componentFile),
              name: fileName
            });
          }
        }
      }

      if (matchingFiles.length > 1) {
        duplicateComponents.push({
          pattern,
          count: matchingFiles.length,
          files: matchingFiles
        });
      }
    }

    console.log(`   发现 ${duplicateComponents.length} 组可能重复的组件`);
    this.cleanupTasks.push({
      type: 'component-duplication',
      count: duplicateComponents.length,
      items: duplicateComponents
    });
  }

  /**
   * 生成清理报告
   */
  async generateCleanupReport() {
    console.log('📊 生成清理报告...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTasks: this.cleanupTasks.length,
        simplifiedPages: this.cleanupTasks.find(t => t.type === 'simplified-pages')?.count || 0,
        duplicatedMethods: this.cleanupTasks.find(t => t.type === 'engine-duplication')?.count || 0,
        duplicatedRoutes: this.cleanupTasks.find(t => t.type === 'route-duplication')?.count || 0,
        duplicatedComponents: this.cleanupTasks.find(t => t.type === 'component-duplication')?.count || 0
      },
      tasks: this.cleanupTasks,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.projectRoot, 'PROJECT_CLEANUP_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`   清理报告已生成: ${reportPath}`);
  }

  /**
   * 生成清理建议
   */
  generateRecommendations() {
    return [
      {
        priority: 'HIGH',
        category: '简化页面',
        action: '实现20个简化页面的完整功能',
        impact: '恢复产品功能完整性'
      },
      {
        priority: 'HIGH',
        category: '测试引擎',
        action: '创建BaseTestEngine基类，提取公共方法',
        impact: '减少代码重复，提高维护性'
      },
      {
        priority: 'MEDIUM',
        category: 'API路由',
        action: '统一API版本，移除重复端点',
        impact: '简化API架构，避免冲突'
      },
      {
        priority: 'MEDIUM',
        category: '前端组件',
        action: '合并重复组件，建立组件库',
        impact: '提高组件复用性'
      }
    ];
  }

  /**
   * 工具方法
   */
  getAllTsxFiles(dir) {
    const files = [];
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getAllTsxFiles(fullPath));
        } else if (item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  getAllJsFiles(dir) {
    const files = [];
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getAllJsFiles(fullPath));
        } else if (item.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  extractRouteEndpoints(content) {
    const endpoints = [];
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }

    return endpoints;
  }

  printSummary() {
    console.log('\n📊 清理计划执行摘要:');
    console.log('================================');

    const summary = this.cleanupTasks.reduce((acc, task) => {
      acc[task.type] = task.count;
      return acc;
    }, {});

    console.log(`简化页面需要完善: ${summary['simplified-pages'] || 0} 个`);
    console.log(`重复引擎方法: ${summary['engine-duplication'] || 0} 个`);
    console.log(`重复API端点: ${summary['route-duplication'] || 0} 个`);
    console.log(`重复组件模式: ${summary['component-duplication'] || 0} 组`);
    console.log('\n建议优先处理简化页面和测试引擎重复问题。');
  }
}

// 执行清理计划
const cleanup = new ProjectCleanupPlan();
cleanup.execute().catch(console.error);

export default ProjectCleanupPlan;
