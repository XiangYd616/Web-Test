#!/usr/bin/env node

/**
 * 前后端一致性检查工具
 * 分析API接口、数据模型、功能模块的一致性
 */

const fs = require('fs');
const path = require('path');

class FrontendBackendConsistencyChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.backendDir = path.join(this.projectRoot, 'backend');

    this.analysis = {
      apiEndpoints: {
        frontend: new Map(),
        backend: new Map(),
        mismatches: [],
        missing: []
      },
      dataModels: {
        frontend: new Map(),
        backend: new Map(),
        mismatches: [],
        missing: []
      },
      functionModules: {
        frontend: new Map(),
        backend: new Map(),
        mismatches: [],
        missing: []
      },
      configurations: {
        frontend: new Map(),
        backend: new Map(),
        mismatches: []
      }
    };
  }

  /**
   * 开始一致性检查
   */
  async checkConsistency() {
    console.log('🔍 开始前后端一致性检查...');
    console.log('='.repeat(60));

    // 分析API接口
    await this.analyzeAPIEndpoints();

    // 分析数据模型
    await this.analyzeDataModels();

    // 分析功能模块
    await this.analyzeFunctionModules();

    // 分析配置一致性
    await this.analyzeConfigurations();

    // 生成报告
    this.generateReport();

    console.log(`\n📊 一致性检查完成:`);
    console.log(`  API不匹配: ${this.analysis.apiEndpoints.mismatches.length} 个`);
    console.log(`  数据模型不匹配: ${this.analysis.dataModels.mismatches.length} 个`);
    console.log(`  功能模块不匹配: ${this.analysis.functionModules.mismatches.length} 个`);
    console.log(`  配置不匹配: ${this.analysis.configurations.mismatches.length} 个`);
  }

  /**
   * 分析API接口
   */
  async analyzeAPIEndpoints() {
    console.log('\n🔗 分析API接口一致性...');

    // 扫描前端API调用
    await this.scanFrontendAPIUsage();

    // 扫描后端API定义
    await this.scanBackendAPIDefinitions();

    // 对比分析
    this.compareAPIEndpoints();
  }

  /**
   * 扫描前端API使用
   */
  async scanFrontendAPIUsage() {
    const serviceFiles = this.findFiles(this.frontendDir, /\.(ts|tsx|js|jsx)$/, ['node_modules', 'dist', 'build']);

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // 匹配API调用模式
      const apiPatterns = [
        /fetch\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /axios\.[get|post|put|delete|patch]+\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /\.get\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /\.post\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /\.put\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /\.delete\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
        /BASE_URL\s*\+\s*[`'"](\/[^`'"]+)[`'"]/g
      ];

      apiPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[1];
          const relativePath = path.relative(this.frontendDir, file);

          if (!this.analysis.apiEndpoints.frontend.has(endpoint)) {
            this.analysis.apiEndpoints.frontend.set(endpoint, []);
          }
          this.analysis.apiEndpoints.frontend.get(endpoint).push({
            file: relativePath,
            line: this.getLineNumber(content, match.index)
          });
        }
      });
    }
  }

  /**
   * 扫描后端API定义
   */
  async scanBackendAPIDefinitions() {
    const routeFiles = this.findFiles(path.join(this.backendDir, 'routes'), /\.js$/, []);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);

      // 匹配路由定义模式
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g,
        /app\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]*)[`'"]/g
      ];

      routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          let endpoint = match[2];

          // 如果路径不以/api开头，添加/api前缀（基于路由文件推断）
          if (!endpoint.startsWith('/api')) {
            endpoint = '/api' + (endpoint.startsWith('/') ? '' : '/') + endpoint;
          }

          const key = `${method} ${endpoint}`;

          if (!this.analysis.apiEndpoints.backend.has(key)) {
            this.analysis.apiEndpoints.backend.set(key, []);
          }
          this.analysis.apiEndpoints.backend.get(key).push({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            method: method
          });
        }
      });
    }
  }

  /**
   * 对比API接口
   */
  compareAPIEndpoints() {
    // 检查前端调用的API是否在后端存在
    for (const [endpoint, usages] of this.analysis.apiEndpoints.frontend) {
      const backendMatches = [];

      // 查找匹配的后端路由（考虑不同HTTP方法）
      for (const [backendKey, definitions] of this.analysis.apiEndpoints.backend) {
        const [method, path] = backendKey.split(' ', 2);
        if (path === endpoint || this.isPathMatch(path, endpoint)) {
          backendMatches.push({ method, path, definitions });
        }
      }

      if (backendMatches.length === 0) {
        this.analysis.apiEndpoints.missing.push({
          type: 'backend_missing',
          endpoint: endpoint,
          usedBy: usages
        });
      }
    }

    // 检查后端定义的API是否被前端使用
    for (const [backendKey, definitions] of this.analysis.apiEndpoints.backend) {
      const [method, path] = backendKey.split(' ', 2);

      if (!this.analysis.apiEndpoints.frontend.has(path)) {
        // 检查是否有类似的路径
        const similarPaths = Array.from(this.analysis.apiEndpoints.frontend.keys())
          .filter(frontendPath => this.isPathSimilar(path, frontendPath));

        if (similarPaths.length === 0) {
          this.analysis.apiEndpoints.missing.push({
            type: 'frontend_unused',
            endpoint: `${method} ${path}`,
            definedIn: definitions
          });
        }
      }
    }
  }

  /**
   * 分析数据模型
   */
  async analyzeDataModels() {
    console.log('\n📊 分析数据模型一致性...');

    // 扫描前端类型定义
    await this.scanFrontendTypes();

    // 扫描后端数据库模型
    await this.scanBackendModels();

    // 对比分析
    this.compareDataModels();
  }

  /**
   * 扫描前端类型定义
   */
  async scanFrontendTypes() {
    const typeFiles = this.findFiles(this.frontendDir, /\.(ts|tsx)$/, ['node_modules', 'dist', 'build']);

    for (const file of typeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.frontendDir, file);

      // 匹配接口和类型定义
      const interfacePattern = /interface\s+(\w+)\s*{([^}]+)}/g;
      const typePattern = /type\s+(\w+)\s*=\s*{([^}]+)}/g;

      [interfacePattern, typePattern].forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const typeName = match[1];
          const typeBody = match[2];

          // 解析字段
          const fields = this.parseTypeFields(typeBody);

          if (!this.analysis.dataModels.frontend.has(typeName)) {
            this.analysis.dataModels.frontend.set(typeName, []);
          }

          this.analysis.dataModels.frontend.get(typeName).push({
            file: relativePath,
            fields: fields,
            line: this.getLineNumber(content, match.index)
          });
        }
      });
    }
  }

  /**
   * 扫描后端数据库模型
   */
  async scanBackendModels() {
    // 扫描数据库迁移文件
    const migrationDir = path.join(this.backendDir, 'migrations');
    if (fs.existsSync(migrationDir)) {
      const migrationFiles = this.findFiles(migrationDir, /\.sql$/, []);

      for (const file of migrationFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.backendDir, file);

        // 匹配CREATE TABLE语句
        const tablePattern = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([^;]+)\)/gi;
        let match;

        while ((match = tablePattern.exec(content)) !== null) {
          const tableName = match[1];
          const tableBody = match[2];

          // 解析字段
          const fields = this.parseTableFields(tableBody);

          if (!this.analysis.dataModels.backend.has(tableName)) {
            this.analysis.dataModels.backend.set(tableName, []);
          }

          this.analysis.dataModels.backend.get(tableName).push({
            file: relativePath,
            fields: fields,
            line: this.getLineNumber(content, match.index)
          });
        }
      }
    }

    // 扫描后端类型定义
    const backendTypesDir = path.join(this.backendDir, 'types');
    if (fs.existsSync(backendTypesDir)) {
      const typeFiles = this.findFiles(backendTypesDir, /\.(ts|js)$/, []);

      for (const file of typeFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.backendDir, file);

        // 匹配接口定义
        const interfacePattern = /interface\s+(\w+)\s*{([^}]+)}/g;
        let match;

        while ((match = interfacePattern.exec(content)) !== null) {
          const typeName = match[1];
          const typeBody = match[2];

          // 解析字段
          const fields = this.parseTypeFields(typeBody);

          const key = `${typeName}_interface`;
          if (!this.analysis.dataModels.backend.has(key)) {
            this.analysis.dataModels.backend.set(key, []);
          }

          this.analysis.dataModels.backend.get(key).push({
            file: relativePath,
            fields: fields,
            line: this.getLineNumber(content, match.index),
            type: 'interface'
          });
        }
      }
    }
  }

  /**
   * 对比数据模型
   */
  compareDataModels() {
    console.log(`  前端类型定义: ${this.analysis.dataModels.frontend.size} 个`);
    console.log(`  后端数据模型: ${this.analysis.dataModels.backend.size} 个`);

    // 检查核心数据模型的一致性
    this.checkCoreModelConsistency();

    // 检查字段命名一致性
    this.checkFieldNamingConsistency();
  }

  /**
   * 检查核心数据模型一致性
   */
  checkCoreModelConsistency() {
    const coreModels = [
      { frontend: 'User', backend: 'users' },
      { frontend: 'TestResult', backend: 'test_records' },
      { frontend: 'SystemConfig', backend: 'system_config' }
    ];

    for (const model of coreModels) {
      const frontendModel = this.analysis.dataModels.frontend.get(model.frontend);
      const backendModel = this.analysis.dataModels.backend.get(model.backend);

      if (!frontendModel) {
        this.analysis.dataModels.missing.push({
          type: 'frontend_missing',
          model: model.frontend,
          description: `前端缺少 ${model.frontend} 类型定义`
        });
      }

      if (!backendModel) {
        this.analysis.dataModels.missing.push({
          type: 'backend_missing',
          model: model.backend,
          description: `后端缺少 ${model.backend} 数据表`
        });
      }

      if (frontendModel && backendModel) {
        // 对比字段
        this.compareModelFields(model.frontend, frontendModel[0], model.backend, backendModel[0]);
      }
    }
  }

  /**
   * 对比模型字段
   */
  compareModelFields(frontendName, frontendModel, backendName, backendModel) {
    const frontendFields = new Set(frontendModel.fields.map(f => f.name));
    const backendFields = new Set(backendModel.fields.map(f => f.name));

    // 检查前端字段在后端是否存在（考虑命名转换）
    for (const field of frontendModel.fields) {
      const snakeCaseName = this.camelToSnakeCase(field.name);

      if (!backendFields.has(field.name) && !backendFields.has(snakeCaseName)) {
        this.analysis.dataModels.mismatches.push({
          type: 'field_missing_in_backend',
          frontend: frontendName,
          backend: backendName,
          field: field.name,
          description: `前端字段 ${field.name} 在后端表 ${backendName} 中不存在`
        });
      }
    }

    // 检查后端字段在前端是否存在
    for (const field of backendModel.fields) {
      const camelCaseName = this.snakeToCamelCase(field.name);

      if (!frontendFields.has(field.name) && !frontendFields.has(camelCaseName)) {
        this.analysis.dataModels.mismatches.push({
          type: 'field_missing_in_frontend',
          frontend: frontendName,
          backend: backendName,
          field: field.name,
          description: `后端字段 ${field.name} 在前端类型 ${frontendName} 中不存在`
        });
      }
    }
  }

  /**
   * 检查字段命名一致性
   */
  checkFieldNamingConsistency() {
    // 检查常见的命名不一致问题
    const commonMismatches = [
      { frontend: 'createdAt', backend: 'created_at' },
      { frontend: 'updatedAt', backend: 'updated_at' },
      { frontend: 'userId', backend: 'user_id' },
      { frontend: 'testId', backend: 'test_id' },
      { frontend: 'startedAt', backend: 'started_at' },
      { frontend: 'completedAt', backend: 'completed_at' }
    ];

    // 这里可以添加更详细的命名一致性检查逻辑
  }

  /**
   * 驼峰命名转下划线命名
   */
  camelToSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线命名转驼峰命名
   */
  snakeToCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 分析功能模块
   */
  async analyzeFunctionModules() {
    console.log('\n🧩 分析功能模块对应关系...');

    // 扫描前端页面和组件
    const frontendPages = this.findFiles(path.join(this.frontendDir, 'pages'), /\.(tsx|ts)$/, []);
    const frontendServices = this.findFiles(path.join(this.frontendDir, 'services'), /\.(ts|tsx)$/, []);

    // 扫描后端路由和服务
    const backendRoutes = this.findFiles(path.join(this.backendDir, 'routes'), /\.js$/, []);
    const backendServices = this.findFiles(path.join(this.backendDir, 'services'), /\.js$/, []);

    console.log(`  前端页面: ${frontendPages.length} 个`);
    console.log(`  前端服务: ${frontendServices.length} 个`);
    console.log(`  后端路由: ${backendRoutes.length} 个`);
    console.log(`  后端服务: ${backendServices.length} 个`);
  }

  /**
   * 分析配置一致性
   */
  async analyzeConfigurations() {
    console.log('\n⚙️ 分析配置一致性...');

    // 检查环境变量配置
    const frontendEnvExample = path.join(this.frontendDir, '.env.example');
    const backendEnvExample = path.join(this.backendDir, '.env.example');

    if (fs.existsSync(frontendEnvExample)) {
      console.log('  找到前端环境变量示例文件');
    }

    if (fs.existsSync(backendEnvExample)) {
      console.log('  找到后端环境变量示例文件');
    }
  }

  /**
   * 工具方法：查找文件
   */
  findFiles(dir, pattern, excludeDirs = []) {
    const files = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item) && !item.startsWith('.')) {
            scan(fullPath);
          }
        } else if (stat.isFile() && pattern.test(item)) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * 获取行号
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 路径匹配检查
   */
  isPathMatch(path1, path2) {
    // 简单的路径匹配，可以扩展支持参数路径
    return path1 === path2 ||
      path1.replace(/:\w+/g, '*') === path2.replace(/:\w+/g, '*');
  }

  /**
   * 路径相似性检查
   */
  isPathSimilar(path1, path2) {
    const similarity = this.calculateSimilarity(path1, path2);
    return similarity > 0.8;
  }

  /**
   * 计算字符串相似度
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
   * 解析类型字段
   */
  parseTypeFields(typeBody) {
    const fields = [];
    const lines = typeBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        const fieldMatch = trimmed.match(/(\w+)(\??):\s*([^;,]+)/);
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            optional: fieldMatch[2] === '?',
            type: fieldMatch[3].trim()
          });
        }
      }
    }

    return fields;
  }

  /**
   * 解析数据表字段
   */
  parseTableFields(tableBody) {
    const fields = [];
    const lines = tableBody.split(',');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        const fieldMatch = trimmed.match(/(\w+)\s+(\w+)/);
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2],
            constraints: trimmed.substring(fieldMatch[0].length).trim()
          });
        }
      }
    }

    return fields;
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'frontend-backend-consistency-report.md');

    let report = '# 前后端一致性检查报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n\n`;

    // API接口分析
    report += '## 🔗 API接口一致性分析\n\n';
    report += `### 前端API调用统计\n`;
    report += `- 发现API调用: ${this.analysis.apiEndpoints.frontend.size} 个\n\n`;

    if (this.analysis.apiEndpoints.frontend.size > 0) {
      report += '#### 前端调用的API列表\n';
      for (const [endpoint, usages] of this.analysis.apiEndpoints.frontend) {
        report += `- \`${endpoint}\` (使用 ${usages.length} 次)\n`;
      }
      report += '\n';
    }

    report += `### 后端API定义统计\n`;
    report += `- 发现API定义: ${this.analysis.apiEndpoints.backend.size} 个\n\n`;

    if (this.analysis.apiEndpoints.backend.size > 0) {
      report += '#### 后端定义的API列表\n';
      for (const [endpoint, definitions] of this.analysis.apiEndpoints.backend) {
        report += `- \`${endpoint}\`\n`;
      }
      report += '\n';
    }

    // 缺失的API
    if (this.analysis.apiEndpoints.missing.length > 0) {
      report += '### ⚠️ 发现的问题\n\n';

      const backendMissing = this.analysis.apiEndpoints.missing.filter(m => m.type === 'backend_missing');
      const frontendUnused = this.analysis.apiEndpoints.missing.filter(m => m.type === 'frontend_unused');

      if (backendMissing.length > 0) {
        report += '#### 后端缺失的API\n';
        backendMissing.forEach((missing, index) => {
          report += `${index + 1}. **${missing.endpoint}**\n`;
          report += `   前端使用位置:\n`;
          missing.usedBy.forEach(usage => {
            report += `   - ${usage.file}:${usage.line}\n`;
          });
          report += '\n';
        });
      }

      if (frontendUnused.length > 0) {
        report += '#### 前端未使用的API\n';
        frontendUnused.forEach((unused, index) => {
          report += `${index + 1}. **${unused.endpoint}**\n`;
          report += `   后端定义位置:\n`;
          unused.definedIn.forEach(def => {
            report += `   - ${def.file}:${def.line}\n`;
          });
          report += '\n';
        });
      }
    }

    // 数据模型分析
    report += '## 📊 数据模型一致性分析\n\n';
    report += `- 前端类型定义: ${this.analysis.dataModels.frontend.size} 个\n`;
    report += `- 后端数据表: ${this.analysis.dataModels.backend.size} 个\n\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 一致性检查报告已保存到: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const checker = new FrontendBackendConsistencyChecker();

  try {
    await checker.checkConsistency();
  } catch (error) {
    console.error('❌ 一致性检查过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FrontendBackendConsistencyChecker;
