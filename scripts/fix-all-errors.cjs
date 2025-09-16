#!/usr/bin/env node

/**
 * 综合错误修复脚本
 * 修复项目中所有已知的TypeScript和代码错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const config = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  skipInstall: process.argv.includes('--skip-install')
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

const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`无法读取文件: ${filePath}`, 'error');
    return null;
  }
};

const writeFile = (filePath, content) => {
  if (config.dryRun) {
    log(`[DRY RUN] 将写入文件: ${filePath}`, 'info');
    return;
  }
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    log(`已更新文件: ${path.basename(filePath)}`, 'success');
  } catch (error) {
    log(`无法写入文件: ${filePath} - ${error.message}`, 'error');
  }
};

// 修复任务
const fixes = {
  /**
   * 1. 修复文件名大小写问题
   */
  fixFilenameCasing: () => {
    log('修复文件名大小写问题...', 'info');
    
    const casingSensitiveFiles = [
      {
        wrong: 'frontend/components/auth/WithAuthCheck.tsx',
        correct: 'frontend/components/auth/withAuthCheck.tsx'
      },
      {
        wrong: 'frontend/services/TestStateManager.ts',
        correct: 'frontend/services/testStateManager.ts'
      },
      {
        wrong: 'frontend/services/performance/PerformanceTestCore.ts',
        correct: 'frontend/services/performance/performanceTestCore.ts'
      }
    ];
    
    casingSensitiveFiles.forEach(({ wrong, correct }) => {
      const wrongPath = path.join(__dirname, '..', wrong);
      const correctPath = path.join(__dirname, '..', correct);
      
      if (fileExists(wrongPath) && !fileExists(correctPath)) {
        if (!config.dryRun) {
          fs.renameSync(wrongPath, correctPath);
        }
        log(`重命名: ${path.basename(wrong)} → ${path.basename(correct)}`, 'success');
      }
    });
    
    // 更新导入语句
    const filesToUpdate = [
      'frontend/pages/APITest.tsx',
      'frontend/pages/CompatibilityTest.tsx',
      'frontend/pages/ContentTest.tsx',
      'frontend/pages/DatabaseTest.tsx',
      'frontend/pages/DocumentationTest.tsx',
      'frontend/pages/InfrastructureTest.tsx',
      'frontend/pages/NetworkTest.tsx',
      'frontend/pages/PerformanceTest.tsx',
      'frontend/pages/SecurityTest.tsx',
      'frontend/pages/SEOTest.tsx',
      'frontend/pages/UnifiedStressTest.tsx',
      'frontend/pages/UXTest.tsx',
      'frontend/pages/WebsiteTest.tsx'
    ];
    
    filesToUpdate.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        let content = readFile(filePath);
        if (content) {
          content = content.replace(/WithAuthCheck/g, 'withAuthCheck');
          content = content.replace(/TestStateManager/g, 'testStateManager');
          content = content.replace(/PerformanceTestCore/g, 'performanceTestCore');
          writeFile(filePath, content);
        }
      }
    });
  },

  /**
   * 2. 修复重复导出声明
   */
  fixDuplicateExports: () => {
    log('修复重复导出声明...', 'info');
    
    const filePath = path.join(__dirname, '../frontend/hooks/useAppState.ts');
    
    if (fileExists(filePath)) {
      let content = readFile(filePath);
      if (content) {
        // 移除文件末尾的重复导出
        content = content.replace(/\n\nexport\s+{\s*[\s\S]*?}\s*;?\s*$/gm, '');
        
        // 确保只有一组导出
        const exports = [
          'useStateType',
          'useTestState', 
          'useUserState',
          'useSystemState',
          'useNotificationState',
          'useLoadingState',
          'useModalState',
          'useSelector',
          'useBusinessState'
        ];
        
        // 添加单一的导出声明
        content += `\n\nexport {
  ${exports.join(',\n  ')}
};\n`;
        
        writeFile(filePath, content);
      }
    }
  },

  /**
   * 3. 修复toast相关错误
   */
  fixToastErrors: () => {
    log('修复toast相关错误...', 'info');
    
    const filesToFix = [
      'frontend/components/charts/EnhancedCharts.tsx',
      'frontend/components/scheduling/TestScheduler.tsx',
      'frontend/pages/UnifiedStressTest.tsx'
    ];
    
    filesToFix.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        let content = readFile(filePath);
        if (content) {
          // 修复toast.info和toast.warning
          content = content.replace(/toast\.info\(/g, 'toast(');
          content = content.replace(/toast\.warning\(/g, 'toast(');
          
          writeFile(filePath, content);
        }
      }
    });
  },

  /**
   * 4. 修复缺失的模块
   */
  fixMissingModules: () => {
    log('修复缺失的模块引用...', 'info');
    
    // 移除对不存在模块的引用
    const moduleReferences = [
      {
        file: 'frontend/components/routing/AppRoutes.tsx',
        remove: ["import ChromeCompatibilityTest from '../../pages/ChromeCompatibilityTest';"]
      },
      {
        file: 'frontend/pages/index.tsx',
        remove: [
          "import Link from 'next/link';",
          "import { useRouter } from 'next/router';"
        ],
        add: [
          "import { Link } from 'react-router-dom';",
          "import { useNavigate } from 'react-router-dom';"
        ]
      }
    ];
    
    moduleReferences.forEach(({ file, remove, add }) => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        let content = readFile(filePath);
        if (content) {
          // 移除不存在的导入
          if (remove) {
            remove.forEach(line => {
              content = content.replace(line, '');
            });
          }
          
          // 添加正确的导入
          if (add) {
            const importRegex = /^import[\s\S]*?from[\s\S]*?;/gm;
            const lastImport = content.match(importRegex);
            if (lastImport && lastImport.length > 0) {
              const lastImportIndex = content.lastIndexOf(lastImport[lastImport.length - 1]);
              const insertPosition = lastImportIndex + lastImport[lastImport.length - 1].length;
              content = content.slice(0, insertPosition) + '\n' + add.join('\n') + content.slice(insertPosition);
            }
          }
          
          writeFile(filePath, content);
        }
      }
    });
  },

  /**
   * 5. 修复类型声明文件导入
   */
  fixTypeImports: () => {
    log('修复类型声明文件导入...', 'info');
    
    const filesToFix = [
      {
        file: 'frontend/config/validateConfig.ts',
        wrong: "@types/errors",
        correct: "./errors"
      },
      {
        file: 'frontend/services/auth/authService.ts',
        wrong: "@types/enums",
        correct: "../../types/enums"
      },
      {
        file: 'frontend/services/auth/authService.ts',
        wrong: "@types/user",
        correct: "../../types/user"
      },
      {
        file: 'frontend/pages/WebsiteTest.tsx',
        wrong: "@types/enums",
        correct: "../types/enums"
      }
    ];
    
    filesToFix.forEach(({ file, wrong, correct }) => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        let content = readFile(filePath);
        if (content) {
          content = content.replace(new RegExp(`from ['"]${wrong}['"]`, 'g'), `from '${correct}'`);
          writeFile(filePath, content);
        }
      }
    });
  },

  /**
   * 6. 安装缺失的依赖
   */
  installMissingDependencies: () => {
    if (config.skipInstall) {
      log('跳过依赖安装', 'info');
      return;
    }
    
    log('安装缺失的依赖...', 'info');
    
    const dependencies = [
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled'
    ];
    
    const command = `yarn add ${dependencies.join(' ')}`;
    
    if (!config.dryRun) {
      try {
        log(`执行: ${command}`, 'info');
        execSync(command, { stdio: 'inherit' });
        log('依赖安装成功', 'success');
      } catch (error) {
        log('依赖安装失败，请手动安装', 'error');
      }
    } else {
      log(`[DRY RUN] 将执行: ${command}`, 'info');
    }
  },

  /**
   * 7. 修复测试文件导入
   */
  fixTestImports: () => {
    log('修复测试文件导入...', 'info');
    
    const testFiles = [
      'frontend/components/ui/__tests__/ButtonTest.tsx',
      'frontend/components/ui/__tests__/InputTest.tsx'
    ];
    
    testFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fileExists(filePath)) {
        let content = readFile(filePath);
        if (content) {
          // 修复@testing-library/react导入
          content = content.replace(
            /import\s*{\s*render[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
            "import { render, screen, fireEvent } from '@testing-library/react'"
          );
          
          writeFile(filePath, content);
        }
      }
    });
  },

  /**
   * 8. 修复接口兼容性问题
   */
  fixInterfaceCompatibility: () => {
    log('修复接口兼容性问题...', 'info');
    
    // 修复RequestConfig接口
    const apiTypesPath = path.join(__dirname, '../frontend/services/api/core/apiTypes.ts');
    if (fileExists(apiTypesPath)) {
      let content = readFile(apiTypesPath);
      if (content) {
        // 修复cache属性类型
        content = content.replace(
          /cache\s*:\s*boolean/g,
          "cache?: RequestCache"
        );
        
        writeFile(apiTypesPath, content);
      }
    }
  },

  /**
   * 9. 清理deprecated目录中的导入错误
   */
  cleanDeprecatedImports: () => {
    log('清理deprecated目录中的导入错误...', 'info');
    
    const deprecatedDir = path.join(__dirname, '../frontend/pages/deprecated');
    
    if (fileExists(deprecatedDir)) {
      const files = fs.readdirSync(deprecatedDir).filter(f => f.endsWith('.tsx'));
      
      files.forEach(file => {
        const filePath = path.join(deprecatedDir, file);
        let content = readFile(filePath);
        if (content) {
          // 注释掉所有导入语句，因为这些文件已经不再使用
          content = content.replace(/^import\s+.*$/gm, '// $&');
          writeFile(filePath, content);
        }
      });
    }
  }
};

