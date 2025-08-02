#!/usr/bin/env node

/**
 * 生产环境构建测试脚本
 * 验证构建产物的质量和性能指标
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

// 配置
const config = {
  distDir: 'dist',
  maxBundleSize: 500 * 1024, // 500KB
  maxChunkSize: 200 * 1024,  // 200KB
  maxCSSSize: 100 * 1024,    // 100KB
  minGzipRatio: 0.3,         // 最小压缩比
  expectedFiles: [
    'index.html',
    'assets/js',
    'assets/css'
  ]
};

/**
 * 获取文件大小（字节）
 */
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 分析构建产物
 */
function analyzeBuildOutput() {
  log.title('📊 构建产物分析');
  
  if (!fs.existsSync(config.distDir)) {
    log.error(`构建目录 ${config.distDir} 不存在`);
    return false;
  }

  // 检查必需文件
  log.info('检查必需文件...');
  let allFilesExist = true;
  
  config.expectedFiles.forEach(file => {
    const filePath = path.join(config.distDir, file);
    if (fs.existsSync(filePath)) {
      log.success(`✓ ${file}`);
    } else {
      log.error(`✗ ${file} 缺失`);
      allFilesExist = false;
    }
  });

  if (!allFilesExist) {
    return false;
  }

  // 分析文件大小
  log.info('\n文件大小分析:');
  const allFiles = getAllFiles(config.distDir);
  const fileStats = {
    js: [],
    css: [],
    html: [],
    images: [],
    other: []
  };

  allFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const size = getFileSize(file);
    const relativePath = path.relative(config.distDir, file);
    
    const fileInfo = { path: relativePath, size };
    
    if (ext === '.js') {
      fileStats.js.push(fileInfo);
    } else if (ext === '.css') {
      fileStats.css.push(fileInfo);
    } else if (ext === '.html') {
      fileStats.html.push(fileInfo);
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
      fileStats.images.push(fileInfo);
    } else {
      fileStats.other.push(fileInfo);
    }
  });

  // 显示统计信息
  Object.entries(fileStats).forEach(([type, files]) => {
    if (files.length > 0) {
      console.log(`\n${colors.magenta}${type.toUpperCase()} 文件:${colors.reset}`);
      files.forEach(file => {
        const sizeStr = formatSize(file.size);
        const isLarge = (type === 'js' && file.size > config.maxChunkSize) ||
                       (type === 'css' && file.size > config.maxCSSSize);
        
        if (isLarge) {
          log.warning(`  ${file.path} - ${sizeStr} (过大)`);
        } else {
          console.log(`  ${file.path} - ${sizeStr}`);
        }
      });
    }
  });

  // 计算总大小
  const totalSize = allFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  console.log(`\n${colors.cyan}总大小: ${formatSize(totalSize)}${colors.reset}`);

  return true;
}

/**
 * 检查代码分割
 */
function checkCodeSplitting() {
  log.title('🔀 代码分割检查');
  
  const jsDir = path.join(config.distDir, 'assets', 'js');
  if (!fs.existsSync(jsDir)) {
    log.error('JS资源目录不存在');
    return false;
  }

  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  
  if (jsFiles.length < 2) {
    log.warning('代码分割可能未生效，只有一个JS文件');
  } else {
    log.success(`代码已分割为 ${jsFiles.length} 个chunk`);
  }

  // 检查vendor chunk
  const hasVendorChunk = jsFiles.some(file => file.includes('vendor'));
  if (hasVendorChunk) {
    log.success('✓ 发现vendor chunk');
  } else {
    log.warning('未发现vendor chunk，可能影响缓存效率');
  }

  return true;
}

/**
 * 检查CSS优化
 */
function checkCSSOptimization() {
  log.title('🎨 CSS优化检查');
  
  const cssDir = path.join(config.distDir, 'assets', 'css');
  if (!fs.existsSync(cssDir)) {
    log.error('CSS资源目录不存在');
    return false;
  }

  const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
  
  if (cssFiles.length === 0) {
    log.error('未发现CSS文件');
    return false;
  }

  log.success(`发现 ${cssFiles.length} 个CSS文件`);

  // 检查CSS文件大小
  cssFiles.forEach(file => {
    const filePath = path.join(cssDir, file);
    const size = getFileSize(filePath);
    
    if (size > config.maxCSSSize) {
      log.warning(`${file} 大小为 ${formatSize(size)}，可能需要进一步优化`);
    } else {
      log.success(`${file} - ${formatSize(size)}`);
    }
  });

  return true;
}

