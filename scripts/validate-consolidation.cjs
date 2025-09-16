#!/usr/bin/env node

/**
 * 整合验证脚本
 * 验证代码整合后系统是否正常运行
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const config = {
  verbose: process.argv.includes('--verbose'),
  fix: process.argv.includes('--fix')
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

// 验证任务
const validations = {
  /**
   * 1. 检查重复文件是否已被移除
   */
  checkDuplicateRemoval: () => {
    log('检查重复文件是否已被移除...', 'info');
    
    const removedFiles = [
      'backend/routes/tests.js',
      'backend/routes/unifiedTestEngine.js',
      'frontend/pages/EnhancedPerformanceTest.tsx',
      'frontend/pages/ChromeCompatibilityTest.tsx'
    ];
    
    let passed = true;
    removedFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        log(`错误: 文件仍然存在 ${file}`, 'error');
        passed = false;
      }
    });
    
    if (passed) {
      log('所有重复文件已被成功移除', 'success');
    }
    
    return passed;
  },

  /**
   * 2. 检查新页面是否已创建
   */
  checkNewPages: () => {
    log('检查新页面是否已创建...', 'info');
    
    const newPages = [
      'frontend/pages/InfrastructureTest.tsx',
      'frontend/pages/DocumentationTest.tsx',
      'frontend/pages/ContentTest.tsx'
    ];
    
    let passed = true;
    newPages.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (!fileExists(filePath)) {
        log(`错误: 页面不存在 ${file}`, 'error');
        passed = false;
      } else {
        if (config.verbose) {
          log(`页面已创建: ${file}`, 'success');
        }
      }
    });
    
    if (passed) {
      log('所有新页面已成功创建', 'success');
    }
    
    return passed;
  },

  /**
   * 3. 检查路由引用是否更新
   */
  checkRouteReferences: () => {
    log('检查路由引用是否更新...', 'info');
    
    const filesToCheck = [
      {
        file: 'backend/src/app.js',
        shouldNotContain: ['../routes/tests.js', '../routes/unifiedTestEngine.js'],
        shouldContain: ['../routes/test.js', '../routes/testEngine.js']
      },
      {
        file: 'backend/src/RouteManager.js',
        shouldNotContain: ['../routes/tests.js', '../routes/unifiedTestEngine.js'],
        shouldContain: ['../routes/test.js', '../routes/testEngine.js']
      }
    ];
    
    let passed = true;
    
    filesToCheck.forEach(({ file, shouldNotContain, shouldContain }) => {
      const filePath = path.join(__dirname, '..', file);
      
      if (fileExists(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        shouldNotContain.forEach(pattern => {
          if (content.includes(pattern)) {
            log(`错误: ${file} 仍包含旧引用 ${pattern}`, 'error');
            passed = false;
          }
        });
        
        shouldContain.forEach(pattern => {
          if (!content.includes(pattern)) {
            log(`警告: ${file} 可能缺少引用 ${pattern}`, 'warning');
          }
        });
      }
    });
    
    if (passed) {
      log('路由引用已正确更新', 'success');
    }
    
    return passed;
  },

  /**
   * 4. 检查备份是否创建
   */
  checkBackup: () => {
    log('检查备份是否创建...', 'info');
    
    const backupDir = path.join(__dirname, '../backup');
    
    if (!fileExists(backupDir)) {
      log('警告: 备份目录不存在', 'warning');
      return false;
    }
    
    const backupDirs = fs.readdirSync(backupDir)
      .filter(dir => dir.startsWith('consolidation-'));
    
    if (backupDirs.length === 0) {
      log('警告: 没有找到备份', 'warning');
      return false;
    }
    
    const latestBackup = backupDirs.sort().pop();
    const latestBackupPath = path.join(backupDir, latestBackup);
    
    log(`找到备份: ${latestBackup}`, 'success');
    
    // 验证备份内容
    const expectedBackups = [
      'backend/routes/tests.js',
      'backend/routes/unifiedTestEngine.js',
      'frontend/pages/EnhancedPerformanceTest.tsx',
      'frontend/pages/ChromeCompatibilityTest.tsx'
    ];
    
    let allBackupsExist = true;
    expectedBackups.forEach(file => {
      const backupFilePath = path.join(latestBackupPath, file);
      if (!fileExists(backupFilePath)) {
        log(`警告: 备份文件不存在 ${file}`, 'warning');
        allBackupsExist = false;
      }
    });
    
    if (allBackupsExist) {
      log('所有备份文件已创建', 'success');
    }
    
    return true;
  },

  /**
   * 5. 测试TypeScript编译
   */
  testTypeScript: () => {
    log('测试 TypeScript 编译...', 'info');
    
    try {
      const result = execSync('yarn type-check', { 
        encoding: 'utf8',
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
      
      log('TypeScript 编译成功', 'success');
      return true;
    } catch (error) {
      log('TypeScript 编译失败', 'error');
      if (!config.verbose && error.stdout) {
        console.log(error.stdout);
      }
      return false;
    }
  },

  /**
   * 6. 测试后端启动
   */
  testBackendStartup: () => {
    log('测试后端启动...', 'info');
    
    try {
      // 只测试是否能加载，不实际启动服务器
      const testCommand = 'node -e "require(\'./backend/src/app.js\')"';
      execSync(testCommand, { 
        encoding: 'utf8',
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
      
      log('后端模块加载成功', 'success');
      return true;
    } catch (error) {
      log('后端模块加载失败', 'error');
      if (error.message) {
        console.log(error.message);
      }
      return false;
    }
  }
};

// 主函数
const main = async () => {
  console.log('');
  log('========================================', 'info');
  log('     整合验证工具', 'info');
  log('========================================', 'info');
  console.log('');
  
  const results = {
    duplicateRemoval: false,
    newPages: false,
    routeReferences: false,
    backup: false,
    typeScript: false,
    backendStartup: false
  };
  
  // 执行验证
  console.log('开始验证...\n');
  
  results.duplicateRemoval = validations.checkDuplicateRemoval();
  console.log('');
  
  results.newPages = validations.checkNewPages();
  console.log('');
  
  results.routeReferences = validations.checkRouteReferences();
  console.log('');
  
  results.backup = validations.checkBackup();
  console.log('');
  
  results.typeScript = validations.testTypeScript();
  console.log('');
  
  results.backendStartup = validations.testBackendStartup();
  console.log('');
  
  // 汇总结果
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const failedTests = totalTests - passedTests;
  
  log('========================================', 'info');
  log('     验证结果', 'info');
  log('========================================', 'info');
  console.log('');
  
  Object.entries(results).forEach(([test, passed]) => {
    const testName = {
      duplicateRemoval: '重复文件移除',
      newPages: '新页面创建',
      routeReferences: '路由引用更新',
      backup: '备份创建',
      typeScript: 'TypeScript编译',
      backendStartup: '后端启动'
    }[test];
    
    const status = passed ? '✅ 通过' : '❌ 失败';
    log(`${testName}: ${status}`, passed ? 'success' : 'error');
  });
  
  console.log('');
  log(`总计: ${passedTests}/${totalTests} 测试通过`, 
      failedTests === 0 ? 'success' : 'warning');
  
  if (failedTests > 0) {
    console.log('');
    log('部分验证失败，请检查上述错误信息', 'error');
    
    if (config.fix) {
      console.log('');
      log('尝试自动修复...', 'info');
      // 这里可以添加自动修复逻辑
    }
    
    process.exit(1);
  } else {
    console.log('');
    log('✨ 所有验证通过！系统已准备就绪', 'success');
  }
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { validations, config };
