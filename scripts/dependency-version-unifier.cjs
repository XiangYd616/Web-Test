#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DependencyVersionUnifier {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageFiles = [];
    this.dependencyMap = new Map();
    this.conflicts = [];
    this.fixes = [];
  }

  /**
   * 执行依赖版本统一
   */
  async execute() {
    console.log('🔧 开始依赖版本统一...\n');

    try {
      // 1. 扫描所有package.json文件
      this.scanPackageFiles();

      // 2. 分析依赖版本冲突
      this.analyzeDependencyConflicts();

      // 3. 解决版本冲突
      await this.resolveVersionConflicts();

      // 4. 更新package-lock.json文件
      await this.updateLockFiles();

      // 5. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 依赖版本统一过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描所有package.json文件
   */
  scanPackageFiles() {
    console.log('📦 扫描package.json文件...');

    const possiblePaths = [
      path.join(this.projectRoot, 'package.json'),
      path.join(this.projectRoot, 'frontend/package.json'),
      path.join(this.projectRoot, 'backend/package.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.packageFiles.push({
            path: filePath,
            relativePath: path.relative(this.projectRoot, filePath),
            content,
            type: this.determinePackageType(filePath)
          });
          console.log(`   ✅ 发现: ${path.relative(this.projectRoot, filePath)}`);
        } catch (error) {
          console.log(`   ❌ 解析失败: ${filePath} - ${error.message}`);
        }
      }
    }

    console.log(`   总计: ${this.packageFiles.length} 个package.json文件\n`);
  }

  /**
   * 分析依赖版本冲突
   */
  analyzeDependencyConflicts() {
    console.log('🔍 分析依赖版本冲突...');

    // 收集所有依赖及其版本
    for (const pkg of this.packageFiles) {
      this.collectDependencies(pkg, 'dependencies');
      this.collectDependencies(pkg, 'devDependencies');
      this.collectDependencies(pkg, 'peerDependencies');
    }

    // 检测版本冲突
    let conflictCount = 0;
    for (const [depName, versions] of this.dependencyMap.entries()) {
      const uniqueVersions = [...new Set(versions.map(v => v.version))];
      
      if (uniqueVersions.length > 1) {
        this.conflicts.push({
          dependency: depName,
          versions: uniqueVersions,
          usages: versions
        });
        conflictCount++;
      }
    }

    console.log(`   发现 ${conflictCount} 个版本冲突\n`);

    if (conflictCount > 0) {
      console.log('📋 版本冲突详情:');
      this.conflicts.forEach(conflict => {
        console.log(`   ${conflict.dependency}:`);
        conflict.versions.forEach(version => {
          const usages = conflict.usages.filter(u => u.version === version);
          const files = usages.map(u => u.file).join(', ');
          console.log(`     ${version} (${files})`);
        });
      });
      console.log('');
    }
  }

  /**
   * 解决版本冲突
   */
  async resolveVersionConflicts() {
    console.log('🔧 解决版本冲突...');

    let fixCount = 0;

    for (const conflict of this.conflicts) {
      const resolvedVersion = this.selectBestVersion(conflict);
      console.log(`   解决 ${conflict.dependency}: 统一为 ${resolvedVersion}`);

      // 更新所有package.json文件
      for (const pkg of this.packageFiles) {
        let modified = false;

        // 更新dependencies
        if (pkg.content.dependencies && pkg.content.dependencies[conflict.dependency]) {
          if (pkg.content.dependencies[conflict.dependency] !== resolvedVersion) {
            pkg.content.dependencies[conflict.dependency] = resolvedVersion;
            modified = true;
            fixCount++;
          }
        }

        // 更新devDependencies
        if (pkg.content.devDependencies && pkg.content.devDependencies[conflict.dependency]) {
          if (pkg.content.devDependencies[conflict.dependency] !== resolvedVersion) {
            pkg.content.devDependencies[conflict.dependency] = resolvedVersion;
            modified = true;
            fixCount++;
          }
        }

        // 更新peerDependencies
        if (pkg.content.peerDependencies && pkg.content.peerDependencies[conflict.dependency]) {
          if (pkg.content.peerDependencies[conflict.dependency] !== resolvedVersion) {
            pkg.content.peerDependencies[conflict.dependency] = resolvedVersion;
            modified = true;
            fixCount++;
          }
        }

        if (modified) {
          fs.writeFileSync(pkg.path, JSON.stringify(pkg.content, null, 2));
          this.addFix(conflict.dependency, pkg.relativePath, resolvedVersion);
        }
      }
    }

    console.log(`   ✅ 修复了 ${fixCount} 个版本冲突\n`);
  }

  /**
   * 更新package-lock.json文件
   */
  async updateLockFiles() {
    console.log('🔒 更新lock文件...');

    const lockFiles = [
      path.join(this.projectRoot, 'package-lock.json'),
      path.join(this.projectRoot, 'frontend/package-lock.json'),
      path.join(this.projectRoot, 'backend/package-lock.json')
    ];

    let updatedCount = 0;

    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile)) {
        try {
          // 删除现有的lock文件，让npm重新生成
          fs.unlinkSync(lockFile);
          console.log(`   🗑️  删除旧的lock文件: ${path.relative(this.projectRoot, lockFile)}`);
          updatedCount++;
        } catch (error) {
          console.log(`   ❌ 删除失败: ${lockFile} - ${error.message}`);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`   ⚠️  请运行 'npm install' 重新生成lock文件`);
    }

    console.log(`   ✅ 处理了 ${updatedCount} 个lock文件\n`);
  }

  /**
   * 收集依赖信息
   */
  collectDependencies(pkg, depType) {
    if (pkg.content[depType]) {
      for (const [name, version] of Object.entries(pkg.content[depType])) {
        if (!this.dependencyMap.has(name)) {
          this.dependencyMap.set(name, []);
        }
        
        this.dependencyMap.get(name).push({
          version,
          file: pkg.relativePath,
          type: depType,
          packageType: pkg.type
        });
      }
    }
  }

  /**
   * 确定package类型
   */
  determinePackageType(filePath) {
    if (filePath.includes('frontend')) return 'frontend';
    if (filePath.includes('backend')) return 'backend';
    return 'root';
  }

  /**
   * 选择最佳版本
   */
  selectBestVersion(conflict) {
    const versions = conflict.versions;
    
    // 优先选择最新的稳定版本
    const stableVersions = versions.filter(v => !v.includes('alpha') && !v.includes('beta') && !v.includes('rc'));
    
    if (stableVersions.length > 0) {
      // 选择最高的稳定版本
      return this.getHighestVersion(stableVersions);
    }
    
    // 如果没有稳定版本，选择最高版本
    return this.getHighestVersion(versions);
  }

  /**
   * 获取最高版本
   */
  getHighestVersion(versions) {
    return versions.sort((a, b) => {
      // 简单的版本比较（实际项目中可能需要更复杂的版本比较逻辑）
      const aClean = a.replace(/[^0-9.]/g, '');
      const bClean = b.replace(/[^0-9.]/g, '');
      
      const aParts = aClean.split('.').map(Number);
      const bParts = bClean.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart; // 降序排列
        }
      }
      
      return 0;
    })[0];
  }

  /**
   * 添加修复记录
   */
  addFix(dependency, file, version) {
    this.fixes.push({
      dependency,
      file,
      version,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'dependency-unification-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPackageFiles: this.packageFiles.length,
        totalConflicts: this.conflicts.length,
        totalFixes: this.fixes.length,
        conflictsByDependency: this.conflicts.map(c => ({
          dependency: c.dependency,
          conflictingVersions: c.versions.length,
          resolvedVersion: this.selectBestVersion(c)
        }))
      },
      packageFiles: this.packageFiles.map(p => ({
        path: p.relativePath,
        type: p.type
      })),
      conflicts: this.conflicts,
      fixes: this.fixes,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 依赖版本统一报告:');
    console.log(`   扫描文件: ${report.summary.totalPackageFiles} 个`);
    console.log(`   发现冲突: ${report.summary.totalConflicts} 个`);
    console.log(`   修复数量: ${report.summary.totalFixes} 个`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.fixes.length > 0) {
      console.log('📋 修复详情:');
      const groupedFixes = this.groupFixesByDependency();
      for (const [dependency, fixes] of Object.entries(groupedFixes)) {
        console.log(`   ${dependency} -> ${fixes[0].version}`);
        fixes.forEach(fix => {
          console.log(`     ${fix.file}`);
        });
      }
    }

    console.log('\n🔄 后续步骤:');
    console.log('   1. 运行 "npm install" 重新安装依赖');
    console.log('   2. 测试应用程序确保兼容性');
    console.log('   3. 提交更改到版本控制系统');
  }

  /**
   * 按依赖分组修复记录
   */
  groupFixesByDependency() {
    const grouped = {};
    for (const fix of this.fixes) {
      if (!grouped[fix.dependency]) {
        grouped[fix.dependency] = [];
      }
      grouped[fix.dependency].push(fix);
    }
    return grouped;
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.conflicts.length > 0) {
      recommendations.push('建议建立依赖版本管理策略，定期检查和更新依赖版本');
    }

    if (this.packageFiles.length > 1) {
      recommendations.push('考虑使用workspace或monorepo工具来统一管理多个package.json');
    }

    recommendations.push('建议在CI/CD流程中添加依赖版本一致性检查');
    recommendations.push('定期运行安全审计检查依赖漏洞');

    return recommendations;
  }
}

// 执行脚本
if (require.main === module) {
  const unifier = new DependencyVersionUnifier();
  unifier.execute().catch(error => {
    console.error('❌ 依赖版本统一失败:', error);
    process.exit(1);
  });
}

module.exports = DependencyVersionUnifier;