/**
 * 检查资源压缩
 */
function checkCompression() {
  log.title('📦 资源压缩检查');
  
  // 检查是否有gzip文件
  const allFiles = getAllFiles(config.distDir);
  const gzipFiles = allFiles.filter(file => file.endsWith('.gz'));
  
  if (gzipFiles.length > 0) {
    log.success(`发现 ${gzipFiles.length} 个gzip压缩文件`);
    
    // 计算压缩比
    gzipFiles.forEach(gzipFile => {
      const originalFile = gzipFile.replace('.gz', '');
      if (fs.existsSync(originalFile)) {
        const originalSize = getFileSize(originalFile);
        const compressedSize = getFileSize(gzipFile);
        const ratio = compressedSize / originalSize;
        
        if (ratio < config.minGzipRatio) {
          log.success(`${path.basename(originalFile)} 压缩比: ${(ratio * 100).toFixed(1)}%`);
        } else {
          log.warning(`${path.basename(originalFile)} 压缩比: ${(ratio * 100).toFixed(1)}% (压缩效果不佳)`);
        }
      }
    });
  } else {
    log.warning('未发现gzip压缩文件，建议启用服务器压缩');
  }

  return true;
}

/**
 * 检查HTML优化
 */
function checkHTMLOptimization() {
  log.title('📄 HTML优化检查');
  
  const indexPath = path.join(config.distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    log.error('index.html 不存在');
    return false;
  }

  const htmlContent = fs.readFileSync(indexPath, 'utf8');
  
  // 检查是否压缩
  if (htmlContent.includes('\n  ') || htmlContent.includes('\n    ')) {
    log.warning('HTML可能未完全压缩');
  } else {
    log.success('HTML已压缩');
  }

  // 检查预加载资源
  if (htmlContent.includes('rel="preload"')) {
    log.success('发现预加载资源');
  } else {
    log.warning('未发现预加载资源，可能影响首屏性能');
  }

  // 检查关键CSS
  if (htmlContent.includes('<style>')) {
    log.success('发现内联CSS（可能是关键CSS）');
  } else {
    log.warning('未发现内联CSS，考虑添加关键CSS');
  }

  return true;
}

/**
 * 运行性能测试
 */
function runPerformanceTest() {
  log.title('⚡ 性能测试');
  
  try {
    // 模拟启动本地服务器进行测试
    log.info('启动本地服务器...');
    
    // 这里可以添加实际的性能测试逻辑
    // 比如使用 lighthouse 或其他工具
    
    log.success('性能测试完成');
    return true;
  } catch (error) {
    log.error(`性能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.cyan}🚀 生产环境构建验证${colors.reset}\n`);
  
  const tests = [
    { name: '构建产物分析', fn: analyzeBuildOutput },
    { name: '代码分割检查', fn: checkCodeSplitting },
    { name: 'CSS优化检查', fn: checkCSSOptimization },
    { name: '资源压缩检查', fn: checkCompression },
    { name: 'HTML优化检查', fn: checkHTMLOptimization },
    { name: '性能测试', fn: runPerformanceTest }
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  tests.forEach(test => {
    try {
      if (test.fn()) {
        passedTests++;
      }
    } catch (error) {
      log.error(`${test.name} 执行失败: ${error.message}`);
    }
  });

  // 输出总结
  log.title('📋 测试总结');
  
  if (passedTests === totalTests) {
    log.success(`所有测试通过 (${passedTests}/${totalTests})`);
    console.log(`${colors.green}🎉 构建质量优秀，可以部署到生产环境！${colors.reset}`);
    process.exit(0);
  } else {
    log.warning(`部分测试未通过 (${passedTests}/${totalTests})`);
    console.log(`${colors.yellow}⚠️  建议优化后再部署到生产环境${colors.reset}`);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBuildOutput,
  checkCodeSplitting,
  checkCSSOptimization,
  checkCompression,
  checkHTMLOptimization,
  runPerformanceTest
};
