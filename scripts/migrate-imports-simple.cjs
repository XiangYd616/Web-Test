/**
 * 简化版批量迁移导入语句脚本
 * 将前端文件中的类型导入从旧路径迁移到@shared/types
 */

const fs = require('fs');
const path = require('path');

// 导入映射规则
const importMappings = [
  {
    // ApiResponse 和 ErrorCode 从 unified/apiResponse.types 迁移到 @shared/types
    pattern: /from\s+['"](?:\.\.\/)*types\/unified\/apiResponse\.types['"]/g,
    replacement: "from '@shared/types'"
  },
  {
    // TestType 和 TestStatus 从 unified/testTypes 迁移到 @shared/types
    pattern: /from\s+['"](?:\.\.\/)*types\/unified\/testTypes['"]/g,
    replacement: "from '@shared/types'"
  },
  {
    // 其他统一类型
    pattern: /from\s+['"](?:\.\.\/)*types\/unified\/baseTypes['"]/g,
    replacement: "from '@shared/types'"
  }
];

// 统计信息
let totalFiles = 0;
let modifiedFiles = 0;
let errorFiles = 0;

/**
 * 递归遍历目录
 */
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // 排除node_modules和其他不需要的目录
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile()) {
      // 只处理TypeScript文件
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        // 排除测试文件
        if (!filePath.includes('.test.') && !filePath.includes('.spec.')) {
          callback(filePath);
        }
      }
    }
  });
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 应用所有映射规则
    for (const mapping of importMappings) {
      if (mapping.pattern.test(content)) {
        content = content.replace(mapping.pattern, mapping.replacement);
        modified = true;
        console.log(`✓ ${path.relative(process.cwd(), filePath)}: 更新导入路径`);
      }
    }

    // 如果文件被修改，写回文件
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
    }
  } catch (error) {
    console.error(`✗ ${path.relative(process.cwd(), filePath)}: ${error.message}`);
    errorFiles++;
  }

  totalFiles++;
}

/**
 * 主函数
 */
function main() {
  console.log('开始批量迁移导入语句...\n');

  const frontendDir = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendDir)) {
    console.error('错误：未找到frontend目录');
    return;
  }

  // 遍历frontend目录
  walkDir(frontendDir, processFile);

  // 输出统计结果
  console.log('\n迁移完成！');
  console.log(`总计检查文件: ${totalFiles}`);
  console.log(`修改文件: ${modifiedFiles}`);
  console.log(`错误文件: ${errorFiles}`);

  // 输出建议
  if (modifiedFiles > 0) {
    console.log('\n建议：');
    console.log('1. 运行 npm run type-check 检查类型错误');
    console.log('2. 运行 npm run test 确保测试通过');
    console.log('3. 提交更改: git add -A && git commit -m "refactor: migrate imports to @shared/types"');
  }
}

// 运行脚本
main();
