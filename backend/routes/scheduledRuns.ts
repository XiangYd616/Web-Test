/**
 * 定时运行路由
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
const scheduledRunController = require('../controllers/scheduledRunController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(scheduledRunController.listScheduledRuns));
router.get('/tasks', authMiddleware, asyncHandler(scheduledRunController.listSchedulingTasks));
router.get(
  '/executions/history',
  authMiddleware,
  asyncHandler(scheduledRunController.getExecutionHistory)
);
router.get(
  '/statistics/summary',
  authMiddleware,
  asyncHandler(scheduledRunController.getSchedulingStatistics)
);
router.post(
  '/validate-cron',
  authMiddleware,
  asyncHandler(scheduledRunController.validateCronExpression)
);
router.get('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.getScheduledRun));
router.post('/', authMiddleware, asyncHandler(scheduledRunController.createScheduledRun));
router.put('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.updateScheduledRun));
router.delete(
  '/:scheduleId',
  authMiddleware,
  asyncHandler(scheduledRunController.deleteScheduledRun)
);
router.post(
  '/:scheduleId/start',
  authMiddleware,
  asyncHandler(scheduledRunController.startScheduledRun)
);
router.post(
  '/:scheduleId/pause',
  authMiddleware,
  asyncHandler(scheduledRunController.pauseScheduledRun)
);
router.post(
  '/:scheduleId/execute',
  authMiddleware,
  asyncHandler(scheduledRunController.executeScheduledRun)
);
router.post(
  '/executions/:executionId/cancel',
  authMiddleware,
  asyncHandler(scheduledRunController.cancelExecution)
);

export default router;
