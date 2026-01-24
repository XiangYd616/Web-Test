/**
 * 环境管理路由 - 统一使用 EnvironmentManager
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
const environmentController = require('../controllers/environmentController');

const router = express.Router();

// 全局变量
router.get(
  '/global/variables',
  authMiddleware,
  asyncHandler(environmentController.getGlobalVariables)
);

// 环境列表与创建
router.get('/', authMiddleware, asyncHandler(environmentController.listEnvironments));
router.post('/', authMiddleware, asyncHandler(environmentController.createEnvironment));

// 环境详情与删除
router.get('/:environmentId', authMiddleware, asyncHandler(environmentController.getEnvironment));
router.delete(
  '/:environmentId',
  authMiddleware,
  asyncHandler(environmentController.deleteEnvironment)
);

// 导入/导出
router.post('/import', authMiddleware, asyncHandler(environmentController.importEnvironment));
router.get(
  '/:environmentId/export',
  authMiddleware,
  asyncHandler(environmentController.exportEnvironment)
);

// 激活环境
router.post(
  '/:environmentId/activate',
  authMiddleware,
  asyncHandler(environmentController.setActiveEnvironment)
);

// 设置环境变量
router.post(
  '/:environmentId/variables',
  authMiddleware,
  asyncHandler(environmentController.setVariable)
);

export default router;
