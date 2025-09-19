#!/usr/bin/env node
/**
 * 插件系统与传统引擎整合分析
 * 分析两种架构的共存情况，识别潜在冲突和整合方案
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 插件系统与传统引擎整合分析');
console.log('='.repeat(80));

const analysis = {
  timestamp: new Date().toISOString(),
  traditionalEngines: {},
  pluginSystem: {
    manager: null,
    plugins: [],
    interfaces: []
  },
  conflicts: [],
  overlaps: [],
  recommendations: []
};

// 1. 分析传统测试引擎
function analyzeTraditionalEngines() {
  console.log('\n📦 分析传统测试引擎...');
  const enginesDir = path.join(projectRoot, 'backend', 'engines');
  
  if (!fs.existsSync(enginesDir)) {
    console.log('❌ 传统引擎目录不存在');
    return;
  }

  const engineDirs = fs.readdirSync(enginesDir).filter(f => 
    fs.statSync(path.join(enginesDir, f)).isDirectory()
  );

  engineDirs.forEach(dir => {
    const enginePath = path.join(enginesDir, dir);
    const files = fs.readdirSync(enginePath);
    
    // 查找主引擎文件
    const mainEngineFile = files.find(f => 
      f.toLowerCase().includes('testengine') && f.endsWith('.js')
    );

    if (mainEngineFile) {
      const filePath = path.join(enginePath, mainEngineFile);
      const content = fs.readFileSync(filePath, 'utf8');
      
      analysis.traditionalEngines[dir] = {
        name: dir,
        mainFile: mainEngineFile,
        path: enginePath,
        methods: extractMethods(content),
        isPluginCompatible: checkPluginCompatibility(content),
        features: extractFeatures(content)
      };
    }
  });

  console.log(`  ✓ 发现 ${Object.keys(analysis.traditionalEngines).length} 个传统引擎`);
}

// 2. 分析插件系统
function analyzePluginSystem() {
  console.log('\n🔌 分析插件系统...');
  const pluginsDir = path.join(projectRoot, 'backend', 'plugins');
  
  if (!fs.existsSync(pluginsDir)) {
    console.log('❌ 插件目录不存在');
    return;
  }

  // 分析插件管理器
  const managerFile = path.join(pluginsDir, 'PluginManager.js');
  if (fs.existsSync(managerFile)) {
    const content = fs.readFileSync(managerFile, 'utf8');
    analysis.pluginSystem.manager = {
      file: 'PluginManager.js',
      hasBasePlugin: content.includes('class BasePlugin'),
      methods: extractMethods(content),
      features: ['生命周期管理', '依赖解析', '动态加载', '事件系统']
    };
  }

  // 分析插件接口
  const interfacesDir = path.join(pluginsDir, 'interfaces');
  if (fs.existsSync(interfacesDir)) {
    const interfaceFiles = fs.readdirSync(interfacesDir);
    interfaceFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(interfacesDir, file), 'utf8');
        analysis.pluginSystem.interfaces.push({
          file,
          types: extractPluginTypes(content),
          requiredMethods: extractRequiredMethods(content)
        });
      }
    });
  }

  // 分析示例插件
  const examplesDir = path.join(pluginsDir, 'examples');
  if (fs.existsSync(examplesDir)) {
    const exampleDirs = fs.readdirSync(examplesDir).filter(f => 
      fs.statSync(path.join(examplesDir, f)).isDirectory()
    );
    
    exampleDirs.forEach(dir => {
      const pluginPath = path.join(examplesDir, dir);
      const manifestPath = path.join(pluginPath, 'plugin.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        analysis.pluginSystem.plugins.push({
          name: manifest.name,
          type: manifest.type,
          category: manifest.category,
          path: pluginPath
        });
      }
    });
  }

  console.log(`  ✓ 插件管理器: ${analysis.pluginSystem.manager ? '已配置' : '未配置'}`);
  console.log(`  ✓ 插件接口: ${analysis.pluginSystem.interfaces.length} 个`);
  console.log(`  ✓ 示例插件: ${analysis.pluginSystem.plugins.length} 个`);
}

// 3. 检测冲突和重叠
function detectConflictsAndOverlaps() {
  console.log('\n⚠️  检测冲突和重叠...');
  
  // 检查功能重叠
  Object.entries(analysis.traditionalEngines).forEach(([name, engine]) => {
    // 检查是否有对应的插件
    const correspondingPlugin = analysis.pluginSystem.plugins.find(p => 
      p.category === name || p.name.toLowerCase().includes(name)
    );
    
    if (correspondingPlugin) {
      analysis.overlaps.push({
        type: 'functionality',
        traditionalEngine: name,
        plugin: correspondingPlugin.name,
        description: `传统引擎 ${name} 和插件 ${correspondingPlugin.name} 功能重叠`
      });
    }
    
    // 检查方法冲突
    if (engine.methods.includes('executeTest') && !engine.isPluginCompatible) {
      analysis.conflicts.push({
        type: 'method_signature',
        engine: name,
        issue: '传统引擎有executeTest方法但不符合插件接口规范'
      });
    }
  });

  // 检查路由冲突
  const routesDir = path.join(projectRoot, 'backend', 'routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    routeFiles.forEach(file => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      
      // 检查是否同时使用传统引擎和插件系统
      if (content.includes('PluginManager') && content.includes('TestEngine')) {
        analysis.conflicts.push({
          type: 'mixed_architecture',
          file: `routes/${file}`,
          issue: '路由文件同时使用传统引擎和插件系统'
        });
      }
    });
  }

  console.log(`  ✓ 发现 ${analysis.overlaps.length} 个功能重叠`);
  console.log(`  ✓ 发现 ${analysis.conflicts.length} 个潜在冲突`);
}

// 4. 生成整合建议
function generateIntegrationRecommendations() {
  console.log('\n💡 生成整合建议...');
  
  // 建议1: 统一架构
  analysis.recommendations.push({
    priority: 'high',
    title: '统一测试架构',
    description: '建议采用插件化架构作为主要架构，逐步迁移传统引擎',
    steps: [
      '为每个传统引擎创建插件适配器',
      '实现ITestEnginePlugin接口',
      '保留原有功能的同时支持插件化特性',
      '逐步废弃直接调用传统引擎的代码'
    ]
  });

  // 建议2: 创建适配层
  const enginesNeedingAdapter = Object.keys(analysis.traditionalEngines).filter(name => 
    !analysis.traditionalEngines[name].isPluginCompatible
  );
  
  if (enginesNeedingAdapter.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      title: '创建插件适配器',
      description: '为不兼容的传统引擎创建插件适配器',
      engines: enginesNeedingAdapter,
      template: generateAdapterTemplate()
    });
  }

  // 建议3: 路由层统一
  analysis.recommendations.push({
    priority: 'medium',
    title: '统一路由层',
    description: '使用统一的路由处理机制',
    steps: [
      '创建统一的测试路由控制器',
      '通过插件管理器路由所有测试请求',
      '保持向后兼容的API接口'
    ]
  });

  // 建议4: 配置管理
  analysis.recommendations.push({
    priority: 'medium',
    title: '统一配置管理',
    description: '使用插件系统的配置管理机制',
    steps: [
      '将传统引擎配置迁移到plugin.json格式',
      '使用PluginConfigManager统一管理',
      '支持热更新和动态配置'
    ]
  });

  // 建议5: 监控和日志
  analysis.recommendations.push({
    priority: 'low',
    title: '统一监控和日志',
    description: '使用插件系统的事件机制进行监控',
    steps: [
      '传统引擎发送事件到插件管理器',
      '统一的日志格式和级别',
      '集中式的性能监控'
    ]
  });
}

// 5. 创建迁移计划
function createMigrationPlan() {
  const plan = {
    phases: [
      {
        phase: 1,
        title: '准备阶段',
        duration: '1周',
        tasks: [
          '创建插件适配器基类',
          '为核心引擎（performance, security, api）创建适配器',
          '测试适配器功能'
        ]
      },
      {
        phase: 2,
        title: '迁移阶段',
        duration: '2周',
        tasks: [
          '逐个迁移传统引擎到插件架构',
          '更新路由层使用插件管理器',
          '更新前端调用逻辑'
        ]
      },
      {
        phase: 3,
        title: '优化阶段',
        duration: '1周',
        tasks: [
          '性能优化',
          '移除冗余代码',
          '完善文档'
        ]
      }
    ]
  };
  
  return plan;
}

// 辅助函数
function extractMethods(content) {
  const methods = [];
  const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    if (match[1] !== 'constructor') {
      methods.push(match[1]);
    }
  }
  return [...new Set(methods)];
}

function checkPluginCompatibility(content) {
  const requiredMethods = [
    'initialize', 'start', 'stop', 'healthCheck',
    'validateConfig', 'executeTest', 'getCapabilities'
  ];
  
  const methods = extractMethods(content);
  return requiredMethods.every(m => methods.includes(m));
}

function extractFeatures(content) {
  const features = [];
  if (content.includes('validateConfig')) features.push('配置验证');
  if (content.includes('async')) features.push('异步支持');
  if (content.includes('EventEmitter')) features.push('事件系统');
  if (content.includes('WebSocket')) features.push('实时通信');
  if (content.includes('Map()')) features.push('状态管理');
  return features;
}

function extractPluginTypes(content) {
  const types = [];
  if (content.includes('ITestEnginePlugin')) types.push('test-engine');
  if (content.includes('IAnalyzerPlugin')) types.push('analyzer');
  if (content.includes('IReporterPlugin')) types.push('reporter');
  if (content.includes('IEnhancerPlugin')) types.push('enhancer');
  if (content.includes('IUtilityPlugin')) types.push('utility');
  return types;
}

function extractRequiredMethods(content) {
  const methods = [];
  const methodRegex = /Method (\w+) must be implemented/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  return methods;
}

function generateAdapterTemplate() {
  return `
/**
 * 传统引擎插件适配器模板
 */
