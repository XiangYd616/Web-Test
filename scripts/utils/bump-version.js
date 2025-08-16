#!/usr/bin/env node

/**
 * 数据模型版本管理脚本
 * 自动升级版本号并更新相关文件
 * 版本: v1.0.0
 */

const fs = require('fs');
const path = require('path');

class VersionManager {
  constructor() {
    this.currentVersion = '2.1.0';
    this.versionFiles = [
      'src/types/unified/models.ts',
      'package.json',
      'docs/api-changelog.md'
    ];
  }

  /**
   * 升级版本号
   */
  async bumpVersion(type = 'patch') {
    console.log('🚀 数据模型版本升级');
    console.log('=' .repeat(50));

    try {
      const newVersion = this.calculateNewVersion(this.currentVersion, type);
      console.log(`📈 版本升级: ${this.currentVersion} → ${newVersion}`);

      // 更新版本号
      await this.updateVersionFiles(newVersion);
      
      // 生成变更日志模板
      await this.generateChangelogTemplate(newVersion);
      
      // 验证更新
      await this.validateVersionUpdate(newVersion);
      
      console.log('\n✅ 版本升级完成！');
      console.log(`\n📝 下一步操作:`);
      console.log(`1. 编辑 docs/api-changelog.md 添加具体变更内容`);
      console.log(`2. 提交变更: git add . && git commit -m "chore: bump version to ${newVersion}"`);
      console.log(`3. 创建标签: git tag v${newVersion}`);
      
    } catch (error) {
      console.error('❌ 版本升级失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 计算新版本号
   */
  calculateNewVersion(currentVersion, type) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`无效的版本类型: ${type}`);
    }
  }

  /**
   * 更新版本文件
   */
  async updateVersionFiles(newVersion) {
    console.log('\n📝 更新版本文件...');

    for (const file of this.versionFiles) {
      if (fs.existsSync(file)) {
        await this.updateVersionInFile(file, newVersion);
        console.log(`  ✅ 更新 ${file}`);
      } else {
        console.log(`  ⚠️  文件不存在: ${file}`);
      }
    }
  }

  /**
   * 更新单个文件中的版本号
   */
  async updateVersionInFile(filePath, newVersion) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    switch (path.extname(filePath)) {
      case '.ts':
        // 更新TypeScript文件中的版本注释
        content = content.replace(
          /版本: v[\d.]+/g,
          `版本: v${newVersion}`
        );
        content = content.replace(
          /更新时间: \d{4}-\d{2}-\d{2}/g,
          `更新时间: ${new Date().toISOString().split('T')[0]}`
        );
        break;
        
      case '.json':
        // 更新package.json中的版本号
        const packageData = JSON.parse(content);
        packageData.version = newVersion;
        content = JSON.stringify(packageData, null, 2);
        break;
        
      case '.md':
        // 在变更日志中添加新版本条目（如果不存在）
        if (!content.includes(`## [${newVersion}]`)) {
          const today = new Date().toISOString().split('T')[0];
          const newEntry = `## [${newVersion}] - ${today}\n\n### 新增 (Added)\n- \n\n### 修改 (Changed)\n- \n\n### 修复 (Fixed)\n- \n\n---\n\n`;
          content = content.replace(
            /## \[[\d.]+\]/,
            newEntry + '## [$&'
          );
        }
        break;
    }
    
    fs.writeFileSync(filePath, content);
  }

  /**
   * 生成变更日志模板
   */
  async generateChangelogTemplate(newVersion) {
    console.log('\n📋 生成变更日志模板...');
    
    const today = new Date().toISOString().split('T')[0];
    const template = `
# 版本 ${newVersion} 变更说明

## 发布日期
${today}

## 变更类型
- [ ] 破坏性变更 (MAJOR)
- [ ] 新增功能 (MINOR)
- [ ] 错误修复 (PATCH)

## 变更内容

### 新增 (Added)
- 

### 修改 (Changed)
- 

### 修复 (Fixed)
- 

### 废弃 (Deprecated)
- 

### 移除 (Removed)
- 

### 安全性 (Security)
- 

## 影响评估

### 前端影响
- 

### 后端影响
- 

### 数据库影响
- 

## 迁移指南

### 升级步骤
1. 
2. 
3. 

### 注意事项
- 

## 测试清单
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 类型检查通过
- [ ] API兼容性测试通过
- [ ] 数据迁移测试通过

## 回滚计划
如果发现问题，可以通过以下步骤回滚：
1. 
2. 
3. 
`;

    const templatePath = `docs/changelog-templates/v${newVersion}.md`;
    const templateDir = path.dirname(templatePath);
    
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    fs.writeFileSync(templatePath, template.trim());
    console.log(`  ✅ 生成模板: ${templatePath}`);
  }

  /**
   * 验证版本更新
   */
  async validateVersionUpdate(newVersion) {
    console.log('\n🔍 验证版本更新...');
    
    // 检查版本号格式
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
      throw new Error(`版本号格式无效: ${newVersion}`);
    }
    
    // 检查文件是否正确更新
    for (const file of this.versionFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (file.endsWith('.json')) {
          const data = JSON.parse(content);
          if (data.version !== newVersion) {
            throw new Error(`${file} 中的版本号未正确更新`);
          }
        }
      }
    }
    
    console.log('  ✅ 版本更新验证通过');
  }

  /**
   * 显示当前版本信息
   */
  showCurrentVersion() {
    console.log('📊 当前版本信息');
    console.log('=' .repeat(50));
    console.log(`当前版本: ${this.currentVersion}`);
    console.log(`版本文件: ${this.versionFiles.length} 个`);
    
    this.versionFiles.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    });
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'info';
  const versionType = args[1] || 'patch';
  
  const manager = new VersionManager();
  
  switch (command) {
    case 'bump':
      manager.bumpVersion(versionType);
      break;
    case 'info':
      manager.showCurrentVersion();
      break;
    default:
      console.log('用法:');
      console.log('  node scripts/bump-version.js info          # 显示当前版本信息');
      console.log('  node scripts/bump-version.js bump patch   # 升级补丁版本');
      console.log('  node scripts/bump-version.js bump minor   # 升级次版本');
      console.log('  node scripts/bump-version.js bump major   # 升级主版本');
  }
}

module.exports = VersionManager;
