/**
 * 用户路由 (重构版)
 * 职责: 定义用户相关的路由
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth';

const userController = require('../controllers/userController');

const router = express.Router();

// 用户个人信息
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// 修改密码
router.post('/change-password', authMiddleware, userController.changePassword);

// 用户统计
router.get('/stats', authMiddleware, userController.getStats);

export default router;
