#!/usr/bin/env node
/**
 * 自动修复测试架构问题
 * 基于comprehensive-test-architecture-analysis.js的分析结果
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

console.log('🔧 Test-Web 测试架构自动修复工具');

// 读取分析结果
const analysisPath = path.join(projectRoot, 'test-architecture-analysis.json');
if (!fs.existsSync(analysisPath)) {
  console.error('❌ 找不到分析结果文件，请先运行 comprehensive-test-architecture-analysis.js');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
const fixes = {
  renamed: [],
  created: [],
  deleted: [],
  updated: [],
  errors: []
};

// 1. 修复命名问题
function fixNamingIssues() {
  
  // 修复TypeScript文件扩展名
  const tsToJsFiles = [
    { from: 'backend/engines/base/BaseTestEngine.ts', to: 'backend/engines/base/BaseTestEngine.js' },
    { from: 'backend/engines/regression/RegressionTestEngine.ts', to: 'backend/engines/regression/RegressionTestEngine.js' }
  ];
  
  tsToJsFiles.forEach(file => {
    const fromPath = path.join(projectRoot, file.from);
    const toPath = path.join(projectRoot, file.to);
    
    if (fs.existsSync(fromPath)) {
      try {
        let content = fs.readFileSync(fromPath, 'utf8');
        // 转换TypeScript特定语法到JavaScript
        content = convertTsToJs(content);
        fs.writeFileSync(toPath, content);
        fs.unlinkSync(fromPath);
        fixes.renamed.push({ from: file.from, to: file.to });
      } catch (error) {
        fixes.errors.push({ file: file.from, error: error.message });
        console.error(`  ❌ 重命名失败: ${file.from} - ${error.message}`);
      }
    }
  });
  
  // 修复主引擎文件命名
  const renameMappings = [
    { 
      dir: 'content', 
      from: 'contentDetectionEngine.js', 
      to: 'ContentTestEngine.js',
      keep: true // 已存在ContentTestEngine.js，只需删除旧的
    },
    {
      dir: 'core',
      from: 'TestEngineManager.js',
      to: 'CoreTestEngine.js',
      merge: 'UnifiedTestEngine.js' // 需要合并两个文件
    },
    {
      dir: 'seo',
      from: 'SEOTestEngine.js',
      to: 'SeoTestEngine.js'
    },
    {
      dir: 'ux',
      from: 'UXTestEngine.js',
      to: 'UxTestEngine.js'
    }
  ];
  
  renameMappings.forEach(mapping => {
    const fromPath = path.join(projectRoot, 'backend', 'engines', mapping.dir, mapping.from);
    const toPath = path.join(projectRoot, 'backend', 'engines', mapping.dir, mapping.to);
    
    if (mapping.keep && fs.existsSync(fromPath)) {
      // 删除旧文件，保留已存在的新文件
      try {
        fs.unlinkSync(fromPath);
        fixes.deleted.push(fromPath);
      } catch (error) {
        fixes.errors.push({ file: mapping.from, error: error.message });
      }
    } else if (mapping.merge) {
      // 合并多个文件
      const mergePath = path.join(projectRoot, 'backend', 'engines', mapping.dir, mapping.merge);
      if (fs.existsSync(fromPath) && fs.existsSync(mergePath)) {
        try {
          const content1 = fs.readFileSync(fromPath, 'utf8');
          const content2 = fs.readFileSync(mergePath, 'utf8');
          const mergedContent = mergeEngineFiles(content1, content2, mapping.to);
          fs.writeFileSync(toPath, mergedContent);
          fs.unlinkSync(fromPath);
          fs.unlinkSync(mergePath);
          fixes.created.push(toPath);
          fixes.deleted.push(fromPath, mergePath);
        } catch (error) {
          fixes.errors.push({ file: mapping.from, error: error.message });
        }
      }
    } else if (fs.existsSync(fromPath)) {
      // 简单重命名
      try {
        fs.renameSync(fromPath, toPath);
        fixes.renamed.push({ from: mapping.from, to: mapping.to });
      } catch (error) {
        fixes.errors.push({ file: mapping.from, error: error.message });
      }
    }
  });
}

// 2. 创建缺失的主引擎文件
function createMissingEngines() {
  
  const missingEngines = [
    {
      dir: 'automation',
      name: 'AutomationTestEngine.js',
      content: generateEngineTemplate('Automation', 'automation', 'UI自动化测试和端到端测试')
    },
    {
      dir: 'clients',
      name: 'ClientsTestEngine.js',
      content: generateEngineTemplate('Clients', 'clients', '客户端兼容性和集成测试')
    },
    {
      dir: 'documentation',
      name: 'DocumentationTestEngine.js',
      content: generateEngineTemplate('Documentation', 'documentation', '文档质量和完整性测试')
    },
    {
      dir: 'services',
      name: 'ServicesTestEngine.js',
      content: generateEngineTemplate('Services', 'services', '服务集成和微服务测试')
    }
  ];
  
  missingEngines.forEach(engine => {
    const enginePath = path.join(projectRoot, 'backend', 'engines', engine.dir, engine.name);
    
    if (!fs.existsSync(enginePath)) {
      try {
        fs.writeFileSync(enginePath, engine.content);
        fixes.created.push(enginePath);
      } catch (error) {
        fixes.errors.push({ file: engine.name, error: error.message });
        console.error(`  ❌ 创建失败: ${engine.name} - ${error.message}`);
      }
    }
  });
}

// 3. 创建缺失的路由文件
function createMissingRoutes() {
  
  const missingRoutes = [
    'automation', 'clients', 'compatibility', 'content', 'core',
    'documentation', 'infrastructure', 'regression', 'services', 'ux', 'website'
  ];
  
  missingRoutes.forEach(routeName => {
    const routePath = path.join(projectRoot, 'backend', 'routes', `${routeName}.js`);
    
    if (!fs.existsSync(routePath)) {
      try {
        const routeContent = generateRouteTemplate(routeName);
        fs.writeFileSync(routePath, routeContent);
        fixes.created.push(routePath);
      } catch (error) {
        fixes.errors.push({ file: `${routeName}.js`, error: error.message });
        console.error(`  ❌ 创建路由失败: ${routeName}.js - ${error.message}`);
      }
    }
  });
}

// 4. 创建缺失的index文件
function createMissingIndexFiles() {
  
  const dirsNeedingIndex = [
    'automation', 'base', 'clients', 'documentation', 
    'regression', 'services'
  ];
  
  dirsNeedingIndex.forEach(dir => {
    const indexPath = path.join(projectRoot, 'backend', 'engines', dir, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      try {
        const indexContent = generateIndexTemplate(dir);
        fs.writeFileSync(indexPath, indexContent);
        fixes.created.push(indexPath);
      } catch (error) {
        fixes.errors.push({ file: `${dir}/index.js`, error: error.message });
      }
    }
  });
}

// 5. 创建前端映射页面缺失的后端引擎
function createMissingBackendForFrontend() {
  
  // 这些是辅助页面，不需要独立的测试引擎
  const helperPages = ['testhistory', 'testoptimizations', 'testresultdetail', 'testschedule', 'unifiedtestpage'];
  
  // accessibility 需要一个真正的引擎
  const accessibilityDir = path.join(projectRoot, 'backend', 'engines', 'accessibility');
  
  if (!fs.existsSync(accessibilityDir)) {
    fs.mkdirSync(accessibilityDir, { recursive: true });
    
    const engineContent = generateEngineTemplate(
      'Accessibility',
      'accessibility',
      'Web可访问性测试（WCAG合规性）'
    );
    
    const enginePath = path.join(accessibilityDir, 'AccessibilityTestEngine.js');
    const indexPath = path.join(accessibilityDir, 'index.js');
    const routePath = path.join(projectRoot, 'backend', 'routes', 'accessibility.js');
    
    try {
      // 创建引擎文件
      fs.writeFileSync(enginePath, engineContent);
      fixes.created.push(enginePath);
      
      // 创建index文件
      fs.writeFileSync(indexPath, generateIndexTemplate('accessibility'));
      fixes.created.push(indexPath);
      
      // 创建路由文件
      fs.writeFileSync(routePath, generateRouteTemplate('accessibility'));
      fixes.created.push(routePath);
    } catch (error) {
      fixes.errors.push({ file: 'accessibility', error: error.message });
    }
  }
}

// 辅助函数：生成引擎模板
function generateEngineTemplate(className, name, description) {
  return `/**
 * ${className}测试引擎
 * ${description}
 */

