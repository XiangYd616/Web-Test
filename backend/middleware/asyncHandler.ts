/**
 * 异步处理中间件
 * 用于包装异步路由处理器，自动捕获错误
 */

import type { NextFunction, Request, Response } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * 异步处理器包装函数
 * @param fn - 异步函数
 * @returns Express中间件函数
 */
const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 确保fn是一个函数
    if (typeof fn !== 'function') {
      return next(new Error('asyncHandler expects a function'));
    }

    // 执行异步函数并捕获错误
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

module.exports = asyncHandler;
