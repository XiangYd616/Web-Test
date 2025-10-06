/**
 * API示例路由
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');

// 示例端点
router.get('/hello', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Hello from API Example!',
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
