import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
const collectionController = require('../controllers/collectionController');

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(collectionController.listCollections));
router.post('/', authMiddleware, asyncHandler(collectionController.createCollection));
router.post('/import', authMiddleware, asyncHandler(collectionController.importPostmanCollection));
router.get('/:collectionId', authMiddleware, asyncHandler(collectionController.getCollection));
router.delete(
  '/:collectionId',
  authMiddleware,
  asyncHandler(collectionController.deleteCollection)
);
router.post('/:collectionId/folders', authMiddleware, asyncHandler(collectionController.addFolder));
router.post(
  '/:collectionId/requests',
  authMiddleware,
  asyncHandler(collectionController.addRequest)
);
router.get(
  '/:collectionId/export',
  authMiddleware,
  asyncHandler(collectionController.exportCollection)
);

export default router;
