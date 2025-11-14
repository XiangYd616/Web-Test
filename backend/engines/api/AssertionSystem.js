/**
 * API测试断言系统
 * 
 * 文件路径: backend/engines/api/AssertionSystem.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - 状态码断言
 * - JSON Path断言
 * - 响应时间断言
 * - Header断言
 * - Body内容断言
 * - 链式断言支持
 */

class AssertionSystem {
  constructor() {
    this.assertions = [];
    this.results = [];
  }

  /**
   * 添加状态码断言
   */
  expectStatus(expectedStatus) {
    this.assertions.push({
      type: 'status',
      expected: expectedStatus,
      validate: (response) => {
        const actual = response.statusCode;
        const passed = actual === expectedStatus;
        
        return {
          type: 'status',
          passed,
          expected: expectedStatus,
          actual,
          message: passed 
            ? `状态码匹配: ${actual}`
            : `状态码不匹配: 期望 ${expectedStatus}, 实际 ${actual}`
        };
      }
    });
    return this;
  }

  /**
   * 添加状态码范围断言
   */
  expectStatusInRange(min, max) {
    this.assertions.push({
      type: 'statusRange',
      expected: `${min}-${max}`,
      validate: (response) => {
        const actual = response.statusCode;
        const passed = actual >= min && actual <= max;
        
        return {
          type: 'statusRange',
          passed,
          expected: `${min}-${max}`,
          actual,
          message: passed
            ? `状态码在范围内: ${actual}`
            : `状态码超出范围: 期望 ${min}-${max}, 实际 ${actual}`
        };
      }
    });
    return this;
  }

  /**
   * 添加响应时间断言
   */
  expectResponseTime(operator, value) {
    this.assertions.push({
      type: 'responseTime',
      expected: `${operator} ${value}ms`,
      validate: (response, responseTime) => {
        let passed = false;
        
        switch (operator) {
          case '<':
            passed = responseTime < value;
            break;
          case '<=':
            passed = responseTime <= value;
            break;
          case '>':
            passed = responseTime > value;
            break;
          case '>=':
            passed = responseTime >= value;
            break;
          case '=':
          case '==':
            passed = responseTime === value;
            break;
          default:
            throw new Error(`不支持的操作符: ${operator}`);
        }
        
        return {
          type: 'responseTime',
          passed,
          expected: `${operator} ${value}ms`,
          actual: `${responseTime}ms`,
          message: passed
            ? `响应时间符合预期: ${responseTime}ms ${operator} ${value}ms`
            : `响应时间不符合预期: ${responseTime}ms 不满足 ${operator} ${value}ms`
        };
      }
    });
    return this;
  }

  /**
   * 添加Header断言
   */
  expectHeader(headerName, expectedValue) {
    this.assertions.push({
      type: 'header',
      expected: `${headerName}: ${expectedValue}`,
      validate: (response) => {
        const actual = response.headers[headerName.toLowerCase()];
        const passed = expectedValue instanceof RegExp 
          ? expectedValue.test(actual)
          : actual === expectedValue;
        
        return {
          type: 'header',
          passed,
          expected: expectedValue,
          actual,
          headerName,
          message: passed
            ? `Header匹配: ${headerName}=${actual}`
            : `Header不匹配: ${headerName} 期望 ${expectedValue}, 实际 ${actual || '(不存在)'}`
        };
      }
    });
    return this;
  }

  /**
   * 添加Header存在性断言
   */
  expectHeaderExists(headerName) {
    this.assertions.push({
      type: 'headerExists',
      expected: `存在Header: ${headerName}`,
      validate: (response) => {
        const exists = response.headers.hasOwnProperty(headerName.toLowerCase());
        
        return {
          type: 'headerExists',
          passed: exists,
          headerName,
          message: exists
            ? `Header存在: ${headerName}`
            : `Header不存在: ${headerName}`
        };
      }
    });
    return this;
  }

  /**
   * 添加Body内容断言
   */
  expectBody(expectedBody) {
    this.assertions.push({
      type: 'body',
      expected: expectedBody,
      validate: (response) => {
        const actual = response.body;
        const passed = typeof expectedBody === 'string'
          ? actual === expectedBody
          : JSON.stringify(actual) === JSON.stringify(expectedBody);
        
        return {
          type: 'body',
          passed,
          expected: expectedBody,
          actual,
          message: passed
            ? 'Body内容匹配'
            : 'Body内容不匹配'
        };
      }
    });
    return this;
  }

  /**
   * 添加Body包含断言
   */
  expectBodyContains(substring) {
    this.assertions.push({
      type: 'bodyContains',
      expected: `包含: ${substring}`,
      validate: (response) => {
        const body = typeof response.body === 'string' 
          ? response.body 
          : JSON.stringify(response.body);
        const passed = body.includes(substring);
        
        return {
          type: 'bodyContains',
          passed,
          expected: substring,
          message: passed
            ? `Body包含指定内容: ${substring}`
            : `Body不包含指定内容: ${substring}`
        };
      }
    });
    return this;
  }

  /**
   * 添加JSON Path断言
   */
  expectJsonPath(path, expectedValue) {
    this.assertions.push({
      type: 'jsonPath',
      expected: `${path} = ${expectedValue}`,
      validate: (response) => {
        try {
          const actual = this.getJsonPathValue(response.body, path);
          const passed = expectedValue instanceof RegExp
            ? expectedValue.test(String(actual))
            : actual === expectedValue;
          
          return {
            type: 'jsonPath',
            passed,
            expected: expectedValue,
            actual,
            path,
            message: passed
              ? `JSON Path匹配: ${path} = ${actual}`
              : `JSON Path不匹配: ${path} 期望 ${expectedValue}, 实际 ${actual}`
          };
        } catch (error) {
          return {
            type: 'jsonPath',
            passed: false,
            path,
            error: error.message,
            message: `JSON Path解析失败: ${path} - ${error.message}`
          };
        }
      }
    });
    return this;
  }

