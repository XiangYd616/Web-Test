const express = require('express');
const router = express.Router();
const CoreTestEngine = require('../engines/core/CoreTestEngine');

const engine = new CoreTestEngine();

// 检查引擎可用性
router.get('/status', async (req, res) => {
  try {
    const status = await engine.checkAvailability();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 运行core测试
router.post('/run', async (req, res) => {
  try {
    const result = await engine.runCoreTest(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取测试状态
router.get('/test/:testId', (req, res) => {
  const status = engine.getTestStatus(req.params.testId);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ error: 'Test not found' });
  }
});

// 停止测试
router.delete('/test/:testId', async (req, res) => {
  const stopped = await engine.stopTest(req.params.testId);
  if (stopped) {
    res.json({ message: 'Test stopped successfully' });
  } else {
    res.status(404).json({ error: 'Test not found' });
  }
});

module.exports = router;
