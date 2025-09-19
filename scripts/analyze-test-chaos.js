#!/usr/bin/env node
/**
 * 测试工具混乱分析脚本
 * 分析项目中测试工具的重复、冲突和组织问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Test-Web 测试工具混乱分析');
console.log('='.repeat(60));

const analysis = {
  testEngines: [],
  duplicates: [],
  conflicts: [],
  missingFiles: [],
  unusedFiles: [],
  namingIssues: [],
  statistics: {
    totalEngines: 0,
    totalFiles: 0,
    duplicateCount: 0,
    conflictCount: 0
  }
};

/**
 * 扫描测试引擎
 */
function scanTestEngines() {
  const enginesDir = path.join(__dirname, '..', 'backend', 'engines');
  const engineFolders = fs.readdirSync(enginesDir).filter(f => {
    const fullPath = path.join(enginesDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log('\n📁 发现的引擎目录:');
  engineFolders.forEach(folder => {
    const folderPath = path.join(enginesDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    
    const engineInfo = {
      name: folder,
      path: folderPath,
      files: files,
      hasIndex: files.includes('index.js') || files.includes('index.ts'),
      mainEngine: null,
      analyzers: [],
      utils: [],
      others: []
    };

    // 分类文件
    files.forEach(file => {
      const content = fs.readFileSync(path.join(folderPath, file), 'utf8');
      
      if (file.toLowerCase().includes('testengine')) {
        engineInfo.mainEngine = file;
      } else if (file.toLowerCase().includes('analyzer')) {
        engineInfo.analyzers.push(file);
      } else if (file === 'index.js' || file === 'index.ts') {
        // Index file
      } else if (content.includes('class') && content.includes('Engine')) {
        engineInfo.others.push(file);
      } else {
        engineInfo.utils.push(file);
      }
    });

    analysis.testEngines.push(engineInfo);
    console.log(`  - ${folder}: ${files.length} 文件`);
  });

  analysis.statistics.totalEngines = analysis.testEngines.length;
}

/**
 * 检查重复和冲突
 */
function checkDuplicatesAndConflicts() {
  console.log('\n🔄 检查重复和冲突...');

  // 检查网络测试引擎重复
  const networkEngines = [];
  analysis.testEngines.forEach(engine => {
    if (engine.name === 'network') {
      engine.files.forEach(file => {
        if (file.toLowerCase().includes('network') && file.toLowerCase().includes('engine')) {
          networkEngines.push({
            folder: engine.name,
            file: file,
            path: path.join(engine.path, file)
          });
        }
      });
    }
    // API文件夹中也有network测试引擎
    if (engine.name === 'api') {
      engine.files.forEach(file => {
        if (file.toLowerCase().includes('network')) {
          networkEngines.push({
            folder: engine.name,
            file: file,
            path: path.join(engine.path, file)
          });
        }
      });
    }
  });

  if (networkEngines.length > 1) {
    analysis.duplicates.push({
      type: 'Network Test Engine',
      instances: networkEngines
    });
  }

  // 检查数据库测试引擎重复
  const databaseEngines = [];
  analysis.testEngines.forEach(engine => {
    engine.files.forEach(file => {
      if (file.toLowerCase().includes('database') && file.toLowerCase().includes('engine')) {
        databaseEngines.push({
          folder: engine.name,
          file: file,
          path: path.join(engine.path, file)
        });
      }
    });
  });

  if (databaseEngines.length > 1) {
    analysis.duplicates.push({
      type: 'Database Test Engine',
      instances: databaseEngines
    });
  }

  analysis.statistics.duplicateCount = analysis.duplicates.length;
}

/**
 * 检查命名规范
 */
function checkNamingConventions() {
  console.log('\n📝 检查命名规范...');

  analysis.testEngines.forEach(engine => {
    // 检查主引擎文件命名
    if (engine.mainEngine) {
      const expectedName = `${engine.name}TestEngine.js`;
      if (engine.mainEngine !== expectedName && 
          engine.mainEngine !== `${engine.name.charAt(0).toUpperCase() + engine.name.slice(1)}TestEngine.js`) {
        analysis.namingIssues.push({
          folder: engine.name,
          file: engine.mainEngine,
          expected: expectedName,
          issue: '主引擎文件命名不规范'
        });
      }
    } else if (engine.name !== 'core' && engine.name !== 'base' && 
               engine.name !== 'services' && engine.name !== 'clients') {
      analysis.namingIssues.push({
        folder: engine.name,
        file: 'N/A',
        expected: `${engine.name}TestEngine.js`,
        issue: '缺少主引擎文件'
      });
    }
  });
}

/**
 * 检查前后端对应关系
 */
function checkFrontendBackendMapping() {
  console.log('\n🔗 检查前后端对应关系...');

  const frontendPages = fs.readdirSync(path.join(__dirname, '..', 'frontend', 'pages'))
    .filter(f => f.includes('Test') && f.endsWith('.tsx'))
    .map(f => f.replace('Test.tsx', '').toLowerCase());

  const backendEngines = analysis.testEngines.map(e => e.name);

  const mappingIssues = [];

  // 检查前端页面是否有对应的后端引擎
  frontendPages.forEach(page => {
    if (!backendEngines.includes(page) && 
        page !== 'unified' && 
        page !== 'history' && 
        page !== 'resultdetail' &&
        page !== 'schedule' &&
        page !== 'optimizations') {
      mappingIssues.push({
        type: 'frontend',
        name: page,
        issue: '前端页面没有对应的后端引擎'
      });
    }
  });

  // 检查后端引擎是否有对应的前端页面
  backendEngines.forEach(engine => {
    if (!frontendPages.includes(engine) && 
        engine !== 'core' && 
        engine !== 'base' && 
        engine !== 'services' &&
        engine !== 'clients' &&
        engine !== 'automation' &&
        engine !== 'documentation' &&
        engine !== 'regression') {
      mappingIssues.push({
        type: 'backend',
        name: engine,
        issue: '后端引擎没有对应的前端页面'
      });
    }
  });

  analysis.conflicts = mappingIssues;
  analysis.statistics.conflictCount = mappingIssues.length;
}

/**
 * 检查文件组织结构
 */
function checkFileOrganization() {
  console.log('\n📊 检查文件组织结构...');

  analysis.testEngines.forEach(engine => {
    // 检查是否有合理的文件组织
    const hasSubfolders = fs.readdirSync(engine.path).some(item => {
      const fullPath = path.join(engine.path, item);
      return fs.statSync(fullPath).isDirectory();
    });

    if (engine.files.length > 5 && !hasSubfolders) {
      analysis.namingIssues.push({
        folder: engine.name,
        file: 'N/A',
        expected: 'Subfolder organization',
        issue: `文件过多(${engine.files.length}个)但没有子文件夹组织`
      });
    }
  });
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 分析报告');
  console.log('='.repeat(60));

  // 统计信息
  console.log('\n📈 统计信息:');
  console.log(`  - 测试引擎总数: ${analysis.statistics.totalEngines}`);
  console.log(`  - 重复问题: ${analysis.statistics.duplicateCount}`);
  console.log(`  - 映射问题: ${analysis.statistics.conflictCount}`);
  console.log(`  - 命名问题: ${analysis.namingIssues.length}`);

  // 重复问题
  if (analysis.duplicates.length > 0) {
    console.log('\n❗ 重复的测试引擎:');
    analysis.duplicates.forEach(dup => {
      console.log(`\n  ${dup.type}:`);
      dup.instances.forEach(inst => {
        console.log(`    - ${inst.folder}/${inst.file}`);
      });
    });
  }

  // 映射问题
  if (analysis.conflicts.length > 0) {
    console.log('\n⚠️ 前后端映射问题:');
    analysis.conflicts.forEach(conflict => {
      console.log(`  - [${conflict.type}] ${conflict.name}: ${conflict.issue}`);
    });
  }

  // 命名问题
  if (analysis.namingIssues.length > 0) {
    console.log('\n📝 命名和组织问题:');
    analysis.namingIssues.forEach(issue => {
      console.log(`  - ${issue.folder}: ${issue.issue}`);
      if (issue.expected !== 'N/A' && issue.expected !== 'Subfolder organization') {
        console.log(`    期望: ${issue.expected}, 实际: ${issue.file}`);
      }
    });
  }

  // 详细的引擎信息
  console.log('\n📋 测试引擎详情:');
  analysis.testEngines.forEach(engine => {
    console.log(`\n  ${engine.name}:`);
    console.log(`    - 主引擎: ${engine.mainEngine || '无'}`);
    console.log(`    - 分析器: ${engine.analyzers.length}个`);
    console.log(`    - 工具类: ${engine.utils.length}个`);
    console.log(`    - 其他: ${engine.others.length}个`);
    console.log(`    - 有index文件: ${engine.hasIndex ? '是' : '否'}`);
  });
}

/**
 * 生成解决方案
 */
function generateSolutions() {
  console.log('\n' + '='.repeat(60));
  console.log('💡 建议的解决方案');
  console.log('='.repeat(60));

  console.log('\n1. 解决重复问题:');
  if (analysis.duplicates.length > 0) {
    analysis.duplicates.forEach(dup => {
      console.log(`   - 合并或删除重复的 ${dup.type}`);
      if (dup.type === 'Network Test Engine') {
        console.log('     建议: 将 api/networkTestEngine.js 移动到 network/ 文件夹');
      }
    });
  } else {
    console.log('   ✅ 没有发现重复问题');
  }

  console.log('\n2. 规范命名:');
  const needsRenaming = analysis.testEngines.filter(e => 
    e.mainEngine && !e.mainEngine.match(/^[A-Z].*TestEngine\.js$/));
  if (needsRenaming.length > 0) {
    needsRenaming.forEach(engine => {
      console.log(`   - 重命名 ${engine.name}/${engine.mainEngine}`);
      console.log(`     为 ${engine.name.charAt(0).toUpperCase() + engine.name.slice(1)}TestEngine.js`);
    });
  } else {
    console.log('   ✅ 命名规范良好');
  }

  console.log('\n3. 组织结构优化:');
  const needsReorg = analysis.testEngines.filter(e => e.files.length > 5);
  if (needsReorg.length > 0) {
    needsReorg.forEach(engine => {
      console.log(`   - ${engine.name}/ 需要更好的文件组织`);
      console.log('     建议创建子文件夹: analyzers/, utils/, tests/');
    });
  } else {
    console.log('   ✅ 文件组织良好');
  }

  console.log('\n4. 前后端对齐:');
  if (analysis.conflicts.length > 0) {
    const frontendIssues = analysis.conflicts.filter(c => c.type === 'frontend');
    const backendIssues = analysis.conflicts.filter(c => c.type === 'backend');
    
    if (frontendIssues.length > 0) {
      console.log('   前端页面缺少后端支持:');
      frontendIssues.forEach(issue => {
        console.log(`     - ${issue.name}Test.tsx 需要创建对应的后端引擎`);
      });
    }
    
    if (backendIssues.length > 0) {
      console.log('   后端引擎缺少前端界面:');
      backendIssues.forEach(issue => {
        console.log(`     - ${issue.name} 引擎需要创建对应的前端页面`);
      });
    }
  } else {
    console.log('   ✅ 前后端对齐良好');
  }
}

// 执行分析
function runAnalysis() {
  try {
    scanTestEngines();
    checkDuplicatesAndConflicts();
    checkNamingConventions();
    checkFrontendBackendMapping();
    checkFileOrganization();
    generateReport();
    generateSolutions();
    
    console.log('\n✨ 分析完成！');
    
    // 保存分析结果
    const outputPath = path.join(__dirname, '..', 'test-chaos-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📁 详细分析结果已保存到: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  }
}

// 执行
runAnalysis();
