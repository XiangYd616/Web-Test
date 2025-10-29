/**
 * 验证中间件单元测试
 */

const { validationResult } = require('express-validator');
const {
  validateTimeRange,
  validateDomain,
  validateUrl,
  validateTestId,
  validateUserId,
  validatePagination,
  validateEmail
} = require('../../middleware/validators');

// Mock express-validator
jest.mock('express-validator', () => {
  const actual = jest.requireActual('express-validator');
  return {
    ...actual,
    validationResult: jest.fn()
  };
});

describe('Validators Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mock
    validationResult.mockClear();
  });

  describe('validateTimeRange', () => {
    it('应该通过有效的timeRange (1-365)', async () => {
      req.query.timeRange = '30';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateTimeRange[validateTimeRange.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('应该拒绝超出范围的timeRange', () => {
      req.query.timeRange = '400';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'timeRange must be between 1 and 365 days',
          param: 'timeRange'
        }]
      });

      const handler = validateTimeRange[validateTimeRange.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('应该允许可选的timeRange', () => {
      // 不提供timeRange参数
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateTimeRange[validateTimeRange.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateDomain', () => {
    it('应该通过有效的域名', () => {
      req.body.domain = 'example.com';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateDomain[validateDomain.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝无效的域名格式', () => {
      req.body.domain = 'invalid domain!';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Invalid domain format',
          param: 'domain'
        }]
      });

      const handler = validateDomain[validateDomain.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('应该拒绝空域名', () => {
      req.body.domain = '';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Domain is required',
          param: 'domain'
        }]
      });

      const handler = validateDomain[validateDomain.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateUrl', () => {
    it('应该通过有效的HTTP URL', () => {
      req.body.url = 'http://example.com';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateUrl[validateUrl.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该通过有效的HTTPS URL', () => {
      req.body.url = 'https://example.com/path';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateUrl[validateUrl.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝无效的URL', () => {
      req.body.url = 'not-a-url';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Invalid URL format',
          param: 'url'
        }]
      });

      const handler = validateUrl[validateUrl.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应该拒绝过长的URL', () => {
      req.body.url = 'https://' + 'a'.repeat(3000);
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'URL must not exceed 2048 characters',
          param: 'url'
        }]
      });

      const handler = validateUrl[validateUrl.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateTestId', () => {
    it('应该通过有效的测试ID', () => {
      req.params.testId = '123';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateTestId[validateTestId.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝负数ID', () => {
      req.params.testId = '-1';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Test ID must be a positive integer',
          param: 'testId'
        }]
      });

      const handler = validateTestId[validateTestId.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应该拒绝非数字ID', () => {
      req.params.testId = 'abc';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Test ID must be a positive integer',
          param: 'testId'
        }]
      });

      const handler = validateTestId[validateTestId.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateUserId', () => {
    it('应该通过有效的用户ID', () => {
      req.params.userId = '456';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateUserId[validateUserId.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝无效的用户ID', () => {
      req.params.userId = '0';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'User ID must be a positive integer',
          param: 'userId'
        }]
      });

      const handler = validateUserId[validateUserId.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validatePagination', () => {
    it('应该通过有效的分页参数', () => {
      req.query.page = '1';
      req.query.limit = '20';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validatePagination[validatePagination.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝超出限制的limit', () => {
      req.query.limit = '200';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Limit must be between 1 and 100',
          param: 'limit'
        }]
      });

      const handler = validatePagination[validatePagination.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应该允许不提供分页参数', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validatePagination[validatePagination.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateEmail', () => {
    it('应该通过有效的邮箱', () => {
      req.body.email = 'test@example.com';
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const handler = validateEmail[validateEmail.length - 1];
      handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该拒绝无效的邮箱格式', () => {
      req.body.email = 'invalid-email';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Invalid email format',
          param: 'email'
        }]
      });

      const handler = validateEmail[validateEmail.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应该拒绝空邮箱', () => {
      req.body.email = '';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'Email is required',
          param: 'email'
        }]
      });

      const handler = validateEmail[validateEmail.length - 1];
      handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('错误响应格式', () => {
    it('应该返回标准的错误响应格式', () => {
      req.body.url = '';
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{
          msg: 'URL is required',
          param: 'url',
          location: 'body'
        }]
      });

      const handler = validateUrl[validateUrl.length - 1];
      handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            msg: 'URL is required',
            param: 'url'
          })
        ])
      });
    });
  });
});

