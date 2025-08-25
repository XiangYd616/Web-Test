#!/usr/bin/env node

/**
 * 导入问题和命名规范修复工具
 * 系统性解决前端项目中的导入和命名问题
 */

const fs = require('fs');
const path = require('path');

class ImportAndNamingFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = [];
    this.fixes = [];
    
    // 常见的导入映射
    this.importMappings = {
      // 组件映射
      'TestHeader': '../components/testing/TestHeader',
      'UnifiedTestPageLayout': '../components/testing/UnifiedTestPageLayout',
      'TestPageLayout': '../components/testing/TestPageLayout',
      'SecurityTestPanel': '../components/security/SecurityTestPanel',
      
      // Hook映射
      'useTestProgress': '../hooks/useTestProgress',
      'useNotifications': '../hooks/useNotifications',
      'useUserStats': '../hooks/useUserStats',
      
      // 类型映射
      'TestProgress': '../services/api/testProgressService',
      'SecurityTestConfig': '../types',
      'SecurityTestResult': '../types',
      
      // 服务映射
      'apiService': '../services/api/apiService',
      'testProgressService': '../services/api/testProgressService'
    };
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复导入和命名问题...\n');
    
    await this.scanAndFixFiles();
    await this.generateReport();
    
    console.log(`\n✅ 修复完成！`);
    console.log(`   发现问题: ${this.issues.length} 个`);
    console.log(`   修复问题: ${this.fixes.length} 个`);
  }

  /**
   * 扫描和修复文件
   */
  async scanAndFixFiles() {
    const files = this.getAllTSXFiles();
    
    for (const file of files) {
      await this.fixFile(file);
    }
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let hasChanges = false;
      
      // 1. 修复缺失的导入
      const missingImports = this.findMissingImports(content, filePath);
      for (const missing of missingImports) {
        const importStatement = this.generateImportStatement(missing, filePath);
        if (importStatement) {
          newContent = this.addImportStatement(newContent, importStatement);
          hasChanges = true;
          this.fixes.push({
            file: path.relative(this.projectRoot, filePath),
            type: 'missing_import',
            fix: `添加导入: ${importStatement}`
          });
        }
      }
      
      // 2. 修复缺失的状态定义
      const missingStates = this.findMissingStates(content);
      for (const state of missingStates) {
        const stateDefinition = this.generateStateDefinition(state);
        newContent = this.addStateDefinition(newContent, stateDefinition);
        hasChanges = true;
        this.fixes.push({
          file: path.relative(this.projectRoot, filePath),
          type: 'missing_state',
          fix: `添加状态: ${stateDefinition}`
        });
      }
      
      // 3. 修复API路径
      newContent = this.fixApiPaths(newContent, filePath);
      if (newContent !== content) {
        hasChanges = true;
      }
      
      // 保存修改
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复文件: ${path.relative(this.projectRoot, filePath)}`);
      }
      
    } catch (error) {
      this.issues.push({
        file: path.relative(this.projectRoot, filePath),
        error: error.message
      });
    }
  }

  /**
   * 查找缺失的导入
   */
  findMissingImports(content, filePath) {
    const missing = [];
    
    // 检查常见的未定义引用
    const undefinedReferences = [
      'TestHeader', 'UnifiedTestPageLayout', 'useTestProgress',
      'SecurityTestPanel', 'TestProgress', 'SecurityTestResult'
    ];
    
    for (const ref of undefinedReferences) {
      if (content.includes(ref) && !this.hasImport(content, ref)) {
        missing.push(ref);
      }
    }
    
    return missing;
  }

  /**
   * 检查是否已有导入
   */
  hasImport(content, name) {
    const importRegex = new RegExp(`import.*${name}.*from`, 'i');
    return importRegex.test(content);
  }

  /**
   * 生成导入语句
   */
  generateImportStatement(name, filePath) {
    const mapping = this.importMappings[name];
    if (!mapping) return null;
    
    // 根据文件位置调整相对路径
    const relativePath = this.calculateRelativePath(filePath, mapping);
    
    if (name.startsWith('use') || name === 'TestProgress') {
      return `import { ${name} } from '${relativePath}';`;
    } else {
      return `import ${name} from '${relativePath}';`;
    }
  }

  /**
   * 计算相对路径
   */
  calculateRelativePath(fromFile, toPath) {
    const fromDir = path.dirname(fromFile);
    const frontendRelative = path.relative(this.frontendPath, fromDir);
    
    // 计算需要返回的层级
    const levels = frontendRelative.split(path.sep).length;
    const prefix = '../'.repeat(levels);
    
    return toPath.replace('../', prefix);
  }

  /**
   * 添加导入语句
   */
  addImportStatement(content, importStatement) {
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // 找到最后一个import语句的位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatement);
    return lines.join('\n');
  }

  /**
   * 查找缺失的状态定义
   */
  findMissingStates(content) {
    const missing = [];
    const stateReferences = [
      'isTestRunning', 'error', 'testProgress', 'canStartTest'
    ];
    
    for (const state of stateReferences) {
      if (content.includes(state) && !content.includes(`useState`) && !content.includes(`const [${state}`)) {
        missing.push(state);
      }
    }
    
    return missing;
  }

  /**
   * 生成状态定义
   */
  generateStateDefinition(stateName) {
    const stateDefinitions = {
      'isTestRunning': 'const [isTestRunning, setIsTestRunning] = useState(false);',
      'error': 'const [error, setError] = useState<string | null>(null);',
      'testProgress': 'const [testProgress, setTestProgress] = useState<any>(null);',
      'canStartTest': 'const [canStartTest, setCanStartTest] = useState(false);'
    };
    
    return stateDefinitions[stateName] || `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(null);`;
  }

  /**
   * 添加状态定义
   */
  addStateDefinition(content, stateDefinition) {
    // 在组件函数开始后添加状态定义
    const functionMatch = content.match(/(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/);
    if (functionMatch) {
      const insertPos = functionMatch.index + functionMatch[0].length;
      return content.slice(0, insertPos) + '\n  ' + stateDefinition + '\n' + content.slice(insertPos);
    }
    
    return content;
  }

  /**
   * 修复API路径
   */
  fixApiPaths(content, filePath) {
    let newContent = content;
    
    // 修复健康检查路径
    newContent = newContent.replace(
      /fetch\(['"`]\/api\/health['"`]/g,
      "fetch('http://localhost:3001/health'"
    );
    
    // 修复系统资源路径
    newContent = newContent.replace(
      /fetch\(['"`]\/api\/system\/resources['"`]/g,
      "fetch('http://localhost:3001/api/system/resources'"
    );
    
    return newContent;
  }

  /**
   * 获取所有TSX文件
   */
  getAllTSXFiles() {
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
  async generateReport() {
    console.log('\n📊 修复报告:');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 成功修复:');
      this.fixes.forEach(fix => {
        console.log(`  📁 ${fix.file}`);
        console.log(`     ${fix.fix}`);
      });
    }
    
    if (this.issues.length > 0) {
      console.log('\n❌ 发现问题:');
      this.issues.forEach(issue => {
        console.log(`  📁 ${issue.file}: ${issue.error}`);
      });
    }
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new ImportAndNamingFixer();
  fixer.fix().catch(console.error);
}

module.exports = ImportAndNamingFixer;
