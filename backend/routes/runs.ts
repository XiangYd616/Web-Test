import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
const runController = require('../controllers/runController');

const router = express.Router();

// REST 化（建议新调用方式）
router.get('/workspaces/:workspaceId', authMiddleware, asyncHandler(runController.listRuns));
router.post(
  '/collections/:collectionId',
  authMiddleware,
  asyncHandler((req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.body = { ...(req.body || {}), collectionId: req.params.collectionId };
    return runController.createRun(req, res, next);
  })
);

router.get('/:runId', authMiddleware, asyncHandler(runController.getRun));
router.get('/:runId/results', authMiddleware, asyncHandler(runController.getRunResults));
router.get('/:runId/export', authMiddleware, asyncHandler(runController.exportRun));
router.get('/:runId/report', authMiddleware, asyncHandler(runController.getRunReport));
router.post('/:runId/cancel', authMiddleware, asyncHandler(runController.cancelRun));
router.post('/:runId/rerun', authMiddleware, asyncHandler(runController.rerun));

export default router;
