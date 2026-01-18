const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const scheduledRunController = require('../controllers/scheduledRunController');

router.get('/', authMiddleware, asyncHandler(scheduledRunController.listScheduledRuns));
router.post('/', authMiddleware, asyncHandler(scheduledRunController.createScheduledRun));
router.put('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.updateScheduledRun));
router.delete('/:scheduleId', authMiddleware, asyncHandler(scheduledRunController.deleteScheduledRun));
router.post('/:scheduleId/run', authMiddleware, asyncHandler(scheduledRunController.runScheduledNow));

module.exports = router;
