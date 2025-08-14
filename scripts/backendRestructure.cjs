#!/usr/bin/env node

/**
 * Backend重构工具
 * 根据分析结果优化backend目录结构
 */

const fs = require('fs');
const path = require('path');

class BackendRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.backendRoot = path.join(this.projectRoot, 'backend');
    this.dryRun = process.argv.includes('--dry-run');
    this.changes = [];
  }

  async execute() {
    console.log('🔧 开始Backend重构...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 移动位置不当的目录
      await this.moveIncorrectDirectories();
      
      // 2. 移动位置不当的文件
      await this.moveIncorrectFiles();
      
      // 3. 重组services目录
      await this.reorganizeServices();
      
      // 4. 移动引擎文件
      await this.moveEngineFiles();
      
      // 5. 生成重构报告
      await this.generateRestructureReport();
      
    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async moveIncorrectDirectories() {
    console.log('\n📁 移动位置不当的目录...');
    
    const directoryMoves = [
      {
        from: path.join(this.backendRoot, 'data'),
        to: path.join(this.projectRoot, 'data', 'backend'),
        reason: '将backend/data移动到项目根目录的data/backend'
      },
      {
        from: path.join(this.backendRoot, 'reports'),
        to: path.join(this.projectRoot, 'docs', 'reports', 'backend'),
        reason: '将backend/reports移动到docs/reports/backend'
      },
      {
        from: path.join(this.backendRoot, 'backups'),
        to: path.join(this.projectRoot, 'backups', 'backend'),
        reason: '将backend/backups移动到项目根目录的backups/backend'
      },
      {
        from: path.join(this.backendRoot, 'scripts'),
        to: path.join(this.projectRoot, 'scripts', 'backend'),
        reason: '将backend/scripts移动到项目根目录的scripts/backend'
      }
    ];

    for (const move of directoryMoves) {
      if (fs.existsSync(move.from)) {
        console.log(`  🔄 ${path.relative(this.projectRoot, move.from)} → ${path.relative(this.projectRoot, move.to)}`);
        
        this.changes.push({
          type: '目录移动',
          from: path.relative(this.projectRoot, move.from),
          to: path.relative(this.projectRoot, move.to),
          reason: move.reason
        });
        
        if (!this.dryRun) {
          // 确保目标目录存在
          const targetDir = path.dirname(move.to);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // 移动目录
          fs.renameSync(move.from, move.to);
        }
      } else {
        console.log(`  ℹ️ ${path.relative(this.projectRoot, move.from)} 不存在，跳过`);
      }
    }
  }

  async moveIncorrectFiles() {
    console.log('\n📄 移动位置不当的文件...');
    
    const fileMoves = [
      {
        from: path.join(this.backendRoot, 'app.js'),
        to: path.join(this.backendRoot, 'src', 'app.js'),
        reason: '将app.js移动到src/目录'
      },
      {
        from: path.join(this.backendRoot, 'index.js'),
        to: path.join(this.backendRoot, 'src', 'index.js'),
        reason: '将index.js移动到src/目录'
      }
    ];

    for (const move of fileMoves) {
      if (fs.existsSync(move.from)) {
        console.log(`  🔄 ${path.relative(this.projectRoot, move.from)} → ${path.relative(this.projectRoot, move.to)}`);
        
        this.changes.push({
          type: '文件移动',
          from: path.relative(this.projectRoot, move.from),
          to: path.relative(this.projectRoot, move.to),
          reason: move.reason
        });
        
        if (!this.dryRun) {
          // 确保目标目录存在
          const targetDir = path.dirname(move.to);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // 移动文件
          fs.renameSync(move.from, move.to);
        }
      } else {
        console.log(`  ℹ️ ${path.relative(this.projectRoot, move.from)} 不存在，跳过`);
      }
    }
  }

  async reorganizeServices() {
    console.log('\n🔧 重组Services目录...');
    
    const servicesPath = path.join(this.backendRoot, 'services');
    if (!fs.existsSync(servicesPath)) {
      console.log('  ⚠️ services目录不存在，跳过重组');
      return;
    }
    
    // 创建功能分类子目录
    const categories = {
      'cache': '缓存相关服务',
      'monitoring': '监控相关服务',
      'testing': '测试相关服务',
      'data': '数据处理服务',
      'auth': '认证相关服务',
      'core': '核心业务服务'
    };
    
    for (const [category, description] of Object.entries(categories)) {
      const categoryPath = path.join(servicesPath, category);
      
      if (!this.dryRun && !fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }
      
      console.log(`  📁 创建分类: ${category}/ - ${description}`);
    }
    
    // 移动服务文件到相应分类
    const serviceFiles = fs.readdirSync(servicesPath).filter(item => {
      const itemPath = path.join(servicesPath, item);
      return fs.statSync(itemPath).isFile() && item.endsWith('.js');
    });
    
    let movedCount = 0;
    
    for (const file of serviceFiles) {
      const category = this.categorizeServiceFile(file);
      if (category) {
        const sourcePath = path.join(servicesPath, file);
        const targetPath = path.join(servicesPath, category, file);
        
        console.log(`    ✅ ${file} → ${category}/${file}`);
        
        this.changes.push({
          type: '服务文件分类',
          from: `backend/services/${file}`,
          to: `backend/services/${category}/${file}`,
          reason: `按功能分类到${category}目录`
        });
        
        if (!this.dryRun) {
          fs.renameSync(sourcePath, targetPath);
        }
        
        movedCount++;
      }
    }
    
    console.log(`  📊 重组了 ${movedCount} 个服务文件`);
  }

  categorizeServiceFile(filename) {
    const name = filename.toLowerCase();
    
    if (name.includes('cache') || name.includes('redis')) {
      return 'cache';
    } else if (name.includes('monitor') || name.includes('health') || name.includes('metric')) {
      return 'monitoring';
    } else if (name.includes('test') || name.includes('engine')) {
      return 'testing';
    } else if (name.includes('data') || name.includes('database') || name.includes('storage')) {
      return 'data';
    } else if (name.includes('auth') || name.includes('user') || name.includes('session')) {
      return 'auth';
    } else if (name.includes('service') || name.includes('manager')) {
      return 'core';
    }
    
    return null; // 不移动未分类的文件
  }

  async moveEngineFiles() {
    console.log('\n⚙️ 移动引擎文件...');
    
    const servicesPath = path.join(this.backendRoot, 'services');
    const enginesPath = path.join(this.backendRoot, 'engines');
    
    if (!fs.existsSync(servicesPath) || !fs.existsSync(enginesPath)) {
      console.log('  ⚠️ services或engines目录不存在，跳过移动');
      return;
    }
    
    // 查找services目录中的引擎文件
    const engineFiles = [];
    
    const scanForEngineFiles = (dirPath) => {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanForEngineFiles(itemPath);
        } else if (item.endsWith('.js') && item.includes('Engine')) {
          engineFiles.push({
            file: item,
            fullPath: itemPath,
            relativePath: path.relative(servicesPath, itemPath)
          });
        }
      }
    };
    
    scanForEngineFiles(servicesPath);
    
    console.log(`  🔧 发现 ${engineFiles.length} 个引擎文件`);
    
    for (const engineFile of engineFiles) {
      // 确定目标引擎类型
      const engineType = this.determineEngineType(engineFile.file);
      const targetDir = path.join(enginesPath, engineType);
      const targetPath = path.join(targetDir, engineFile.file);
      
      console.log(`    ✅ ${engineFile.relativePath} → engines/${engineType}/${engineFile.file}`);
      
      this.changes.push({
        type: '引擎文件移动',
        from: path.relative(this.projectRoot, engineFile.fullPath),
        to: path.relative(this.projectRoot, targetPath),
        reason: `移动到${engineType}引擎目录`
      });
      
      if (!this.dryRun) {
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // 移动文件
        fs.renameSync(engineFile.fullPath, targetPath);
      }
    }
  }

  determineEngineType(filename) {
    const name = filename.toLowerCase();
    
    if (name.includes('api')) return 'api';
    if (name.includes('performance')) return 'performance';
    if (name.includes('security')) return 'security';
    if (name.includes('seo')) return 'seo';
    if (name.includes('stress')) return 'stress';
    if (name.includes('compatibility')) return 'compatibility';
    
    return 'api'; // 默认分类
  }

  async generateRestructureReport() {
    console.log('\n📊 生成重构报告...');
    
    const reportPath = path.join(this.projectRoot, 'docs/reports/BACKEND_RESTRUCTURE_REPORT.md');
    
    const report = `# Backend重构报告

**重构时间**: ${new Date().toISOString()}
**重构模式**: ${this.dryRun ? '预览模式' : '实际执行'}
**变更数量**: ${this.changes.length}个

## 📊 重构摘要

${this.changes.length === 0 ? '无需重构 🎉' : `共执行 ${this.changes.length} 个重构操作`}

## 🔧 重构详情

${this.changes.length === 0 ? '所有结构都已合理' : this.changes.map((change, index) => `
### ${index + 1}. ${change.type}
- **原位置**: \`${change.from}\`
- **新位置**: \`${change.to}\`
- **重构原因**: ${change.reason}
`).join('\n')}

## 🎯 重构效果

### 重构前问题
- 目录位置混乱，data/reports/backups在backend中
- 入口文件位置不当
- services目录文件过多，缺乏分类
- 引擎文件位置错误

### 重构后状态
- ✅ 目录位置合理，各司其职
- ✅ 入口文件移动到src/目录
- ✅ services按功能分类组织
- ✅ 引擎文件归位到engines目录

---
*此报告由Backend重构工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 重构报告已生成: ${reportPath}`);
    
    // 输出摘要
    console.log('\n📊 重构结果摘要:');
    console.log(`- 变更数量: ${this.changes.length}`);
    console.log(`- 重构模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    
    if (this.changes.length === 0) {
      console.log('\n🎉 Backend结构已经合理，无需重构！');
    } else {
      console.log(`\n✅ 成功重构 ${this.changes.length} 个项目！`);
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new BackendRestructure();
  restructure.execute().catch(console.error);
}

module.exports = BackendRestructure;
