/**
 * K6引擎管理路由
 * 路径: /engines/k6/*
 */

const express = require('express');
const { authMiddleware, adminAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

/**
 * K6 引擎状态检查
 * GET /engines/k6/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'k6',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Load testing tool'
    };

    try {
      // 尝试检查k6是否安装
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('k6 version');
      if (stdout) {
        engineStatus.available = true;
        engineStatus.version = stdout.trim().split(' ')[1] || 'unknown';
        engineStatus.status = 'ready';
      }
    } catch (error) {
      engineStatus.status = 'not_installed';
      engineStatus.error = 'K6 not found in PATH';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('K6 status check failed:', error);
    res.serverError('K6状态检查失败');
  }
}));

/**
 * K6 引擎安装指引
 * POST /engines/k6/install
 */
router.post('/install', authMiddleware, adminAuth, asyncHandler(async (req, res) => {
  try {
    res.success({
      installationUrl: 'https://k6.io/docs/getting-started/installation/',
      instructions: {
        windows: 'winget install k6 --source winget',
        mac: 'brew install k6',
        linux: 'sudo apt-get install k6'
      }
    }, 'K6安装请求已提交，请手动安装K6');
  } catch (error) {
    console.error('K6 installation failed:', error);
    res.serverError('K6安装失败');
  }
}));

/**
 * K6 引擎配置获取
 * GET /engines/k6/config
 */
router.get('/config', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const config = {
      defaultVUs: 10,
      defaultDuration: '30s',
      defaultRampUpTime: '10s',
      maxVUs: 100,
      maxDuration: 300,
      supportedTestTypes: ['load', 'stress', 'spike', 'soak']
    };

    res.success(config);
  } catch (error) {
    console.error('K6 config retrieval failed:', error);
    res.serverError('K6配置获取失败');
  }
}));

module.exports = router;

