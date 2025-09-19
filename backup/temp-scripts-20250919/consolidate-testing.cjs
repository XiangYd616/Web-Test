#!/usr/bin/env node

/**
 * 测试工具代码整合脚本
 * 用于清理重复代码，整合测试相关功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const config = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  backupDir: path.join(__dirname, '../backup', `consolidation-${Date.now()}`)
};

// 工具函数
const log = (message, level = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[level]}[${level.toUpperCase()}]${colors.reset} ${message}`);
};

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

const backup = (filePath) => {
  if (!fileExists(filePath)) return;
  
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const backupPath = path.join(config.backupDir, relativePath);
  const backupDirPath = path.dirname(backupPath);
  
  if (!config.dryRun) {
    fs.mkdirSync(backupDirPath, { recursive: true });
    fs.copyFileSync(filePath, backupPath);
  }
  
  log(`Backed up: ${relativePath}`, 'success');
};

// 主要任务
const tasks = {
  /**
   * 1. 合并重复的路由文件
   */
  mergeRoutes: () => {
    log('开始合并重复路由...', 'info');
    
    const routesDir = path.join(__dirname, '../backend/routes');
    const deprecatedDir = path.join(routesDir, 'deprecated');
    
    // 需要合并的路由
    const routesToMerge = [
      { 
        keep: 'test.js', 
        merge: ['tests.js'],
        description: '合并测试执行路由'
      },
      { 
        keep: 'testEngine.js', 
        merge: ['unifiedTestEngine.js'],
        description: '合并测试引擎路由'
      }
    ];
    
    routesToMerge.forEach(({ keep, merge, description }) => {
      log(description, 'info');
      
      const keepPath = path.join(routesDir, keep);
      
      merge.forEach(fileToMerge => {
        const mergePath = path.join(routesDir, fileToMerge);
        
        if (fileExists(mergePath)) {
          // 备份文件
          backup(mergePath);
          
          // 移动到deprecated目录
          if (!config.dryRun) {
            if (!fs.existsSync(deprecatedDir)) {
              fs.mkdirSync(deprecatedDir, { recursive: true });
            }
            
            const deprecatedPath = path.join(deprecatedDir, fileToMerge);
            fs.renameSync(mergePath, deprecatedPath);
          }
          
          log(`已移动 ${fileToMerge} 到 deprecated/`, 'success');
        }
      });
    });
  },

  /**
   * 2. 合并重复的前端页面
   */
  mergePages: () => {
    log('开始合并重复页面...', 'info');
    
    const pagesDir = path.join(__dirname, '../frontend/pages');
    const deprecatedDir = path.join(pagesDir, 'deprecated');
    
    // 需要合并的页面
    const pagesToMerge = [
      {
        keep: 'PerformanceTest.tsx',
        remove: 'EnhancedPerformanceTest.tsx',
        description: '合并性能测试页面'
      },
      {
        keep: 'CompatibilityTest.tsx',
        remove: 'ChromeCompatibilityTest.tsx',
        description: '合并兼容性测试页面'
      }
    ];
    
    pagesToMerge.forEach(({ keep, remove, description }) => {
      log(description, 'info');
      
      const removePath = path.join(pagesDir, remove);
      
      if (fileExists(removePath)) {
        // 备份文件
        backup(removePath);
        
        // 移动到deprecated目录
        if (!config.dryRun) {
          if (!fs.existsSync(deprecatedDir)) {
            fs.mkdirSync(deprecatedDir, { recursive: true });
          }
          
          const deprecatedPath = path.join(deprecatedDir, remove);
          fs.renameSync(removePath, deprecatedPath);
        }
        
        log(`已移动 ${remove} 到 deprecated/`, 'success');
      }
    });
  },

  /**
   * 3. 更新路由引用
   */
  updateReferences: () => {
    log('更新路由引用...', 'info');
    
    const appPath = path.join(__dirname, '../backend/src/app.js');
    const routeManagerPath = path.join(__dirname, '../backend/src/RouteManager.js');
    
    // 需要更新的引用映射
    const referenceMap = {
      '../routes/tests.js': '../routes/test.js',
      '../routes/unifiedTestEngine.js': '../routes/testEngine.js',
      'EnhancedPerformanceTest': 'PerformanceTest',
      'ChromeCompatibilityTest': 'CompatibilityTest'
    };
    
    const filesToUpdate = [appPath, routeManagerPath];
    
    filesToUpdate.forEach(filePath => {
      if (fileExists(filePath)) {
        backup(filePath);
        
        if (!config.dryRun) {
          let content = fs.readFileSync(filePath, 'utf8');
          
          Object.entries(referenceMap).forEach(([oldRef, newRef]) => {
            const regex = new RegExp(oldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            content = content.replace(regex, newRef);
          });
          
          fs.writeFileSync(filePath, content);
        }
        
        log(`已更新引用: ${path.basename(filePath)}`, 'success');
      }
    });
  },

  /**
   * 4. 创建缺失的页面
   */
  createMissingPages: () => {
    log('创建缺失的页面...', 'info');
    
    const pagesToCreate = [
      {
        name: 'InfrastructureTest.tsx',
        title: '基础设施测试',
        engineType: 'infrastructure'
      },
      {
        name: 'DocumentationTest.tsx',
        title: '文档生成',
        engineType: 'documentation'
      },
      {
        name: 'ContentTest.tsx',
        title: '内容检测',
        engineType: 'content'
      }
    ];
    
    const templatePath = path.join(__dirname, '../frontend/pages/APITest.tsx');
    
    pagesToCreate.forEach(({ name, title, engineType }) => {
      const pagePath = path.join(__dirname, '../frontend/pages', name);
      
      if (!fileExists(pagePath)) {
        if (!config.dryRun && fileExists(templatePath)) {
          // 读取模板内容
          let template = fs.readFileSync(templatePath, 'utf8');
          
          // 替换关键内容
          template = template
            .replace(/API测试/g, title)
            .replace(/api-test/g, engineType + '-test')
            .replace(/engineType: 'api'/g, `engineType: '${engineType}'`);
          
          fs.writeFileSync(pagePath, template);
        }
        
        log(`已创建页面: ${name}`, 'success');
      } else {
        log(`页面已存在: ${name}`, 'warning');
      }
    });
  },

  /**
   * 5. 生成整合报告
   */
  generateReport: () => {
    log('生成整合报告...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: config.dryRun,
      backupDir: config.backupDir,
      actions: {
        routesMerged: [],
        pagesMerged: [],
        referencesUpdated: [],
        pagesCreated: []
      }
    };
    
    const reportPath = path.join(__dirname, '../CONSOLIDATION_REPORT.json');
    
    if (!config.dryRun) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
    
    log(`报告已生成: CONSOLIDATION_REPORT.json`, 'success');
  }
};

