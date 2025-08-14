#!/usr/bin/env node

/**
 * 项目配置验证工具
 * 验证全项目重构后的配置是否正确
 */

const fs = require('fs');
const path = require('path');

class ProjectConfigValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
  }

  async execute() {
    console.log('🔍 开始验证项目配置...');
    console.log('==================================================');

    try {
      // 1. 验证目录结构
      await this.validateDirectoryStructure();
      
      // 2. 验证配置文件
      await this.validateConfigFiles();
      
      // 3. 验证路径引用
      await this.validatePathReferences();
      
      // 4. 生成报告
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ 验证过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async validateDirectoryStructure() {
    console.log('\n📁 验证目录结构...');
    
    const expectedDirs = [
      'frontend',
      'backend', 
      'data',
      'docs',
      'config',
      'tools',
      'scripts',
      'deploy'
    ];
    
    for (const dir of expectedDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`  ✅ ${dir}/ 存在`);
      } else {
        console.log(`  ⚠️ ${dir}/ 不存在`);
        this.issues.push(`缺少目录: ${dir}/`);
      }
    }
    
    // 检查是否还有旧的src目录
    const srcPath = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
      console.log(`  ⚠️ 发现旧的src目录，应该已重命名为frontend`);
      this.issues.push('旧的src目录仍然存在');
    } else {
      console.log(`  ✅ 旧的src目录已正确重命名`);
    }
  }

  async validateConfigFiles() {
    console.log('\n⚙️ 验证配置文件...');
    
    const configFiles = [
      'config/build/vite.config.ts',
      'config/build/tsconfig.json',
      'config/build/tsconfig.node.json',
      'config/testing/playwright.config.ts'
    ];
    
    for (const configFile of configFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${configFile} 存在`);
        await this.validateConfigContent(configFile, filePath);
      } else {
        console.log(`  ❌ ${configFile} 不存在`);
        this.issues.push(`缺少配置文件: ${configFile}`);
      }
    }
  }

  async validateConfigContent(configFile, filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否还有src路径引用
    if (content.includes('src/') && !content.includes('frontend/')) {
      console.log(`    ⚠️ ${configFile} 仍包含src路径引用`);
      this.issues.push(`${configFile} 包含过时的src路径引用`);
    } else if (content.includes('frontend/')) {
      console.log(`    ✅ ${configFile} 路径引用已更新`);
    }
  }

  async validatePathReferences() {
    console.log('\n🔗 验证路径引用...');
    
    // 检查package.json中的脚本
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      let hasConfigReferences = false;
      for (const [scriptName, scriptValue] of Object.entries(scripts)) {
        if (typeof scriptValue === 'string' && scriptValue.includes('config/')) {
          hasConfigReferences = true;
          break;
        }
      }
      
      if (hasConfigReferences) {
        console.log('  ✅ package.json包含config路径引用');
      } else {
        console.log('  ℹ️ package.json未直接引用config路径');
      }
    }
  }

  async generateReport() {
    console.log('\n📊 生成验证报告...');
    
    const reportPath = path.join(this.projectRoot, 'docs/reports/PROJECT_CONFIG_VALIDATION_REPORT.md');
    
    const report = `# 项目配置验证报告

**验证时间**: ${new Date().toISOString()}
**验证状态**: ${this.issues.length === 0 ? '✅ 通过' : '⚠️ 有问题'}

## 验证结果

### 发现的问题 (${this.issues.length}个)

${this.issues.length === 0 ? '无问题发现 🎉' : this.issues.map(issue => `- ${issue}`).join('\n')}

## 验证项目

### ✅ 已验证的项目
- 目录结构完整性
- 配置文件存在性
- 路径引用正确性
- src → frontend 重命名

### 📋 建议
${this.issues.length === 0 ? 
  '项目配置验证通过，可以正常使用。' : 
  '请根据上述问题进行修复，确保项目配置正确。'}

---
*此报告由项目配置验证工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 验证报告已生成: ${reportPath}`);
    
    if (this.issues.length === 0) {
      console.log('\n🎉 项目配置验证通过！');
    } else {
      console.log(`\n⚠️ 发现 ${this.issues.length} 个问题，请查看详细报告。`);
    }
  }
}

// 执行验证
if (require.main === module) {
  const validator = new ProjectConfigValidator();
  validator.execute().catch(console.error);
}

module.exports = ProjectConfigValidator;
