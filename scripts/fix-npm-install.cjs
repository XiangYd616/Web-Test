#!/usr/bin/env node

/**
 * NPM安装修复脚本
 * 解决网络连接问题和依赖安装失败的问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 NPM安装修复脚本\n');

/**
 * 执行命令并处理错误
 */
function executeCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} 完成\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} 失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 设置npm镜像源
 */
function setupNpmMirrors() {
  console.log('🌐 设置npm镜像源...\n');

  const commands = [
    {
      cmd: 'npm config set registry https://registry.npmmirror.com',
      desc: '设置npm主镜像源'
    }
  ];

  // 设置环境变量（这些不是npm配置项）
  const envVars = [
    {
      name: 'ELECTRON_MIRROR',
      value: 'https://npmmirror.com/mirrors/electron/',
      desc: '设置electron镜像源'
    },
    {
      name: 'ELECTRON_BUILDER_BINARIES_MIRROR',
      value: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
      desc: '设置electron-builder镜像源'
    },
    {
      name: 'PUPPETEER_DOWNLOAD_HOST',
      value: 'https://npmmirror.com/mirrors',
      desc: '设置puppeteer镜像源'
    },
    {
      name: 'CHROMEDRIVER_CDNURL',
      value: 'https://npmmirror.com/mirrors/chromedriver',
      desc: '设置chromedriver镜像源'
    }
  ];

  commands.forEach(({ cmd, desc }) => {
    executeCommand(cmd, desc);
  });

  // 设置环境变量
  console.log('🌍 设置环境变量...\n');
  envVars.forEach(({ name, value, desc }) => {
    try {
      process.env[name] = value;
      console.log(`✅ ${desc}: ${name}=${value}`);
    } catch (error) {
      console.log(`❌ ${desc} 失败: ${error.message}`);
    }
  });
  console.log('');
}

/**
 * 清理npm缓存
 */
function cleanNpmCache() {
  console.log('🧹 清理npm缓存...\n');

  const commands = [
    {
      cmd: 'npm cache clean --force',
      desc: '清理npm缓存'
    },
    {
      cmd: 'npm cache verify',
      desc: '验证npm缓存'
    }
  ];

  commands.forEach(({ cmd, desc }) => {
    executeCommand(cmd, desc);
  });
}

/**
 * 尝试不同的安装方法
 */
function tryInstallMethods() {
  console.log('📦 尝试不同的安装方法...\n');

  const methods = [
    {
      cmd: 'npm install --no-optional --no-audit --no-fund',
      desc: '跳过可选依赖安装'
    },
    {
      cmd: 'npm install --ignore-scripts',
      desc: '跳过脚本执行安装'
    },
    {
      cmd: 'npm install --production',
      desc: '仅安装生产依赖'
    }
  ];

  for (const { cmd, desc } of methods) {
    console.log(`🔄 尝试: ${desc}`);
    if (executeCommand(cmd, desc)) {
      console.log('✅ 安装成功！\n');
      return true;
    }
    console.log('❌ 此方法失败，尝试下一个...\n');
  }

  return false;
}

/**
 * 手动处理electron
 */
function handleElectronManually() {
  console.log('⚡ 手动处理electron...\n');

  // 检查是否已经安装了electron
  const electronPath = path.join(process.cwd(), 'node_modules', 'electron');
  if (fs.existsSync(electronPath)) {
    console.log('✅ Electron已安装，跳过手动处理\n');
    return true;
  }

  const commands = [
    {
      cmd: 'npm install electron --no-save --ignore-scripts',
      desc: '单独安装electron'
    },
    {
      cmd: 'npm rebuild electron',
      desc: '重新构建electron'
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
 * 检查安装结果
 */
function checkInstallation() {
  console.log('🔍 检查安装结果...\n');

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
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    console.log('📋 检查关键依赖...');
    const keyDependencies = ['react', 'react-dom', 'vite', 'typescript'];

    for (const dep of keyDependencies) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep} - 已安装`);
      } else {
        console.log(`❌ ${dep} - 未安装`);
      }
    }

    console.log('\n✅ 安装检查完成\n');
    return true;

  } catch (error) {
    console.log(`❌ 检查安装失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 提供替代方案
 */
function provideAlternatives() {
  console.log('🔄 提供替代安装方案...\n');

  console.log('如果npm安装仍然失败，可以尝试以下方案：\n');

  console.log('1. 使用yarn:');
  console.log('   npm install -g yarn');
  console.log('   yarn install\n');

  console.log('2. 使用pnpm:');
  console.log('   npm install -g pnpm');
  console.log('   pnpm install\n');

  console.log('3. 使用cnpm:');
  console.log('   npm install -g cnpm --registry=https://registry.npmmirror.com');
  console.log('   cnpm install\n');

  console.log('4. 手动下载依赖:');
  console.log('   删除package-lock.json');
  console.log('   逐个安装关键依赖\n');

  console.log('5. 网络问题解决:');
  console.log('   - 检查防火墙设置');
  console.log('   - 使用VPN或代理');
  console.log('   - 切换网络环境');
  console.log('   - 联系网络管理员\n');
}

/**
 * 主函数
 */
function main() {
  console.log('开始修复npm安装问题...\n');

  // 1. 设置镜像源
  setupNpmMirrors();

  // 2. 清理缓存
  cleanNpmCache();

  // 3. 尝试安装
  if (tryInstallMethods()) {
    // 4. 检查安装结果
    if (checkInstallation()) {
      console.log('🎉 npm安装修复成功！');
      process.exit(0);
    }
  }

  // 5. 手动处理electron
  console.log('🔧 尝试手动处理electron...\n');
  handleElectronManually();

  // 6. 最终检查
  if (checkInstallation()) {
    console.log('🎉 npm安装修复成功！');
    process.exit(0);
  }

  // 7. 提供替代方案
  provideAlternatives();

  console.log('⚠️  自动修复未完全成功，请参考上述替代方案手动解决。');
  process.exit(1);
}

// 运行修复脚本
if (require.main === module) {
  main();
}
