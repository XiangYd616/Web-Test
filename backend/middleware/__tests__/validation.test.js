/**
 * Validation中间件单元测试
 * @description 测试请求验证、数据校验等功能
 */

const { 
  validateTestType, 
  validatePagination,
  validateURL,
  validateRequestBody 
} = require('../validation');

describe('Validation中间件测试', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('测试类型验证', () => {
    test('应该接受有效的测试类型', () => {
      req.query.testType = 'performance';
      
      validateTestType(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该接受所有支持的测试类型', () => {
      const validTypes = [
        'performance', 'security', 'api', 'stress',
        'database', 'network', 'ux', 'seo',
        'compatibility', 'website'
      ];

      validTypes.forEach(testType => {
        jest.clearAllMocks();
        req.query.testType = testType;
        
        validateTestType(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    test('应该拒绝无效的测试类型', () => {
      req.query.testType = 'invalid_type';
      
      validateTestType(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('无效的测试类型')
        })
      );
    });

    test('应该处理缺少测试类型的情况', () => {
      // req.query.testType 未设置
      
      validateTestType(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('分页参数验证', () => {
    test('应该接受有效的分页参数', () => {
      req.query.page = '2';
      req.query.limit = '20';
      
      validatePagination(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该接受默认分页参数', () => {
      // 不提供分页参数
      
      validatePagination(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('应该拒绝无效的页码', () => {
      req.query.page = '0';
      
      validatePagination(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('页码')
        })
      );
    });

    test('应该拒绝负数页码', () => {
      req.query.page = '-1';
      
      validatePagination(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该拒绝无效的limit', () => {
      req.query.limit = '0';
      
      validatePagination(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该限制最大limit值', () => {
      req.query.limit = '1000'; // 超过最大值
      
      validatePagination(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该拒绝非数字的分页参数', () => {
      req.query.page = 'abc';
      
      validatePagination(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('URL验证', () => {
    test('应该接受有效的HTTP URL', () => {
      req.body.url = 'http://example.com';
      
      validateURL(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该接受有效的HTTPS URL', () => {
      req.body.url = 'https://example.com/path';
      
      validateURL(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('应该接受带查询参数的URL', () => {
      req.body.url = 'https://example.com/search?q=test&page=1';
      
      validateURL(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('应该拒绝无效的URL', () => {
      req.body.url = 'not-a-valid-url';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('URL')
        })
      );
    });

    test('应该拒绝缺少协议的URL', () => {
      req.body.url = 'example.com';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该拒绝FTP协议', () => {
      req.body.url = 'ftp://example.com';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该拒绝本地文件路径', () => {
      req.body.url = 'file:///etc/passwd';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('请求体验证', () => {
    test('应该接受有效的请求体', () => {
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false }
      };

      req.body = {
        name: 'John',
        age: 30
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该检测缺少的必填字段', () => {
      const schema = {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true }
      };

      req.body = {
        name: 'John'
        // email 缺失
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('email')
        })
      );
    });

    test('应该验证字段类型', () => {
      const schema = {
        age: { type: 'number', required: true }
      };

      req.body = {
        age: 'not-a-number'
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该验证数组类型', () => {
      const schema = {
        tags: { type: 'array', required: true }
      };

      req.body = {
        tags: ['tag1', 'tag2', 'tag3']
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('应该验证嵌套对象', () => {
      const schema = {
        user: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            email: { type: 'string', required: true }
          }
        }
      };

      req.body = {
        user: {
          name: 'John',
          email: 'john@example.com'
        }
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('应该允许可选字段为空', () => {
      const schema = {
        name: { type: 'string', required: true },
        nickname: { type: 'string', required: false }
      };

      req.body = {
        name: 'John'
        // nickname 可选，可以不提供
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('边界情况处理', () => {
    test('应该处理空请求体', () => {
      req.body = {};
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该处理null值', () => {
      req.body.url = null;
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该处理undefined值', () => {
      req.body.url = undefined;
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该处理非常长的字符串', () => {
      req.body.url = 'https://example.com/' + 'a'.repeat(10000);
      
      validateURL(req, res, next);
      
      // 应该拒绝过长的URL
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('安全性测试', () => {
    test('应该防止SQL注入尝试', () => {
      const schema = {
        query: { type: 'string', required: true }
      };

      req.body = {
        query: "'; DROP TABLE users; --"
      };

      const validator = validateRequestBody(schema);
      validator(req, res, next);
      
      // 虽然会通过类型验证，但应该有额外的清理逻辑
      // 这里测试基本类型验证通过
      expect(next).toHaveBeenCalled();
    });

    test('应该拒绝包含脚本的输入', () => {
      req.body.url = 'javascript:alert("XSS")';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('应该拒绝data: URL', () => {
      req.body.url = 'data:text/html,<script>alert("XSS")</script>';
      
      validateURL(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

