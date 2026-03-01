import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import uatFeedbackController from './controllers/uatFeedbackController';

const router = express.Router();

router.use(authMiddleware);

/**
 * 提交 UAT 用户反馈
 * POST /api/uat/feedbacks
 */
router.post('/feedbacks', asyncHandler(uatFeedbackController.createFeedback));

/**
 * 获取单条 UAT 反馈
 * GET /api/uat/feedbacks/:sessionId
 */
router.get('/feedbacks/:sessionId', asyncHandler(uatFeedbackController.getFeedback));

/**
 * 获取 UAT 反馈列表
 * GET /api/uat/feedbacks
 */
router.get('/feedbacks', asyncHandler(uatFeedbackController.listFeedback));

/**
 * 删除 UAT 反馈
 * DELETE /api/uat/feedbacks/:id
 */
router.delete('/feedbacks/:id', asyncHandler(uatFeedbackController.deleteFeedback));

export default router;
