#!/usr/bin/env node
/**
 * 全面的测试架构分析工具
 * 检查前后端一致性、架构合理性、命名规范等问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

console.log('🔍 Test-Web 测试架构全面分析');

// 分析结果收集
const analysis = {
  timestamp: new Date().toISOString(),
  backend: {
    engines: {},
    routes: {},
    services: {},
    middleware: []
  },
  frontend: {
    pages: {},
    components: {},
    hooks: {},
    services: {}
  },
  issues: {
    naming: [],
    mapping: [],
    architecture: [],
    redundancy: [],
    inconsistency: []
  },
  recommendations: []
};

// 1. 分析后端测试引擎
function analyzeBackendEngines() {
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  
  if (!fs.existsSync(enginesDir)) {
    console.log('❌ 后端引擎目录不存在');
    return;
  }

  const engineDirs = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );

  engineDirs.forEach(dir => {
    const enginePath = path.join(enginesDir, dir);
    const files = fs.readdirSync(enginePath);
    
    // 查找主引擎文件
    const mainEngineFiles = files.filter(f => 
      f.toLowerCase().includes('testengine') || 
      f.toLowerCase().includes('engine')
    );

    // 查找index文件
    const hasIndex = files.includes('index.js') || files.includes('index.ts');
    
    // 分析文件类型
    const fileTypes = {
      engines: mainEngineFiles,
      analyzers: files.filter(f => f.toLowerCase().includes('analyzer')),
      utilities: files.filter(f => f.toLowerCase().includes('util') || f.toLowerCase().includes('helper')),
      tests: files.filter(f => f.includes('.test.') || f.includes('.spec.')),
      configs: files.filter(f => f.includes('config'))
    };

    analysis.backend.engines[dir] = {
      path: enginePath,
      mainEngine: mainEngineFiles[0] || null,
      hasIndex,
      fileCount: files.length,
      fileTypes,
      expectedName: `${dir}TestEngine.js`,
      issues: []
    };

    // 检查命名规范
    if (mainEngineFiles.length === 0) {
      analysis.issues.naming.push({
        type: 'missing_main_engine',
        engine: dir,
        message: `引擎目录 ${dir} 缺少主引擎文件`
      });
    } else if (mainEngineFiles.length > 1) {
      analysis.issues.redundancy.push({
        type: 'multiple_main_engines',
        engine: dir,
        files: mainEngineFiles,
        message: `引擎目录 ${dir} 有多个主引擎文件`
      });
    }

    // 检查命名一致性
    const expectedName = `${dir.charAt(0).toUpperCase() + dir.slice(1)}TestEngine.js`;
    if (mainEngineFiles[0] && mainEngineFiles[0] !== expectedName) {
      const actualName = mainEngineFiles[0];
      // 检查是否只是大小写问题
      if (actualName.toLowerCase() === expectedName.toLowerCase()) {
        analysis.issues.naming.push({
          type: 'case_mismatch',
          engine: dir,
          expected: expectedName,
          actual: actualName,
          message: `大小写不一致: 期望 ${expectedName}, 实际 ${actualName}`
        });
      } else {
        analysis.issues.naming.push({
          type: 'name_mismatch',
          engine: dir,
          expected: expectedName,
          actual: actualName,
          message: `命名不规范: 期望 ${expectedName}, 实际 ${actualName}`
        });
      }
    }
  });

}

// 2. 分析后端路由
function analyzeBackendRoutes() {
  const routesDir = path.join(projectRoot, 'backend', 'routes');
  
  if (!fs.existsSync(routesDir)) {
    console.log('❌ 后端路由目录不存在');
    return;
  }

  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 提取路由端点
    const endpoints = [];
    const routePatterns = [
      /router\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/gi,
      /app\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/gi
    ];
    
    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2]
        });
      }
    });

    const routeName = file.replace('.js', '');
    analysis.backend.routes[routeName] = {
      file,
      endpoints,
      hasTestEndpoints: endpoints.some(e => e.path.includes('test')),
      relatedEngine: findRelatedEngine(routeName)
    };
  });

}

// 3. 分析前端测试页面
function analyzeFrontendPages() {
  const pagesDir = path.join(projectRoot, 'frontend', 'pages');
  
  if (!fs.existsSync(pagesDir)) {
    console.log('❌ 前端页面目录不存在');
    return;
  }

  const pageFiles = fs.readdirSync(pagesDir).filter(f => 
    (f.endsWith('.tsx') || f.endsWith('.jsx')) && 
    (f.toLowerCase().includes('test') || f.toLowerCase().includes('check'))
  );

  pageFiles.forEach(file => {
    const filePath = path.join(pagesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 提取页面信息
    const pageName = file.replace(/\.(tsx|jsx)$/, '');
    const engineName = extractEngineFromPageName(pageName);
    
    // 查找API调用
    const apiCalls = [];
    const apiPatterns = [
      /fetch\(['"`](.*?)['"`]/gi,
      /axios\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/gi,
      /api\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/gi
    ];
    
    apiPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const url = match[match.length - 1];
        if (url.includes('api') || url.includes('test')) {
          apiCalls.push(url);
        }
      }
    });

    analysis.frontend.pages[pageName] = {
      file,
      expectedEngine: engineName,
      apiCalls,
      hasBackendEngine: !!analysis.backend.engines[engineName],
      imports: extractImports(content)
    };

    // 检查前后端映射
    if (!analysis.backend.engines[engineName]) {
      analysis.issues.mapping.push({
        type: 'missing_backend_engine',
        page: pageName,
        expectedEngine: engineName,
        message: `前端页面 ${pageName} 没有对应的后端引擎 ${engineName}`
      });
    }
  });

}

// 4. 分析前端组件
function analyzeFrontendComponents() {
  const componentsDir = path.join(projectRoot, 'frontend', 'components');
  
  if (!fs.existsSync(componentsDir)) {
    console.log('❌ 前端组件目录不存在');
    return;
  }

  // 递归查找测试相关组件
  function findTestComponents(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    const components = [];
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        components.push(...findTestComponents(itemPath, path.join(prefix, item)));
      } else if ((item.endsWith('.tsx') || item.endsWith('.jsx')) && 
                 (item.toLowerCase().includes('test') || dir.includes('test'))) {
        components.push({
          name: item.replace(/\.(tsx|jsx)$/, ''),
          path: path.join(prefix, item),
          fullPath: itemPath
        });
      }
    });
    
    return components;
  }

  const testComponents = findTestComponents(componentsDir);
  
  testComponents.forEach(comp => {
    const content = fs.readFileSync(comp.fullPath, 'utf8');
    
    analysis.frontend.components[comp.name] = {
      path: comp.path,
      exports: extractExports(content),
      imports: extractImports(content),
      usesHooks: content.includes('use') && content.includes('hook'),
      category: comp.path.split(path.sep)[0] || 'root'
    };
  });

}

// 5. 分析前端Hooks
function analyzeFrontendHooks() {
  const hooksDir = path.join(projectRoot, 'frontend', 'hooks');
  
  if (!fs.existsSync(hooksDir)) {
    console.log('❌ 前端Hooks目录不存在');
    return;
  }

  const hookFiles = fs.readdirSync(hooksDir).filter(f => 
    (f.endsWith('.ts') || f.endsWith('.js')) && 
    (f.includes('use') || f.includes('Test'))
  );

  hookFiles.forEach(file => {
    const filePath = path.join(hooksDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hookName = file.replace(/\.(ts|js)$/, '');
    
    analysis.frontend.hooks[hookName] = {
      file,
      exports: extractExports(content),
      dependencies: extractDependencies(content),
      relatedEngines: extractRelatedEngines(content)
    };
  });

}

// 6. 检查架构一致性
function checkArchitectureConsistency() {
  
  // 检查每个后端引擎是否有对应的路由
  Object.keys(analysis.backend.engines).forEach(engine => {
    const hasRoute = Object.keys(analysis.backend.routes).some(route => 
      route.toLowerCase().includes(engine.toLowerCase()) ||
      engine.toLowerCase().includes(route.toLowerCase())
    );
    
    if (!hasRoute) {
      analysis.issues.architecture.push({
        type: 'missing_route',
        engine,
        message: `引擎 ${engine} 没有对应的路由文件`
      });
    }
  });

  // 检查命名一致性
  const namingPatterns = {
    engines: [],
    pages: [],
    routes: []
  };

  // 收集命名模式
  Object.keys(analysis.backend.engines).forEach(engine => {
    if (analysis.backend.engines[engine].mainEngine) {
      namingPatterns.engines.push(analysis.backend.engines[engine].mainEngine);
    }
  });

  Object.keys(analysis.frontend.pages).forEach(page => {
    namingPatterns.pages.push(page);
  });

  Object.keys(analysis.backend.routes).forEach(route => {
    namingPatterns.routes.push(route);
  });

  // 检查命名模式一致性
  checkNamingConsistency(namingPatterns);

  // 检查API端点一致性
  checkAPIConsistency();
}

// 7. 生成修复建议
function generateRecommendations() {
  
  // 基于发现的问题生成建议
  if (analysis.issues.naming.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      category: 'naming',
      title: '统一命名规范',
      actions: analysis.issues.naming.map(issue => ({
        type: 'rename',
        from: issue.actual,
        to: issue.expected,
        path: issue.engine
      }))
    });
  }

  if (analysis.issues.mapping.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      category: 'mapping',
      title: '修复前后端映射',
      actions: analysis.issues.mapping.map(issue => ({
        type: issue.type === 'missing_backend_engine' ? 'create_engine' : 'create_page',
        name: issue.expectedEngine || issue.expectedPage,
        for: issue.page || issue.engine
      }))
    });
  }

  if (analysis.issues.architecture.length > 0) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'architecture',
      title: '完善架构组件',
      actions: analysis.issues.architecture.map(issue => ({
        type: issue.type,
        target: issue.engine || issue.component,
        solution: issue.message
      }))
    });
  }

  if (analysis.issues.redundancy.length > 0) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'redundancy',
      title: '清理冗余文件',
      actions: analysis.issues.redundancy.map(issue => ({
        type: 'consolidate',
        files: issue.files,
        location: issue.engine
      }))
    });
  }

  // 添加通用建议
  analysis.recommendations.push({
    priority: 'low',
    category: 'documentation',
    title: '完善文档',
    actions: [
      { type: 'create', name: 'TEST_ARCHITECTURE.md', description: '创建测试架构文档' },
      { type: 'update', name: 'README.md', description: '更新测试工具使用说明' }
    ]
  });
}

// 辅助函数
function findRelatedEngine(routeName) {
  const engines = Object.keys(analysis.backend.engines);
  return engines.find(engine => 
    engine.toLowerCase() === routeName.toLowerCase() ||
    routeName.toLowerCase().includes(engine.toLowerCase()) ||
    engine.toLowerCase().includes(routeName.toLowerCase())
  ) || null;
}

function extractEngineFromPageName(pageName) {
  // 移除Test后缀并转换为小写
  let engineName = pageName.replace(/Test$/i, '').toLowerCase();
  
  // 特殊映射
  const mappings = {
    'accessibilitytest': 'accessibility',
    'performancetest': 'performance',
    'securitytest': 'security',
    'stresstest': 'stress',
    'compatibilitytest': 'compatibility',
    'apitest': 'api',
    'networktest': 'network',
    'databasetest': 'database',
    'websitetest': 'website',
    'contenttest': 'content',
    'seotest': 'seo',
    'uxtest': 'ux'
  };
  
  return mappings[pageName.toLowerCase()] || engineName;
}

function extractImports(content) {
  const imports = [];
  const importPattern = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractExports(content) {
  const exports = [];
  const exportPatterns = [
    /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
    /export\s+{([^}]+)}/g
  ];
  
  exportPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1].trim());
      }
    }
  });
  
  return exports;
}

function extractDependencies(content) {
  const deps = [];
  const patterns = [
    /useState/g,
    /useEffect/g,
    /useCallback/g,
    /useMemo/g,
    /useContext/g,
    /useReducer/g
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      deps.push(pattern.source);
    }
  });
  
  return deps;
}

function extractRelatedEngines(content) {
  const engines = [];
  Object.keys(analysis.backend.engines).forEach(engine => {
    if (content.toLowerCase().includes(engine.toLowerCase())) {
      engines.push(engine);
    }
  });
  return engines;
}

function checkNamingConsistency(patterns) {
  // 检查是否使用一致的命名约定
  const conventions = {
    camelCase: 0,
    PascalCase: 0,
    kebab_case: 0,
    snake_case: 0
  };
  
  patterns.engines.forEach(name => {
    if (name) {
      if (/^[a-z][a-zA-Z0-9]*/.test(name)) conventions.camelCase++;
      if (/^[A-Z][a-zA-Z0-9]*/.test(name)) conventions.PascalCase++;
      if (name.includes('-')) conventions.kebab_case++;
      if (name.includes('_')) conventions.snake_case++;
    }
  });
  
  // 找出最常用的约定
  const mostUsed = Object.keys(conventions).reduce((a, b) => 
    conventions[a] > conventions[b] ? a : b
  );
  
  // 检查不一致的命名
  patterns.engines.forEach(name => {
    if (name && !isFollowingConvention(name, mostUsed)) {
      analysis.issues.inconsistency.push({
        type: 'naming_convention',
        file: name,
        expected: mostUsed,
        message: `文件 ${name} 不符合主要的命名约定 ${mostUsed}`
      });
    }
  });
}

