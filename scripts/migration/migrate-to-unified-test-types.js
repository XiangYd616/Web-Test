#!/usr/bin/env node

/**
 * 迁移脚本 - 更新所有文件使用统一的测试类型定义
 * 
 * 运行方式：
 * node scripts/migrate-to-unified-test-types.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 要替换的旧导入语句模式
const OLD_IMPORTS = [
  // Frontend imports
  { 
    pattern: /import\s+.*?from\s+['"].*?\/types\/enums\.types['"];?/g,
    replacement: "import { TestType, TestStatus, TestPriority, TestGrade } from '@/shared/types/unified-test-types';"
  },
  { 
    pattern: /import\s+.*?from\s+['"].*?\/types\/unified\/testTypes['"];?/g,
    replacement: "import { TestType, TestStatus } from '@/shared/types/unified-test-types';"
  },
  { 
    pattern: /import\s+.*?from\s+['"].*?\/types\/unified\/testTypes\.types['"];?/g,
    replacement: "import { TestType, TestStatus } from '@/shared/types/unified-test-types';"
  },
  { 
    pattern: /import\s+.*?TEST_TYPES.*?from\s+['"].*?\/constants['"];?/g,
    replacement: "import { TestType } from '@/shared/types/unified-test-types';"
  },
  
  // Backend requires
  { 
    pattern: /const\s+.*?=\s+require\(['"].*?\/types\/enums\.types['"]\);?/g,
    replacement: "const { TestType, TestStatus, TestPriority, TestGrade } = require('../../shared/types/unified-test-types');"
  },
  { 
    pattern: /const\s+.*?TEST_TYPES.*?=\s+require\(['"].*?\/constants['"]\);?/g,
    replacement: "const { TestType } = require('../../shared/types/unified-test-types');"
  }
];

// 要替换的枚举使用模式
const ENUM_REPLACEMENTS = [
  // TEST_TYPES.PERFORMANCE -> TestType.PERFORMANCE
  { pattern: /TEST_TYPES\.(\w+)/g, replacement: 'TestType.$1' },
  // TEST_STATUS.PENDING -> TestStatus.PENDING  
  { pattern: /TEST_STATUS\.(\w+)/g, replacement: 'TestStatus.$1' },
  // TestTypeEnum.PERFORMANCE -> TestType.PERFORMANCE
  { pattern: /TestTypeEnum\.(\w+)/g, replacement: 'TestType.$1' },
  // TestStatusEnum.PENDING -> TestStatus.PENDING
  { pattern: /TestStatusEnum\.(\w+)/g, replacement: 'TestStatus.$1' },
  // TestStatusType.IDLE -> TestStatus.IDLE
  { pattern: /TestStatusType\.(\w+)/g, replacement: 'TestStatus.$1' }
];

// 要处理的文件扩展名
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// 要排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next'
];

/**
 * 检查文件是否应该被处理
 */
function shouldProcessFile(filePath) {
  // 排除目录
  for (const dir of EXCLUDE_DIRS) {
    if (filePath.includes(dir)) return false;
  }
  
  // 排除统一定义文件本身
  if (filePath.includes('unified-test-types')) return false;
  
  // 检查文件扩展名
  const ext = path.extname(filePath);
  return FILE_EXTENSIONS.includes(ext);
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 替换导入语句
    for (const { pattern, replacement } of OLD_IMPORTS) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // 替换枚举使用
    for (const { pattern, replacement } of ENUM_REPLACEMENTS) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // 如果文件被修改，写回文件
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已更新: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始迁移到统一测试类型定义...\n');
  
  const projectRoot = path.resolve(__dirname, '..');
  let totalFiles = 0;
  let updatedFiles = 0;
  
  // 查找所有需要处理的文件
  const patterns = FILE_EXTENSIONS.map(ext => `**/*${ext}`);
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: projectRoot,
      absolute: true,
      ignore: EXCLUDE_DIRS.map(dir => `**/${dir}/**`)
    });
    
    for (const file of files) {
      if (shouldProcessFile(file)) {
        totalFiles++;
        if (processFile(file)) {
          updatedFiles++;
        }
      }
    }
  }
  
  
  // 创建迁移报告
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles,
    updatedFiles,
    skippedFiles: totalFiles - updatedFiles,
    unifiedTypePath: 'shared/types/unified-test-types.js'
  };
  
  fs.writeFileSync(
    path.join(projectRoot, 'migration-report.json'),
    JSON.stringify(report, null, 2)
  );
  
}

// 运行主函数
main().catch(error => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