  /**
   * 添加JSON Path存在性断言
   */
  expectJsonPathExists(path) {
    this.assertions.push({
      type: 'jsonPathExists',
      expected: `存在路径: ${path}`,
      validate: (response) => {
        try {
          const value = this.getJsonPathValue(response.body, path);
          const exists = value !== undefined && value !== null;
          
          return {
            type: 'jsonPathExists',
            passed: exists,
            path,
            value,
            message: exists
              ? `JSON Path存在: ${path}`
              : `JSON Path不存在: ${path}`
          };
        } catch (error) {
          return {
            type: 'jsonPathExists',
            passed: false,
            path,
            error: error.message,
            message: `JSON Path解析失败: ${path} - ${error.message}`
          };
        }
      }
    });
    return this;
  }

  /**
   * 添加JSON Schema断言
   */
  expectJsonSchema(schema) {
    this.assertions.push({
      type: 'jsonSchema',
      expected: 'JSON Schema验证',
      validate: (response) => {
        try {
          const errors = this.validateJsonSchema(response.body, schema);
          const passed = errors.length === 0;
          
          return {
            type: 'jsonSchema',
            passed,
            errors,
            message: passed
              ? 'JSON Schema验证通过'
              : `JSON Schema验证失败: ${errors.join(', ')}`
          };
        } catch (error) {
          return {
            type: 'jsonSchema',
            passed: false,
            error: error.message,
            message: `JSON Schema验证异常: ${error.message}`
          };
        }
      }
    });
    return this;
  }

  /**
   * 添加Content-Type断言
   */
  expectContentType(expectedType) {
    this.assertions.push({
      type: 'contentType',
      expected: expectedType,
      validate: (response) => {
        const actual = response.headers['content-type'] || '';
        const passed = actual.includes(expectedType);
        
        return {
          type: 'contentType',
          passed,
          expected: expectedType,
          actual,
          message: passed
            ? `Content-Type匹配: ${actual}`
            : `Content-Type不匹配: 期望包含 ${expectedType}, 实际 ${actual}`
        };
      }
    });
    return this;
  }

  /**
   * 执行所有断言
   */
  async execute(response, responseTime) {
    this.results = [];
    
    for (const assertion of this.assertions) {
      try {
        const result = assertion.validate(response, responseTime);
        this.results.push(result);
      } catch (error) {
        this.results.push({
          type: assertion.type,
          passed: false,
          error: error.message,
          message: `断言执行失败: ${error.message}`
        });
      }
    }
    
    return this.getResults();
  }

  /**
   * 获取断言结果
   */
  getResults() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100 * 100) / 100 : 0,
      allPassed: failed === 0,
      results: this.results,
      summary: `${passed}/${total} 断言通过 (${Math.round((passed / total) * 100)}%)`
    };
  }

  /**
   * 获取JSON Path值
   * 简化版JSON Path实现，支持点号和方括号语法
   */
  getJsonPathValue(obj, path) {
    if (!path || path === '$') return obj;
    
    // 移除开头的 $. 或 $
    path = path.replace(/^\$\.?/, '');
    
    // 分割路径
    const parts = path.split(/\.|\[|\]/).filter(p => p !== '');
    
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) {
        throw new Error(`路径不存在: ${path}`);
      }
      
      // 处理数组索引
      if (/^\d+$/.test(part)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * 简化的JSON Schema验证
   */
  validateJsonSchema(data, schema) {
    const errors = [];
    
    // 验证类型
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) {
        errors.push(`类型不匹配: 期望 ${schema.type}, 实际 ${actualType}`);
        return errors;
      }
    }
    
    // 验证必需字段
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`缺少必需字段: ${field}`);
        }
      }
    }
    
    // 验证属性
    if (schema.properties && typeof data === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const propErrors = this.validateJsonSchema(data[key], propSchema);
          errors.push(...propErrors.map(e => `${key}.${e}`));
        }
      }
    }
    
    return errors;
  }

  /**
   * 清空断言
   */
  clear() {
    this.assertions = [];
    this.results = [];
    return this;
  }
}

/**
 * 创建断言实例的工厂函数
 */
function createAssertion() {
  return new AssertionSystem();
}

/**
 * 预设断言集合
 */
const presets = {
  /**
   * 成功响应断言
   */
  success() {
    return createAssertion()
      .expectStatusInRange(200, 299)
      .expectResponseTime('<', 3000);
  },

  /**
   * JSON API断言
   */
  jsonApi() {
    return createAssertion()
      .expectStatus(200)
      .expectContentType('application/json')
      .expectResponseTime('<', 2000);
  },

  /**
   * 快速响应断言
   */
  fast() {
    return createAssertion()
      .expectStatus(200)
      .expectResponseTime('<', 500);
  },

  /**
   * 安全Header断言
   */
  secureHeaders() {
    return createAssertion()
      .expectHeaderExists('strict-transport-security')
      .expectHeaderExists('x-content-type-options')
      .expectHeaderExists('x-frame-options');
  }
};

module.exports = {
  AssertionSystem,
  createAssertion,
  presets
};