class TraditionalEngineAdapter extends BasePlugin {
  constructor(manifest, traditionalEngine) {
    super(manifest);
    this.engine = traditionalEngine;
  }
  
  async initialize(context) {
    // 初始化传统引擎
    if (this.engine.checkAvailability) {
      await this.engine.checkAvailability();
    }
  }
  
  async executeTest(config, options) {
    // 调用传统引擎的测试方法
    const result = await this.engine.runTest(config);
    
    // 转换结果格式
    return {
      success: result.success,
      testId: result.testId,
      pluginId: this.id,
      timestamp: new Date().toISOString(),
      duration: result.duration,
      data: result.results || result.data,
      errors: result.errors || []
    };
  }
  
  // 实现其他必需方法...
}`;
}

// 生成报告
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 分析报告');
  console.log('='.repeat(80));
  
  // 架构现状
  console.log('\n🏗️  架构现状:');
  console.log(`  传统引擎: ${Object.keys(analysis.traditionalEngines).length} 个`);
  console.log(`  插件系统: ${analysis.pluginSystem.manager ? '已启用' : '未启用'}`);
  console.log(`  插件数量: ${analysis.pluginSystem.plugins.length} 个`);
  
  // 兼容性分析
  const compatibleEngines = Object.values(analysis.traditionalEngines)
    .filter(e => e.isPluginCompatible).length;
  const totalEngines = Object.keys(analysis.traditionalEngines).length;
  
  console.log('\n🔄 兼容性分析:');
  console.log(`  插件兼容: ${compatibleEngines}/${totalEngines} (${(compatibleEngines/totalEngines*100).toFixed(1)}%)`);
  console.log(`  功能重叠: ${analysis.overlaps.length} 处`);
  console.log(`  架构冲突: ${analysis.conflicts.length} 处`);
  
  // 问题详情
  if (analysis.conflicts.length > 0) {
    console.log('\n❌ 发现的冲突:');
    analysis.conflicts.forEach(conflict => {
      console.log(`  - [${conflict.type}] ${conflict.issue}`);
    });
  }
  
  if (analysis.overlaps.length > 0) {
    console.log('\n⚡ 功能重叠:');
    analysis.overlaps.forEach(overlap => {
      console.log(`  - ${overlap.description}`);
    });
  }
  
  // 建议
  console.log('\n💡 整合建议:');
  analysis.recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
    console.log(`   ${rec.description}`);
    if (rec.steps) {
      rec.steps.forEach(step => {
        console.log(`   • ${step}`);
      });
    }
  });
  
  // 迁移计划
  const migrationPlan = createMigrationPlan();
  console.log('\n📅 建议迁移计划:');
  migrationPlan.phases.forEach(phase => {
    console.log(`\n  阶段 ${phase.phase}: ${phase.title} (${phase.duration})`);
    phase.tasks.forEach(task => {
      console.log(`    - ${task}`);
    });
  });
}

// 保存分析结果
function saveAnalysisResults() {
  const outputPath = path.join(projectRoot, 'plugin-engine-integration-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    ...analysis,
    migrationPlan: createMigrationPlan()
  }, null, 2));
  console.log(`\n📁 详细分析结果已保存到: ${outputPath}`);
}

// 执行分析
console.log(`\n🚀 开始分析项目: ${projectRoot}`);

analyzeTraditionalEngines();
analyzePluginSystem();
detectConflictsAndOverlaps();
generateIntegrationRecommendations();
generateReport();
saveAnalysisResults();

console.log('\n✨ 分析完成！');
console.log('\n建议下一步:');
console.log('1. 选择统一的架构方向（推荐插件化）');
console.log('2. 创建传统引擎的插件适配器');
console.log('3. 逐步迁移到统一架构');
console.log('4. 更新文档和测试用例');
