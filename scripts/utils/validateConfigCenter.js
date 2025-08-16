/**
 * 配置中心验证脚本
 * 验证统一配置中心的功能和集成效果
 */

const fs = require('fs');
const path = require('path');

class ConfigCenterValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  /**
   * 运行所有验证测试
   */
  async validate() {
    console.log('🔍 开始配置中心验证...\n');

    try {
      // 1. 验证配置中心文件存在
      this.validateFiles();
      
      // 2. 验证配置模式定义
      this.validateSchema();
      
      // 3. 验证API路由注册
      this.validateAPIRoutes();
      
      // 4. 验证环境变量映射
      this.validateEnvironmentMapping();
      
      // 5. 验证配置验证器
      this.validateConfigValidator();
      
      // 6. 验证热更新功能
      this.validateHotReload();
      
      // 7. 验证配置历史功能
      this.validateConfigHistory();
      
      // 8. 生成验证报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 配置中心验证失败:', error);
      process.exit(1);
    }
  }

  /**
   * 验证配置中心文件存在
   */
  validateFiles() {
    console.log('📁 验证配置中心文件...');
    
    const requiredFiles = [
      'backend/config/ConfigCenter.js',
      'backend/routes/config.js',
      'docs/CONFIG_CENTER_GUIDE.md',
      'scripts/migrateToConfigCenter.js'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      this.test(`文件存在: ${file}`, () => {
        if (!fs.existsSync(filePath)) {
          throw new Error(`文件不存在: ${filePath}`);
        }
        return true;
      });
    }
  }

  /**
   * 验证配置模式定义
   */
  validateSchema() {
    console.log('🔧 验证配置模式定义...');
    
    this.test('ConfigCenter模块可以加载', () => {
      try {
        const { ConfigCenter } = require('../backend/config/ConfigCenter');
        return ConfigCenter !== undefined;
      } catch (error) {
        throw new Error(`ConfigCenter模块加载失败: ${error.message}`);
      }
    });

    this.test('配置模式包含必要的配置项', () => {
      try {
        const { ConfigCenter } = require('../backend/config/ConfigCenter');
        const configCenter = new ConfigCenter();
        const schema = configCenter.getSchema();
        
        const requiredConfigs = [
          'server.port',
          'database.host',
          'database.port',
          'auth.jwtSecret',
          'testEngine.maxConcurrentTests',
          'security.corsOrigins',
          'monitoring.enabled'
        ];
        
        for (const config of requiredConfigs) {
          if (!schema[config]) {
            throw new Error(`缺少必要的配置项: ${config}`);
          }
        }
        
        return true;
      } catch (error) {
        throw new Error(`配置模式验证失败: ${error.message}`);
      }
    });

    this.test('配置项包含必要的元数据', () => {
      try {
        const { ConfigCenter } = require('../backend/config/ConfigCenter');
        const configCenter = new ConfigCenter();
        const schema = configCenter.getSchema();
        
        for (const [key, config] of Object.entries(schema)) {
          if (!config.type) {
            throw new Error(`配置项 ${key} 缺少类型定义`);
          }
          if (config.default === undefined && config.required) {
            throw new Error(`必需配置项 ${key} 缺少默认值`);
          }
          if (!config.description) {
            throw new Error(`配置项 ${key} 缺少描述`);
          }
        }
        
        return true;
      } catch (error) {
        throw new Error(`配置元数据验证失败: ${error.message}`);
      }
    });
  }

  /**
   * 验证API路由注册
   */
  validateAPIRoutes() {
    console.log('🌐 验证API路由注册...');
    
    this.test('配置管理路由文件存在', () => {
      const routePath = path.join(__dirname, '../backend/routes/config.js');
      if (!fs.existsSync(routePath)) {
        throw new Error('配置管理路由文件不存在');
      }
      return true;
    });

    this.test('配置管理路由可以加载', () => {
      try {
        const configRouter = require('../backend/routes/config.js');
        return configRouter !== undefined;
      } catch (error) {
        throw new Error(`配置管理路由加载失败: ${error.message}`);
      }
    });

    this.test('UnifiedRouteManager包含配置路由', () => {
      try {
        const routeManagerPath = path.join(__dirname, '../backend/src/UnifiedRouteManager.js');
        const content = fs.readFileSync(routeManagerPath, 'utf8');
        
        if (!content.includes('/api/config')) {
          throw new Error('UnifiedRouteManager未注册配置管理路由');
        }
        
        return true;
      } catch (error) {
        throw new Error(`路由注册验证失败: ${error.message}`);
      }
    });
  }

  /**
   * 验证环境变量映射
   */
  validateEnvironmentMapping() {
    console.log('🌍 验证环境变量映射...');
    
    this.test('环境变量映射完整', () => {
      try {
        const configCenterPath = path.join(__dirname, '../backend/config/ConfigCenter.js');
        const content = fs.readFileSync(configCenterPath, 'utf8');
        
        const requiredMappings = [
          'PORT',
          'DB_HOST',
          'DB_PORT',
          'JWT_SECRET',
          'MAX_CONCURRENT_TESTS'
        ];
        
        for (const mapping of requiredMappings) {
          if (!content.includes(mapping)) {
            throw new Error(`缺少环境变量映射: ${mapping}`);
          }
        }
        
        return true;
      } catch (error) {
        throw new Error(`环境变量映射验证失败: ${error.message}`);
      }
    });
  }

  /**
   * 验证配置验证器
   */
  validateConfigValidator() {
    console.log('✅ 验证配置验证器...');
    
    this.test('ConfigValidator类存在', () => {
      try {
        const { ConfigValidator } = require('../backend/config/ConfigCenter');
        return ConfigValidator !== undefined;
      } catch (error) {
        throw new Error(`ConfigValidator类不存在: ${error.message}`);
      }
    });

    this.test('类型验证功能正常', () => {
      try {
        const { ConfigValidator } = require('../backend/config/ConfigCenter');
        
        // 测试正确的类型验证
        ConfigValidator.validateType('test', 'string', 'test.key');
        ConfigValidator.validateType(123, 'number', 'test.key');
        ConfigValidator.validateType(true, 'boolean', 'test.key');
        ConfigValidator.validateType([], 'array', 'test.key');
        ConfigValidator.validateType({}, 'object', 'test.key');
        
        // 测试错误的类型验证
        try {
          ConfigValidator.validateType('test', 'number', 'test.key');
          throw new Error('应该抛出类型验证错误');
        } catch (error) {
          if (!error.message.includes('必须是数字类型')) {
            throw error;
          }
        }
        
        return true;
      } catch (error) {
        throw new Error(`类型验证功能测试失败: ${error.message}`);
      }
    });
  }

  /**
   * 验证热更新功能
   */
  validateHotReload() {
    console.log('🔥 验证热更新功能...');
    
    this.test('热更新配置标识正确', () => {
      try {
        const { ConfigCenter } = require('../backend/config/ConfigCenter');
        const configCenter = new ConfigCenter();
        const schema = configCenter.getSchema();
        
        // 检查不应该支持热更新的配置
        const noHotReloadConfigs = ['server.port', 'database.host', 'database.port'];
        for (const config of noHotReloadConfigs) {
          if (schema[config] && schema[config].hotReload) {
            throw new Error(`配置 ${config} 不应该支持热更新`);
          }
        }
        
        // 检查应该支持热更新的配置
        const hotReloadConfigs = ['testEngine.maxConcurrentTests', 'monitoring.interval'];
        for (const config of hotReloadConfigs) {
          if (schema[config] && !schema[config].hotReload) {
            throw new Error(`配置 ${config} 应该支持热更新`);
          }
        }
        
        return true;
      } catch (error) {
        throw new Error(`热更新配置验证失败: ${error.message}`);
      }
    });
  }

  /**
   * 验证配置历史功能
   */
  validateConfigHistory() {
    console.log('📚 验证配置历史功能...');
    
    this.test('ConfigHistory类存在', () => {
      try {
        const { ConfigHistory } = require('../backend/config/ConfigCenter');
        return ConfigHistory !== undefined;
      } catch (error) {
        throw new Error(`ConfigHistory类不存在: ${error.message}`);
      }
    });

    this.test('配置历史功能正常', () => {
      try {
        const { ConfigHistory } = require('../backend/config/ConfigCenter');
        const history = new ConfigHistory();
        
        // 添加变更记录
        const changeId = history.addChange('test.key', 'oldValue', 'newValue', 'test');
        
        // 获取历史记录
        const historyRecords = history.getHistory();
        if (historyRecords.length === 0) {
          throw new Error('历史记录未正确添加');
        }
        
        // 测试回滚功能
        const rollbackInfo = history.rollback(changeId);
        if (rollbackInfo.key !== 'test.key' || rollbackInfo.value !== 'oldValue') {
          throw new Error('回滚功能不正常');
        }
        
        return true;
      } catch (error) {
        throw new Error(`配置历史功能测试失败: ${error.message}`);
      }
    });
  }

  /**
   * 执行单个测试
   */
  test(name, testFn) {
    try {
      const result = testFn();
      if (result) {
        console.log(`  ✅ ${name}`);
        this.passed++;
      } else {
        console.log(`  ❌ ${name}: 测试返回false`);
        this.failed++;
        this.errors.push(`${name}: 测试返回false`);
      }
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      this.failed++;
      this.errors.push(`${name}: ${error.message}`);
    }
    
    this.tests.push({ name, passed: this.errors.length === 0 });
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 配置中心验证报告');
    console.log('=' .repeat(50));
    
    console.log(`\n📈 测试统计:`);
    console.log(`  总测试数: ${this.tests.length}`);
    console.log(`  通过: ${this.passed}`);
    console.log(`  失败: ${this.failed}`);
    console.log(`  成功率: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ 失败的测试:`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\n🎯 验证结果:`);
    if (this.failed === 0) {
      console.log('✅ 配置中心验证通过！');
      console.log('🎉 统一配置中心已成功实现并集成');
    } else {
      console.log('❌ 配置中心验证失败');
      console.log('🔧 请修复上述问题后重新验证');
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// 运行验证
if (require.main === module) {
  const validator = new ConfigCenterValidator();
  validator.validate().catch(console.error);
}

module.exports = ConfigCenterValidator;