// 主函数
const main = async () => {
  console.log('');
  log('========================================', 'info');
  log('     综合错误修复工具', 'info');
  log('========================================', 'info');
  console.log('');
  
  if (config.dryRun) {
    log('运行模式: DRY RUN (不会修改文件)', 'warning');
  } else {
    log('运行模式: 实际执行', 'warning');
  }
  
  console.log('');
  
  const fixTasks = [
    { name: '修复文件名大小写', fn: fixes.fixFilenameCasing },
    { name: '修复重复导出', fn: fixes.fixDuplicateExports },
    { name: '修复Toast错误', fn: fixes.fixToastErrors },
    { name: '修复缺失模块', fn: fixes.fixMissingModules },
    { name: '修复类型导入', fn: fixes.fixTypeImports },
    { name: '安装缺失依赖', fn: fixes.installMissingDependencies },
    { name: '修复测试导入', fn: fixes.fixTestImports },
    { name: '修复接口兼容性', fn: fixes.fixInterfaceCompatibility },
    { name: '清理deprecated导入', fn: fixes.cleanDeprecatedImports }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const task of fixTasks) {
    console.log('');
    log(`执行: ${task.name}`, 'info');
    try {
      await task.fn();
      successCount++;
    } catch (error) {
      log(`失败: ${error.message}`, 'error');
      errorCount++;
    }
  }
  
  console.log('');
  log('========================================', 'info');
  log('     修复完成', 'info');
  log('========================================', 'info');
  console.log('');
  
  log(`成功: ${successCount} 个任务`, 'success');
  if (errorCount > 0) {
    log(`失败: ${errorCount} 个任务`, 'error');
  }
  
  if (config.dryRun) {
    console.log('');
    log('这是一次模拟运行，没有文件被修改', 'warning');
    log('要实际执行，请运行: yarn fix:all-errors', 'info');
  } else {
    console.log('');
    log('建议运行 yarn type-check 验证修复结果', 'info');
  }
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { fixes, config };
