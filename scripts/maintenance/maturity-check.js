#!/usr/bin/env node
/**
 * 项目成熟度检查脚本
 * 识别重复、缺失、占位符内容
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = {
  duplicates: [],
  missing: [],
  placeholders: [],
  incomplete: [],
  suggestions: []
};

/**
 * 检查文件内容相似度
 */
function checkFileSimilarity(file1Path, file2Path) {
  const content1 = fs.readFileSync(file1Path, 'utf8');
  const content2 = fs.readFileSync(file2Path, 'utf8');
  
  // 简单的相似度检查（基于行数和关键内容）
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  if (Math.abs(lines1.length - lines2.length) < 5) {
    // 检查关键代码结构
    const struct1 = content1.replace(/\s+/g, '').substring(0, 500);
    const struct2 = content2.replace(/\s+/g, '').substring(0, 500);
    
    if (struct1 === struct2) {
      return 100; // 完全相同
    }
    
    // 计算相似度
    let matches = 0;
    const minLen = Math.min(struct1.length, struct2.length);
    for (let i = 0; i < minLen; i++) {
      if (struct1[i] === struct2[i]) matches++;
    }
    return Math.round((matches / minLen) * 100);
  }
  
  return 0;
}

/**
 * 查找重复文件
 */
function findDuplicates(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !['node_modules', '.git', 'dist'].includes(file)) {
      findDuplicates(filePath, fileList);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      fileList.push(filePath);
    }
  });
  
  // 比较文件相似度
  for (let i = 0; i < fileList.length; i++) {
    for (let j = i + 1; j < fileList.length; j++) {
      const similarity = checkFileSimilarity(fileList[i], fileList[j]);
      if (similarity > 80) {
        const rel1 = path.relative(path.join(__dirname, '..'), fileList[i]);
        const rel2 = path.relative(path.join(__dirname, '..'), fileList[j]);
        
        issues.duplicates.push({
          file1: rel1,
          file2: rel2,
          similarity: similarity + '%'
        });
      }
    }
  }
}

/**
 * 检查占位符和未完成内容
 */
function checkPlaceholders(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  // 占位符模式
  const placeholderPatterns = [
    { pattern: /TODO(?!:)/gi, type: 'TODO' },
    { pattern: /FIXME/gi, type: 'FIXME' },
    { pattern: /XXX/gi, type: 'XXX' },
    { pattern: /HACK/gi, type: 'HACK' },
    { pattern: /待实现|待完成|未完成/g, type: '中文标记' },
    { pattern: /placeholder|dummy|mock(?!ing)/gi, type: '占位符' },
    { pattern: /not\s+implemented/gi, type: '未实现' },
    { pattern: /coming\s+soon/gi, type: '即将推出' }
  ];
  
  placeholderPatterns.forEach(({ pattern, type }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      issues.placeholders.push({
        file: relativePath,
        type,
        count: matches.length
      });
    }
  });
  
  // 检查空函数或最小实现
  const emptyFunctionPattern = /function\s+\w+\s*\([^)]*\)\s*{\s*}/g;
  const emptyMethodPattern = /\w+\s*\([^)]*\)\s*{\s*}/g;
  
  if (emptyFunctionPattern.test(content) || emptyMethodPattern.test(content)) {
    issues.incomplete.push({
      file: relativePath,
      issue: '可能包含空函数'
    });
  }
}

/**
 * 检查缺失的重要文件
 */
function checkMissingFiles() {
  const requiredFiles = [
    { path: 'README.md', description: '项目说明文档' },
    { path: 'LICENSE', description: '许可证文件' },
    { path: '.gitignore', description: 'Git忽略文件' },
    { path: '.env.example', description: '环境变量示例' },
    { path: 'package.json', description: 'NPM配置文件' },
    { path: 'tsconfig.json', description: 'TypeScript配置' },
    { path: 'docs/API.md', description: 'API文档' },
    { path: 'docs/DEPLOYMENT.md', description: '部署文档' },
    { path: 'docs/CONTRIBUTING.md', description: '贡献指南' },
    { path: 'tests/unit', description: '单元测试目录' },
    { path: 'tests/integration', description: '集成测试目录' },
    { path: 'tests/e2e', description: '端到端测试目录' }
  ];
  
  requiredFiles.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      issues.missing.push({
        path: filePath,
        description,
        type: filePath.includes('.') ? 'file' : 'directory'
      });
    }
  });
}

/**
 * 检查组件一致性
 */
function checkComponentConsistency() {
  const frontendComponentsDir = path.join(__dirname, '..', 'frontend', 'components');
  
  if (fs.existsSync(frontendComponentsDir)) {
    const componentDirs = fs.readdirSync(frontendComponentsDir)
      .filter(f => fs.statSync(path.join(frontendComponentsDir, f)).isDirectory());
    
    componentDirs.forEach(dir => {
      const dirPath = path.join(frontendComponentsDir, dir);
      const files = fs.readdirSync(dirPath);
      
      // 检查是否有index文件
      if (!files.some(f => f.startsWith('index'))) {
        issues.suggestions.push({
          location: `frontend/components/${dir}`,
          suggestion: '缺少index文件用于导出',
          priority: 'medium'
        });
      }
      
      // 检查是否有测试文件
      if (!files.some(f => f.includes('.test.') || f.includes('.spec.'))) {
        issues.suggestions.push({
          location: `frontend/components/${dir}`,
          suggestion: '缺少测试文件',
          priority: 'high'
        });
      }
    });
  }
}

