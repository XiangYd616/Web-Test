/**
 * 测试计划路由
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import * as testPlanController from '../controllers/testPlanController';

const router = express.Router();

// 计划 CRUD
router.get('/', authMiddleware, asyncHandler(testPlanController.listPlans));
router.post('/', authMiddleware, asyncHandler(testPlanController.createPlan));
router.get('/:planId', authMiddleware, asyncHandler(testPlanController.getPlan));
router.put('/:planId', authMiddleware, asyncHandler(testPlanController.updatePlan));
router.delete('/:planId', authMiddleware, asyncHandler(testPlanController.deletePlan));

// 执行
router.post('/:planId/execute', authMiddleware, asyncHandler(testPlanController.executePlan));

// 执行记录
router.get('/executions/list', authMiddleware, asyncHandler(testPlanController.listExecutions));
router.get(
  '/executions/:executionId',
  authMiddleware,
  asyncHandler(testPlanController.getExecution)
);
router.post(
  '/executions/:executionId/cancel',
  authMiddleware,
  asyncHandler(testPlanController.cancelExecution)
);
router.get(
  '/executions/:executionId/report',
  authMiddleware,
  asyncHandler(testPlanController.getReport)
);

export default router;
