/**
 * 废弃路由清理脚本
 * 识别并清理项目中的废弃、重复和无用路由
 */

import fs from 'fs';
import path from 'path';

// 配置
const PROJECT_ROOT = process.cwd();
const BACKUP_DIR = path.join(PROJECT_ROOT, 'backup/deprecated-routes');

// 废弃路由清理结果
const cleanupResults = {
  removedFiles: [],
  removedRoutes: [],
  updatedFiles: [],
  errors: []
};

/**
 * 识别的废弃路由和文件
 */
const DEPRECATED_ITEMS = {
  // 废弃的路由文件
  files: [
    'server/routes/unifiedSecurity.js', // 已在app.js中注释掉
  ],
  
  // 废弃的路由别名
  routeAliases: [
    '/api/tests', // 复数形式别名，应该统一使用 /api/test
    '/api/test-engines', // 测试引擎状态API，功能重复
    '/api/test-history', // 兼容性路由，应该使用 /api/test/history
  ],
  
  // 废弃的前端路由
  frontendRoutes: [
    '/background-test-demo', // 演示路由，生产环境不需要
  ],
  
  // 重复的API端点
  duplicateEndpoints: [
    '/api/preferences', // 在app.js中重复定义，应该使用 /api/user/preferences
  ]
};

/**
 * 创建备份目录
 */
function createBackupDir() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`📁 创建备份目录: ${BACKUP_DIR}`);
    }
  } catch (error) {
    console.error('❌ 创建备份目录失败:', error.message);
    cleanupResults.errors.push(`创建备份目录失败: ${error.message}`);
  }
}

/**
 * 备份文件
 */
function backupFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const backupPath = path.join(BACKUP_DIR, `${fileName}.backup`);
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`💾 备份文件: ${filePath} -> ${backupPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 备份文件失败 ${filePath}:`, error.message);
    cleanupResults.errors.push(`备份文件失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 移除废弃的路由文件
 */
function removeDeprecatedFiles() {
  console.log('\n🗑️  移除废弃的路由文件...');
  
  DEPRECATED_ITEMS.files.forEach(filePath => {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    
    if (fs.existsSync(fullPath)) {
      // 备份文件
      if (backupFile(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`✅ 删除废弃文件: ${filePath}`);
          cleanupResults.removedFiles.push(filePath);
        } catch (error) {
          console.error(`❌ 删除文件失败 ${filePath}:`, error.message);
          cleanupResults.errors.push(`删除文件失败 ${filePath}: ${error.message}`);
        }
      }
    } else {
      console.log(`⚠️  文件不存在: ${filePath}`);
    }
  });
}

/**
 * 清理后端路由别名
 */
function cleanupBackendRouteAliases() {
  console.log('\n🔧 清理后端路由别名...');
  
  const appJsPath = path.join(PROJECT_ROOT, 'server/app.js');
  
  if (!fs.existsSync(appJsPath)) {
    console.error('❌ server/app.js 文件不存在');
    return;
  }
  
  // 备份文件
  if (!backupFile(appJsPath)) {
    return;
  }
  
  try {
    let content = fs.readFileSync(appJsPath, 'utf8');
    let modified = false;
    
    // 移除废弃的路由别名
    const routesToRemove = [
      "app.use('/api/tests', testRoutes); // 复数形式的别名",
      "app.use('/api/test-engines', testRoutes); // 测试引擎状态API",
      "app.use('/api/test-history', testRoutes); // 兼容性路由 - 重定向到test路由"
    ];
    
    routesToRemove.forEach(route => {
      if (content.includes(route)) {
        content = content.replace(route, `// ${route} // 已移除`);
        modified = true;
        console.log(`✅ 移除路由别名: ${route.split('//')[0].trim()}`);
        cleanupResults.removedRoutes.push(route.split('//')[0].trim());
      }
    });
    
    // 移除重复的偏好设置API
    const preferencesApiRegex = /\/\/ 偏好设置API别名路由[\s\S]*?}\);/g;
    if (preferencesApiRegex.test(content)) {
      content = content.replace(preferencesApiRegex, '// 偏好设置API已移除，请使用 /api/user/preferences');
      modified = true;
      console.log('✅ 移除重复的偏好设置API');
      cleanupResults.removedRoutes.push('/api/preferences');
    }
    
    if (modified) {
      fs.writeFileSync(appJsPath, content, 'utf8');
      console.log('✅ 更新 server/app.js');
      cleanupResults.updatedFiles.push('server/app.js');
    } else {
      console.log('ℹ️  server/app.js 无需更新');
    }
    
  } catch (error) {
    console.error('❌ 更新 server/app.js 失败:', error.message);
    cleanupResults.errors.push(`更新 server/app.js 失败: ${error.message}`);
  }
}

