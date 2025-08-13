#!/usr/bin/env node

/**
 * 检查package.json中重复的npm脚本
 */

const fs = require('fs');
const path = require('path');

class ScriptDuplicateChecker {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '../package.json');
    this.packageJson = null;
    this.scripts = {};
    this.duplicates = [];
    this.aliases = [];
    this.issues = [];
  }

  /**
   * 加载package.json
   */
  loadPackageJson() {
    try {
      const content = fs.readFileSync(this.packageJsonPath, 'utf8');
      this.packageJson = JSON.parse(content);
      this.scripts = this.packageJson.scripts || {};
      console.log('✅ 成功加载package.json');
    } catch (error) {
      console.error('❌ 加载package.json失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 分析脚本重复
   */
  analyzeScripts() {
    const scriptCommands = {};
    const scriptNames = Object.keys(this.scripts);
    
    console.log(`📊 分析 ${scriptNames.length} 个脚本...`);

    // 过滤掉注释
    const realScripts = scriptNames.filter(name => !name.startsWith('_comment'));
    
    console.log(`📋 实际脚本数量: ${realScripts.length}`);

    // 检查命令重复
    realScripts.forEach(scriptName => {
      const command = this.scripts[scriptName];
      
      if (scriptCommands[command]) {
        scriptCommands[command].push(scriptName);
      } else {
        scriptCommands[command] = [scriptName];
      }
    });

    // 找出重复的命令
    Object.entries(scriptCommands).forEach(([command, scripts]) => {
      if (scripts.length > 1) {
        this.duplicates.push({
          command,
          scripts,
          type: 'exact_duplicate'
        });
      }
    });

    // 检查别名（一个脚本调用另一个脚本）
    realScripts.forEach(scriptName => {
      const command = this.scripts[scriptName];
      
      if (command.startsWith('npm run ')) {
        const targetScript = command.replace('npm run ', '');
        if (this.scripts[targetScript]) {
          this.aliases.push({
            alias: scriptName,
            target: targetScript,
            command: this.scripts[targetScript]
          });
        }
      }
    });

    // 检查潜在问题
    this.checkPotentialIssues(realScripts);
  }

  /**
   * 检查潜在问题
   */
  checkPotentialIssues(scripts) {
    // 检查功能分组
    const functionalGroups = {
      database: scripts.filter(s => s.startsWith('db:')),
      test: scripts.filter(s => s.startsWith('test') || s.startsWith('e2e')),
      build: scripts.filter(s => s.includes('build')),
      lint: scripts.filter(s => s.includes('lint') || s.includes('format')),
      maintenance: scripts.filter(s => s.startsWith('maintenance')),
      env: scripts.filter(s => s.startsWith('env:')),
      clean: scripts.filter(s => s.includes('clean'))
    };

    console.log('\n📂 功能分组统计:');
    Object.entries(functionalGroups).forEach(([group, groupScripts]) => {
      if (groupScripts.length > 0) {
        console.log(`   ${group}: ${groupScripts.length} 个脚本`);
      }
    });
  }

  /**
   * 显示分析结果
   */
  displayResults() {
    console.log('\n🔍 NPM脚本重复检查结果');
    console.log('========================');

    // 显示完全重复的脚本
    if (this.duplicates.length > 0) {
      console.log('\n❌ 发现完全重复的脚本:');
      this.duplicates.forEach((dup, index) => {
        console.log(`\n${index + 1}. 重复命令: ${dup.command}`);
        console.log(`   脚本名称: ${dup.scripts.join(', ')}`);
      });
    } else {
      console.log('\n✅ 没有发现完全重复的脚本');
    }

    // 显示别名脚本
    if (this.aliases.length > 0) {
      console.log('\n📎 发现别名脚本 (兼容性别名):');
      this.aliases.forEach((alias, index) => {
        console.log(`\n${index + 1}. 别名: ${alias.alias}`);
        console.log(`   目标: ${alias.target}`);
        console.log(`   实际命令: ${alias.command}`);
      });
    } else {
      console.log('\n📎 没有发现别名脚本');
    }

    // 显示统计信息
    console.log('\n📊 统计信息:');
    const totalScripts = Object.keys(this.scripts).length;
    const commentScripts = Object.keys(this.scripts).filter(k => k.startsWith('_comment')).length;
    const realScripts = totalScripts - commentScripts;
    
    console.log(`   总脚本数: ${totalScripts}`);
    console.log(`   注释数: ${commentScripts}`);
    console.log(`   实际脚本数: ${realScripts}`);
    console.log(`   完全重复: ${this.duplicates.length}`);
    console.log(`   别名脚本: ${this.aliases.length}`);

    // 显示建议
    this.displayRecommendations();
  }

  /**
   * 显示优化建议
   */
  displayRecommendations() {
    console.log('\n💡 优化建议:');

    if (this.duplicates.length === 0 && this.aliases.length > 0) {
      console.log('   ✅ 没有发现完全重复的脚本');
      console.log('   📎 别名脚本用于向后兼容，这是合理的设计');
    }

    if (this.duplicates.length > 0) {
      console.log('   1. 删除完全重复的脚本，保留一个主要的');
    }

    // 检查数据库脚本的组织
    const dbScripts = Object.keys(this.scripts).filter(k => k.startsWith('db:') && !k.startsWith('_comment'));
    console.log(`   📊 数据库脚本数量: ${dbScripts.length}`);
    
    if (dbScripts.length > 15) {
      console.log('   💡 数据库脚本较多，已使用统一的db:manager工具 ✅');
    }

    console.log('   🔄 定期运行此检查以保持脚本整洁');
  }

  /**
   * 检查脚本健康度
   */
  checkScriptHealth() {
    const realScripts = Object.keys(this.scripts).filter(k => !k.startsWith('_comment'));
    const issues = [];

    // 检查过长的脚本
    realScripts.forEach(script => {
      const command = this.scripts[script];
      if (command.length > 200) {
        issues.push({
          type: 'long_command',
          script,
          message: '命令过长，考虑拆分或使用脚本文件'
        });
      }
    });

    // 检查硬编码路径
    realScripts.forEach(script => {
      const command = this.scripts[script];
      if (command.includes('cd server &&') && !script.includes('legacy')) {
        issues.push({
          type: 'hardcoded_path',
          script,
          message: '包含硬编码路径，考虑使用相对路径或环境变量'
        });
      }
    });

    if (issues.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.script}`);
        console.log(`   问题: ${issue.message}`);
      });
    } else {
      console.log('\n✅ 脚本健康度检查通过');
    }

    return issues;
  }

  /**
   * 运行检查
   */
  run() {
    console.log('🔍 开始检查NPM脚本重复...\n');
    
    this.loadPackageJson();
    this.analyzeScripts();
    this.displayResults();
    this.checkScriptHealth();

    console.log('\n✅ 脚本检查完成！');
    
    // 返回检查结果
    return {
      duplicates: this.duplicates.length,
      aliases: this.aliases.length,
      healthy: this.duplicates.length === 0
    };
  }
}

// 运行检查
if (require.main === module) {
  const checker = new ScriptDuplicateChecker();
  const result = checker.run();
  
  // 设置退出码
  process.exit(result.healthy ? 0 : 1);
}

module.exports = ScriptDuplicateChecker;
