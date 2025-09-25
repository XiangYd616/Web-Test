/**
 * 测试断言库
 * 提供丰富的断言方法，兼容 Postman 和 Chai 语法
 */

const chai = require('chai');
const { isEqual, isMatch, get, has } = require('lodash');

class AssertionLibrary {
  constructor() {
    this.chai = chai;
    this.expect = chai.expect;
    this.assert = chai.assert;
    
    // 断言统计
    this.assertions = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * 响应断言
   */
  createResponseAssertions(response) {
    const self = this;
    
    return {
      // 状态码断言
      status: {
        toBe: (expectedCode) => {
          self.recordAssertion(
            `响应状态码应该是 ${expectedCode}`,
            response.status === expectedCode,
            `期望 ${expectedCode}，实际 ${response.status}`
          );
        },
        toBeOk: () => {
          const isOk = response.status >= 200 && response.status < 300;
          self.recordAssertion(
            '响应应该成功 (2xx)',
            isOk,
            `状态码 ${response.status} 不是成功状态`
          );
        },
        toBeError: () => {
          const isError = response.status >= 400;
          self.recordAssertion(
            '响应应该是错误 (4xx 或 5xx)',
            isError,
            `状态码 ${response.status} 不是错误状态`
          );
        },
        toBeClientError: () => {
          const isClientError = response.status >= 400 && response.status < 500;
          self.recordAssertion(
            '响应应该是客户端错误 (4xx)',
            isClientError,
            `状态码 ${response.status} 不是客户端错误`
          );
        },
        toBeServerError: () => {
          const isServerError = response.status >= 500;
          self.recordAssertion(
            '响应应该是服务器错误 (5xx)',
            isServerError,
            `状态码 ${response.status} 不是服务器错误`
          );
        }
      },

      // 响应头断言
      header: {
        toExist: (headerName) => {
          const exists = response.headers && headerName.toLowerCase() in response.headers;
          self.recordAssertion(
            `响应头 '${headerName}' 应该存在`,
            exists,
            `响应头 '${headerName}' 不存在`
          );
        },
        toBe: (headerName, expectedValue) => {
          const actualValue = response.headers?.[headerName.toLowerCase()];
          self.recordAssertion(
            `响应头 '${headerName}' 应该是 '${expectedValue}'`,
            actualValue === expectedValue,
            `期望 '${expectedValue}'，实际 '${actualValue}'`
          );
        },
        toContain: (headerName, substring) => {
          const actualValue = response.headers?.[headerName.toLowerCase()] || '';
          const contains = actualValue.includes(substring);
          self.recordAssertion(
            `响应头 '${headerName}' 应该包含 '${substring}'`,
            contains,
            `'${actualValue}' 不包含 '${substring}'`
          );
        },
        toMatch: (headerName, pattern) => {
          const actualValue = response.headers?.[headerName.toLowerCase()] || '';
          const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
          const matches = regex.test(actualValue);
          self.recordAssertion(
            `响应头 '${headerName}' 应该匹配 ${pattern}`,
            matches,
            `'${actualValue}' 不匹配 ${pattern}`
          );
        }
      },

      // 响应体断言
      body: {
        toBe: (expected) => {
          const isEqual = JSON.stringify(response.data) === JSON.stringify(expected);
          self.recordAssertion(
            '响应体应该完全匹配',
            isEqual,
            '响应体不匹配期望值'
          );
        },
        toContain: (value) => {
          const bodyStr = JSON.stringify(response.data);
          const contains = bodyStr.includes(value);
          self.recordAssertion(
            `响应体应该包含 '${value}'`,
            contains,
            `响应体不包含 '${value}'`
          );
        },
        toHaveProperty: (path, expectedValue = undefined) => {

          /**

           * if功能函数

           * @param {Object} params - 参数对象

           * @returns {Promise<Object>} 返回结果

           */
          const hasProperty = has(response.data, path);
          if (expectedValue !== undefined) {
            const actualValue = get(response.data, path);
            const matches = actualValue === expectedValue;
            self.recordAssertion(
              `响应体属性 '${path}' 应该是 '${expectedValue}'`,
              hasProperty && matches,
              hasProperty ? `期望 '${expectedValue}'，实际 '${actualValue}'` : `属性 '${path}' 不存在`
            );
          } else {
            self.recordAssertion(
              `响应体应该有属性 '${path}'`,
              hasProperty,
              `属性 '${path}' 不存在`
            );
          }
        },
        toMatchSchema: (schema) => {
          const matches = self.validateSchema(response.data, schema);
          self.recordAssertion(
            '响应体应该匹配 Schema',
            matches.valid,
            matches.errors.join(', ')
          );
        },
        toBeArray: () => {
          const isArray = Array.isArray(response.data);
          self.recordAssertion(
            '响应体应该是数组',
            isArray,
            `响应体类型是 ${typeof response.data}`
          );
        },
        toBeObject: () => {
          const isObject = response.data !== null && typeof response.data === 'object' && !Array.isArray(response.data);
          self.recordAssertion(
            '响应体应该是对象',
            isObject,
            `响应体类型是 ${typeof response.data}`
          );
        },
        toBeEmpty: () => {
          const isEmpty = response.data === null || 
                          response.data === undefined || 
                          response.data === '' ||
                          (Array.isArray(response.data) && response.data.length === 0) ||
                          (typeof response.data === 'object' && Object.keys(response.data).length === 0);
          self.recordAssertion(
            '响应体应该为空',
            isEmpty,
            '响应体不为空'
          );
        },
        toHaveLength: (expectedLength) => {
          const actualLength = response.data?.length || Object.keys(response.data || {}).length;
          self.recordAssertion(
            `响应体长度应该是 ${expectedLength}`,
            actualLength === expectedLength,
            `期望长度 ${expectedLength}，实际长度 ${actualLength}`
          );
        }
      },

      // 响应时间断言
      time: {
        toBeLessThan: (milliseconds) => {
          const responseTime = response.responseTime || 0;
          self.recordAssertion(
            `响应时间应该小于 ${milliseconds}ms`,
            responseTime < milliseconds,
            `响应时间 ${responseTime}ms 超过限制`
          );
        },
        toBeGreaterThan: (milliseconds) => {
          const responseTime = response.responseTime || 0;
          self.recordAssertion(
            `响应时间应该大于 ${milliseconds}ms`,
            responseTime > milliseconds,
            `响应时间 ${responseTime}ms 低于限制`
          );
        },
        toBeBetween: (min, max) => {
          const responseTime = response.responseTime || 0;
          const isInRange = responseTime >= min && responseTime <= max;
          self.recordAssertion(
            `响应时间应该在 ${min}ms 到 ${max}ms 之间`,
            isInRange,
            `响应时间 ${responseTime}ms 不在范围内`
          );
        }
      },

      // JSON 特定断言
      json: {
        path: (jsonPath) => {
          return {
            toBe: (expectedValue) => {
              const actualValue = get(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 的值应该是 '${expectedValue}'`,
                actualValue === expectedValue,
                `期望 '${expectedValue}'，实际 '${actualValue}'`
              );
            },
            toContain: (value) => {
              const actualValue = get(response.data, jsonPath);
              const contains = String(actualValue).includes(value);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该包含 '${value}'`,
                contains,
                `'${actualValue}' 不包含 '${value}'`
              );
            },
            toBeType: (type) => {
              const actualValue = get(response.data, jsonPath);
              const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 的类型应该是 '${type}'`,
                actualType === type,
                `期望类型 '${type}'，实际类型 '${actualType}'`
              );
            },
            toExist: () => {
              const exists = has(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该存在`,
                exists,
                `路径 '${jsonPath}' 不存在`
              );
            },
            toBeNull: () => {
              const actualValue = get(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该是 null`,
                actualValue === null,
                `实际值是 '${actualValue}'`
              );
            },
            toBeUndefined: () => {
              const actualValue = get(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该是 undefined`,
                actualValue === undefined,
                `实际值是 '${actualValue}'`
              );
            },
            toBeTruthy: () => {
              const actualValue = get(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该是 truthy`,
                !!actualValue,
                `实际值 '${actualValue}' 是 falsy`
              );
            },
            toBeFalsy: () => {
              const actualValue = get(response.data, jsonPath);
              self.recordAssertion(
                `JSON路径 '${jsonPath}' 应该是 falsy`,
                !actualValue,
                `实际值 '${actualValue}' 是 truthy`
              );
            }
          };
        }
      }
    };
  }

  /**
   * 通用断言
   */
  createGeneralAssertions() {
    const self = this;
    
    return {
      // 相等性断言
      equal: (actual, expected, message) => {
        self.recordAssertion(
          message || `${actual} 应该等于 ${expected}`,
          actual === expected,
          `期望 ${expected}，实际 ${actual}`
        );
      },
      
      notEqual: (actual, expected, message) => {
        self.recordAssertion(
          message || `${actual} 不应该等于 ${expected}`,
          actual !== expected,
          `值相等: ${actual}`
        );
      },
      
      deepEqual: (actual, expected, message) => {
        const isDeepEqual = isEqual(actual, expected);
        self.recordAssertion(
          message || '深度相等检查',
          isDeepEqual,
          '对象不完全相等'
        );
      },
      
      // 类型断言
      isTrue: (value, message) => {
        self.recordAssertion(
          message || '值应该是 true',
          value === true,
          `实际值: ${value}`
        );
      },
      
      isFalse: (value, message) => {
        self.recordAssertion(
          message || '值应该是 false',
          value === false,
          `实际值: ${value}`
        );
      },
      
      isNull: (value, message) => {
        self.recordAssertion(
          message || '值应该是 null',
          value === null,
          `实际值: ${value}`
        );
      },
      
      isUndefined: (value, message) => {
        self.recordAssertion(
          message || '值应该是 undefined',
          value === undefined,
          `实际值: ${value}`
        );
      },
      
      isDefined: (value, message) => {
        self.recordAssertion(
          message || '值应该被定义',
          value !== undefined,
          '值是 undefined'
        );
      },
      
      // 数组断言
      contains: (array, item, message) => {
        const contains = Array.isArray(array) && array.includes(item);
        self.recordAssertion(
          message || `数组应该包含 ${item}`,
          contains,
          '数组不包含该项'
        );
      },
      
      lengthOf: (array, length, message) => {
        const actualLength = array?.length || 0;
        self.recordAssertion(
          message || `长度应该是 ${length}`,
          actualLength === length,
          `实际长度: ${actualLength}`
        );
      },
      
      // 字符串断言
      match: (string, pattern, message) => {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        const matches = regex.test(string);
        self.recordAssertion(
          message || `'${string}' 应该匹配 ${pattern}`,
          matches,
          '不匹配'
        );
      },
      
      includes: (string, substring, message) => {
        const includes = String(string).includes(substring);
        self.recordAssertion(
          message || `'${string}' 应该包含 '${substring}'`,
          includes,
          '不包含'
        );
      },
      
      // 数值断言
      above: (value, threshold, message) => {
        self.recordAssertion(
          message || `${value} 应该大于 ${threshold}`,
          value > threshold,
          `${value} 不大于 ${threshold}`
        );
      },
      
      below: (value, threshold, message) => {
        self.recordAssertion(
          message || `${value} 应该小于 ${threshold}`,
          value < threshold,
          `${value} 不小于 ${threshold}`
        );
      },
      
      between: (value, min, max, message) => {
        const isInRange = value >= min && value <= max;
        self.recordAssertion(
          message || `${value} 应该在 ${min} 和 ${max} 之间`,
          isInRange,
          `${value} 不在范围内`
        );
      },
      
      // 对象断言
      hasProperty: (object, property, message) => {
        const hasProperty = object && property in object;
        self.recordAssertion(
          message || `对象应该有属性 '${property}'`,
          hasProperty,
          `缺少属性 '${property}'`
        );
      },
      
      hasAllProperties: (object, properties, message) => {
        const missingProps = properties.filter(prop => !(prop in object));
        self.recordAssertion(
          message || '对象应该有所有指定属性',
          missingProps.length === 0,
          `缺少属性: ${missingProps.join(', ')}`
        );
      },
      
      // 异常断言
      throws: (fn, errorType, message) => {
        let thrown = false;
        let error = null;
        
        try {
          fn();
        } catch (e) {
          thrown = true;
          error = e;
        }
        
        if (errorType) {
          const correctType = error instanceof errorType;
          self.recordAssertion(
            message || `应该抛出 ${errorType.name} 异常`,
            thrown && correctType,
            thrown ? `抛出了 ${error.constructor.name} 而不是 ${errorType.name}` : '没有抛出异常'
          );
        } else {
          self.recordAssertion(
            message || '应该抛出异常',
            thrown,
            '没有抛出异常'
          );
        }
      },
      
      doesNotThrow: (fn, message) => {
        let thrown = false;
        let error = null;
        
        try {
          fn();
        } catch (e) {
          thrown = true;
          error = e;
        }
        
        self.recordAssertion(
          message || '不应该抛出异常',
          !thrown,
          `抛出了异常: ${error?.message}`
        );
      }
    };
  }

  /**
   * Schema 验证
   */
  validateSchema(data, schema) {
    const errors = [];
    const validate = (obj, schemaObj, path = '') => {
      for (const key in schemaObj) {
        const fullPath = path ? `${path}.${key}` : key;
        const schemaValue = schemaObj[key];
        const actualValue = obj?.[key];
        
        if (schemaValue.required && actualValue === undefined) {
          errors.push(`必需字段 '${fullPath}' 缺失`);
          continue;
        }
        
        if (actualValue !== undefined) {
          if (schemaValue.type) {

            /**

             * if功能函数

             * @param {Object} params - 参数对象

             * @returns {Promise<Object>} 返回结果

             */
            const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;
            if (actualType !== schemaValue.type) {
              errors.push(`'${fullPath}' 类型错误: 期望 ${schemaValue.type}, 实际 ${actualType}`);
            }
          }
          
          if (schemaValue.enum && !schemaValue.enum.includes(actualValue)) {
            errors.push(`'${fullPath}' 值不在枚举范围内: ${schemaValue.enum.join(', ')}`);
          }
          
          if (schemaValue.pattern && !new RegExp(schemaValue.pattern).test(actualValue)) {
            errors.push(`'${fullPath}' 不匹配模式: ${schemaValue.pattern}`);
          }
          
          if (schemaValue.minLength && actualValue.length < schemaValue.minLength) {
            errors.push(`'${fullPath}' 长度小于最小值 ${schemaValue.minLength}`);
          }
          
          if (schemaValue.maxLength && actualValue.length > schemaValue.maxLength) {
            errors.push(`'${fullPath}' 长度大于最大值 ${schemaValue.maxLength}`);
          }
          
          if (schemaValue.minimum && actualValue < schemaValue.minimum) {
            errors.push(`'${fullPath}' 值小于最小值 ${schemaValue.minimum}`);
          }
          
          if (schemaValue.maximum && actualValue > schemaValue.maximum) {
            errors.push(`'${fullPath}' 值大于最大值 ${schemaValue.maximum}`);
          }
          
          if (schemaValue.properties && typeof actualValue === 'object') {
            validate(actualValue, schemaValue.properties, fullPath);
          }
        }
      }
    };
    
    validate(data, schema);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 记录断言结果
   */
  recordAssertion(description, passed, failureMessage = '') {
    const assertion = {
      description,
      passed,
      failureMessage: passed ? '' : failureMessage,
      timestamp: new Date().toISOString()
    };
    
    this.assertions.push(assertion);
    
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
      if (failureMessage) {
      }
    }
    
    return assertion;
  }

  /**
   * 获取断言结果摘要
   */
  getSummary() {
    return {
      total: this.assertions.length,
      passed: this.passed,
      failed: this.failed,
      passRate: this.assertions.length > 0 ? (this.passed / this.assertions.length * 100).toFixed(2) : 0,
      assertions: this.assertions
    };
  }

  /**
   * 清空断言记录
   */
  clear() {
    this.assertions = [];
    this.passed = 0;
    this.failed = 0;
  }
}

module.exports = AssertionLibrary;
