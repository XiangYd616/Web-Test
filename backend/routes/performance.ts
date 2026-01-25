/**
 * 性能相关接口（占位）
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    return res.success({ message: 'Performance routes not implemented' }, undefined, 200);
  })
);

export default router;
