const express = require('express');
const router = express.Router();

// 最简单的测试路由
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test route is working!',
    timestamp: new Date().toISOString()
  });
});

router.post('/echo', (req, res) => {
  res.json({
    success: true,
    message: 'Echo route is working!',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