function isFollowingConvention(name, convention) {
  switch (convention) {
    case 'camelCase':
      return /^[a-z][a-zA-Z0-9]*/.test(name) && !name.includes('-') && !name.includes('_');
    case 'PascalCase':
      return /^[A-Z][a-zA-Z0-9]*/.test(name) && !name.includes('-') && !name.includes('_');
    case 'kebab_case':
      return name.includes('-');
    case 'snake_case':
      return name.includes('_');
    default:
      return true;
  }
}

function checkAPIConsistency() {
  // 检查前端API调用是否有对应的后端端点
  Object.values(analysis.frontend.pages).forEach(page => {
    page.apiCalls.forEach(apiCall => {
      let foundEndpoint = false;
      
      Object.values(analysis.backend.routes).forEach(route => {
        if (route.endpoints.some(ep => apiCall.includes(ep.path))) {
          foundEndpoint = true;
        }
      });
      
      if (!foundEndpoint) {
        analysis.issues.inconsistency.push({
          type: 'missing_endpoint',
          page: page.file,
          apiCall,
          message: `前端调用的API ${apiCall} 在后端没有找到对应端点`
        });
      }
    });
  });
}

// 生成详细报告
function generateReport() {
  console.log('📊 分析报告');
  
  // 统计信息
  
  // 问题统计
  
  // 详细问题列表
  if (analysis.issues.naming.length > 0) {
    analysis.issues.naming.forEach(issue => {
    });
  }
  
  if (analysis.issues.mapping.length > 0) {
    analysis.issues.mapping.forEach(issue => {
    });
  }
  
  if (analysis.issues.architecture.length > 0) {
    analysis.issues.architecture.forEach(issue => {
    });
  }
  
  if (analysis.issues.redundancy.length > 0) {
    analysis.issues.redundancy.forEach(issue => {
    });
  }
  
  if (analysis.issues.inconsistency.length > 0) {
    analysis.issues.inconsistency.forEach(issue => {
    });
  }
  
  // 建议
  
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  analysis.recommendations.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  
  analysis.recommendations.forEach((rec, index) => {
    rec.actions.forEach(action => {
      if (action.type === 'rename') {
      } else if (action.type === 'create_engine') {
      } else if (action.type === 'create_page') {
      } else if (action.type === 'consolidate') {
      } else if (action.type === 'create' || action.type === 'update') {
      } else {
      }
    });
  });
}

// 保存分析结果
function saveAnalysisResults() {
  const outputPath = path.join(projectRoot, 'test-architecture-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
}

// 执行分析

analyzeBackendEngines();
analyzeBackendRoutes();
analyzeFrontendPages();
analyzeFrontendComponents();
analyzeFrontendHooks();
checkArchitectureConsistency();
generateRecommendations();
generateReport();
saveAnalysisResults();

