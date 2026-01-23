/**
 * errorHandler 单元测试
 */

const { ApiError, ErrorLogger, enhancedErrorHandler } = require('../errorHandler');

jest.mock('../errorHandler', () => {
  const actual = jest.requireActual('../errorHandler');
  return {
    ...actual,
    ErrorLogger: {
      log: jest.fn(),
    },
  };
});

describe('errorHandler', () => {
  test('ApiError.badRequest 生成 400 错误', () => {
    const error = ApiError.badRequest('参数错误');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('参数错误');
  });

  test('enhancedErrorHandler 记录并返回错误响应', () => {
    const error = ApiError.internal('服务器错误');
    const req = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 'user-1' },
    };
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    enhancedErrorHandler(error, req, res, next);

    expect(ErrorLogger.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: error.code,
        }),
      })
    );
  });
});
