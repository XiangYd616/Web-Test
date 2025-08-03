#!/usr/bin/env node

/**
 * 迁移到yarn包管理器脚本
 * 自动更新所有npm引用为yarn
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 开始迁移到yarn包管理器...\n');

// 需要更新的文件和对应的替换规则
const filesToUpdate = [
  {
    file: 'package.json',
    replacements: [
      { from: '"npm run ', to: '"yarn ' },
      { from: 'npm run ', to: 'yarn ' }
    ]
  },
  {
    file: 'Dockerfile',
    replacements: [
      { from: 'npm ci', to: 'yarn install --frozen-lockfile' },
      { from: 'npm install', to: 'yarn install' },
      { from: 'npm run ', to: 'yarn ' },
      { from: 'npm cache clean --force', to: 'yarn cache clean' }
    ]
  },
  {
    file: 'Dockerfile.api',
    replacements: [
      { from: 'npm ci', to: 'yarn install --frozen-lockfile' },
      { from: 'npm install', to: 'yarn install' },
      { from: 'npm run ', to: 'yarn ' }
    ]
  },
  {
    file: 'deploy/server-deploy.sh',
    replacements: [
      { from: 'npm install --production --silent', to: 'yarn install --production --silent' }
    ]
  },
  {
    file: 'scripts/fix-ci-issues.cjs',
    replacements: [
      { from: 'npm ci', to: 'yarn install --frozen-lockfile' },
      { from: 'npm cache clean --force', to: 'yarn cache clean' },
      { from: 'npm update', to: 'yarn upgrade' }
    ]
  },
  {
    file: 'scripts/fix-npm-install.cjs',
    replacements: [
      { from: 'npm config set', to: 'yarn config set' },
      { from: 'npm install', to: 'yarn install' },
      { from: 'npm cache clean --force', to: 'yarn cache clean' },
      { from: 'npm rebuild', to: 'yarn rebuild' }
    ]
  }
];

/**
 * 更新文件内容
 */
function updateFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在，跳过: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
        modified = true;
        console.log(`  ✅ 替换: "${from}" → "${to}"`);
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`📝 更新文件: ${filePath}\n`);
      return true;
    } else {
      console.log(`📄 无需更新: ${filePath}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 更新失败: ${filePath} - ${error.message}\n`);
    return false;
  }
}

/**
 * 安装yarn
 */
function installYarn() {
  console.log('📦 检查yarn安装状态...');
  
  try {
    execSync('yarn --version', { stdio: 'pipe' });
    console.log('✅ yarn已安装\n');
    return true;
  } catch (error) {
    console.log('📦 安装yarn...');
    try {
      execSync('npm install -g yarn', { stdio: 'inherit' });
      console.log('✅ yarn安装成功\n');
      return true;
    } catch (installError) {
      console.log('❌ yarn安装失败，请手动安装yarn\n');
      console.log('安装命令: npm install -g yarn\n');
      return false;
    }
  }
}

/**
 * 删除npm锁文件
 */
function removeNpmLockFile() {
  console.log('🗑️  删除npm锁文件...');
  
  const lockFiles = ['package-lock.json', 'server/package-lock.json'];
  
  lockFiles.forEach(lockFile => {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`✅ 删除: ${lockFile}`);
    }
  });
  
  console.log('');
}

/**
 * 生成yarn锁文件
 */
function generateYarnLock() {
  console.log('🔒 生成yarn锁文件...');
  
  try {
    // 主项目
    console.log('  📦 主项目依赖...');
    execSync('yarn install', { stdio: 'inherit' });
    
    // 服务器项目
    if (fs.existsSync('server/package.json')) {
      console.log('  🖥️  服务器依赖...');
      process.chdir('server');
      execSync('yarn install', { stdio: 'inherit' });
      process.chdir('..');
    }
    
    console.log('✅ yarn锁文件生成成功\n');
    return true;
  } catch (error) {
    console.log(`❌ yarn安装失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 更新.gitignore
 */
function updateGitignore() {
  console.log('📁 更新.gitignore...');
  
  const gitignorePath = '.gitignore';
  if (!fs.existsSync(gitignorePath)) {
    console.log('⚠️  .gitignore不存在，跳过更新\n');
    return;
  }
  
  let content = fs.readFileSync(gitignorePath, 'utf8');
  
  // 添加yarn相关忽略项
  const yarnIgnores = [
    '# Yarn',
    'yarn-error.log*',
    '.yarn-integrity',
    '.yarn/',
    '.pnp.*'
  ];
  
  let modified = false;
  yarnIgnores.forEach(ignore => {
    if (!content.includes(ignore)) {
      content += '\n' + ignore;
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(gitignorePath, content);
    console.log('✅ .gitignore已更新\n');
  } else {
    console.log('📄 .gitignore无需更新\n');
  }
}

/**
 * 创建迁移报告
 */
function createMigrationReport(updatedFiles) {
  const reportContent = `# Yarn迁移报告

## 迁移概述
项目已成功从npm迁移到yarn包管理器。

## 更新的文件
${updatedFiles.map(file => `- ${file}`).join('\n')}

## 主要变更
- 删除了package-lock.json文件
- 生成了yarn.lock文件
- 更新了所有脚本中的npm命令为yarn命令
- 更新了Docker配置文件
- 更新了部署脚本

## 使用说明
现在可以使用以下yarn命令：

\`\`\`bash
# 安装依赖
yarn install

# 启动开发服务器
yarn start

# 构建项目
yarn build

# 运行测试
yarn test

# 添加依赖
yarn add package-name

# 添加开发依赖
yarn add -D package-name

# 移除依赖
yarn remove package-name
\`\`\`

## 注意事项
- 团队成员需要安装yarn: \`npm install -g yarn\`
- CI/CD环境需要更新为使用yarn
- 确保所有团队成员使用相同的包管理器

---
迁移时间: ${new Date().toISOString()}
`;

  fs.writeFileSync('YARN_MIGRATION_REPORT.md', reportContent);
  console.log('📋 迁移报告已生成: YARN_MIGRATION_REPORT.md\n');
}

/**
 * 主函数
 */
function main() {
  // 1. 安装yarn
  if (!installYarn()) {
    process.exit(1);
  }
  
  // 2. 更新文件
  console.log('📝 更新配置文件...\n');
  const updatedFiles = [];
  
  filesToUpdate.forEach(({ file, replacements }) => {
    if (updateFile(file, replacements)) {
      updatedFiles.push(file);
    }
  });
  
  // 3. 删除npm锁文件
  removeNpmLockFile();
  
  // 4. 生成yarn锁文件
  if (!generateYarnLock()) {
    console.log('⚠️  yarn安装失败，但配置文件已更新');
    console.log('请手动运行: yarn install');
  }
  
  // 5. 更新.gitignore
  updateGitignore();
  
  // 6. 创建迁移报告
  createMigrationReport(updatedFiles);
  
  console.log('🎉 迁移到yarn完成！');
  console.log('\n📋 后续步骤:');
  console.log('1. 检查yarn.lock文件是否正确生成');
  console.log('2. 测试项目启动: yarn start');
  console.log('3. 通知团队成员安装yarn');
  console.log('4. 更新CI/CD配置');
}

// 运行迁移
if (require.main === module) {
  main();
}
