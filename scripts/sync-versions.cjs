#!/usr/bin/env node

/**
 * 版本同步工具 - 统一管理项目依赖版本
 * 从 versions.json 同步版本到各个 package.json
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
const VERSIONS_FILE = path.join(ROOT_DIR, 'versions.json');

// 需要同步的 package.json 文件
const PACKAGES = [
  { path: path.join(ROOT_DIR, 'package.json'), name: 'root' },
  { path: path.join(ROOT_DIR, 'frontend', 'package.json'), name: 'frontend' },
  { path: path.join(ROOT_DIR, 'backend', 'package.json'), name: 'backend' },
  { path: path.join(ROOT_DIR, 'shared', 'package.json'), name: 'shared' }
];

/**
 * 读取版本配置
 */
function readVersionsConfig() {
  try {
    const content = fs.readFileSync(VERSIONS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ 读取版本配置失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

/**
 * 读取 package.json
 */
function readPackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ 读取 ${filePath} 失败: ${error.message}`, 'red');
    return null;
  }
}

/**
 * 写入 package.json
 */
function writePackageJson(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    log(`❌ 写入 ${filePath} 失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 同步版本
 */
function syncVersions(dryRun = false) {
  log('\n🔄 开始同步版本...', 'cyan');
  
  const versionsConfig = readVersionsConfig();
  const { dependencies, devDependencies, optionalDependencies } = versionsConfig;
  
  let totalUpdates = 0;
  const updateDetails = [];

  PACKAGES.forEach(({ path: pkgPath, name }) => {
    log(`\n📦 处理 ${name}...`, 'blue');
    
    const pkg = readPackageJson(pkgPath);
    if (!pkg) return;

    let updates = 0;
    const changes = [];

    // 同步 dependencies
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => {
        if (dependencies[dep] && dependencies[dep] !== pkg.dependencies[dep]) {
          changes.push({
            type: 'dependencies',
            name: dep,
            from: pkg.dependencies[dep],
            to: dependencies[dep]
          });
          if (!dryRun) {
            pkg.dependencies[dep] = dependencies[dep];
          }
          updates++;
        }
      });
    }

    // 同步 devDependencies
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach(dep => {
        if (devDependencies[dep] && devDependencies[dep] !== pkg.devDependencies[dep]) {
          changes.push({
            type: 'devDependencies',
            name: dep,
            from: pkg.devDependencies[dep],
            to: devDependencies[dep]
          });
          if (!dryRun) {
            pkg.devDependencies[dep] = devDependencies[dep];
          }
          updates++;
        }
      });
    }

    // 同步 optionalDependencies
    if (pkg.optionalDependencies && optionalDependencies) {
      Object.keys(pkg.optionalDependencies).forEach(dep => {
        if (optionalDependencies[dep] && optionalDependencies[dep] !== pkg.optionalDependencies[dep]) {
          changes.push({
            type: 'optionalDependencies',
            name: dep,
            from: pkg.optionalDependencies[dep],
            to: optionalDependencies[dep]
          });
          if (!dryRun) {
            pkg.optionalDependencies[dep] = optionalDependencies[dep];
          }
          updates++;
        }
      });
    }

    if (updates > 0) {
      log(`  ✓ 发现 ${updates} 个版本更新`, 'yellow');
      changes.forEach(({ type, name, from, to }) => {
        log(`    - ${name}: ${from} → ${to}`, 'yellow');
      });
      
      if (!dryRun) {
        if (writePackageJson(pkgPath, pkg)) {
          log(`  ✓ 已更新 ${name}`, 'green');
        }
      }
      
      updateDetails.push({ name, updates, changes });
      totalUpdates += updates;
    } else {
      log(`  ✓ 无需更新`, 'green');
    }
  });

  log('\n' + '='.repeat(60), 'cyan');
  if (dryRun) {
    log(`\n🔍 预览模式: 发现 ${totalUpdates} 个版本需要更新`, 'yellow');
    log('运行 npm run sync:versions 执行实际更新', 'yellow');
  } else {
    log(`\n✅ 版本同步完成! 共更新 ${totalUpdates} 个依赖`, 'green');
    if (totalUpdates > 0) {
      log('\n⚠️  请运行以下命令重新安装依赖:', 'yellow');
      log('  npm install', 'cyan');
    }
  }

  return { totalUpdates, updateDetails };
}

/**
 * 检查版本冲突
 */
function checkConflicts() {
  log('\n🔍 检查版本冲突...', 'cyan');
  
  const versionMap = new Map();
  const conflicts = [];

  PACKAGES.forEach(({ path: pkgPath, name }) => {
    const pkg = readPackageJson(pkgPath);
    if (!pkg) return;

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies
    };

    Object.entries(allDeps).forEach(([depName, version]) => {
      if (!versionMap.has(depName)) {
        versionMap.set(depName, []);
      }
      versionMap.get(depName).push({ package: name, version });
    });
  });

  versionMap.forEach((versions, depName) => {
    const uniqueVersions = [...new Set(versions.map(v => v.version))];
    if (uniqueVersions.length > 1) {
      conflicts.push({
        dependency: depName,
        versions: versions
      });
    }
  });

  if (conflicts.length > 0) {
    log(`\n⚠️  发现 ${conflicts.length} 个版本冲突:`, 'yellow');
    conflicts.forEach(({ dependency, versions }) => {
      log(`\n  ${dependency}:`, 'red');
      versions.forEach(({ package: pkg, version }) => {
        log(`    - ${pkg}: ${version}`, 'yellow');
      });
    });
  } else {
    log('\n✅ 未发现版本冲突', 'green');
  }

  return conflicts;
}

/**
 * 生成版本报告
 */
function generateReport() {
  log('\n📊 生成版本报告...', 'cyan');
  
  const versionsConfig = readVersionsConfig();
  const report = {
    generated: new Date().toISOString(),
    projectVersion: versionsConfig.project.version,
    packages: {},
    conflicts: []
  };

  PACKAGES.forEach(({ path: pkgPath, name }) => {
    const pkg = readPackageJson(pkgPath);
    if (!pkg) return;

    report.packages[name] = {
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || {}).length,
      devDependencies: Object.keys(pkg.devDependencies || {}).length,
      optionalDependencies: Object.keys(pkg.optionalDependencies || {}).length
    };
  });

  report.conflicts = checkConflicts();

  const reportPath = path.join(ROOT_DIR, 'version-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  
  log(`\n✅ 报告已生成: ${reportPath}`, 'green');
  return report;
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'sync';
  
  log('\n' + '='.repeat(60), 'cyan');
  log('📦 版本管理工具', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  switch (command) {
    case 'check':
      checkConflicts();
      break;
    
    case 'report':
      generateReport();
      break;
    
    case 'sync':
      const dryRun = args.includes('--dry-run');
      syncVersions(dryRun);
      break;
    
    case 'help':
    default:
      log('用法:', 'cyan');
      log('  node sync-versions.cjs [command] [options]', 'white');
      log('\n命令:', 'cyan');
      log('  sync          同步版本到各个 package.json (默认)', 'white');
      log('  check         检查版本冲突', 'white');
      log('  report        生成版本报告', 'white');
      log('  help          显示帮助信息', 'white');
      log('\n选项:', 'cyan');
      log('  --dry-run     预览模式,不实际修改文件', 'white');
      break;
  }
}

main();
