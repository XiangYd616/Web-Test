/**
 * 引擎管理路由总入口
 * 路径: /engines/*
 */

const express = require('express');
const router = express.Router();

// 导入子路由
const k6Routes = require('./k6');
const lighthouseRoutes = require('./lighthouse');

// 注册子路由
router.use('/k6', k6Routes);
router.use('/lighthouse', lighthouseRoutes);

/**
 * 获取所有引擎状态
 * GET /engines/status
 */
router.get('/status', async (req, res) => {
  try {
    const engines = {
      k6: { name: 'K6', status: 'checking' },
      lighthouse: { name: 'Lighthouse', status: 'checking' }
    };

    // 检查K6
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('k6 version');
      engines.k6 = {
        name: 'K6',
        status: 'available',
        version: stdout.trim().split(' ')[1] || 'unknown'
      };
    } catch (error) {
      engines.k6 = { name: 'K6', status: 'not_installed' };
    }

    // 检查Lighthouse
    try {
      const lighthouse = require('lighthouse');
      engines.lighthouse = {
        name: 'Lighthouse',
        status: 'available',
        version: require('lighthouse/package.json').version
      };
    } catch (error) {
      engines.lighthouse = { name: 'Lighthouse', status: 'not_installed' };
    }

    res.json({
      success: true,
      data: engines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '引擎状态检查失败'
    });
  }
});

module.exports = router;

