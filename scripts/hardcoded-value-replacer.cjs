#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class HardcodedValueReplacer {
  constructor() {
    this.projectRoot = process.cwd();
    this.replacements = 0;
    this.processedFiles = [];
    
    // 定义替换映射
    this.colorReplacements = {
      '#ffffff': 'var(--color-white)',
      '#000000': 'var(--color-black)',
      '#f9fafb': 'var(--color-gray-50)',
      '#f3f4f6': 'var(--color-gray-100)',
      '#e5e7eb': 'var(--color-gray-200)',
      '#d1d5db': 'var(--color-gray-300)',
      '#9ca3af': 'var(--color-gray-400)',
      '#6b7280': 'var(--color-gray-500)',
      '#4b5563': 'var(--color-gray-600)',
      '#374151': 'var(--color-gray-700)',
      '#1f2937': 'var(--color-gray-800)',
      '#111827': 'var(--color-gray-900)',
      '#3b82f6': 'var(--color-primary)',
      '#2563eb': 'var(--color-primary-hover)',
      '#1d4ed8': 'var(--color-primary-active)',
      '#10b981': 'var(--color-success)',
      '#059669': 'var(--color-success-hover)',
      '#ef4444': 'var(--color-danger)',
      '#dc2626': 'var(--color-danger-hover)',
      '#f59e0b': 'var(--color-warning)',
      '#d97706': 'var(--color-warning-hover)'
    };

    this.spacingReplacements = {
      '0px': 'var(--spacing-0)',
      '2px': 'var(--spacing-0\\.5)',
      '4px': 'var(--spacing-1)',
      '8px': 'var(--spacing-2)',
      '12px': 'var(--spacing-3)',
      '16px': 'var(--spacing-4)',
      '20px': 'var(--spacing-5)',
      '24px': 'var(--spacing-6)',
      '32px': 'var(--spacing-8)',
      '40px': 'var(--spacing-10)',
      '48px': 'var(--spacing-12)',
      '64px': 'var(--spacing-16)',
      '0.25rem': 'var(--spacing-1)',
      '0.5rem': 'var(--spacing-2)',
      '0.75rem': 'var(--spacing-3)',
      '1rem': 'var(--spacing-4)',
      '1.25rem': 'var(--spacing-5)',
      '1.5rem': 'var(--spacing-6)',
      '2rem': 'var(--spacing-8)',
      '2.5rem': 'var(--spacing-10)',
      '3rem': 'var(--spacing-12)',
      '4rem': 'var(--spacing-16)'
    };

    this.fontSizeReplacements = {
      '12px': 'var(--font-size-xs)',
      '14px': 'var(--font-size-sm)',
      '16px': 'var(--font-size-base)',
      '18px': 'var(--font-size-lg)',
      '20px': 'var(--font-size-xl)',
      '24px': 'var(--font-size-2xl)',
      '0.75rem': 'var(--font-size-xs)',
      '0.875rem': 'var(--font-size-sm)',
      '1rem': 'var(--font-size-base)',
      '1.125rem': 'var(--font-size-lg)',
      '1.25rem': 'var(--font-size-xl)',
      '1.5rem': 'var(--font-size-2xl)'
    };

    this.borderRadiusReplacements = {
      '0px': 'var(--radius-none)',
      '2px': 'var(--radius-sm)',
      '4px': 'var(--radius-md)',
      '6px': 'var(--radius-lg)',
      '8px': 'var(--radius-xl)',
      '12px': 'var(--radius-2xl)',
      '16px': 'var(--radius-3xl)',
      '0.125rem': 'var(--radius-sm)',
      '0.25rem': 'var(--radius-md)',
      '0.375rem': 'var(--radius-lg)',
      '0.5rem': 'var(--radius-xl)',
      '0.75rem': 'var(--radius-2xl)',
      '1rem': 'var(--radius-3xl)'
    };
  }

  /**
   * 执行硬编码值替换
   */
  async execute() {
    console.log('🔄 开始替换硬编码值...\n');

    try {
      // 获取需要处理的文件
      const files = this.getTargetFiles();
      
      // 处理每个文件
      for (const file of files) {
        await this.processFile(file);
      }

      // 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 硬编码值替换过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 处理单个文件
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileReplacements = 0;

      // 替换颜色值
      for (const [hardcoded, variable] of Object.entries(this.colorReplacements)) {
        const regex = new RegExp(hardcoded.replace('#', '\\#'), 'gi');
        const matches = newContent.match(regex);
        if (matches) {
          newContent = newContent.replace(regex, variable);
          fileReplacements += matches.length;
        }
      }

      // 替换间距值（只在特定属性中替换）
      for (const [hardcoded, variable] of Object.entries(this.spacingReplacements)) {
        const spacingProps = ['margin', 'padding', 'gap', 'top', 'right', 'bottom', 'left', 'width', 'height'];
        
        for (const prop of spacingProps) {
          const regex = new RegExp(`(${prop}:\\s*)${hardcoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'g');
          const matches = newContent.match(regex);
          if (matches) {
            newContent = newContent.replace(regex, `$1${variable}`);
            fileReplacements += matches.length;
          }
        }
      }

      // 替换字体大小
      for (const [hardcoded, variable] of Object.entries(this.fontSizeReplacements)) {
        const regex = new RegExp(`(font-size:\\s*)${hardcoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'g');
        const matches = newContent.match(regex);
        if (matches) {
          newContent = newContent.replace(regex, `$1${variable}`);
          fileReplacements += matches.length;
        }
      }

      // 替换圆角值
      for (const [hardcoded, variable] of Object.entries(this.borderRadiusReplacements)) {
        const regex = new RegExp(`(border-radius:\\s*)${hardcoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'g');
        const matches = newContent.match(regex);
        if (matches) {
          newContent = newContent.replace(regex, `$1${variable}`);
          fileReplacements += matches.length;
        }
      }

      // 如果有替换，写入文件
      if (fileReplacements > 0) {
        fs.writeFileSync(filePath, newContent);
        this.processedFiles.push({
          file: path.relative(this.projectRoot, filePath),
          replacements: fileReplacements
        });
        this.replacements += fileReplacements;
        console.log(`✅ ${path.relative(this.projectRoot, filePath)}: ${fileReplacements} 个替换`);
      }

    } catch (error) {
      console.log(`❌ 处理文件失败: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 获取目标文件
   */
  getTargetFiles() {
    const files = [];
    
    const scanDirectory = (dir, extensions) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules' || item.includes('unified')) return;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, extensions);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };
    
    // 扫描样式文件
    scanDirectory(path.join(this.projectRoot, 'frontend/styles'), ['.css', '.scss']);
    
    // 扫描组件文件中的样式
    scanDirectory(path.join(this.projectRoot, 'frontend/components'), ['.tsx', '.jsx']);
    
    return files;
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'hardcoded-replacement-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalReplacements: this.replacements,
        processedFiles: this.processedFiles.length,
        replacementTypes: {
          colors: Object.keys(this.colorReplacements).length,
          spacing: Object.keys(this.spacingReplacements).length,
          fontSizes: Object.keys(this.fontSizeReplacements).length,
          borderRadius: Object.keys(this.borderRadiusReplacements).length
        }
      },
      processedFiles: this.processedFiles,
      replacementMappings: {
        colors: this.colorReplacements,
        spacing: this.spacingReplacements,
        fontSizes: this.fontSizeReplacements,
        borderRadius: this.borderRadiusReplacements
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 硬编码值替换报告:');
    console.log(`   总替换数: ${this.replacements}`);
    console.log(`   处理文件: ${this.processedFiles.length}`);
    console.log(`   替换类型:`);
    console.log(`   - 颜色: ${report.summary.replacementTypes.colors} 种`);
    console.log(`   - 间距: ${report.summary.replacementTypes.spacing} 种`);
    console.log(`   - 字体: ${report.summary.replacementTypes.fontSizes} 种`);
    console.log(`   - 圆角: ${report.summary.replacementTypes.borderRadius} 种`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.processedFiles.length > 0) {
      console.log('📋 处理详情:');
      this.processedFiles.forEach(({ file, replacements }) => {
        console.log(`   ${file}: ${replacements} 个替换`);
      });
    }

    console.log('\n🎯 后续步骤:');
    console.log('   1. 测试应用程序确保样式正常');
    console.log('   2. 审查替换结果的视觉效果');
    console.log('   3. 继续替换剩余的硬编码值');
    console.log('   4. 更新组件使用设计系统类');
  }
}

// 执行脚本
if (require.main === module) {
  const replacer = new HardcodedValueReplacer();
  replacer.execute().catch(error => {
    console.error('❌ 硬编码值替换失败:', error);
    process.exit(1);
  });
}

module.exports = HardcodedValueReplacer;
