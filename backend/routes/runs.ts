import express from 'express';
import runController from '../controllers/runController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(runController.listRuns));
router.post('/', authMiddleware, asyncHandler(runController.createRun));
router.get('/:runId', authMiddleware, asyncHandler(runController.getRun));
router.get('/:runId/results', authMiddleware, asyncHandler(runController.getRunResults));
router.get('/:runId/export', authMiddleware, asyncHandler(runController.exportRun));
router.get('/:runId/report', authMiddleware, asyncHandler(runController.getRunReport));
router.post('/:runId/cancel', authMiddleware, asyncHandler(runController.cancelRun));
router.post('/:runId/rerun', authMiddleware, asyncHandler(runController.rerun));

export default router;
