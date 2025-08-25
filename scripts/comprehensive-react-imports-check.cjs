#!/usr/bin/env node

/**
 * 全面的React导入检查和修复工具
 * 检查所有可能的React API使用并确保正确导入
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveReactImportsChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = [];
    this.fixes = [];
    
    // 完整的React API列表
    this.reactAPIs = {
      // Hooks
      'useState': /\buseState\s*[(<]/g,
      'useEffect': /\buseEffect\s*[(<]/g,
      'useContext': /\buseContext\s*[(<]/g,
      'useReducer': /\buseReducer\s*[(<]/g,
      'useCallback': /\buseCallback\s*[(<]/g,
      'useMemo': /\buseMemo\s*[(<]/g,
      'useRef': /\buseRef\s*[(<]/g,
      'useImperativeHandle': /\buseImperativeHandle\s*[(<]/g,
      'useLayoutEffect': /\buseLayoutEffect\s*[(<]/g,
      'useDebugValue': /\buseDebugValue\s*[(<]/g,
      'useDeferredValue': /\buseDeferredValue\s*[(<]/g,
      'useTransition': /\buseTransition\s*[(<]/g,
      'useId': /\buseId\s*[(<]/g,
      
      // React APIs
      'forwardRef': /\bforwardRef\s*[(<]/g,
      'createContext': /\bcreateContext\s*[(<]/g,
      'memo': /\bmemo\s*[(<]/g,
      'lazy': /\blazy\s*[(<]/g,
      'Suspense': /\bSuspense\s*[<\s]/g,
      'Fragment': /\bFragment\s*[<\s]/g,
      'StrictMode': /\bStrictMode\s*[<\s]/g,
      'createElement': /\bcreateElement\s*[(<]/g,
      'cloneElement': /\bcloneElement\s*[(<]/g,
      'isValidElement': /\bisValidElement\s*[(<]/g,
      
      // React Types (commonly used)
      'ReactNode': /\bReactNode\b/g,
      'ReactElement': /\bReactElement\b/g,
      'ComponentType': /\bComponentType\b/g,
      'FC': /\bFC\b/g,
      'FunctionComponent': /\bFunctionComponent\b/g,
      'Component': /\bComponent\b/g,
      'PureComponent': /\bPureComponent\b/g
    };
  }

  /**
   * 开始检查
   */
  async check() {
    console.log('🔍 开始全面检查React导入...\n');
    
    const files = this.getAllTSFiles();
    let checkedCount = 0;
    
    for (const file of files) {
      await this.checkFile(file);
      checkedCount++;
    }
    
    this.generateReport();
    
    console.log(`\n✅ 检查完成！`);
    console.log(`   检查文件: ${checkedCount} 个`);
    console.log(`   发现问题: ${this.issues.length} 个`);
    console.log(`   自动修复: ${this.fixes.length} 个`);
  }

  /**
   * 检查单个文件
   */
  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendPath, filePath);
      
      // 检查使用的React API
      const usedAPIs = this.findUsedAPIs(content);
      if (usedAPIs.length === 0) return;
      
      // 检查当前的React导入
      const currentImports = this.extractReactImports(content);
      
      // 找出缺失的API导入
      const missingAPIs = usedAPIs.filter(api => !currentImports.includes(api));
      
      if (missingAPIs.length > 0) {
        this.issues.push({
          file: relativePath,
          usedAPIs: usedAPIs,
          currentImports: currentImports,
          missingAPIs: missingAPIs
        });
        
        // 尝试自动修复
        const fixed = await this.autoFix(filePath, relativePath, missingAPIs, currentImports, content);
        if (fixed) {
          this.fixes.push({
            file: relativePath,
            addedImports: missingAPIs
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ 检查失败: ${path.relative(this.frontendPath, filePath)} - ${error.message}`);
    }
  }

  /**
   * 查找文件中使用的React API
   */
  findUsedAPIs(content) {
    const usedAPIs = [];
    
    for (const [api, pattern] of Object.entries(this.reactAPIs)) {
      if (pattern.test(content)) {
        usedAPIs.push(api);
      }
      // 重置正则表达式的lastIndex
      pattern.lastIndex = 0;
    }
    
    return usedAPIs;
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
            .filter(imp => imp);
          
          imports.push(...namedImports);
        }
      }
      
      // 匹配React类型导入
      const reactTypeImportMatch = line.match(/import\s+type\s+\{([^}]+)\}\s+from\s+['"`]react['"`]/);
      if (reactTypeImportMatch) {
        const typeImports = reactTypeImportMatch[1]
          .split(',')
          .map(imp => imp.trim().split(' as ')[0].trim())
          .filter(imp => imp);
        
        imports.push(...typeImports);
      }
    }
    
    return imports;
  }

  /**
   * 自动修复导入
   */
  async autoFix(filePath, relativePath, missingAPIs, currentImports, content) {
    try {
      const newContent = this.addMissingImports(content, missingAPIs, currentImports);
      
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 自动修复: ${relativePath}`);
        console.log(`   添加: ${missingAPIs.join(', ')}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ 自动修复失败: ${relativePath} - ${error.message}`);
      return false;
    }
  }

  /**
   * 添加缺失的导入
   */
  addMissingImports(content, missingAPIs, currentImports) {
    const lines = content.split('\n');
    let reactImportLineIndex = -1;
    
    // 查找React导入行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/import.*from\s+['"`]react['"`]/)) {
        reactImportLineIndex = i;
        break;
      }
    }
    
    // 分离类型导入和值导入
    const typeImports = missingAPIs.filter(api => 
      ['ReactNode', 'ReactElement', 'ComponentType', 'FC', 'FunctionComponent', 'Component', 'PureComponent'].includes(api)
    );
    const valueImports = missingAPIs.filter(api => !typeImports.includes(api));
    
    if (reactImportLineIndex !== -1) {
      // 更新现有的React导入
      const allValueImports = [...currentImports.filter(imp => !typeImports.includes(imp)), ...valueImports].sort();
      if (allValueImports.length > 0) {
        const newImportLine = `import { ${allValueImports.join(', ')} } from 'react';`;
        lines[reactImportLineIndex] = newImportLine;
      }
      
      // 添加类型导入（如果有）
      if (typeImports.length > 0) {
        const typeImportLine = `import type { ${typeImports.join(', ')} } from 'react';`;
        lines.splice(reactImportLineIndex + 1, 0, typeImportLine);
      }
    } else {
      // 添加新的React导入行
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      if (valueImports.length > 0) {
        const newImportLine = `import { ${valueImports.join(', ')} } from 'react';`;
        lines.splice(insertIndex, 0, newImportLine);
        insertIndex++;
      }
      
      if (typeImports.length > 0) {
        const typeImportLine = `import type { ${typeImports.join(', ')} } from 'react';`;
        lines.splice(insertIndex, 0, typeImportLine);
      }
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
    console.log('\n📊 React导入全面检查报告:');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('\n✅ 所有React导入都正确！');
      return;
    }
    
    console.log(`\n❌ 发现 ${this.issues.length} 个文件有导入问题:`);
    
    // 显示未修复的问题
    const unfixedIssues = this.issues.filter(issue => 
      !this.fixes.some(fix => fix.file === issue.file)
    );
    
    if (unfixedIssues.length > 0) {
      console.log('\n⚠️ 需要手动修复的问题:');
      unfixedIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}`);
        console.log(`     使用的API: ${issue.usedAPIs.join(', ')}`);
        console.log(`     当前导入: ${issue.currentImports.join(', ') || '无'}`);
        console.log(`     缺失导入: ${issue.missingAPIs.join(', ')}`);
      });
    }
    
    if (this.fixes.length > 0) {
      console.log(`\n✅ 自动修复了 ${this.fixes.length} 个文件:`);
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     添加导入: ${fix.addedImports.join(', ')}`);
      });
    }
    
    // 统计最常见的缺失导入
    const missingCounts = {};
    this.issues.forEach(issue => {
      issue.missingAPIs.forEach(api => {
        missingCounts[api] = (missingCounts[api] || 0) + 1;
      });
    });
    
    if (Object.keys(missingCounts).length > 0) {
      console.log('\n📈 最常见的缺失导入:');
      Object.entries(missingCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([api, count]) => {
          console.log(`   ${api}: ${count} 个文件`);
        });
    }
  }
}

// 运行检查工具
if (require.main === module) {
  const checker = new ComprehensiveReactImportsChecker();
  checker.check().catch(console.error);
}

module.exports = ComprehensiveReactImportsChecker;