// 主函数
const main = async () => {
  console.log('');
  log('========================================', 'info');
  log('     测试工具代码整合工具', 'info');
  log('========================================', 'info');
  console.log('');
  
  if (config.dryRun) {
    log('运行模式: DRY RUN (不会修改文件)', 'warning');
  } else {
    log('运行模式: 实际执行', 'warning');
    log(`备份目录: ${config.backupDir}`, 'info');
  }
  
  console.log('');
  
  // 执行任务
  try {
    // 1. 合并路由
    tasks.mergeRoutes();
    console.log('');
    
    // 2. 合并页面
    tasks.mergePages();
    console.log('');
    
    // 3. 更新引用
    tasks.updateReferences();
    console.log('');
    
    // 4. 创建缺失页面
    tasks.createMissingPages();
    console.log('');
    
    // 5. 生成报告
    tasks.generateReport();
    console.log('');
    
    log('========================================', 'success');
    log('     整合完成！', 'success');
    log('========================================', 'success');
    
    if (config.dryRun) {
      console.log('');
      log('这是一次模拟运行，没有文件被修改', 'warning');
      log('要实际执行，请运行: yarn consolidate-testing', 'info');
    }
    
  } catch (error) {
    log(`错误: ${error.message}`, 'error');
    process.exit(1);
  }
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { tasks, config };
