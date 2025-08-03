#!/usr/bin/env node

/**
 * 分步安装依赖脚本
 * 避免electron等大型包导致的网络和权限问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 分步安装项目依赖...\n');

/**
 * 执行命令并处理错误
 */
function executeCommand(command, description, options = {}) {
  console.log(`📋 ${description}...`);
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      timeout: 300000, // 5分钟超时
      ...options 
    });
    console.log(`✅ ${description} 完成\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} 失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 检查依赖是否已安装
 */
function checkDependency(packageName) {
  const packagePath = path.join(process.cwd(), 'node_modules', packageName);
  return fs.existsSync(packagePath);
}

/**
 * 安装核心依赖（不包括electron等问题包）
 */
function installCoreDependencies() {
  console.log('🎯 第一步：安装核心依赖（跳过问题包）...\n');
  
  const commands = [
    {
      cmd: 'npm install --ignore-scripts --no-optional',
      desc: '安装核心依赖（跳过脚本和可选依赖）'
    }
  ];
  
  for (const { cmd, desc } of commands) {
    if (executeCommand(cmd, desc)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 单独安装问题包
 */
function installProblematicPackages() {
  console.log('⚡ 第二步：单独安装问题包...\n');
  
  const problematicPackages = [
    {
      name: 'electron',
      cmd: 'npm install electron --no-save --ignore-scripts',
      desc: '安装electron'
    },
    {
      name: 'electron-builder',
      cmd: 'npm install electron-builder --no-save --ignore-scripts',
      desc: '安装electron-builder'
    },
    {
      name: 'playwright',
      cmd: 'npm install playwright --no-save --ignore-scripts',
      desc: '安装playwright'
    }
  ];
  
  let successCount = 0;
  
  for (const { name, cmd, desc } of problematicPackages) {
    if (checkDependency(name)) {
      console.log(`✅ ${name} 已安装，跳过\n`);
      successCount++;
      continue;
    }
    
    console.log(`🔄 尝试安装 ${name}...`);
    if (executeCommand(cmd, desc)) {
      successCount++;
    } else {
      console.log(`⚠️  ${name} 安装失败，但不影响核心功能\n`);
    }
  }
  
  return successCount;
}

/**
 * 重建原生模块
 */
function rebuildNativeModules() {
  console.log('🔧 第三步：重建原生模块...\n');
  
  const commands = [
    {
      cmd: 'npm rebuild',
      desc: '重建所有原生模块'
    }
  ];
  
  for (const { cmd, desc } of commands) {
    executeCommand(cmd, desc);
  }
}

/**
 * 验证安装结果
 */
function verifyInstallation() {
  console.log('🔍 第四步：验证安装结果...\n');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json不存在');
    return false;
  }
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules目录不存在');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    console.log('📋 检查关键依赖...');
    const criticalDependencies = [
      'react',
      'react-dom', 
      'vite',
      'typescript',
      'express',
      'axios'
    ];
    
    let installedCount = 0;
    
    for (const dep of criticalDependencies) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep} - 已安装`);
        installedCount++;
      } else {
        console.log(`❌ ${dep} - 未安装`);
      }
    }
    
    console.log(`\n📊 关键依赖安装率: ${installedCount}/${criticalDependencies.length} (${Math.round(installedCount/criticalDependencies.length*100)}%)\n`);
    
    // 检查可选依赖
    console.log('📋 检查可选依赖...');
    const optionalDependencies = [
      'electron',
      'electron-builder',
      'playwright'
    ];
    
    let optionalInstalledCount = 0;
    
    for (const dep of optionalDependencies) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep} - 已安装`);
        optionalInstalledCount++;
      } else {
        console.log(`⚠️  ${dep} - 未安装（可选）`);
      }
    }
    
    console.log(`\n📊 可选依赖安装率: ${optionalInstalledCount}/${optionalDependencies.length} (${Math.round(optionalInstalledCount/optionalDependencies.length*100)}%)\n`);
    
    return installedCount >= criticalDependencies.length * 0.8; // 80%以上关键依赖安装成功
    
  } catch (error) {
    console.log(`❌ 验证安装失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 测试项目启动
 */
function testProjectStart() {
  console.log('🚀 第五步：测试项目启动...\n');
  
  const testCommands = [
    {
      cmd: 'npm run type-check',
      desc: 'TypeScript类型检查',
      timeout: 30000
    },
    {
      cmd: 'npm run build',
      desc: '项目构建测试',
      timeout: 60000
    }
  ];
  
  let successCount = 0;
  
  for (const { cmd, desc, timeout } of testCommands) {
    if (executeCommand(cmd, desc, { timeout })) {
      successCount++;
    }
  }
  
  return successCount;
}

/**
 * 生成安装报告
 */
function generateInstallReport(coreSuccess, problematicCount, verifySuccess, testSuccess) {
  const reportContent = `# 依赖安装报告

## 安装概述
分步安装策略执行完成，以下是详细结果：

## 安装结果
- ✅ 核心依赖安装: ${coreSuccess ? '成功' : '失败'}
- ⚡ 问题包安装: ${problematicCount}/3 个成功
- 🔍 安装验证: ${verifySuccess ? '通过' : '失败'}
- 🚀 启动测试: ${testSuccess}/2 个成功

## 可用功能
${coreSuccess ? '✅ Web开发服务器可以启动' : '❌ Web开发服务器可能无法启动'}
${coreSuccess ? '✅ 前端构建功能可用' : '❌ 前端构建功能可能不可用'}
${problematicCount > 0 ? '✅ 部分桌面应用功能可用' : '⚠️  桌面应用功能可能受限'}

## 下一步建议
${coreSuccess ? 
  '1. 尝试启动开发服务器: npm run frontend\n2. 尝试启动后端服务: npm run backend' : 
  '1. 检查网络连接\n2. 尝试使用yarn: npm install -g yarn && yarn install'
}

${problematicCount < 3 ? 
  '\n## 可选依赖安装\n如需完整功能，可以稍后单独安装：\n```bash\nnpm install electron --no-save\nnpm install playwright --no-save\n```' : 
  ''
}

---
安装时间: ${new Date().toISOString()}
`;

  fs.writeFileSync('DEPENDENCY_INSTALL_REPORT.md', reportContent);
  console.log('📋 安装报告已生成: DEPENDENCY_INSTALL_REPORT.md\n');
}

/**
 * 主函数
 */
function main() {
  console.log('开始分步安装依赖...\n');
  
  // 第一步：安装核心依赖
  const coreSuccess = installCoreDependencies();
  
  // 第二步：单独安装问题包
  const problematicCount = installProblematicPackages();
  
  // 第三步：重建原生模块
  rebuildNativeModules();
  
  // 第四步：验证安装
  const verifySuccess = verifyInstallation();
  
  // 第五步：测试启动
  const testSuccess = testProjectStart();
  
  // 生成报告
  generateInstallReport(coreSuccess, problematicCount, verifySuccess, testSuccess);
  
  if (coreSuccess && verifySuccess) {
    console.log('🎉 依赖安装基本成功！');
    console.log('\n📋 可以尝试启动项目:');
    console.log('  npm run frontend  # 启动前端开发服务器');
    console.log('  npm run backend   # 启动后端服务器');
    process.exit(0);
  } else {
    console.log('⚠️  依赖安装部分成功，请查看报告了解详情');
    process.exit(1);
  }
}

// 运行安装
if (require.main === module) {
  main();
}
