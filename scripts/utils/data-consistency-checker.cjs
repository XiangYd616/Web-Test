#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DataConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.dataModels = {
      frontend: {},
      backend: {},
      database: {}
    };
  }

  /**
   * 执行数据结构一致性检查
   */
  async execute() {
    console.log('🗄️ 开始数据结构一致性检查...\n');

    try {
      // 1. 提取前端数据模型
      await this.extractFrontendModels();

      // 2. 提取后端数据模型
      await this.extractBackendModels();

      // 3. 提取数据库Schema
      await this.extractDatabaseSchema();

      // 4. 检查API请求响应格式一致性
      await this.checkAPIConsistency();

      // 5. 检查前后端数据模型一致性
      await this.checkModelConsistency();

      // 6. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 数据一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 提取前端数据模型
   */
  async extractFrontendModels() {
    console.log('🎨 提取前端数据模型...');

    const typeFiles = this.getTypeFiles('frontend');
    let modelsFound = 0;

    for (const file of typeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const models = this.extractTypeDefinitions(content);
        
        if (models.length > 0) {
          this.dataModels.frontend[path.relative(this.projectRoot, file)] = models;
          modelsFound += models.length;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取类型文件: ${file}`);
      }
    }

    console.log(`   发现 ${modelsFound} 个前端数据模型\n`);
  }

  /**
   * 提取后端数据模型
   */
  async extractBackendModels() {
    console.log('⚙️ 提取后端数据模型...');

    const typeFiles = this.getTypeFiles('backend');
    let modelsFound = 0;

    for (const file of typeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const models = this.extractTypeDefinitions(content);
        
        if (models.length > 0) {
          this.dataModels.backend[path.relative(this.projectRoot, file)] = models;
          modelsFound += models.length;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取类型文件: ${file}`);
      }
    }

    console.log(`   发现 ${modelsFound} 个后端数据模型\n`);
  }

  /**
   * 提取数据库Schema
   */
  async extractDatabaseSchema() {
    console.log('🗃️ 提取数据库Schema...');

    const schemaFiles = [
      path.join(this.projectRoot, 'data/schema.sql'),
      path.join(this.projectRoot, 'database/schema.sql'),
      path.join(this.projectRoot, 'backend/database/schema.sql')
    ];

    let tablesFound = 0;

    for (const file of schemaFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const tables = this.extractDatabaseTables(content);
          
          if (tables.length > 0) {
            this.dataModels.database[path.relative(this.projectRoot, file)] = tables;
            tablesFound += tables.length;
          }

        } catch (error) {
          console.log(`   ⚠️  无法读取Schema文件: ${file}`);
        }
      }
    }

    console.log(`   发现 ${tablesFound} 个数据库表定义\n`);
  }

  /**
   * 检查API请求响应格式一致性
   */
  async checkAPIConsistency() {
    console.log('🌐 检查API请求响应格式一致性...');

    const apiFiles = this.getAPIFiles();
    let inconsistencies = 0;

    const responsePatterns = {
      standardFormat: 0,  // { success: boolean, data: any, message?: string }
      directData: 0,      // 直接返回数据
      customFormat: 0     // 其他格式
    };

    for (const file of apiFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查响应格式模式
        if (content.includes('success:') && content.includes('data:')) {
          responsePatterns.standardFormat++;
        } else if (content.includes('return ') && !content.includes('success:')) {
          responsePatterns.directData++;
        } else {
          responsePatterns.customFormat++;
        }

        // 检查错误响应格式
        const hasStandardErrorResponse = content.includes('error:') || content.includes('message:');
        if (!hasStandardErrorResponse && content.includes('catch')) {
          this.addIssue('api_consistency', 'inconsistent_error_format', file,
            'API错误响应格式不一致');
          inconsistencies++;
        }

        // 检查状态码使用
        const statusCodes = content.match(/\.status\(\d+\)/g) || [];
        const uniqueStatusCodes = [...new Set(statusCodes)];
        
        if (uniqueStatusCodes.length > 5) {
          this.addIssue('api_consistency', 'too_many_status_codes', file,
            `使用了过多的HTTP状态码: ${uniqueStatusCodes.length}`);
          inconsistencies++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取API文件: ${file}`);
      }
    }

    // 检查响应格式一致性
    const totalPatterns = Object.values(responsePatterns).reduce((a, b) => a + b, 0);
    if (totalPatterns > 0) {
      const standardRatio = responsePatterns.standardFormat / totalPatterns;
      if (standardRatio < 0.8 && responsePatterns.standardFormat > 0) {
        this.addIssue('api_consistency', 'mixed_response_formats', 'project',
          `API响应格式不统一: 标准格式${responsePatterns.standardFormat}, 直接数据${responsePatterns.directData}, 自定义格式${responsePatterns.customFormat}`);
        inconsistencies++;
      }
    }

    console.log(`   发现 ${inconsistencies} 个API一致性问题`);
    console.log(`   响应格式分布: 标准格式(${responsePatterns.standardFormat}), 直接数据(${responsePatterns.directData}), 自定义格式(${responsePatterns.customFormat})\n`);
  }

  /**
   * 检查前后端数据模型一致性
   */
  async checkModelConsistency() {
    console.log('🔄 检查前后端数据模型一致性...');

    let inconsistencies = 0;

    // 获取所有前端和后端模型
    const frontendModels = this.getAllModels(this.dataModels.frontend);
    const backendModels = this.getAllModels(this.dataModels.backend);

    // 检查共同模型的一致性
    for (const frontendModel of frontendModels) {
      const matchingBackendModel = backendModels.find(b => 
        b.name === frontendModel.name || 
        b.name.toLowerCase() === frontendModel.name.toLowerCase()
      );

      if (matchingBackendModel) {
        // 检查字段一致性
        const frontendFields = frontendModel.fields || [];
        const backendFields = matchingBackendModel.fields || [];

        for (const frontendField of frontendFields) {
          const matchingBackendField = backendFields.find(b => b.name === frontendField.name);
          
          if (!matchingBackendField) {
            this.addIssue('model_consistency', 'missing_backend_field', 'models',
              `后端模型 ${matchingBackendModel.name} 缺少字段: ${frontendField.name}`);
            inconsistencies++;
          } else if (frontendField.type !== matchingBackendField.type) {
            // 简单的类型映射检查
            const typeMapping = {
              'string': ['string', 'varchar', 'text'],
              'number': ['number', 'int', 'integer', 'float', 'decimal'],
              'boolean': ['boolean', 'bool'],
              'Date': ['Date', 'datetime', 'timestamp']
            };

            const frontendValidTypes = typeMapping[frontendField.type] || [frontendField.type];
            if (!frontendValidTypes.includes(matchingBackendField.type)) {
              this.addIssue('model_consistency', 'type_mismatch', 'models',
                `字段类型不匹配: ${frontendModel.name}.${frontendField.name} (前端: ${frontendField.type}, 后端: ${matchingBackendField.type})`);
              inconsistencies++;
            }
          }
        }
      }
    }

    console.log(`   发现 ${inconsistencies} 个模型一致性问题\n`);
  }

  /**
   * 获取类型文件
   */
  getTypeFiles(directory) {
    const files = [];
    const targetDir = path.join(this.projectRoot, directory);
    
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (this.shouldSkipDirectory(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (this.isTypeFile(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    if (fs.existsSync(targetDir)) {
      walkDir(targetDir);
    }
    return files;
  }

  /**
   * 获取API文件
   */
  getAPIFiles() {
    const files = [];
    const apiDirs = [
      path.join(this.projectRoot, 'backend/routes'),
      path.join(this.projectRoot, 'backend/api'),
      path.join(this.projectRoot, 'frontend/services/api')
    ];

    for (const dir of apiDirs) {
      if (fs.existsSync(dir)) {
        const walkDir = (currentDir) => {
          try {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
              if (this.shouldSkipDirectory(item)) continue;
              
              const fullPath = path.join(currentDir, item);
              const stat = fs.statSync(fullPath);
              
              if (stat.isDirectory()) {
                walkDir(fullPath);
              } else if (/\.(ts|js)$/.test(item)) {
                files.push(fullPath);
              }
            }
          } catch (error) {
            // 忽略无法访问的目录
          }
        };

        walkDir(dir);
      }
    }

    return files;
  }

  isTypeFile(fileName) {
    return fileName.includes('types') || fileName.includes('models') || 
           fileName.endsWith('.d.ts') || fileName.includes('interface');
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 提取类型定义（简化版）
   */
  extractTypeDefinitions(content) {
    const models = [];
    
    // 提取interface定义
    const interfaceRegex = /interface\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, name, body] = match;
      const fields = this.extractFields(body);
      models.push({ name, type: 'interface', fields });
    }

    // 提取type定义
    const typeRegex = /type\s+(\w+)\s*=\s*{([^}]+)}/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const [, name, body] = match;
      const fields = this.extractFields(body);
      models.push({ name, type: 'type', fields });
    }

    return models;
  }

  /**
   * 提取字段定义
   */
  extractFields(body) {
    const fields = [];
    const lines = body.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        const fieldMatch = trimmed.match(/(\w+)\??\s*:\s*([^;,]+)/);
        if (fieldMatch) {
          const [, name, type] = fieldMatch;
          fields.push({ 
            name: name.trim(), 
            type: type.trim().replace(/[;,]$/, ''),
            optional: trimmed.includes('?')
          });
        }
      }
    }
    
    return fields;
  }

  /**
   * 提取数据库表定义（简化版）
   */
  extractDatabaseTables(content) {
    const tables = [];
    const createTableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^)]+)\)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const [, name, body] = match;
      const fields = this.extractDatabaseFields(body);
      tables.push({ name, fields });
    }

    return tables;
  }

  /**
   * 提取数据库字段定义
   */
  extractDatabaseFields(body) {
    const fields = [];
    const lines = body.split(',');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.toUpperCase().includes('PRIMARY KEY') && 
          !trimmed.toUpperCase().includes('FOREIGN KEY')) {
        const fieldMatch = trimmed.match(/(\w+)\s+(\w+)/);
        if (fieldMatch) {
          const [, name, type] = fieldMatch;
          fields.push({ 
            name: name.trim(), 
            type: type.trim().toLowerCase(),
            nullable: !trimmed.toUpperCase().includes('NOT NULL')
          });
        }
      }
    }
    
    return fields;
  }

  /**
   * 获取所有模型
   */
  getAllModels(modelsByFile) {
    const allModels = [];
    for (const models of Object.values(modelsByFile)) {
      allModels.push(...models);
    }
    return allModels;
  }

  addIssue(category, type, file, message) {
    this.issues.push({
      category,
      type,
      file: typeof file === 'string' ? path.relative(this.projectRoot, file) : file,
      message,
      severity: this.getSeverity(category, type)
    });
  }

  getSeverity(category, type) {
    const severityMap = {
      api_consistency: { 
        inconsistent_error_format: 'medium',
        too_many_status_codes: 'low',
        mixed_response_formats: 'high'
      },
      model_consistency: { 
        missing_backend_field: 'high',
        type_mismatch: 'medium'
      }
    };
    return severityMap[category]?.[type] || 'low';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'data-consistency-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        categories: {
          api_consistency: this.issues.filter(i => i.category === 'api_consistency').length,
          model_consistency: this.issues.filter(i => i.category === 'model_consistency').length
        },
        models: {
          frontend: Object.values(this.dataModels.frontend).reduce((acc, models) => acc + models.length, 0),
          backend: Object.values(this.dataModels.backend).reduce((acc, models) => acc + models.length, 0),
          database: Object.values(this.dataModels.database).reduce((acc, tables) => acc + tables.length, 0)
        }
      },
      dataModels: this.dataModels,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 数据结构一致性检查报告:');
    console.log(`   总问题数: ${report.summary.totalIssues}`);
    console.log(`   - API一致性问题: ${report.summary.categories.api_consistency}`);
    console.log(`   - 模型一致性问题: ${report.summary.categories.model_consistency}`);
    console.log(`   数据模型统计:`);
    console.log(`   - 前端模型: ${report.summary.models.frontend}`);
    console.log(`   - 后端模型: ${report.summary.models.backend}`);
    console.log(`   - 数据库表: ${report.summary.models.database}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new DataConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ 数据一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = DataConsistencyChecker;
