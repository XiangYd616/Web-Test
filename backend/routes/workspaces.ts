import express from 'express';
import workspaceController from '../controllers/workspaceController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

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
  '/:workspaceId/members/:userId',
  authMiddleware,
  asyncHandler(workspaceController.updateMemberRole)
);

export default router;
