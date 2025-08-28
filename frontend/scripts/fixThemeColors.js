/**
 * 主题颜色自动修复脚本
 * 用于批量修复项目中的硬编码颜色类
 */

const fs = require('fs');
const path = require('path');

// 简单的glob实现，避免依赖问题
function simpleGlob(pattern, options = {}) {
  const files = [];

  function walkDir(dir) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过忽略的目录
          if (options.ignore && options.ignore.some(ignore => fullPath.includes(ignore.replace('**/', '').replace('/**', '')))) {
            continue;
          }
          walkDir(fullPath);
        } else if (stat.isFile()) {
          // 检查文件扩展名
          if (FILE_EXTENSIONS.some(ext => fullPath.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }
  }

  walkDir(pattern);
  return files;
}

// 颜色类映射表
const COLOR_MAPPINGS = {
  // 背景色
  'bg-white': 'themed-bg-primary',
  'bg-gray-50': 'themed-bg-secondary',
  'bg-gray-100': 'themed-bg-secondary',
  'bg-gray-200': 'themed-bg-tertiary',
  'bg-gray-300': 'themed-bg-tertiary',
  'bg-gray-800': 'themed-bg-secondary',
  'bg-gray-900': 'themed-bg-primary',

  // 文本颜色
  'text-gray-900': 'themed-text-primary',
  'text-gray-800': 'themed-text-primary',
  'text-gray-700': 'themed-text-secondary',
  'text-gray-600': 'themed-text-secondary',
  'text-gray-500': 'themed-text-tertiary',
  'text-gray-400': 'themed-text-tertiary',
  'text-gray-300': 'themed-text-secondary',
  'text-white': 'themed-text-primary',

  // 边框颜色
  'border-gray-200': 'themed-border-primary',
  'border-gray-300': 'themed-border-secondary',
  'border-gray-400': 'themed-border-tertiary',
  'border-gray-600': 'themed-border-primary',
  'border-gray-700': 'themed-border-secondary',

  // 占位符颜色
  'placeholder:text-gray-500': 'placeholder:themed-text-tertiary',
  'placeholder:text-gray-400': 'placeholder:themed-text-tertiary',
};

// 需要保留的状态颜色（不修改）
const PRESERVE_COLORS = [
  'text-red-', 'bg-red-', 'border-red-',
  'text-green-', 'bg-green-', 'border-green-',
  'text-blue-', 'bg-blue-', 'border-blue-',
  'text-yellow-', 'bg-yellow-', 'border-yellow-',
  'text-purple-', 'bg-purple-', 'border-purple-',
  'text-indigo-', 'bg-indigo-', 'border-indigo-',
];

// 文件扩展名白名单
const FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/**
 * 检查是否应该保留颜色类
 */
function shouldPreserveColor(className) {
  return PRESERVE_COLORS.some(prefix => className.includes(prefix));
}

/**
 * 替换文件中的硬编码颜色类
 */
function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // 替换颜色类
    Object.entries(COLOR_MAPPINGS).forEach(([oldClass, newClass]) => {
      // 创建正则表达式，匹配完整的类名
      const regex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

      if (regex.test(content)) {
        content = content.replace(regex, newClass);
        hasChanges = true;
        console.log(`  ✓ ${oldClass} → ${newClass}`);
      }
    });

    // 如果有变更，写回文件
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 扫描并修复目录中的文件
 */
function fixColorsInDirectory(directory) {
  console.log(`🔍 扫描目录: ${directory}`);

  const files = simpleGlob(directory, {
    ignore: [
      'node_modules',
      'dist',
      'build',
      '.next',
      'coverage'
    ]
  });

  console.log(`📁 找到 ${files.length} 个文件`);

  let processedFiles = 0;
  let modifiedFiles = 0;

  files.forEach(file => {
    console.log(`\n📝 处理: ${path.relative(process.cwd(), file)}`);

    if (replaceColorsInFile(file)) {
      modifiedFiles++;
    }
    processedFiles++;
  });

  return { processedFiles, modifiedFiles };
}

/**
 * 生成修复报告
 */
function generateReport(results) {
  const report = `
# 🎨 主题颜色修复报告

## 📊 统计信息
- **处理文件数**: ${results.processedFiles}
- **修改文件数**: ${results.modifiedFiles}
- **修复时间**: ${new Date().toLocaleString()}

## 🔧 修复的颜色映射
${Object.entries(COLOR_MAPPINGS).map(([old, new_]) => `- \`${old}\` → \`${new_}\``).join('\n')}

## 📝 注意事项
- 状态颜色（红、绿、蓝、黄等）已保留不变
- 建议运行测试确保修复正确
- 可以使用浏览器开发工具验证主题切换

## 🎯 下一步
1. 运行 \`npm run dev\` 启动开发服务器
2. 测试主题切换功能
3. 检查各页面颜色一致性
4. 运行自动化测试
`;

  fs.writeFileSync('theme-fix-report.md', report, 'utf8');
  console.log('\n📋 修复报告已生成: theme-fix-report.md');
}

/**
 * 主函数
 */
function main() {
  console.log('🎨 开始修复主题颜色...\n');

  const frontendDir = path.join(__dirname, '..');
  const results = fixColorsInDirectory(frontendDir);

  console.log('\n✅ 修复完成!');
  console.log(`📊 处理了 ${results.processedFiles} 个文件`);
  console.log(`🔧 修改了 ${results.modifiedFiles} 个文件`);

  generateReport(results);

  console.log('\n🎯 建议下一步操作:');
  console.log('1. 运行 npm run dev 启动开发服务器');
  console.log('2. 在浏览器中测试主题切换');
  console.log('3. 检查各页面颜色是否正确');
  console.log('4. 运行 validateTheme() 进行验证');
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  replaceColorsInFile,
  fixColorsInDirectory,
  COLOR_MAPPINGS
};