/**
 * 清理前端废弃路由
 */
function cleanupFrontendRoutes() {
  console.log('\n🎨 清理前端废弃路由...');
  
  const appRoutesPath = path.join(PROJECT_ROOT, 'src/components/routing/AppRoutes.tsx');
  
  if (!fs.existsSync(appRoutesPath)) {
    console.error('❌ AppRoutes.tsx 文件不存在');
    return;
  }
  
  // 备份文件
  if (!backupFile(appRoutesPath)) {
    return;
  }
  
  try {
    let content = fs.readFileSync(appRoutesPath, 'utf8');
    let modified = false;
    
    // 移除 background-test-demo 路由
    const demoRouteRegex = /\s*<Route path="\/background-test-demo"[\s\S]*?\/>\s*/g;
    if (demoRouteRegex.test(content)) {
      content = content.replace(demoRouteRegex, '\n      {/* background-test-demo 路由已移除 */}\n');
      modified = true;
      console.log('✅ 移除 background-test-demo 路由');
      cleanupResults.removedRoutes.push('/background-test-demo');
    }
    
    // 移除对应的懒加载导入
    const demoImportRegex = /const BackgroundTestDemo = lazy\(\(\) => import\('.*?BackgroundTestDemo'\)\);\s*/g;
    if (demoImportRegex.test(content)) {
      content = content.replace(demoImportRegex, '// BackgroundTestDemo 导入已移除\n');
      modified = true;
      console.log('✅ 移除 BackgroundTestDemo 导入');
    }
    
    if (modified) {
      fs.writeFileSync(appRoutesPath, content, 'utf8');
      console.log('✅ 更新 AppRoutes.tsx');
      cleanupResults.updatedFiles.push('src/components/routing/AppRoutes.tsx');
    } else {
      console.log('ℹ️  AppRoutes.tsx 无需更新');
    }
    
  } catch (error) {
    console.error('❌ 更新 AppRoutes.tsx 失败:', error.message);
    cleanupResults.errors.push(`更新 AppRoutes.tsx 失败: ${error.message}`);
  }
}

/**
 * 更新API文档
 */
function updateAPIDocumentation() {
  console.log('\n📝 更新API文档...');
  
  const appJsPath = path.join(PROJECT_ROOT, 'server/app.js');
  
  try {
    let content = fs.readFileSync(appJsPath, 'utf8');
    
    // 确保API文档中不包含废弃的端点
    const apiDocRegex = /endpoints: \{[\s\S]*?\}/;
    const match = content.match(apiDocRegex);
    
    if (match) {
      let endpointsSection = match[0];
      
      // 移除废弃端点的引用
      if (endpointsSection.includes('tests:') || endpointsSection.includes('testEngines:')) {
        endpointsSection = endpointsSection
          .replace(/,?\s*tests: '\/api\/tests'/, '')
          .replace(/,?\s*testEngines: '\/api\/test-engines'/, '')
          .replace(/,?\s*testHistory: '\/api\/test-history'/, '');
        
        content = content.replace(apiDocRegex, endpointsSection);
        fs.writeFileSync(appJsPath, content, 'utf8');
        console.log('✅ 更新API文档，移除废弃端点');
      }
    }
    
  } catch (error) {
    console.error('❌ 更新API文档失败:', error.message);
    cleanupResults.errors.push(`更新API文档失败: ${error.message}`);
  }
}

