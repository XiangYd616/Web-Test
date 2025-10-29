#!/usr/bin/env node
/**
 * 测试架构验证脚本
 * 验证所有架构组件是否正确配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

console.log('✅ Test-Web 架构验证工具');

const validation = {
  passed: [],
  failed: [],
  warnings: []
};

// 1. 验证所有引擎都有主文件
function validateEngineFiles() {
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  const engineDirs = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );

  engineDirs.forEach(dir => {
    const enginePath = path.join(enginesDir, dir);
    const files = fs.readdirSync(enginePath);
    const className = dir.charAt(0).toUpperCase() + dir.slice(1);
    const expectedMainFile = `${className}TestEngine.js`;
    
    if (files.includes(expectedMainFile)) {
      validation.passed.push(`✓ ${dir}: 主引擎文件存在 (${expectedMainFile})`);
    } else {
      // 检查是否有其他引擎文件
      const engineFiles = files.filter(f => 
        f.toLowerCase().includes('engine') && f.endsWith('.js')
      );
      if (engineFiles.length > 0) {
        validation.warnings.push(`⚠️  ${dir}: 主引擎文件命名不标准 (期望: ${expectedMainFile}, 实际: ${engineFiles.join(', ')})`);
      } else {
        validation.failed.push(`✗ ${dir}: 缺少主引擎文件`);
      }
    }
    
    // 检查index文件
    if (files.includes('index.js')) {
      validation.passed.push(`✓ ${dir}: index.js 存在`);
    } else {
      validation.warnings.push(`⚠️  ${dir}: 缺少 index.js 文件`);
    }
  });
}

// 2. 验证路由文件
function validateRoutes() {
  const routesDir = path.join(projectRoot, 'backend', 'routes');
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  
  const engineDirs = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );
  
  engineDirs.forEach(engine => {
    const routeFile = `${engine}.js`;
    const routePath = path.join(routesDir, routeFile);
    
    if (fs.existsSync(routePath)) {
      validation.passed.push(`✓ 路由 ${engine}: 文件存在`);
    } else {
      validation.failed.push(`✗ 路由 ${engine}: 文件缺失`);
    }
  });
}

// 3. 验证前后端映射
function validateFrontendBackendMapping() {
  const pagesDir = path.join(projectRoot, 'frontend', 'pages');
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  
  const testPages = fs.readdirSync(pagesDir).filter(f => 
    (f.endsWith('.tsx') || f.endsWith('.jsx')) && 
    f.toLowerCase().includes('test')
  );
  
  const engineNames = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );
  
  // 辅助页面，不需要对应的引擎
  const helperPages = [
    'TestHistory', 'TestOptimizations', 'TestResultDetail', 
    'TestSchedule', 'UnifiedTestPage'
  ];
  
  testPages.forEach(page => {
    const pageName = page.replace(/\.(tsx|jsx)$/, '');
    
    if (helperPages.includes(pageName)) {
      validation.passed.push(`✓ ${pageName}: 辅助页面，不需要独立引擎`);
      return;
    }
    
    const engineName = pageName.replace(/Test$/i, '').toLowerCase();
    
    if (engineNames.includes(engineName)) {
      validation.passed.push(`✓ ${pageName}: 有对应的后端引擎 (${engineName})`);
    } else {
      validation.warnings.push(`⚠️  ${pageName}: 没有对应的后端引擎`);
    }
  });
}

// 4. 验证文件命名一致性
function validateNamingConsistency() {
  
  const issues = [];
  
  // 检查引擎文件命名
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  const engineDirs = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );
  
  engineDirs.forEach(dir => {
    const enginePath = path.join(enginesDir, dir);
    const files = fs.readdirSync(enginePath);
    
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        issues.push(`${dir}/${file}: TypeScript文件应该是JavaScript`);
      }
    });
  });
  
  if (issues.length === 0) {
    validation.passed.push('✓ 所有文件命名符合规范');
  } else {
    issues.forEach(issue => {
      validation.warnings.push(`⚠️  ${issue}`);
    });
  }
}

// 5. 验证API端点
function validateAPIEndpoints() {
  const routesDir = path.join(projectRoot, 'backend', 'routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  const standardEndpoints = ['/status', '/run', '/test/:testId'];
  let validRoutes = 0;
  
  routeFiles.forEach(file => {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    let hasAllEndpoints = true;
    
    standardEndpoints.forEach(endpoint => {
      if (!content.includes(endpoint)) {
        hasAllEndpoints = false;
      }
    });
    
    if (hasAllEndpoints) {
      validRoutes++;
    }
  });
  
  validation.passed.push(`✓ ${validRoutes}/${routeFiles.length} 路由文件包含标准端点`);
}

// 6. 生成验证报告
function generateReport() {
  console.log('📊 验证报告');
  
  const totalChecks = validation.passed.length + validation.failed.length + validation.warnings.length;
  const passRate = ((validation.passed.length / totalChecks) * 100).toFixed(1);
  
  
  if (validation.passed.length > 0) {
    validation.passed.forEach(item => );
  }
  
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(item => );
  }
  
  if (validation.failed.length > 0) {
    validation.failed.forEach(item => );
  }
  
  // 整体评估
  if (validation.failed.length === 0) {
  } else if (validation.failed.length <= 3) {
    console.log('⚠️  架构基本完整，但还有少量问题需要修复。');
  } else {
    console.log('❌ 架构存在较多问题，建议运行修复脚本。');
  }
  
  // 保存验证结果
  const reportPath = path.join(projectRoot, 'architecture-validation.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalChecks,
      passed: validation.passed.length,
      failed: validation.failed.length,
      warnings: validation.warnings.length,
      passRate: passRate
    },
    details: validation
  }, null, 2));
  
}

// 执行验证

validateEngineFiles();
validateRoutes();
validateFrontendBackendMapping();
validateNamingConsistency();
validateAPIEndpoints();
generateReport();

