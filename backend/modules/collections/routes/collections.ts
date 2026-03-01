import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import * as collectionController from '../controllers/collectionController';

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(collectionController.listCollections));
router.post('/', authMiddleware, asyncHandler(collectionController.createCollection));
router.post('/import', authMiddleware, asyncHandler(collectionController.importPostmanCollection));
router.get('/:collectionId', authMiddleware, asyncHandler(collectionController.getCollection));
router.put('/:collectionId', authMiddleware, asyncHandler(collectionController.updateCollection));
router.delete(
  '/:collectionId',
  authMiddleware,
  asyncHandler(collectionController.deleteCollection)
);
router.post('/:collectionId/folders', authMiddleware, asyncHandler(collectionController.addFolder));
router.delete(
  '/:collectionId/folders/:folderId',
  authMiddleware,
  asyncHandler(collectionController.deleteFolderFromCollection)
);
router.post(
  '/:collectionId/requests',
  authMiddleware,
  asyncHandler(collectionController.addRequest)
);
router.put(
  '/:collectionId/requests/:requestId',
  authMiddleware,
  asyncHandler(collectionController.updateRequest)
);
router.delete(
  '/:collectionId/requests/:requestId',
  authMiddleware,
  asyncHandler(collectionController.deleteRequest)
);
router.post(
  '/:collectionId/default-environment',
  authMiddleware,
  asyncHandler(collectionController.setDefaultEnvironment)
);
router.get(
  '/:collectionId/export',
  authMiddleware,
  asyncHandler(collectionController.exportCollection)
);

export default router;
