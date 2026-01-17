/**
 * 用户路由 (重构版)
 * 职责: 定义用户相关的路由
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminAuth } = require('../middleware/auth');

// 用户个人信息
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// 修改密码
router.post('/change-password', authMiddleware, userController.changePassword);

// 用户统计
router.get('/stats', authMiddleware, userController.getStats);

// 管理员功能
router.get('/', adminAuth, userController.getUsers);
router.delete('/:userId', adminAuth, userController.deleteUser);
router.put('/:userId/role', adminAuth, userController.updateRole);

module.exports = router;
