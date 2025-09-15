/**
 * 重复文件清理工具
 * 基于分析报告自动清理重复和占位符文件
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class DuplicateCleaner {
  constructor() {
    this.reportPath = path.join(process.cwd(), 'duplicate-analysis-report.json');
    this.backupDir = path.join(process.cwd(), 'backup', `cleanup-${Date.now()}`);
    this.cleanupPlan = [];
    this.placeholderPattern = /PlaceholderComponent|组件开发中/;
  }

  // 读取分析报告
  loadReport() {
    try {
      const reportContent = fs.readFileSync(this.reportPath, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      console.error('❌ 无法读取分析报告:', error.message);
      return null;
    }
  }

  // 创建备份目录
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}`);
    }
  }

  // 备份文件
  backupFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(this.backupDir, relativePath);
    const backupDirPath = path.dirname(backupPath);

    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }

    try {
      fs.copyFileSync(filePath, backupPath);
      return true;
    } catch (error) {
      console.error(`❌ 备份失败: ${filePath}`, error.message);
      return false;
    }
  }

  // 检查是否为占位符文件
  isPlaceholderFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return this.placeholderPattern.test(content);
    } catch (error) {
      return false;
    }
  }

  // 生成清理计划
  generateCleanupPlan(report) {
    const plan = [];

    // 处理完全重复的文件
    for (const group of report.exactDuplicates) {
      const files = group.files.map(f => path.join(process.cwd(), f.path));
      
      // 检查是否都是占位符文件
      const allPlaceholders = files.every(f => this.isPlaceholderFile(f));
      
      if (allPlaceholders) {
        // 如果都是占位符，全部删除
        plan.push({
          type: 'DELETE_ALL_PLACEHOLDERS',
          reason: '所有文件都是占位符组件',
          files: files,
          action: 'delete_all'
        });
      } else if (files.length > 1) {
        // 保留一个，删除其他
        const [keep, ...remove] = this.prioritizeFiles(files);
        
        plan.push({
          type: 'REMOVE_DUPLICATES',
          reason: '完全重复的文件',
          keep: keep,
          remove: remove,
          action: 'keep_one'
        });
      }
    }

    // 特殊处理某些文件
    this.addSpecialCases(plan, report);

    return plan;
  }

  // 文件优先级排序（决定保留哪个）
  prioritizeFiles(files) {
    return files.sort((a, b) => {
      // 优先保留不在备份目录的文件
      if (a.includes('backup') && !b.includes('backup')) return 1;
      if (!a.includes('backup') && b.includes('backup')) return -1;
      
      // 优先保留不带.example后缀的文件
      if (a.includes('.example') && !b.includes('.example')) return 1;
      if (!a.includes('.example') && b.includes('.example')) return -1;
      
      // 优先保留不带.simple后缀的文件
      if (a.includes('.simple') && !b.includes('.simple')) return 1;
      if (!a.includes('.simple') && b.includes('.simple')) return -1;
      
      // 按字母顺序
      return a.localeCompare(b);
    });
  }

  // 添加特殊处理案例
  addSpecialCases(plan, report) {
    // 处理空日志文件
    const emptyLogs = report.exactDuplicates.find(group => 
      group.files.some(f => f.path.includes('logs') && f.size === 0)
    );
    
    if (emptyLogs) {
      const logFiles = emptyLogs.files
        .filter(f => f.path.includes('logs'))
        .map(f => path.join(process.cwd(), f.path));
      
      plan.push({
        type: 'CLEAN_EMPTY_LOGS',
        reason: '空的日志文件',
        files: logFiles,
        action: 'delete_all'
      });
    }

    // 处理.env重复
    const envDuplicates = report.exactDuplicates.find(group =>
      group.files.some(f => f.path.includes('.env'))
    );

    if (envDuplicates) {
      const envFiles = envDuplicates.files.map(f => path.join(process.cwd(), f.path));
      const hasExample = envFiles.some(f => f.includes('.example'));
      
      if (hasExample) {
        // 保留.env，可选删除.env.example
        plan.push({
          type: 'ENV_FILE_DUPLICATE',
          reason: '.env和.env.example内容相同',
          files: envFiles,
          action: 'info_only',
          note: '建议检查.env.example是否应该包含敏感信息'
        });
      }
    }
  }

  // 执行清理计划
  async executeCleanupPlan(plan) {
    console.log('\n📋 清理计划:');
    console.log('='.repeat(80));
    
    let totalDeleted = 0;
    let totalSpaceSaved = 0;

    for (const item of plan) {
      console.log(`\n🔹 ${item.type}`);
      console.log(`   原因: ${item.reason}`);
      
      if (item.action === 'delete_all') {
        console.log('   操作: 删除所有文件');
        for (const file of item.files) {
          const relativePath = path.relative(process.cwd(), file);
          console.log(`   - 删除: ${relativePath}`);
          
          if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            
            // 备份文件
            if (this.backupFile(file)) {
              // 删除文件
              try {
                fs.unlinkSync(file);
                totalDeleted++;
                totalSpaceSaved += stats.size;
                console.log(`     ✅ 已删除 (已备份)`);
              } catch (error) {
                console.log(`     ❌ 删除失败: ${error.message}`);
              }
            }
          }
        }
      } else if (item.action === 'keep_one') {
        console.log(`   操作: 保留一个，删除其他`);
        console.log(`   ✅ 保留: ${path.relative(process.cwd(), item.keep)}`);
        
        for (const file of item.remove) {
          const relativePath = path.relative(process.cwd(), file);
          console.log(`   - 删除: ${relativePath}`);
          
          if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            
            // 备份文件
            if (this.backupFile(file)) {
              // 删除文件
              try {
                fs.unlinkSync(file);
                totalDeleted++;
                totalSpaceSaved += stats.size;
                console.log(`     ✅ 已删除 (已备份)`);
              } catch (error) {
                console.log(`     ❌ 删除失败: ${error.message}`);
              }
            }
          }
        }
      } else if (item.action === 'info_only') {
        console.log(`   ⚠️ 注意: ${item.note}`);
        console.log(`   涉及文件:`);
        item.files.forEach(f => {
          console.log(`   - ${path.relative(process.cwd(), f)}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 清理结果:');
    console.log(`  • 删除文件数: ${totalDeleted}`);
    console.log(`  • 节省空间: ${this.formatFileSize(totalSpaceSaved)}`);
    console.log(`  • 备份位置: ${this.backupDir}`);
    console.log('='.repeat(80));
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // 创建占位符组件替换文件
  createSharedPlaceholder() {
    const placeholderPath = path.join(
      process.cwd(),
      'frontend',
      'components',
      'common',
      'PlaceholderComponent.tsx'
    );

    const content = `/**
 * 共享的占位符组件
 * 用于尚未实现的组件
 */
