import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
const workspaceController = require('../controllers/workspaceController');

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(workspaceController.listWorkspaces));
router.post('/', authMiddleware, asyncHandler(workspaceController.createWorkspace));
router.get('/:workspaceId', authMiddleware, asyncHandler(workspaceController.getWorkspace));
router.put('/:workspaceId', authMiddleware, asyncHandler(workspaceController.updateWorkspace));
router.delete('/:workspaceId', authMiddleware, asyncHandler(workspaceController.deleteWorkspace));

router.get('/:workspaceId/members', authMiddleware, asyncHandler(workspaceController.listMembers));
router.post(
  '/:workspaceId/invitations',
  authMiddleware,
  asyncHandler(workspaceController.inviteMember)
);
router.post(
  '/invitations/accept',
  authMiddleware,
  asyncHandler(workspaceController.acceptInvitation)
);
router.put(
  '/:workspaceId/members/:memberId',
  authMiddleware,
  asyncHandler(workspaceController.updateMemberRole)
);
router.delete(
  '/:workspaceId/members/:memberId',
  authMiddleware,
  asyncHandler(workspaceController.removeMember)
);

export default router;
