const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const runController = require('../controllers/runController');

router.get('/', authMiddleware, asyncHandler(runController.listRuns));
router.post('/', authMiddleware, asyncHandler(runController.createRun));
router.get('/:runId', authMiddleware, asyncHandler(runController.getRun));
router.get('/:runId/results', authMiddleware, asyncHandler(runController.getRunResults));
router.post('/:runId/cancel', authMiddleware, asyncHandler(runController.cancelRun));
router.post('/:runId/rerun', authMiddleware, asyncHandler(runController.rerun));

module.exports = router;