/**
 * 扫描整个项目
 */
function scanProject(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        scanProject(filePath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        checkPlaceholders(filePath);
      }
    }
  });
}

/**
 * 生成优化建议
 */
function generateOptimizationSuggestions() {
  // 基于发现的问题生成建议
  
  if (issues.duplicates.length > 0) {
    issues.suggestions.push({
      category: '代码重复',
      suggestion: '合并重复代码，创建共享模块',
      priority: 'high',
      files: issues.duplicates.map(d => d.file1)
    });
  }
  
  if (issues.placeholders.length > 10) {
    issues.suggestions.push({
      category: '占位符清理',
      suggestion: '完成TODO项并移除占位符内容',
      priority: 'high',
      count: issues.placeholders.length
    });
  }
  
  if (issues.missing.some(m => m.type === 'file' && m.path.includes('test'))) {
    issues.suggestions.push({
      category: '测试覆盖',
      suggestion: '添加缺失的测试文件和测试用例',
      priority: 'high'
    });
  }
  
  if (!fs.existsSync(path.join(__dirname, '..', 'docs', 'API.md'))) {
    issues.suggestions.push({
      category: '文档',
      suggestion: '创建完整的API文档',
      priority: 'medium'
    });
  }
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 项目成熟度分析报告');
  console.log('='.repeat(60));
  
  // 重复文件
  if (issues.duplicates.length > 0) {
    console.log('\n🔁 发现重复或高度相似的文件:');
    issues.duplicates.slice(0, 5).forEach(dup => {
      console.log(`  - ${dup.file1}`);
      console.log(`    与 ${dup.file2} 相似度: ${dup.similarity}`);
    });
  } else {
    console.log('\n✅ 没有发现重复文件');
  }
  
  // 缺失文件
  if (issues.missing.length > 0) {
    console.log('\n❌ 缺失的重要文件:');
    issues.missing.forEach(item => {
      console.log(`  - ${item.path}: ${item.description}`);
    });
  } else {
    console.log('\n✅ 所有重要文件都存在');
  }
  
  // 占位符统计
  if (issues.placeholders.length > 0) {
    console.log('\n📝 占位符和待完成内容:');
    const summary = {};
    issues.placeholders.forEach(item => {
      summary[item.type] = (summary[item.type] || 0) + item.count;
    });
    
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} 处`);
    });
  }
  
  // 不完整的实现
  if (issues.incomplete.length > 0) {
    console.log('\n⚠️  可能不完整的实现:');
    issues.incomplete.slice(0, 5).forEach(item => {
      console.log(`  - ${item.file}: ${item.issue}`);
    });
  }
  
  // 优化建议
  if (issues.suggestions.length > 0) {
    console.log('\n💡 优化建议:');
    issues.suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      })
      .forEach(suggestion => {
        const icon = suggestion.priority === 'high' ? '🔴' : 
                    suggestion.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${icon} [${suggestion.priority.toUpperCase()}] ${suggestion.category || suggestion.location}:`);
        console.log(`     ${suggestion.suggestion}`);
      });
  }
  
  // 成熟度评分
  const score = calculateMaturityScore();
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 项目成熟度评分: ${score}%`);
  
  if (score >= 90) {
    console.log('✨ 优秀！项目非常成熟完整');
  } else if (score >= 75) {
    console.log('👍 良好！项目基本成熟，仍有改进空间');
  } else if (score >= 60) {
    console.log('📝 及格！需要进一步完善');
  } else {
    console.log('⚠️  需要大量工作来提升项目成熟度');
  }
  
  return score;
}

/**
 * 计算成熟度评分
 */
function calculateMaturityScore() {
  let score = 100;
  
  // 扣分项
  score -= issues.duplicates.length * 2;
  score -= issues.missing.length * 5;
  score -= issues.placeholders.length * 0.5;
  score -= issues.incomplete.length * 1;
  
  // 确保分数在0-100之间
  return Math.max(0, Math.min(100, Math.round(score)));
}

// 主函数
async function main() {
  console.log('🔍 开始项目成熟度检查...\n');
  
  const projectRoot = path.join(__dirname, '..');
  
  // 1. 检查缺失文件
  console.log('📁 检查缺失文件...');
  checkMissingFiles();
  
  // 2. 查找重复文件
  console.log('🔁 查找重复文件...');
  findDuplicates(projectRoot);
  
  // 3. 扫描占位符和不完整内容
  console.log('📝 扫描占位符内容...');
  scanProject(projectRoot);
  
  // 4. 检查组件一致性
  console.log('🧩 检查组件一致性...');
  checkComponentConsistency();
  
  // 5. 生成优化建议
  generateOptimizationSuggestions();
  
  // 6. 生成报告
  const score = generateReport();
  
  // 7. 保存详细报告
  const reportPath = path.join(__dirname, '..', 'docs', 'maturity-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    score,
    issues,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n📄 详细报告已保存到: docs/maturity-report.json`);
}

main().catch(console.error);
