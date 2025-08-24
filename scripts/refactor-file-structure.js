#!/usr/bin/env node

/**
 * 文件结构重构脚本
 * 自动执行文件重命名和目录重组
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查Git状态
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  警告: 工作目录有未提交的更改', 'yellow');
      log('建议先提交所有更改再执行重构', 'yellow');
      return false;
    }
    return true;
  } catch (error) {
    log('❌ 无法检查Git状态', 'red');
    return false;
  }
}

// 创建备份分支
function createBackupBranch() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `refactor/file-structure-${timestamp}`;
    
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
    log(`✅ 创建重构分支: ${branchName}`, 'green');
    return branchName;
  } catch (error) {
    log('❌ 创建分支失败', 'red');
    return null;
  }
}

// 文件重命名映射
const fileRenames = [
  {
    from: 'frontend/services/api/UnifiedTestApiClient.ts',
    to: 'frontend/services/api/unifiedTestApiClient.ts',
    type: 'rename'
  },
  {
    from: 'frontend/components/ui/UI_OPTIMIZATION_GUIDE.md',
    to: 'frontend/components/ui/ui-optimization-guide.md',
    type: 'rename'
  }
];

// 目录重组映射
const directoryMoves = [
  {
    from: 'frontend/examples',
    to: 'docs/examples',
    type: 'move',
    createParent: true
  },
  {
    from: 'frontend/services/backgroundTestManagerAdapter.ts',
    to: 'frontend/services/api/managers/backgroundTestManagerAdapter.ts',
    type: 'move',
    createParent: true
  }
];

// 导入更新映射
const importUpdates = [
  {
    pattern: /from ['"](\.\.?\/)*services\/api\/UnifiedTestApiClient['"];?/g,
    replacement: "from '$1services/api/unifiedTestApiClient';",
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx']
  },
  {
    pattern: /import.*UnifiedTestApiClient/g,
    replacement: (match) => match.replace('UnifiedTestApiClient', 'unifiedTestApiClient'),
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx']
  }
];

// 执行文件重命名
function executeRenames() {
  log('\n📝 执行文件重命名...', 'blue');
  
  for (const rename of fileRenames) {
    try {
      if (fs.existsSync(rename.from)) {
        // 确保目标目录存在
        const targetDir = path.dirname(rename.to);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // 使用Git mv来保持历史记录
        execSync(`git mv "${rename.from}" "${rename.to}"`, { stdio: 'inherit' });
        log(`✅ 重命名: ${rename.from} → ${rename.to}`, 'green');
      } else {
        log(`⚠️  文件不存在: ${rename.from}`, 'yellow');
      }
    } catch (error) {
      log(`❌ 重命名失败: ${rename.from}`, 'red');
      log(`   错误: ${error.message}`, 'red');
    }
  }
}

// 执行目录移动
function executeDirectoryMoves() {
  log('\n📁 执行目录重组...', 'blue');
  
  for (const move of directoryMoves) {
    try {
      if (fs.existsSync(move.from)) {
        // 创建父目录
        if (move.createParent) {
          const targetDir = path.dirname(move.to);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            log(`📁 创建目录: ${targetDir}`, 'blue');
          }
        }
        
        // 使用Git mv来保持历史记录
        execSync(`git mv "${move.from}" "${move.to}"`, { stdio: 'inherit' });
        log(`✅ 移动: ${move.from} → ${move.to}`, 'green');
      } else {
        log(`⚠️  文件/目录不存在: ${move.from}`, 'yellow');
      }
    } catch (error) {
      log(`❌ 移动失败: ${move.from}`, 'red');
      log(`   错误: ${error.message}`, 'red');
    }
  }
}

// 更新导入引用
function updateImports() {
  log('\n🔄 更新导入引用...', 'blue');
  
  const glob = require('glob');
  
  for (const update of importUpdates) {
    for (const filePattern of update.files) {
      try {
        const files = glob.sync(filePattern);
        
        for (const file of files) {
          if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            const originalContent = content;
            
            if (typeof update.replacement === 'function') {
              content = content.replace(update.pattern, update.replacement);
            } else {
              content = content.replace(update.pattern, update.replacement);
            }
            
            if (content !== originalContent) {
              fs.writeFileSync(file, content, 'utf8');
              log(`✅ 更新导入: ${file}`, 'green');
            }
          }
        }
      } catch (error) {
        log(`❌ 更新导入失败: ${filePattern}`, 'red');
        log(`   错误: ${error.message}`, 'red');
      }
    }
  }
}

// 验证编译
function verifyCompilation() {
  log('\n🔍 验证TypeScript编译...', 'blue');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    log('✅ TypeScript编译通过', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript编译失败', 'red');
    log('请检查并修复编译错误', 'yellow');
    return false;
  }
}

// 创建提交
function createCommit() {
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "refactor: 优化文件命名和项目结构\n\n- 统一服务类文件命名规范\n- 重组目录结构\n- 更新导入引用\n- 移动示例文件到docs目录"', { stdio: 'inherit' });
    log('✅ 创建提交成功', 'green');
    return true;
  } catch (error) {
    log('❌ 创建提交失败', 'red');
    return false;
  }
}

// 主函数
async function main() {
  log('🚀 开始文件结构重构...', 'blue');
  
  // 检查先决条件
  if (!checkGitStatus()) {
    log('❌ 请先处理Git状态问题', 'red');
    process.exit(1);
  }
  
  // 创建备份分支
  const branchName = createBackupBranch();
  if (!branchName) {
    log('❌ 无法创建备份分支', 'red');
    process.exit(1);
  }
  
  try {
    // 执行重构步骤
    executeRenames();
    executeDirectoryMoves();
    updateImports();
    
    // 验证结果
    if (!verifyCompilation()) {
      log('⚠️  编译验证失败，请手动修复', 'yellow');
      log('可以使用 git reset --hard HEAD~1 回滚更改', 'yellow');
      return;
    }
    
    // 创建提交
    if (createCommit()) {
      log('\n🎉 文件结构重构完成！', 'green');
      log(`📋 重构分支: ${branchName}`, 'blue');
      log('📋 下一步建议:', 'blue');
      log('  1. 运行完整测试: npm run test', 'blue');
      log('  2. 检查功能是否正常', 'blue');
      log('  3. 如果一切正常，合并到主分支', 'blue');
      log('  4. 如果有问题，使用 git reset --hard HEAD~1 回滚', 'blue');
    }
    
  } catch (error) {
    log(`❌ 重构过程中出现错误: ${error.message}`, 'red');
    log('建议检查错误并手动修复', 'yellow');
  }
}

// 检查是否安装了必要的依赖
function checkDependencies() {
  try {
    require('glob');
    return true;
  } catch (error) {
    log('❌ 缺少必要依赖: glob', 'red');
    log('请运行: npm install glob', 'yellow');
    return false;
  }
}

// 入口点
if (require.main === module) {
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  main().catch(error => {
    log(`❌ 脚本执行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  executeRenames,
  executeDirectoryMoves,
  updateImports,
  verifyCompilation
};
