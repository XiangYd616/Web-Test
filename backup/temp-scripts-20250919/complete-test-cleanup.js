#!/usr/bin/env node
/**
 * 完整的测试工具规范化脚本
 * 处理所有剩余的命名和组织问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 执行完整的测试工具规范化');
console.log('='.repeat(60));

const operations = {
  renamed: [],
  updated: [],
  created: [],
  errors: [],
  warnings: []
};

/**
 * 批量重命名测试引擎文件
 */
async function batchRenameEngines() {
  console.log('\n📝 批量重命名测试引擎文件...');
  
  const renameTasks = [
    { 
      folder: 'api', 
      from: 'apiTestEngine.js', 
      to: 'ApiTestEngine.js' 
    },
    { 
      folder: 'compatibility', 
      from: 'compatibilityTestEngine.js', 
      to: 'CompatibilityTestEngine.js' 
    },
    { 
      folder: 'security', 
      from: 'securityTestEngine.js', 
      to: 'SecurityTestEngine.js' 
    },
    { 
      folder: 'stress', 
      from: 'stressTestEngine.js', 
      to: 'StressTestEngine.js' 
    },
    { 
      folder: 'website', 
      from: 'websiteTestEngine.js', 
      to: 'WebsiteTestEngine.js' 
    }
  ];

  for (const task of renameTasks) {
    const oldPath = path.join(__dirname, '..', 'backend', 'engines', task.folder, task.from);
    const newPath = path.join(__dirname, '..', 'backend', 'engines', task.folder, task.to);
    
    try {
      if (fs.existsSync(oldPath)) {
        // 读取文件内容
        const content = fs.readFileSync(oldPath, 'utf8');
        
        // 更新类名以匹配文件名
        const className = task.to.replace('.js', '');
        const oldClassName = task.from.replace('.js', '').replace(/^[a-z]/, c => c.toUpperCase());
        const updatedContent = content.replace(
          new RegExp(`class\\s+${oldClassName}`, 'g'),
          `class ${className}`
        );
        
        // 写入新文件
        fs.writeFileSync(newPath, updatedContent);
        
        // 删除旧文件
        fs.unlinkSync(oldPath);
        
        operations.renamed.push({
          from: `${task.folder}/${task.from}`,
          to: `${task.folder}/${task.to}`
        });
        console.log(`  ✅ ${task.from} → ${task.to}`);
      } else if (!fs.existsSync(newPath)) {
        operations.warnings.push(`文件不存在: ${task.folder}/${task.from}`);
      }
    } catch (error) {
      operations.errors.push(`重命名失败 ${task.from}: ${error.message}`);
    }
  }
}

/**
 * 更新所有index.js文件的引用
 */
