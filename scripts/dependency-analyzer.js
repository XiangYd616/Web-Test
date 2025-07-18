#!/usr/bin/env node

/**
 * 依赖关系分析和整理脚本
 * 用于分析项目依赖、检查未使用的包、更新过时依赖等
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 分析结果
const analysisResults = {
  totalDependencies: 0,
  totalDevDependencies: 0,
  unusedDependencies: [],
  outdatedDependencies: [],
  securityIssues: [],
  duplicateDependencies: [],
  recommendations: [],
  errors: []
};

/**
 * 读取package.json
 */
function readPackageJson() {
  try {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(packageContent);
  } catch (error) {
    analysisResults.errors.push(`读取package.json失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取所有源代码文件
 */
function getAllSourceFiles() {
  const sourceFiles = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
            scanDirectory(filePath);
          }
        } else if (extensions.includes(path.extname(file))) {
          sourceFiles.push(filePath);
        }
      });
    } catch (error) {
      analysisResults.errors.push(`扫描目录失败 ${dir}: ${error.message}`);
    }
  }
  
  scanDirectory(path.join(PROJECT_ROOT, 'src'));
  scanDirectory(path.join(PROJECT_ROOT, 'server'));
  
  return sourceFiles;
}

/**
 * 分析依赖使用情况
 */
function analyzeDependencyUsage(packageJson) {
  console.log('🔍 分析依赖使用情况...\n');
  
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  analysisResults.totalDependencies = Object.keys(packageJson.dependencies || {}).length;
  analysisResults.totalDevDependencies = Object.keys(packageJson.devDependencies || {}).length;
  
  const sourceFiles = getAllSourceFiles();
  const usedDependencies = new Set();
  
  // 分析每个源文件中的导入
  sourceFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 匹配import语句
      const importMatches = content.match(/import\s+.+\s+from\s+['"]([^'"]+)['"]/g) || [];
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      
      [...importMatches, ...requireMatches].forEach(match => {
        const moduleMatch = match.match(/['"]([^'"]+)['"]/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          
          // 提取包名（处理scoped packages）
          let packageName;
          if (moduleName.startsWith('@')) {
            const parts = moduleName.split('/');
            packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
          } else {
            packageName = moduleName.split('/')[0];
          }
          
          if (allDependencies[packageName]) {
            usedDependencies.add(packageName);
          }
        }
      });
    } catch (error) {
      analysisResults.errors.push(`分析文件失败 ${filePath}: ${error.message}`);
    }
  });
  
  // 找出未使用的依赖
  Object.keys(allDependencies).forEach(dep => {
    if (!usedDependencies.has(dep)) {
      // 检查是否是工具类依赖（这些可能不会在源代码中直接导入）
      const toolDependencies = [
        'typescript', 'vite', 'vitest', 'electron', 'electron-builder',
        'tailwindcss', 'postcss', 'autoprefixer', 'nodemon', 'concurrently',
        'cross-env', 'wait-on', 'ts-node', 'connect-history-api-fallback'
      ];
      
      if (!toolDependencies.includes(dep)) {
        analysisResults.unusedDependencies.push(dep);
      }
    }
  });
  
  console.log(`📊 依赖分析结果:`);
  console.log(`   总依赖数: ${analysisResults.totalDependencies}`);
  console.log(`   开发依赖数: ${analysisResults.totalDevDependencies}`);
  console.log(`   使用的依赖: ${usedDependencies.size}`);
  console.log(`   可能未使用: ${analysisResults.unusedDependencies.length}\n`);
}

/**
 * 检查过时的依赖
 */
function checkOutdatedDependencies() {
  console.log('📅 检查过时的依赖...\n');
  
  try {
    // 使用npm outdated命令检查过时依赖
    const result = execSync('npm outdated --json', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result) {
      const outdated = JSON.parse(result);
      Object.keys(outdated).forEach(pkg => {
        analysisResults.outdatedDependencies.push({
          name: pkg,
          current: outdated[pkg].current,
          wanted: outdated[pkg].wanted,
          latest: outdated[pkg].latest
        });
      });
    }
  } catch (error) {
    // npm outdated在有过时依赖时会返回非零退出码，这是正常的
    if (error.stdout) {
      try {
        const outdated = JSON.parse(error.stdout);
        Object.keys(outdated).forEach(pkg => {
          analysisResults.outdatedDependencies.push({
            name: pkg,
            current: outdated[pkg].current,
            wanted: outdated[pkg].wanted,
            latest: outdated[pkg].latest
          });
        });
      } catch (parseError) {
        analysisResults.errors.push(`解析过时依赖信息失败: ${parseError.message}`);
      }
    }
  }
  
  console.log(`📊 过时依赖检查结果: ${analysisResults.outdatedDependencies.length} 个过时依赖\n`);
}

/**
 * 检查安全问题
 */
function checkSecurityIssues() {
  console.log('🔒 检查安全问题...\n');
  
  try {
    const result = execSync('npm audit --json', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const auditResult = JSON.parse(result);
    
    if (auditResult.vulnerabilities) {
      Object.keys(auditResult.vulnerabilities).forEach(pkg => {
        const vuln = auditResult.vulnerabilities[pkg];
        analysisResults.securityIssues.push({
          name: pkg,
          severity: vuln.severity,
          title: vuln.title,
          url: vuln.url
        });
      });
    }
  } catch (error) {
    if (error.stdout) {
      try {
        const auditResult = JSON.parse(error.stdout);
        if (auditResult.vulnerabilities) {
          Object.keys(auditResult.vulnerabilities).forEach(pkg => {
            const vuln = auditResult.vulnerabilities[pkg];
            analysisResults.securityIssues.push({
              name: pkg,
              severity: vuln.severity,
              title: vuln.title || '未知安全问题',
              url: vuln.url || ''
            });
          });
        }
      } catch (parseError) {
        analysisResults.errors.push(`解析安全审计结果失败: ${parseError.message}`);
      }
    }
  }
  
  console.log(`📊 安全检查结果: ${analysisResults.securityIssues.length} 个安全问题\n`);
}

/**
 * 生成建议
 */
function generateRecommendations() {
  console.log('💡 生成优化建议...\n');
  
  // 未使用依赖建议
  if (analysisResults.unusedDependencies.length > 0) {
    analysisResults.recommendations.push({
      type: 'cleanup',
      title: '清理未使用的依赖',
      description: `发现 ${analysisResults.unusedDependencies.length} 个可能未使用的依赖包`,
      action: `npm uninstall ${analysisResults.unusedDependencies.join(' ')}`,
      packages: analysisResults.unusedDependencies
    });
  }
  
  // 过时依赖建议
  if (analysisResults.outdatedDependencies.length > 0) {
    const majorUpdates = analysisResults.outdatedDependencies.filter(dep => {
      const currentMajor = dep.current.split('.')[0];
      const latestMajor = dep.latest.split('.')[0];
      return currentMajor !== latestMajor;
    });
    
    if (majorUpdates.length > 0) {
      analysisResults.recommendations.push({
        type: 'update-major',
        title: '主要版本更新',
        description: `${majorUpdates.length} 个依赖有主要版本更新，需要谨慎处理`,
        packages: majorUpdates.map(dep => dep.name)
      });
    }
    
    const minorUpdates = analysisResults.outdatedDependencies.filter(dep => {
      const currentMajor = dep.current.split('.')[0];
      const latestMajor = dep.latest.split('.')[0];
      return currentMajor === latestMajor;
    });
    
    if (minorUpdates.length > 0) {
      analysisResults.recommendations.push({
        type: 'update-minor',
        title: '次要版本更新',
        description: `${minorUpdates.length} 个依赖可以安全更新`,
        action: 'npm update',
        packages: minorUpdates.map(dep => dep.name)
      });
    }
  }
  
  // 安全问题建议
  if (analysisResults.securityIssues.length > 0) {
    const highSeverity = analysisResults.securityIssues.filter(issue => 
      ['high', 'critical'].includes(issue.severity)
    );
    
    if (highSeverity.length > 0) {
      analysisResults.recommendations.push({
        type: 'security-critical',
        title: '紧急安全修复',
        description: `发现 ${highSeverity.length} 个高危安全问题，需要立即修复`,
        action: 'npm audit fix --force',
        packages: highSeverity.map(issue => issue.name)
      });
    }
  }
  
  console.log(`📊 生成建议: ${analysisResults.recommendations.length} 条优化建议\n`);
}

/**
 * 生成分析报告
 */
function generateAnalysisReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# 依赖关系分析报告

## 📅 分析日期
${timestamp.split('T')[0]}

## 📊 依赖统计

- **生产依赖**: ${analysisResults.totalDependencies} 个
- **开发依赖**: ${analysisResults.totalDevDependencies} 个
- **总计**: ${analysisResults.totalDependencies + analysisResults.totalDevDependencies} 个

## 🗑️ 可能未使用的依赖 (${analysisResults.unusedDependencies.length}个)

${analysisResults.unusedDependencies.length > 0 ? 
  analysisResults.unusedDependencies.map(dep => `- \`${dep}\``).join('\n') : 
  '✅ 所有依赖都在使用中'}

## 📅 过时的依赖 (${analysisResults.outdatedDependencies.length}个)

${analysisResults.outdatedDependencies.length > 0 ? 
  analysisResults.outdatedDependencies.map(dep => 
    `- \`${dep.name}\`: ${dep.current} → ${dep.latest}`
  ).join('\n') : 
  '✅ 所有依赖都是最新版本'}

## 🔒 安全问题 (${analysisResults.securityIssues.length}个)

${analysisResults.securityIssues.length > 0 ? 
  analysisResults.securityIssues.map(issue => 
    `- \`${issue.name}\`: ${issue.severity} - ${issue.title}`
  ).join('\n') : 
  '✅ 未发现安全问题'}

## 💡 优化建议 (${analysisResults.recommendations.length}条)

${analysisResults.recommendations.map(rec => `
### ${rec.title}
${rec.description}

${rec.action ? `**执行命令**: \`${rec.action}\`` : ''}

**涉及包**: ${rec.packages ? rec.packages.map(pkg => `\`${pkg}\``).join(', ') : '无'}
`).join('\n')}

## ❌ 错误记录 (${analysisResults.errors.length}个)

${analysisResults.errors.length > 0 ? 
  analysisResults.errors.map(error => `- ${error}`).join('\n') : 
  '✅ 分析过程中无错误'}

## 📋 下一步行动

1. **立即处理**: 修复高危安全问题
2. **计划处理**: 更新过时的依赖包
3. **可选处理**: 清理未使用的依赖包

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'reports', 'DEPENDENCY_ANALYSIS_REPORT.md');
  
  // 确保目录存在
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 分析报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('📦 开始依赖关系分析...\n');
    
    // 读取package.json
    const packageJson = readPackageJson();
    if (!packageJson) {
      console.error('❌ 无法读取package.json，分析终止');
      process.exit(1);
    }
    
    // 分析依赖使用情况
    analyzeDependencyUsage(packageJson);
    
    // 检查过时的依赖
    checkOutdatedDependencies();
    
    // 检查安全问题
    checkSecurityIssues();
    
    // 生成建议
    generateRecommendations();
    
    // 生成分析报告
    generateAnalysisReport();
    
    console.log('🎉 依赖关系分析完成！');
    
    if (analysisResults.errors.length === 0) {
      console.log('✅ 分析过程中无错误');
    } else {
      console.log(`⚠️  分析过程中发现 ${analysisResults.errors.length} 个错误，请检查报告`);
    }
    
  } catch (error) {
    console.error('\n💥 分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  readPackageJson,
  getAllSourceFiles,
  analyzeDependencyUsage,
  checkOutdatedDependencies,
  checkSecurityIssues,
  generateRecommendations,
  generateAnalysisReport
};
