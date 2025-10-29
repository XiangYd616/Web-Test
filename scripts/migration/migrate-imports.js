/**
 * 批量迁移导入语句脚本
 * 将前端文件中的类型导入从旧路径迁移到@shared/types
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 导入映射规则
const importMappings = [
  {
    // ApiResponse 和 ErrorCode 从 unified/apiResponse.types 迁移到 @shared/types
    pattern: /from\s+['"](\.\.\/)*types\/unified\/apiResponse\.types['"]/g,
    replacement: "from '@shared/types'",
    types: ['ApiResponse', 'ErrorCode', 'ApiError', 'PaginatedResponse']
  },
  {
    // TestType 和 TestStatus 从 unified/testTypes 迁移到 @shared/types
    pattern: /from\s+['"](\.\.\/)*types\/unified\/testTypes['"]/g,
    replacement: "from '@shared/types'",
    types: ['TestType', 'TestStatus', 'TestResult']
  },
  {
    // 其他统一类型
    pattern: /from\s+['"](\.\.\/)*types\/unified\/baseTypes['"]/g,
    replacement: "from '@shared/types'",
    types: []
  }
];

// 要处理的文件模式
const filePatterns = [
  'frontend/**/*.ts',
  'frontend/**/*.tsx',
  '!frontend/**/*.test.ts',
  '!frontend/**/*.test.tsx',
  '!frontend/**/*.spec.ts',
  '!frontend/**/*.spec.tsx',
  '!frontend/**/node_modules/**'
];

// 统计信息
let totalFiles = 0;
let modifiedFiles = 0;
let errorFiles = 0;

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // 应用所有映射规则
    for (const mapping of importMappings) {
      if (mapping.pattern.test(content)) {
        content = content.replace(mapping.pattern, mapping.replacement);
        modified = true;
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

  // 查找所有符合条件的文件
  const files = [];
  filePatterns.forEach(pattern => {
    if (pattern.startsWith('!')) {
      // 排除模式
      return;
    }
    const matchedFiles = glob.sync(pattern, {
      ignore: filePatterns.filter(p => p.startsWith('!')).map(p => p.substring(1))
    });
    files.push(...matchedFiles);
  });

  // 去重
  const uniqueFiles = [...new Set(files)];

  // 处理每个文件
  uniqueFiles.forEach(processFile);

  // 输出统计结果

  // 输出建议
  if (modifiedFiles > 0) {
  }
}

// 运行脚本
main();
