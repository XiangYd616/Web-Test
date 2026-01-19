/**
 * 定时运行路由
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
const scheduledRunController = require('../controllers/scheduledRunController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(scheduledRunController.listScheduledRuns));
router.get('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.getScheduledRun));
router.post('/', authMiddleware, asyncHandler(scheduledRunController.createScheduledRun));
router.put('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.updateScheduledRun));
router.delete(
  '/:scheduleId',
  authMiddleware,
  asyncHandler(scheduledRunController.deleteScheduledRun)
);

export default router;
