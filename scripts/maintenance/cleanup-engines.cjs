/**
 * 引擎目录清理脚本
 * 规范文件命名，去除重复功能，整理目录结构
 */

const fs = require('fs');
const path = require('path');

class EngineCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.enginesDir = path.join(this.projectRoot, 'backend', 'engines');

    // 标准的测试工具列表
    this.testTools = [
      'api', 'compatibility', 'infrastructure', 'performance',
      'security', 'seo', 'stress', 'ux', 'website'
    ];

    this.cleanup = {
      renamed: [],
      removed: [],
      standardized: [],
      issues: []
    };
  }

  /**
   * 执行清理
   */
  async run() {
    console.log('🧹 开始清理引擎目录...\n');

    // 1. 检查目录结构
    await this.checkDirectoryStructure();

    // 2. 规范文件命名
    await this.standardizeFileNames();

    // 3. 清理重复文件
    await this.removeDuplicateFiles();

    // 4. 验证引擎完整性
    await this.validateEngineIntegrity();

    // 5. 更新索引文件
    await this.updateIndexFiles();

    this.outputCleanupResults();
    await this.generateCleanupReport();

    console.log('\n✅ 引擎目录清理完成！');
  }

  /**
   * 检查目录结构
   */
  async checkDirectoryStructure() {
    console.log('📁 检查目录结构...');

    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);

      if (!fs.existsSync(toolDir)) {
        console.log(`   ❌ 缺少目录: ${tool}`);
        this.cleanup.issues.push(`缺少${tool}目录`);
        continue;
      }

      const expectedMainFile = path.join(toolDir, `${tool}TestEngine.js`);

      if (!fs.existsSync(expectedMainFile)) {
        console.log(`   ⚠️ ${tool}: 缺少标准主文件 ${tool}TestEngine.js`);
        this.cleanup.issues.push(`${tool}缺少标准主文件`);
      } else {
        console.log(`   ✅ ${tool}: 主文件存在`);
      }
    }
  }

  /**
   * 规范文件命名
   */
  async standardizeFileNames() {
    console.log('\n📝 规范文件命名...');

    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);

      if (!fs.existsSync(toolDir)) continue;

      const files = fs.readdirSync(toolDir);
      const expectedMainFile = `${tool}TestEngine.js`;

      // 查找可能的主引擎文件
      const possibleMainFiles = files.filter(file =>
        file.toLowerCase().includes('testengine') &&
        file.endsWith('.js') &&
        file !== expectedMainFile
      );

      for (const file of possibleMainFiles) {
        const oldPath = path.join(toolDir, file);
        const newPath = path.join(toolDir, expectedMainFile);

        if (!fs.existsSync(newPath)) {
          console.log(`   🔄 重命名: ${tool}/${file} -> ${expectedMainFile}`);
          fs.renameSync(oldPath, newPath);
          this.cleanup.renamed.push(`${tool}/${file} -> ${expectedMainFile}`);
        } else {
          console.log(`   🗑️ 删除重复: ${tool}/${file}`);
          fs.unlinkSync(oldPath);
          this.cleanup.removed.push(`${tool}/${file}`);
        }
      }
    }
  }

  /**
   * 清理重复文件
   */
  async removeDuplicateFiles() {
    console.log('\n🗑️ 清理重复文件...');

    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);

      if (!fs.existsSync(toolDir)) continue;

      const files = fs.readdirSync(toolDir);

      // 查找重复的引擎文件
      const engineFiles = files.filter(file =>
        file.toLowerCase().includes('engine') &&
        file.endsWith('.js') &&
        file !== `${tool}TestEngine.js`
      );

      for (const file of engineFiles) {
        // 检查是否是真正的重复文件
        if (this.isDuplicateEngine(file, tool)) {
          const filePath = path.join(toolDir, file);
          console.log(`   🗑️ 删除重复引擎: ${tool}/${file}`);
          fs.unlinkSync(filePath);
          this.cleanup.removed.push(`${tool}/${file}`);
        }
      }
    }
  }

  /**
   * 判断是否是重复的引擎文件
   */
  isDuplicateEngine(filename, tool) {
    const duplicatePatterns = [
      `real${tool}TestEngine.js`,
      `Real${tool}TestEngine.js`,
      `${tool}Engine.js`,
      `${tool.toUpperCase()}Engine.js`
    ];

    return duplicatePatterns.some(pattern =>
      filename.toLowerCase() === pattern.toLowerCase()
    );
  }

  /**
   * 验证引擎完整性
   */
  async validateEngineIntegrity() {
    console.log('\n🔍 验证引擎完整性...');

    for (const tool of this.testTools) {
      const mainFile = path.join(this.enginesDir, tool, `${tool}TestEngine.js`);

      if (!fs.existsSync(mainFile)) {
        console.log(`   ❌ ${tool}: 主文件不存在`);
        continue;
      }

      const content = fs.readFileSync(mainFile, 'utf8');

      // 检查类名是否正确
      const expectedClassName = `${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine`;
      const hasCorrectClassName = content.includes(`class ${expectedClassName}`);

      // 检查导出是否正确
      const hasCorrectExport = content.includes(`module.exports = ${expectedClassName}`);

      // 检查必需方法
      const hasValidateConfig = content.includes('validateConfig');
      const hasCheckAvailability = content.includes('checkAvailability');

      if (hasCorrectClassName && hasCorrectExport && hasValidateConfig && hasCheckAvailability) {
        console.log(`   ✅ ${tool}: 引擎完整`);
        this.cleanup.standardized.push(tool);
      } else {
        console.log(`   ⚠️ ${tool}: 引擎需要完善`);
        this.cleanup.issues.push(`${tool}引擎需要完善`);
      }
    }
  }

  /**
   * 更新索引文件
   */
  async updateIndexFiles() {
    console.log('\n📋 更新索引文件...');

    for (const tool of this.testTools) {
      const toolDir = path.join(this.enginesDir, tool);
      const indexFile = path.join(toolDir, 'index.js');
      const mainFile = `${tool}TestEngine.js`;

      if (fs.existsSync(toolDir) && fs.existsSync(path.join(toolDir, mainFile))) {
        const indexContent = `/**
 * ${tool.charAt(0).toUpperCase() + tool.slice(1)} 测试引擎索引
 */

const ${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine = require('./${mainFile}');

module.exports = ${tool.charAt(0).toUpperCase() + tool.slice(1)}TestEngine;
`;

        fs.writeFileSync(indexFile, indexContent);
        console.log(`   ✅ 更新索引: ${tool}/index.js`);
      }
    }
  }

  /**
   * 输出清理结果
   */
  outputCleanupResults() {
    console.log('\n📊 清理结果总结:');

    console.log(`\n🔄 重命名文件: ${this.cleanup.renamed.length}个`);
    this.cleanup.renamed.forEach(item => console.log(`   - ${item}`));

    console.log(`\n🗑️ 删除文件: ${this.cleanup.removed.length}个`);
    this.cleanup.removed.forEach(item => console.log(`   - ${item}`));

    console.log(`\n✅ 标准化引擎: ${this.cleanup.standardized.length}个`);
    this.cleanup.standardized.forEach(item => console.log(`   - ${item}`));

    if (this.cleanup.issues.length > 0) {
      console.log(`\n⚠️ 发现问题: ${this.cleanup.issues.length}个`);
      this.cleanup.issues.forEach(item => console.log(`   - ${item}`));
    }

    console.log(`\n🎯 清理效果:`);
    console.log(`   - 删除了 ${this.cleanup.removed.length} 个重复/无用文件`);
    console.log(`   - 重命名了 ${this.cleanup.renamed.length} 个不规范文件`);
    console.log(`   - 标准化了 ${this.cleanup.standardized.length} 个引擎`);
    console.log(`   - 发现 ${this.cleanup.issues.length} 个需要修复的问题`);
  }

  /**
   * 生成清理报告
   */
  async generateCleanupReport() {
    const reportPath = path.join(this.projectRoot, 'docs', 'reports', 'ENGINE_CLEANUP_REPORT.md');

    const report = `# 引擎目录清理报告

## 📊 清理概览

- **重命名文件**: ${this.cleanup.renamed.length}个
- **删除文件**: ${this.cleanup.removed.length}个
- **标准化引擎**: ${this.cleanup.standardized.length}个
- **发现问题**: ${this.cleanup.issues.length}个
- **清理时间**: ${new Date().toISOString()}

## 🔄 重命名操作

${this.cleanup.renamed.length > 0 ?
        this.cleanup.renamed.map(item => `- ${item}`).join('\n') :
        '无重命名操作'
      }

## 🗑️ 删除操作

${this.cleanup.removed.length > 0 ?
        this.cleanup.removed.map(item => `- ${item}`).join('\n') :
        '无删除操作'
      }

## ✅ 标准化引擎

${this.cleanup.standardized.length > 0 ?
        this.cleanup.standardized.map(item => `- ${item}TestEngine.js`).join('\n') :
        '无标准化引擎'
      }

## ⚠️ 需要修复的问题

${this.cleanup.issues.length > 0 ?
        this.cleanup.issues.map(item => `- ${item}`).join('\n') :
        '无发现问题'
      }

## 📁 标准化后的目录结构

\`\`\`
backend/engines/
├── api/
│   ├── apiTestEngine.js          # 主引擎文件
│   ├── index.js                  # 索引文件
│   └── [辅助文件和目录]
├── compatibility/
│   ├── compatibilityTestEngine.js
│   ├── index.js
│   └── [分析器和管理器]
├── infrastructure/
│   ├── infrastructureTestEngine.js
│   └── index.js
├── performance/
│   ├── performanceTestEngine.js
│   ├── index.js
│   └── [分析器、监控器、优化器]
├── security/
│   ├── securityTestEngine.js
│   ├── index.js
│   └── [分析器和工具]
├── seo/
│   ├── seoTestEngine.js
│   ├── index.js
│   └── [分析器和工具]
├── stress/
│   ├── stressTestEngine.js
│   ├── index.js
│   └── [生成器和分析器]
├── ux/
│   ├── uxTestEngine.js
│   └── index.js
└── website/
    ├── websiteTestEngine.js
    └── index.js
\`\`\`

## 🎯 清理原则

1. **统一命名**: 所有主引擎文件使用 \`toolTestEngine.js\` 格式
2. **避免重复**: 删除功能重复的文件
3. **保持结构**: 保留有用的辅助文件和子目录
4. **标准导出**: 确保正确的类名和模块导出

## 📋 后续建议

1. **保持规范**: 新增文件时遵循命名规范
2. **定期清理**: 定期运行清理脚本维护目录整洁
3. **文档更新**: 更新相关文档反映新的目录结构

---
*报告生成时间: ${new Date().toLocaleString()}*`;

    // 确保目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 清理报告已保存: ${reportPath}`);
  }
}

// 执行清理
if (require.main === module) {
  const cleanup = new EngineCleanup();
  cleanup.run().catch(console.error);
}

module.exports = EngineCleanup;