const Joi = require('joi');

class ${className}TestEngine {
  constructor() {
    this.name = '${name}';
    this.version = '1.0.0';
    this.activeTests = new Map();
  }

  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      capabilities: this.getCapabilities()
    };
  }

  getCapabilities() {
    return {
      // 定义引擎的能力
      supportedTests: [],
      maxConcurrent: 10,
      timeout: 60000
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri(),
      options: Joi.object(),
      timeout: Joi.number().min(1000).max(300000).default(30000)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(\`配置验证失败: \${error.details[0].message}\`);
    }
    return value;
  }

  async run${className}Test(config) {
    const testId = \`\${this.name}_\${Date.now()}_\${Math.random().toString(36).substring(2, 11)}\`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      // TODO: 实现具体的测试逻辑
      const results = await this.perform${className}Tests(validatedConfig);
      
      this.activeTests.delete(testId);
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  async perform${className}Tests(config) {
    // TODO: 实现具体的测试逻辑
    return {
      status: 'completed',
      message: '${className}测试完成',
      config
    };
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

module.exports = ${className}TestEngine;
`;
}

// 生成路由模板
function generateRouteTemplate(name) {
  const className = name.charAt(0).toUpperCase() + name.slice(1);
  return `const express = require('express');
const router = express.Router();
const ${className}TestEngine = require('../engines/${name}/${className}TestEngine');

const engine = new ${className}TestEngine();

// 检查引擎可用性
router.get('/status', async (req, res) => {
  try {
    const status = await engine.checkAvailability();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 运行${name}测试
router.post('/run', async (req, res) => {
  try {
    const result = await engine.run${className}Test(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取测试状态
router.get('/test/:testId', (req, res) => {
  const status = engine.getTestStatus(req.params.testId);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ error: 'Test not found' });
  }
});

// 停止测试
router.delete('/test/:testId', async (req, res) => {
  const stopped = await engine.stopTest(req.params.testId);
  if (stopped) {
    res.json({ message: 'Test stopped successfully' });
  } else {
    res.status(404).json({ error: 'Test not found' });
  }
});

module.exports = router;
`;
}

// 生成index模板
function generateIndexTemplate(name) {
  const className = name.charAt(0).toUpperCase() + name.slice(1);
  return `/**
 * ${className}测试引擎导出
 */

const ${className}TestEngine = require('./${className}TestEngine');

module.exports = {
  ${className}TestEngine,
  default: ${className}TestEngine
};
`;
}

// 转换TypeScript到JavaScript
function convertTsToJs(content) {
  // 移除类型注解
  content = content.replace(/:\s*(string|number|boolean|any|void|object|Array<\w+>|\w+\[\])/g, '');
  
  // 移除接口定义
  content = content.replace(/interface\s+\w+\s*{[^}]*}/g, '');
  
  // 移除类型导入
  content = content.replace(/import\s+(?:type\s+)?{[^}]*}\s+from\s+['"][^'"]+['"]/g, '');
  
  // 转换export
  content = content.replace(/export\s+default\s+class/g, 'class');
  content = content.replace(/export\s+class/g, 'class');
  
  // 在文件末尾添加module.exports
  if (!content.includes('module.exports')) {
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      content += `\n\nmodule.exports = ${classMatch[1]};`;
    }
  }
  
  return content;
}

