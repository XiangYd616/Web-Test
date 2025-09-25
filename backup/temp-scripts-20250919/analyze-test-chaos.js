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
  });

  analysis.statistics.totalEngines = analysis.testEngines.length;
}

/**
 * 检查重复和冲突
 */
function checkDuplicatesAndConflicts() {

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
  console.log('📊 分析报告');

  // 统计信息

  // 重复问题
  if (analysis.duplicates.length > 0) {
    analysis.duplicates.forEach(dup => {
      dup.instances.forEach(inst => {
      });
    });
  }

  // 映射问题
  if (analysis.conflicts.length > 0) {
    analysis.conflicts.forEach(conflict => {
    });
  }

  // 命名问题
  if (analysis.namingIssues.length > 0) {
    analysis.namingIssues.forEach(issue => {
      if (issue.expected !== 'N/A' && issue.expected !== 'Subfolder organization') {
      }
    });
  }

  // 详细的引擎信息
  analysis.testEngines.forEach(engine => {
  });
}

/**
 * 生成解决方案
 */
function generateSolutions() {

  if (analysis.duplicates.length > 0) {
    analysis.duplicates.forEach(dup => {
      if (dup.type === 'Network Test Engine') {
      }
    });
  } else {
  }

  const needsRenaming = analysis.testEngines.filter(e => 
    e.mainEngine && !e.mainEngine.match(/^[A-Z].*TestEngine\.js$/));
  if (needsRenaming.length > 0) {
    needsRenaming.forEach(engine => {
    });
  } else {
  }

  const needsReorg = analysis.testEngines.filter(e => e.files.length > 5);
  if (needsReorg.length > 0) {
    needsReorg.forEach(engine => {
    });
  } else {
  }

  if (analysis.conflicts.length > 0) {
    const frontendIssues = analysis.conflicts.filter(c => c.type === 'frontend');
    const backendIssues = analysis.conflicts.filter(c => c.type === 'backend');
    
    if (frontendIssues.length > 0) {
      frontendIssues.forEach(issue => {
      });
    }
    
    if (backendIssues.length > 0) {
      backendIssues.forEach(issue => {
      });
    }
  } else {
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
    
    
    // 保存分析结果
    const outputPath = path.join(__dirname, '..', 'test-chaos-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  }
}

// 执行
runAnalysis();
