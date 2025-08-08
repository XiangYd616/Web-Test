/**
 * 数据模型导出文件
 * 统一导出所有数据模型
 */

const User = require('./User');
const Test = require('./Test');
const TestHistory = require('./TestHistory');

module.exports = {
  User,
  Test,
  TestHistory
};

/**
 * 模型工厂函数
 * 根据类型创建对应的模型实例
 */
const ModelFactory = {
  /**
   * 创建用户模型
   */
  createUser(data) {
    return new User(data);
  },

  /**
   * 创建测试模型
   */
  createTest(data) {
    return new Test(data);
  },

  /**
   * 创建测试历史模型
   */
  createTestHistory(data) {
    return new TestHistory(data);
  },

  /**
   * 从数据库数据创建模型
   */
  fromDatabase(type, dbData) {
    switch (type) {
      case 'user':
        return User.fromDatabase(dbData);
      case 'test':
        return Test.fromDatabase(dbData);
      case 'testHistory':
        return TestHistory.fromDatabase(dbData);
      default:
        throw new Error(`未知的模型类型: ${type}`);
    }
  },

  /**
   * 批量从数据库数据创建模型
   */
  fromDatabaseArray(type, dbDataArray) {
    if (!Array.isArray(dbDataArray)) {
      return [];
    }

    return dbDataArray.map(dbData => this.fromDatabase(type, dbData)).filter(Boolean);
  }
};

module.exports.ModelFactory = ModelFactory;

/**
 * 模型验证器
 * 提供统一的验证接口
 */
const ModelValidator = {
  /**
   * 验证用户数据
   */
  validateUser(userData) {
    const user = new User(userData);
    return user.validate();
  },

  /**
   * 验证测试数据
   */
  validateTest(testData) {
    const test = new Test(testData);
    return test.validate();
  },

  /**
   * 验证测试历史数据
   */
  validateTestHistory(historyData) {
    const history = new TestHistory(historyData);
    return history.validate();
  },

  /**
   * 批量验证
   */
  validateBatch(type, dataArray) {
    if (!Array.isArray(dataArray)) {
      return { isValid: false, errors: ['数据必须是数组格式'] };
    }

    const results = [];
    let hasErrors = false;

    for (let i = 0; i < dataArray.length; i++) {
      let validation;
      
      switch (type) {
        case 'user':
          validation = this.validateUser(dataArray[i]);
          break;
        case 'test':
          validation = this.validateTest(dataArray[i]);
          break;
        case 'testHistory':
          validation = this.validateTestHistory(dataArray[i]);
          break;
        default:
          validation = { isValid: false, errors: [`未知的验证类型: ${type}`] };
      }

      results.push({
        index: i,
        data: dataArray[i],
        validation
      });

      if (!validation.isValid) {
        hasErrors = true;
      }
    }

    return {
      isValid: !hasErrors,
      results,
      summary: {
        total: dataArray.length,
        valid: results.filter(r => r.validation.isValid).length,
        invalid: results.filter(r => !r.validation.isValid).length
      }
    };
  }
};

module.exports.ModelValidator = ModelValidator;

/**
 * 模型转换器
 * 提供不同格式之间的转换
 */
const ModelConverter = {
  /**
   * 转换为API格式
   */
  toAPI(model) {
    if (!model || typeof model.toAPI !== 'function') {
      return null;
    }
    return model.toAPI();
  },

  /**
   * 批量转换为API格式
   */
  toAPIArray(models) {
    if (!Array.isArray(models)) {
      return [];
    }
    return models.map(model => this.toAPI(model)).filter(Boolean);
  },

  /**
   * 转换为数据库格式
   */
  toDatabase(model) {
    if (!model || typeof model.toDatabase !== 'function') {
      return null;
    }
    return model.toDatabase();
  },

  /**
   * 批量转换为数据库格式
   */
  toDatabaseArray(models) {
    if (!Array.isArray(models)) {
      return [];
    }
    return models.map(model => this.toDatabase(model)).filter(Boolean);
  }
};

module.exports.ModelConverter = ModelConverter;