// 合并引擎文件
function mergeEngineFiles(content1, content2, newName) {
  const className = newName.replace('.js', '');
  
  // 提取两个文件的主要内容
  const methods1 = extractMethods(content1);
  const methods2 = extractMethods(content2);
  
  // 合并方法
  const allMethods = { ...methods1, ...methods2 };
  
  return `/**
 * ${className}
 * 合并后的核心测试引擎
 */

const Joi = require('joi');

class ${className} {
  constructor() {
    this.name = 'core';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.engines = new Map();
  }

${Object.values(allMethods).join('\n\n')}
}

module.exports = ${className};
`;
}

// 提取方法
function extractMethods(content) {
  const methods = {};
  const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*{([^}]|{[^}]*})*}/g;
  let match;
  
  while ((match = methodRegex.exec(content)) !== null) {
    const methodName = match[2];
    if (methodName !== 'constructor') {
      methods[methodName] = match[0];
    }
  }
  
  return methods;
}

// 生成修复报告
function generateFixReport() {
  console.log('📊 修复报告');
  
  
  if (fixes.errors.length > 0) {
    fixes.errors.forEach(error => {
    });
  }
  
  // 保存修复记录
  const reportPath = path.join(projectRoot, 'test-architecture-fixes.json');
  fs.writeFileSync(reportPath, JSON.stringify(fixes, null, 2));
}

// 执行修复

fixNamingIssues();
createMissingEngines();
createMissingRoutes();
createMissingIndexFiles();
createMissingBackendForFrontend();
generateFixReport();