/**
 * 生成清理报告
 */
function generateCleanupReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 废弃路由清理报告');
  console.log('='.repeat(60));
  
  console.log(`🗑️  删除文件: ${cleanupResults.removedFiles.length}`);
  cleanupResults.removedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  console.log(`🔧 移除路由: ${cleanupResults.removedRoutes.length}`);
  cleanupResults.removedRoutes.forEach(route => {
    console.log(`   - ${route}`);
  });
  
  console.log(`📝 更新文件: ${cleanupResults.updatedFiles.length}`);
  cleanupResults.updatedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  if (cleanupResults.errors.length > 0) {
    console.log(`❌ 错误: ${cleanupResults.errors.length}`);
    cleanupResults.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  console.log('\n📁 备份位置:', BACKUP_DIR);
  console.log('='.repeat(60));
  
  // 保存报告到文件
  const reportPath = path.join(PROJECT_ROOT, 'DEPRECATED_ROUTES_CLEANUP_REPORT.md');
  const reportContent = generateMarkdownReport();
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 详细报告已保存: ${reportPath}`);
}

/**
 * 生成Markdown格式的报告
 */
function generateMarkdownReport() {
  const timestamp = new Date().toISOString();
  
  return `# 废弃路由清理报告

**清理时间**: ${timestamp}

## 📋 清理概述

本次清理移除了项目中的废弃路由、重复路由别名和无用的演示路由，提高了代码的可维护性和一致性。

## 🗑️ 删除的文件 (${cleanupResults.removedFiles.length})

${cleanupResults.removedFiles.map(file => `- \`${file}\``).join('\n')}

## 🔧 移除的路由 (${cleanupResults.removedRoutes.length})

${cleanupResults.removedRoutes.map(route => `- \`${route}\``).join('\n')}

## 📝 更新的文件 (${cleanupResults.updatedFiles.length})

${cleanupResults.updatedFiles.map(file => `- \`${file}\``).join('\n')}

## ❌ 错误记录 (${cleanupResults.errors.length})

${cleanupResults.errors.length > 0 ? cleanupResults.errors.map(error => `- ${error}`).join('\n') : '无错误'}

## 📁 备份信息

所有被修改或删除的文件都已备份到: \`${BACKUP_DIR}\`

## 🎯 清理效果

- ✅ 移除了废弃的统一安全测试路由文件
- ✅ 清理了重复的API路由别名
- ✅ 移除了演示用的前端路由
- ✅ 统一了API端点命名规范
- ✅ 提高了路由配置的一致性

## 📚 建议

1. **路由规范**: 统一使用 \`/api/test/*\` 格式的API路由
2. **避免别名**: 减少路由别名，保持API的简洁性
3. **定期清理**: 建议定期运行此脚本清理废弃路由
4. **文档更新**: 及时更新API文档，移除废弃端点的引用

---

**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🧹 开始清理废弃路由...\n');
    
    // 创建备份目录
    createBackupDir();
    
    // 执行清理操作
    removeDeprecatedFiles();
    cleanupBackendRouteAliases();
    cleanupFrontendRoutes();
    updateAPIDocumentation();
    
    // 生成报告
    generateCleanupReport();
    
    console.log('\n🎉 废弃路由清理完成！');
    
    if (cleanupResults.errors.length === 0) {
      process.exit(0);
    } else {
      console.log('\n⚠️  清理过程中发现错误，请检查上述错误信息。');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 清理过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  main as cleanupDeprecatedRoutes,
  cleanupResults
};
