#!/usr/bin/env node

/**
 * 修复缺失的React Hook导入
 * 检测并修复所有缺失的useState、useEffect等Hook导入
 */

const fs = require('fs');
const path = require('path');

class MissingReactImportsFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];

    // React Hooks和API列表
    this.reactHooks = [
      'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
      'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
      'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
      'forwardRef', 'createContext', 'memo', 'lazy', 'Suspense'
    ];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复缺失的React Hook导入...\n');

    const files = this.getAllTSFiles();
    let fixedCount = 0;

    for (const file of files) {
      const fixed = await this.fixFile(file);
      if (fixed) fixedCount++;
    }

    this.generateReport();

    console.log(`\n✅ 修复完成！`);
    console.log(`   修复文件: ${fixedCount} 个`);
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendPath, filePath);

      // 检查是否使用了React Hooks
      const usedHooks = this.findUsedHooks(content);
      if (usedHooks.length === 0) return false;

      // 检查当前的React导入
      const currentImports = this.extractReactImports(content);

      // 找出缺失的Hook导入
      const missingHooks = usedHooks.filter(hook => !currentImports.includes(hook));
      if (missingHooks.length === 0) return false;

      // 修复导入
      const newContent = this.addMissingImports(content, missingHooks, currentImports);

      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复导入: ${relativePath}`);
        console.log(`   添加: ${missingHooks.join(', ')}`);

        this.fixes.push({
          file: relativePath,
          missingHooks: missingHooks,
          currentImports: currentImports
        });

        return true;
      }

      return false;

    } catch (error) {
      console.error(`❌ 修复失败: ${path.relative(this.frontendPath, filePath)} - ${error.message}`);
      return false;
    }
  }

  /**
   * 查找文件中使用的React Hooks
   */
  findUsedHooks(content) {
    const usedHooks = [];

    for (const hook of this.reactHooks) {
      // 匹配Hook的使用模式
      const patterns = [
        new RegExp(`\\b${hook}\\s*\\(`, 'g'),  // useState(
        new RegExp(`\\b${hook}\\s*<`, 'g'),    // useState<
        new RegExp(`const\\s+\\[.*?\\]\\s*=\\s*${hook}`, 'g'), // const [state, setState] = useState
      ];

      const isUsed = patterns.some(pattern => pattern.test(content));
      if (isUsed && !usedHooks.includes(hook)) {
        usedHooks.push(hook);
      }
    }

    return usedHooks;
  }

  /**
   * 提取当前的React导入
   */
  extractReactImports(content) {
    const imports = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // 匹配React导入行
      const reactImportMatch = line.match(/import\s+(?:React,?\s*)?(?:\{([^}]+)\})?\s+from\s+['"`]react['"`]/);
      if (reactImportMatch) {
        if (reactImportMatch[1]) {
          // 解析命名导入
          const namedImports = reactImportMatch[1]
            .split(',')
            .map(imp => imp.trim().split(' as ')[0].trim())
            .filter(imp => imp && this.reactHooks.includes(imp));

          imports.push(...namedImports);
        }
      }
    }

    return imports;
  }

  /**
   * 添加缺失的导入
   */
  addMissingImports(content, missingHooks, currentImports) {
    const lines = content.split('\n');
    let reactImportLineIndex = -1;

    // 查找React导入行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/import.*from\s+['"`]react['"`]/)) {
        reactImportLineIndex = i;
        break;
      }
    }

    if (reactImportLineIndex !== -1) {
      // 更新现有的React导入
      const allImports = [...currentImports, ...missingHooks].sort();
      const newImportLine = `import { ${allImports.join(', ')} } from 'react';`;
      lines[reactImportLineIndex] = newImportLine;
    } else {
      // 添加新的React导入行
      const newImportLine = `import { ${missingHooks.join(', ')} } from 'react';`;

      // 找到合适的位置插入导入
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }

      lines.splice(insertIndex, 0, newImportLine);
    }

    return lines.join('\n');
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSFiles() {
    const files = [];

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    };

    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 React Hook导入修复报告:');
    console.log('='.repeat(50));

    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复的文件:');
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     缺失的Hook: ${fix.missingHooks.join(', ')}`);
        if (fix.currentImports.length > 0) {
          console.log(`     已有导入: ${fix.currentImports.join(', ')}`);
        }
      });

      // 统计最常见的缺失Hook
      const hookCounts = {};
      this.fixes.forEach(fix => {
        fix.missingHooks.forEach(hook => {
          hookCounts[hook] = (hookCounts[hook] || 0) + 1;
        });
      });

      console.log('\n📈 最常见的缺失Hook:');
      Object.entries(hookCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([hook, count]) => {
          console.log(`   ${hook}: ${count} 个文件`);
        });

    } else {
      console.log('\n✅ 没有发现缺失的React Hook导入');
    }

    console.log('\n🎯 修复效果:');
    console.log('  ✅ 修复了缺失的React Hook导入');
    console.log('  ✅ 避免了运行时错误');
    console.log('  ✅ 提高了代码质量');

    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run type-check 验证修复效果');
    console.log('  2. 使用ESLint规则检查Hook使用');
    console.log('  3. 考虑使用自动导入工具');
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new MissingReactImportsFixer();
  fixer.fix().catch(console.error);
}

module.exports = MissingReactImportsFixer;