async function updateAllIndexFiles() {
  console.log('\n🔄 更新所有index文件引用...');
  
  const enginesDir = path.join(__dirname, '..', 'backend', 'engines');
  const folders = fs.readdirSync(enginesDir).filter(f => {
    const fullPath = path.join(enginesDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const folder of folders) {
    const indexPath = path.join(enginesDir, folder, 'index.js');
    
    if (fs.existsSync(indexPath)) {
      try {
        let content = fs.readFileSync(indexPath, 'utf8');
        let updated = false;
        
        // 更新require语句
        const requirePatterns = [
          { old: /require\(['"]\.\/apiTestEngine['"]\)/g, new: "require('./ApiTestEngine')" },
          { old: /require\(['"]\.\/compatibilityTestEngine['"]\)/g, new: "require('./CompatibilityTestEngine')" },
          { old: /require\(['"]\.\/securityTestEngine['"]\)/g, new: "require('./SecurityTestEngine')" },
          { old: /require\(['"]\.\/stressTestEngine['"]\)/g, new: "require('./StressTestEngine')" },
          { old: /require\(['"]\.\/websiteTestEngine['"]\)/g, new: "require('./WebsiteTestEngine')" },
          { old: /require\(['"]\.\/DatabaseTestEngine['"]\)/g, new: "require('./DatabaseTestEngine')" },
          { old: /require\(['"]\.\/NetworkTestEngine['"]\)/g, new: "require('./NetworkTestEngine')" },
          { old: /require\(['"]\.\/ContentTestEngine['"]\)/g, new: "require('./ContentTestEngine')" }
        ];
        
        for (const pattern of requirePatterns) {
          if (pattern.old.test(content)) {
            content = content.replace(pattern.old, pattern.new);
            updated = true;
          }
        }
        
        if (updated) {
          fs.writeFileSync(indexPath, content);
          operations.updated.push(`${folder}/index.js`);
          console.log(`  ✅ 更新 ${folder}/index.js`);
        }
      } catch (error) {
        operations.errors.push(`更新 ${folder}/index.js 失败: ${error.message}`);
      }
    }
  }
}

/**
 * 更新TypeScript配置文件
 */
async function updateTypeScriptFiles() {
  console.log('\n📘 处理TypeScript文件...');
  
  // 处理 base/BaseTestEngine.ts
  const baseTsPath = path.join(__dirname, '..', 'backend', 'engines', 'base', 'BaseTestEngine.ts');
  if (fs.existsSync(baseTsPath)) {
    console.log('  ℹ️ 保留 BaseTestEngine.ts (基类需要TypeScript)');
    operations.warnings.push('BaseTestEngine.ts 保留为TypeScript文件');
  }
  
  // 处理 regression/RegressionTestEngine.ts
  const regressionTsPath = path.join(__dirname, '..', 'backend', 'engines', 'regression', 'RegressionTestEngine.ts');
  if (fs.existsSync(regressionTsPath)) {
    console.log('  ℹ️ 保留 RegressionTestEngine.ts (高级功能需要TypeScript)');
    operations.warnings.push('RegressionTestEngine.ts 保留为TypeScript文件');
  }
}

/**
 * 创建缺失的index文件
 */
async function createMissingIndexFiles() {
  console.log('\n➕ 创建缺失的index文件...');
  
  const foldersNeedingIndex = [
    'database',
    'network',
    'content',
    'core'
  ];
  
  for (const folder of foldersNeedingIndex) {
    const indexPath = path.join(__dirname, '..', 'backend', 'engines', folder, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      try {
        // 确定引擎文件名
        let engineFile = '';
        switch (folder) {
          case 'database':
            engineFile = 'DatabaseTestEngine';
            break;
          case 'network':
            engineFile = 'NetworkTestEngine';
            break;
          case 'content':
            engineFile = 'ContentTestEngine';
            break;
          case 'core':
            engineFile = 'UnifiedTestEngine';
            break;
        }
        
        const indexContent = `/**
 * ${folder.charAt(0).toUpperCase() + folder.slice(1)}测试工具索引
 */

const ${engineFile} = require('./${engineFile}.js');

module.exports = ${engineFile};
`;
        
        fs.writeFileSync(indexPath, indexContent);
        operations.created.push(`${folder}/index.js`);
        console.log(`  ✅ 创建 ${folder}/index.js`);
      } catch (error) {
        operations.errors.push(`创建 ${folder}/index.js 失败: ${error.message}`);
      }
    }
  }
}

/**
 * 更新路由文件中的引用
 */
async function updateRouteReferences() {
  console.log('\n🔗 更新路由文件引用...');
  
  const routesDir = path.join(__dirname, '..', 'backend', 'routes');
  
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // 更新引擎引用
        const enginePatterns = [
          { old: /apiTestEngine/g, new: 'ApiTestEngine' },
          { old: /compatibilityTestEngine/g, new: 'CompatibilityTestEngine' },
          { old: /securityTestEngine/g, new: 'SecurityTestEngine' },
          { old: /stressTestEngine/g, new: 'StressTestEngine' },
          { old: /websiteTestEngine/g, new: 'WebsiteTestEngine' },
          { old: /EnhancedDatabaseTestEngine/g, new: 'DatabaseTestEngine' },
          { old: /EnhancedNetworkTestEngine/g, new: 'NetworkTestEngine' }
        ];
        
        for (const pattern of enginePatterns) {
          if (pattern.old.test(content)) {
            content = content.replace(pattern.old, pattern.new);
            updated = true;
          }
        }
        
        if (updated) {
          fs.writeFileSync(filePath, content);
          operations.updated.push(`routes/${file}`);
          console.log(`  ✅ 更新 routes/${file}`);
        }
      } catch (error) {
        operations.errors.push(`更新 routes/${file} 失败: ${error.message}`);
      }
    }
  }
}

/**
 * 更新服务层引用
 */
async function updateServiceReferences() {
  console.log('\n⚙️ 更新服务层引用...');
  
  const servicesDir = path.join(__dirname, '..', 'backend', 'services');
  
  if (fs.existsSync(servicesDir)) {
    // 递归查找所有JS文件
    const findJsFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(findJsFiles(filePath));
        } else if (file.endsWith('.js')) {
          results.push(filePath);
        }
      });
      return results;
    };
    
    const serviceFiles = findJsFiles(servicesDir);
    
    for (const filePath of serviceFiles) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // 更新引擎引用
        const patterns = [
          { old: /require\(['"].*\/apiTestEngine['"]\)/g, new: (match) => match.replace('apiTestEngine', 'ApiTestEngine') },
          { old: /require\(['"].*\/compatibilityTestEngine['"]\)/g, new: (match) => match.replace('compatibilityTestEngine', 'CompatibilityTestEngine') },
          { old: /require\(['"].*\/securityTestEngine['"]\)/g, new: (match) => match.replace('securityTestEngine', 'SecurityTestEngine') },
          { old: /require\(['"].*\/stressTestEngine['"]\)/g, new: (match) => match.replace('stressTestEngine', 'StressTestEngine') },
          { old: /require\(['"].*\/websiteTestEngine['"]\)/g, new: (match) => match.replace('websiteTestEngine', 'WebsiteTestEngine') },
          { old: /require\(['"].*\/EnhancedDatabaseTestEngine['"]\)/g, new: (match) => match.replace('EnhancedDatabaseTestEngine', 'DatabaseTestEngine') },
          { old: /require\(['"].*\/EnhancedNetworkTestEngine['"]\)/g, new: (match) => match.replace('EnhancedNetworkTestEngine', 'NetworkTestEngine') }
        ];
        
        for (const pattern of patterns) {
          if (pattern.old.test(content)) {
            content = content.replace(pattern.old, pattern.new);
            updated = true;
          }
        }
        
        if (updated) {
          fs.writeFileSync(filePath, content);
          const relativePath = path.relative(path.join(__dirname, '..'), filePath);
          operations.updated.push(relativePath);
          console.log(`  ✅ 更新 ${relativePath}`);
        }
      } catch (error) {
        operations.errors.push(`更新服务文件失败: ${error.message}`);
      }
    }
  }
}

/**
 * 验证所有引擎文件
 */
async function validateEngines() {
  console.log('\n✅ 验证所有引擎文件...');
  
  const expectedEngines = [
    { folder: 'api', file: 'ApiTestEngine.js' },
    { folder: 'compatibility', file: 'CompatibilityTestEngine.js' },
    { folder: 'content', file: 'ContentTestEngine.js' },
    { folder: 'database', file: 'DatabaseTestEngine.js' },
    { folder: 'infrastructure', file: 'InfrastructureTestEngine.js' },
    { folder: 'network', file: 'NetworkTestEngine.js' },
    { folder: 'performance', file: 'PerformanceTestEngine.js' },
    { folder: 'security', file: 'SecurityTestEngine.js' },
    { folder: 'seo', file: 'SEOTestEngine.js' },
    { folder: 'stress', file: 'StressTestEngine.js' },
    { folder: 'ux', file: 'UXTestEngine.js' },
    { folder: 'website', file: 'WebsiteTestEngine.js' }
  ];
  
  let allValid = true;
  
  for (const engine of expectedEngines) {
    const enginePath = path.join(__dirname, '..', 'backend', 'engines', engine.folder, engine.file);
    if (!fs.existsSync(enginePath)) {
      console.log(`  ❌ 缺失: ${engine.folder}/${engine.file}`);
      allValid = false;
    } else {
      console.log(`  ✅ 存在: ${engine.folder}/${engine.file}`);
    }
  }
  
  return allValid;
}

/**
 * 生成最终报告
 */
function generateFinalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 规范化执行报告');
  console.log('='.repeat(60));
  
  console.log('\n✅ 成功操作:');
  
  if (operations.renamed.length > 0) {
    console.log('\n📝 重命名:');
    operations.renamed.forEach(item => {
      console.log(`  - ${item.from} → ${item.to}`);
    });
  }
  
  if (operations.created.length > 0) {
    console.log('\n➕ 创建:');
    operations.created.forEach(item => {
      console.log(`  - ${item}`);
    });
  }
  
  if (operations.updated.length > 0) {
    console.log('\n🔄 更新引用:');
    console.log(`  - 共更新 ${operations.updated.length} 个文件`);
  }
  
  if (operations.warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    operations.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  if (operations.errors.length > 0) {
    console.log('\n❌ 错误:');
    operations.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  const totalOps = operations.renamed.length + operations.created.length + operations.updated.length;
  console.log(`\n📈 总计: ${totalOps} 个成功操作, ${operations.errors.length} 个错误`);
}

/**
 * 保存操作日志
 */
function saveOperationLog() {
  const logPath = path.join(__dirname, '..', 'test-cleanup-complete.json');
  const logContent = {
    timestamp: new Date().toISOString(),
    operations,
    summary: {
      renamed: operations.renamed.length,
      created: operations.created.length,
      updated: operations.updated.length,
      warnings: operations.warnings.length,
      errors: operations.errors.length
    }
  };
  
  fs.writeFileSync(logPath, JSON.stringify(logContent, null, 2));
  console.log(`\n💾 操作日志已保存到: ${logPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    // 执行所有操作
    await batchRenameEngines();
    await updateAllIndexFiles();
    await updateTypeScriptFiles();
    await createMissingIndexFiles();
    await updateRouteReferences();
    await updateServiceReferences();
    
    // 验证结果
    const isValid = await validateEngines();
    
    // 生成报告
    generateFinalReport();
    saveOperationLog();
    
    if (isValid) {
      console.log('\n🎉 规范化完成！所有测试引擎文件已符合命名规范。');
    } else {
      console.log('\n⚠️ 规范化完成，但仍有部分文件需要手动检查。');
    }
    
    console.log('\n建议后续操作:');
    console.log('1. 运行 npm test 验证所有测试');
    console.log('2. 提交变更到版本控制');
    console.log('3. 更新相关文档');
    
  } catch (error) {
    console.error('\n❌ 规范化过程中出错:', error);
    process.exit(1);
  }
}

// 执行
main();
