type AssertionResult = {
  passed: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
  type?: string;
  path?: string;
};

type ApiAssertionInput = {
  status?: number;
  statusCode?: number;
  headers?: Record<string, string | undefined>;
  body?: string;
  jsonBody?: unknown;
  responseTime?: number;
  error?: string;
};

type JsonSchemaRule = {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: string[];
  properties?: Record<string, JsonSchemaRule | { type: JsonSchemaRule['type'] }>;
};

const normalizePath = (path: string) =>
  path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

const getValueByPath = (value: unknown, path: string) => {
  if (!path) return value;
  const segments = normalizePath(path);
  let current: unknown = value;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toRegExp = (value: unknown) => {
  if (value instanceof RegExp) return value;
  if (typeof value === 'string') return new RegExp(value);
  return null;
};

class AssertionSystem {
  status(expected: number | number[] | { min?: number; max?: number }) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const actual = input.statusCode ?? input.status;
        if (actual === undefined || actual === null) {
          return {
            passed: false,
            message: '响应状态码不存在',
            actual,
            expected,
            type: 'status',
          };
        }

        if (Array.isArray(expected)) {
          const passed = expected.includes(actual);
          return {
            passed,
            message: passed ? '状态码符合预期' : `状态码不在允许范围: ${expected.join(',')}`,
            actual,
            expected,
            type: 'status',
          };
        }

        if (typeof expected === 'object') {
          const min = expected.min ?? Number.NEGATIVE_INFINITY;
          const max = expected.max ?? Number.POSITIVE_INFINITY;
          const passed = actual >= min && actual <= max;
          return {
            passed,
            message: passed ? '状态码符合范围' : `状态码不在范围 ${min}-${max}`,
            actual,
            expected,
            type: 'status',
          };
        }

        const passed = actual === expected;
        return {
          passed,
          message: passed ? '状态码符合预期' : `状态码不匹配: ${actual} ≠ ${expected}`,
          actual,
          expected,
          type: 'status',
        };
      },
    };
  }

  header(name: string, expected?: unknown) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const headers = input.headers || {};
        const actual = headers[name.toLowerCase()] ?? headers[name];
        if (expected === undefined) {
          const passed = actual !== undefined;
          return {
            passed,
            message: passed ? `响应头存在: ${name}` : `缺少响应头: ${name}`,
            actual,
            expected,
            type: 'header',
          };
        }

        const regex = toRegExp(expected);
        if (regex) {
          const passed = typeof actual === 'string' && regex.test(actual);
          return {
            passed,
            message: passed ? '响应头匹配正则' : `响应头未匹配正则: ${name}`,
            actual,
            expected,
            type: 'header',
          };
        }

        if (typeof expected === 'string') {
          const passed = String(actual ?? '').includes(expected);
          return {
            passed,
            message: passed ? '响应头包含预期内容' : `响应头不包含预期内容: ${name}`,
            actual,
            expected,
            type: 'header',
          };
        }

        const passed = actual === expected;
        return {
          passed,
          message: passed ? '响应头值符合预期' : `响应头值不匹配: ${name}`,
          actual,
          expected,
          type: 'header',
        };
      },
    };
  }

  json(path: string, expected?: unknown, operator = 'equals') {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const jsonBody = input.jsonBody ?? null;
        const actual = getValueByPath(jsonBody, path);
        const type = 'json';

        if (operator === 'exists') {
          const passed = actual !== undefined;
          return {
            passed,
            message: passed ? '字段存在' : `字段不存在: ${path}`,
            actual,
            expected,
            type,
            path,
          };
        }

        if (operator === 'contains') {
          const passed = Array.isArray(actual)
            ? actual.includes(expected)
            : String(actual ?? '').includes(String(expected ?? ''));
          return {
            passed,
            message: passed ? '字段包含预期内容' : `字段未包含预期内容: ${path}`,
            actual,
            expected,
            type,
            path,
          };
        }

        if (operator === 'regex') {
          const regex = toRegExp(expected);
          const passed = !!regex && typeof actual === 'string' && regex.test(actual);
          return {
            passed,
            message: passed ? '字段匹配正则' : `字段未匹配正则: ${path}`,
            actual,
            expected,
            type,
            path,
          };
        }

        if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
          const actualNumber = Number(actual);
          const expectedNumber = Number(expected);
          const comparisons = {
            gt: actualNumber > expectedNumber,
            gte: actualNumber >= expectedNumber,
            lt: actualNumber < expectedNumber,
            lte: actualNumber <= expectedNumber,
          };
          const passed = comparisons[operator as keyof typeof comparisons] ?? false;
          return {
            passed,
            message: passed ? '字段数值符合范围' : `字段数值未满足 ${operator}`,
            actual,
            expected,
            type,
            path,
          };
        }

        if (operator === 'oneOf') {
          const list = Array.isArray(expected) ? expected : [expected];
          const passed = list.includes(actual);
          return {
            passed,
            message: passed ? '字段命中允许值' : `字段值不在允许范围: ${path}`,
            actual,
            expected: list,
            type,
            path,
          };
        }

        const passed = actual === expected;
        return {
          passed,
          message: passed ? '字段值符合预期' : `字段值不匹配: ${path}`,
          actual,
          expected,
          type,
          path,
        };
      },
    };
  }

  jsonSchema(schema: JsonSchemaRule) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const errors: string[] = [];
        const validateNode = (node: unknown, rule: JsonSchemaRule, currentPath: string) => {
          if (rule.type) {
            const actualType = Array.isArray(node) ? 'array' : typeof node;
            if (actualType !== rule.type) {
              errors.push(`${currentPath} 类型不匹配: ${actualType} ≠ ${rule.type}`);
              return;
            }
          }

          if (rule.required && isObject(node)) {
            for (const key of rule.required) {
              if (!(key in node)) {
                errors.push(`${currentPath}.${key} 缺少必填字段`);
              }
            }
          }

          if (rule.properties && isObject(node)) {
            for (const [key, childRule] of Object.entries(rule.properties)) {
              if (node[key] === undefined) continue;
              validateNode(node[key], childRule as JsonSchemaRule, `${currentPath}.${key}`);
            }
          }
        };

        validateNode(input.jsonBody, schema, '$');
        const passed = errors.length === 0;
        return {
          passed,
          message: passed ? 'JSON结构符合schema' : `JSON结构校验失败: ${errors.join('; ')}`,
          actual: input.jsonBody,
          expected: schema,
          type: 'jsonSchema',
        };
      },
    };
  }

  bodyContains(expected: string) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const body = input.body ?? '';
        const passed = String(body).includes(expected);
        return {
          passed,
          message: passed ? '响应体包含预期内容' : '响应体未包含预期内容',
          actual: body,
          expected,
          type: 'body',
        };
      },
    };
  }

  bodyRegex(pattern: string | RegExp) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const regex = toRegExp(pattern);
        const body = input.body ?? '';
        const passed = !!regex && regex.test(String(body));
        return {
          passed,
          message: passed ? '响应体匹配正则' : '响应体未匹配正则',
          actual: body,
          expected: pattern,
          type: 'bodyRegex',
        };
      },
    };
  }

  responseTime(max: number | { min?: number; max?: number }) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const actual = input.responseTime ?? 0;
        if (typeof max === 'object') {
          const min = max.min ?? Number.NEGATIVE_INFINITY;
          const upper = max.max ?? Number.POSITIVE_INFINITY;
          const passed = actual >= min && actual <= upper;
          return {
            passed,
            message: passed ? '响应时间符合范围' : `响应时间不在范围 ${min}-${upper}ms`,
            actual,
            expected: max,
            type: 'responseTime',
          };
        }

        const passed = actual <= max;
        return {
          passed,
          message: passed ? '响应时间符合预期' : `响应时间超出限制: ${actual}ms`,
          actual,
          expected: max,
          type: 'responseTime',
        };
      },
    };
  }

  error(expected: string | RegExp) {
    return {
      validate: (input: ApiAssertionInput): AssertionResult => {
        const actual = input.error ?? '';
        const regex = toRegExp(expected);
        if (regex) {
          const passed = regex.test(actual);
          return {
            passed,
            message: passed ? '错误信息匹配正则' : '错误信息未匹配正则',
            actual,
            expected,
            type: 'error',
          };
        }
        const passed = actual.includes(String(expected));
        return {
          passed,
          message: passed ? '错误信息符合预期' : '错误信息不符合预期',
          actual,
          expected,
          type: 'error',
        };
      },
    };
  }
}

module.exports = {
  AssertionSystem,
};

export {};