import React from 'react';

interface PlaceholderComponentProps {
  componentName?: string;
  children?: React.ReactNode;
}

const PlaceholderComponent: React.FC<PlaceholderComponentProps> = ({ 
  componentName = '组件',
  children 
}) => {
  return (
    <div className="placeholder-component p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center">
        <div className="text-gray-500 mb-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">{componentName}开发中</h3>
        <p className="text-sm text-gray-500 mt-1">此组件正在开发中，敬请期待</p>
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceholderComponent;
`;

    const dir = path.dirname(placeholderPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(placeholderPath, content);
    console.log(`\n✅ 创建共享占位符组件: ${path.relative(process.cwd(), placeholderPath)}`);
    
    return placeholderPath;
  }

  // 主执行函数
  async run() {
    console.log('🧹 重复文件清理工具');
    console.log('='.repeat(80));

    // 1. 加载报告
    const report = this.loadReport();
    if (!report) {
      console.log('请先运行 analyze-duplicates.cjs 生成分析报告');
      return;
    }

    // 2. 创建备份目录
    this.ensureBackupDir();

    // 3. 生成清理计划
    const plan = this.generateCleanupPlan(report);

    if (plan.length === 0) {
      console.log('✅ 没有需要清理的文件');
      return;
    }

    // 4. 显示计划并请求确认
    console.log(`\n发现 ${plan.length} 个清理任务`);
    
    // 创建readline接口
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirm = await new Promise(resolve => {
      rl.question('\n是否执行清理计划？(y/n): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });

    if (!confirm) {
      console.log('❌ 清理已取消');
      return;
    }

    // 5. 执行清理
    await this.executeCleanupPlan(plan);

    // 6. 创建共享占位符组件
    const hasPlaceholders = plan.some(item => 
      item.type === 'DELETE_ALL_PLACEHOLDERS'
    );
    
    if (hasPlaceholders) {
      this.createSharedPlaceholder();
      console.log('\n💡 建议: 将删除的占位符组件导入改为引用共享的 PlaceholderComponent');
    }

    console.log('\n✅ 清理完成！');
  }
}

// 执行清理
if (require.main === module) {
  const cleaner = new DuplicateCleaner();
  cleaner.run().catch(console.error);
}

module.exports = DuplicateCleaner;
