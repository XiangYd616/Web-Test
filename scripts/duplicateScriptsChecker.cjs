#!/usr/bin/env node

/**
 * 检查package.json中重复的npm脚本
 */

const fs = require('fs');
const path = require('path');

class ScriptDuplicateChecker {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '../package.json');
    this.scripts = {};
    this.duplicates = [];
    this.aliases = [];
  }

  /**
   * 加载package.json
   */
  loadPackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      this.scripts = packageJson.scripts || {};
      console.log(`📦 加载package.json成功，共 ${Object.keys(this.scripts).length} 个脚本`);
    } catch (error) {
      console.error('❌ 无法读取package.json:', error.message);
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

    // 检查相似的脚本
    this.checkSimilarScripts(realScripts);
  }

  /**
   * 检查相似的脚本
   */
  checkSimilarScripts(scripts) {
    // 检查潜在的别名
    scripts.forEach(script => {
      const command = this.scripts[script];

      // 检查是否有相似的命令
      scripts.forEach(otherScript => {
        if (script !== otherScript) {
          const otherCommand = this.scripts[otherScript];

          // 简单的相似性检查
          if (this.isSimilarCommand(command, otherCommand)) {
            this.aliases.push({
              script1: script,
              script2: otherScript,
              command1: command,
              command2: otherCommand,
              similarity: this.calculateSimilarity(command, otherCommand)
            });
          }
        }
      });
    });

    // 去重
    this.aliases = this.aliases.filter((alias, index, self) =>
      index === self.findIndex(a =>
        (a.script1 === alias.script1 && a.script2 === alias.script2) ||
        (a.script1 === alias.script2 && a.script2 === alias.script1)
      )
    );
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
   * 判断命令是否相似
   */
  isSimilarCommand(cmd1, cmd2) {
    // 移除空格和特殊字符进行比较
    const normalize = (cmd) => cmd.replace(/\s+/g, ' ').trim().toLowerCase();
    const norm1 = normalize(cmd1);
    const norm2 = normalize(cmd2);

    // 如果命令完全相同，不算相似（已经在重复检查中处理）
    if (norm1 === norm2) return false;

    // 检查是否有共同的关键词
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));

    // 如果有超过一半的词相同，认为是相似的
    return commonWords.length > Math.min(words1.length, words2.length) * 0.5;
  }

  /**
   * 计算相似度
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 显示结果
   */
  displayResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 脚本重复检查结果');
    console.log('='.repeat(50));

    if (this.duplicates.length === 0) {
      console.log('✅ 未发现完全重复的脚本');
    } else {
      console.log(`❌ 发现 ${this.duplicates.length} 组重复脚本:`);
      this.duplicates.forEach((duplicate, index) => {
        console.log(`\n${index + 1}. 重复命令:`);
        console.log(`   命令: ${duplicate.command}`);
        console.log(`   脚本: ${duplicate.scripts.join(', ')}`);
      });
    }

    if (this.aliases.length === 0) {
      console.log('\n✅ 未发现相似的脚本');
    } else {
      console.log(`\n⚠️  发现 ${this.aliases.length} 组相似脚本:`);
      this.aliases.slice(0, 5).forEach((alias, index) => {
        console.log(`\n${index + 1}. 相似脚本 (相似度: ${(alias.similarity * 100).toFixed(1)}%):`);
        console.log(`   ${alias.script1}: ${alias.command1}`);
        console.log(`   ${alias.script2}: ${alias.command2}`);
      });

      if (this.aliases.length > 5) {
        console.log(`   ... 还有 ${this.aliases.length - 5} 组相似脚本`);
      }
    }

    // 检查潜在问题
    const realScripts = Object.keys(this.scripts).filter(k => !k.startsWith('_comment'));
    this.checkPotentialIssues(realScripts);
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
