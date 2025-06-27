import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// 获取所有测试引擎状态 - 可选认证
router.get('/status', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    // 检查各个测试引擎的状态
    const engineStatus = {
      k6: await checkK6Status(),
      lighthouse: await checkLighthouseStatus(),
      playwright: await checkPlaywrightStatus(),
      puppeteer: await checkPuppeteerStatus()
    };

    res.json({
      success: true,
      data: {
        engines: engineStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('获取测试引擎状态失败', error);
    res.status(500).json({
      success: false,
      error: '获取测试引擎状态失败'
    });
  }
}));

// 检查K6引擎状态
async function checkK6Status(): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('k6 version');
    const version = stdout.trim().split(' ')[1] || 'unknown';
    
    return {
      available: true,
      version
    };
  } catch (error) {
    return {
      available: false,
      error: 'K6 not installed or not accessible'
    };
  }
}

// 检查Lighthouse引擎状态
async function checkLighthouseStatus(): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const lighthouse = require('lighthouse');
    const packageJson = require('lighthouse/package.json');
    
    return {
      available: true,
      version: packageJson.version
    };
  } catch (error) {
    return {
      available: false,
      error: 'Lighthouse not installed or not accessible'
    };
  }
}

// 检查Playwright引擎状态
async function checkPlaywrightStatus(): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const { chromium } = require('playwright');
    const packageJson = require('playwright/package.json');
    
    // 尝试启动浏览器来验证
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    
    return {
      available: true,
      version: packageJson.version
    };
  } catch (error) {
    return {
      available: false,
      error: 'Playwright not installed or browsers not available'
    };
  }
}

// 检查Puppeteer引擎状态
async function checkPuppeteerStatus(): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const puppeteer = require('puppeteer');
    const packageJson = require('puppeteer/package.json');
    
    return {
      available: true,
      version: packageJson.version
    };
  } catch (error) {
    return {
      available: false,
      error: 'Puppeteer not installed or not accessible'
    };
  }
}

// 获取特定引擎的详细信息
router.get('/:engine/info', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { engine } = req.params;
    
    let engineInfo;
    switch (engine.toLowerCase()) {
      case 'k6':
        engineInfo = await getK6Info();
        break;
      case 'lighthouse':
        engineInfo = await getLighthouseInfo();
        break;
      case 'playwright':
        engineInfo = await getPlaywrightInfo();
        break;
      case 'puppeteer':
        engineInfo = await getPuppeteerInfo();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的测试引擎'
        });
    }

    res.json({
      success: true,
      data: engineInfo
    });
  } catch (error) {
    logger.error(`获取${req.params.engine}引擎信息失败`, error);
    res.status(500).json({
      success: false,
      error: '获取引擎信息失败'
    });
  }
}));

// 获取K6详细信息
async function getK6Info() {
  const status = await checkK6Status();
  return {
    name: 'K6',
    description: '现代负载测试工具',
    capabilities: ['性能测试', '负载测试', '压力测试', 'API测试'],
    status
  };
}

// 获取Lighthouse详细信息
async function getLighthouseInfo() {
  const status = await checkLighthouseStatus();
  return {
    name: 'Lighthouse',
    description: 'Google开发的网页质量审计工具',
    capabilities: ['性能分析', 'SEO检查', '可访问性测试', '最佳实践检查'],
    status
  };
}

// 获取Playwright详细信息
async function getPlaywrightInfo() {
  const status = await checkPlaywrightStatus();
  return {
    name: 'Playwright',
    description: 'Microsoft开发的浏览器自动化工具',
    capabilities: ['跨浏览器测试', 'UI测试', '兼容性测试', '截图测试'],
    status
  };
}

// 获取Puppeteer详细信息
async function getPuppeteerInfo() {
  const status = await checkPuppeteerStatus();
  return {
    name: 'Puppeteer',
    description: 'Google开发的Chrome浏览器控制工具',
    capabilities: ['Chrome自动化', 'PDF生成', '截图', '性能监控'],
    status
  };
}

// 测试引擎健康检查
router.get('/health', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.allSettled([
      checkK6Status(),
      checkLighthouseStatus(),
      checkPlaywrightStatus(),
      checkPuppeteerStatus()
    ]);

    const results = {
      k6: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { available: false, error: 'Health check failed' },
      lighthouse: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { available: false, error: 'Health check failed' },
      playwright: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { available: false, error: 'Health check failed' },
      puppeteer: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { available: false, error: 'Health check failed' }
    };

    const availableEngines = Object.values(results).filter(engine => engine.available).length;
    const totalEngines = Object.keys(results).length;

    res.json({
      success: true,
      data: {
        engines: results,
        summary: {
          available: availableEngines,
          total: totalEngines,
          healthScore: (availableEngines / totalEngines) * 100
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('测试引擎健康检查失败', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败'
    });
  }
}));

export default router;
