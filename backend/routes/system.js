/**
 * 系统资源监控API路由
 * 
 * 提供系统资源状态查询接口
 */

const express = require('express');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 系统资源监控专用的宽松速率限制
const systemResourceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 允许更多请求，因为这是内部监控
  message: {
    success: false,
    message: '系统监控请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 在开发环境跳过限制
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * 获取系统资源信息
 */
router.get('/resources', systemResourceRateLimit, async (req, res) => {
  try {
    // console.log('📊 获取系统资源信息'); // 注释掉日志输出

    // 获取CPU信息
    const cpus = os.cpus();
    const cpuUsage = await getCPUUsage();

    // 获取内存信息
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    // 获取负载平均值
    const loadAverage = os.loadavg();

    // 获取网络连接信息（简化版）
    const networkInfo = await getNetworkInfo();

    // 获取磁盘使用信息
    const diskInfo = await getDiskInfo();

    const resources = {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        loadAverage: loadAverage
      },
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        usage: memoryUsage,
        available: Math.round(freeMemory / 1024 / 1024) // MB
      },
      network: {
        activeConnections: networkInfo.connections,
        bandwidth: {
          upload: networkInfo.upload,
          download: networkInfo.download
        }
      },
      disk: {
        usage: diskInfo.usage,
        available: diskInfo.available
      },
      timestamp: Date.now()
    };

    // console.log('✅ 系统资源信息获取成功:', {
    //   cpuUsage: `${cpuUsage.toFixed(1)}%`,
    //   memoryUsage: `${memoryUsage.toFixed(1)}%`,
    //   diskUsage: `${diskInfo.usage.toFixed(1)}%`
    // }); // 注释掉成功日志

    res.success(resources);

  } catch (error) {
    console.error('❌ 获取系统资源信息失败:', error);
    res.serverError('获取系统资源信息失败');
  }
});

/**
 * 获取CPU使用率
 */
async function getCPUUsage() {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage();

    setTimeout(() => {
      const endMeasure = cpuAverage();
      const idleDifference = endMeasure.idle - startMeasure.idle;
      const totalDifference = endMeasure.total - startMeasure.total;
      const usage = 100 - ~~(100 * idleDifference / totalDifference);
      resolve(usage);
    }, 100);
  });
}

/**
 * 计算CPU平均值
 */
function cpuAverage() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;

  for (let cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }

  const total = user + nice + sys + idle + irq;

  return {
    idle: idle,
    total: total
  };
}

/**
 * 获取网络信息（简化版）
 */
async function getNetworkInfo() {
  try {
    // 在实际环境中，这里可以调用系统命令获取真实的网络统计
    // 这里提供一个模拟实现
    const networkInterfaces = os.networkInterfaces();
    let activeConnections = 0;

    // 计算活跃的网络接口数量作为连接数的近似值
    Object.keys(networkInterfaces).forEach(interfaceName => {
      const interfaces = networkInterfaces[interfaceName];
      interfaces.forEach(iface => {
        if (!iface.internal && iface.family === 'IPv4') {
          activeConnections += 10; // 模拟每个接口10个连接
        }
      });
    });

    return {
      connections: Math.min(activeConnections, 100), // 限制最大值
      upload: Math.random() * 10, // 模拟上传速度 (Mbps)
      download: Math.random() * 50 // 模拟下载速度 (Mbps)
    };
  } catch (error) {
    console.warn('获取网络信息失败，使用默认值:', error);
    return {
      connections: 50,
      upload: 5,
      download: 25
    };
  }
}

/**
 * 获取磁盘使用信息
 */
async function getDiskInfo() {
  try {
    // 在不同操作系统上获取磁盘信息的方法不同
    // 这里提供一个跨平台的简化实现

    if (process.platform === 'win32') {
      
        // Windows系统
      return await getWindowsDiskInfo();
      } else {
      // Unix-like系统
      return await getUnixDiskInfo();
    }
  } catch (error) {
    console.warn('获取磁盘信息失败，使用默认值:', error);
    return {
      usage: 45 + Math.random() * 20, // 45-65%
      available: 100 + Math.random() * 400 // 100-500GB
    };
  }
}

/**
 * 获取Windows磁盘信息
 */
async function getWindowsDiskInfo() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // 使用wmic命令获取磁盘信息
    const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
    const lines = stdout.trim().split('/n').slice(1); // 跳过标题行

    let totalSize = 0;
    let totalFree = 0;

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const freeSpace = parseInt(parts[1]) || 0;
        const size = parseInt(parts[2]) || 0;
        totalSize += size;
        totalFree += freeSpace;
      }
    });

    const usage = totalSize > 0 ? ((totalSize - totalFree) / totalSize) * 100 : 50;
    const availableGB = totalFree / (1024 * 1024 * 1024);

    return {
      usage: usage,
      available: availableGB
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 获取Unix磁盘信息
 */
async function getUnixDiskInfo() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // 使用df命令获取磁盘信息
    const { stdout } = await execAsync('df -h /');
    const lines = stdout.trim().split('/n');

    if (lines.length >= 2) {
      
        const parts = lines[1].split(/\s+/);
      if (parts.length >= 5) {
        const usagePercent = parseInt(parts[4].replace('%', '')) || 50;
        const available = parseFloat(parts[3].replace(/[^/d.]/g, '')) || 100;

        return {
          usage: usagePercent,
          available: available
      };
      }
    }

    throw new Error('无法解析df命令输出');
  } catch (error) {
    throw error;
  }
}

/**
 * 获取系统健康状态
 */
router.get('/health', systemResourceRateLimit, async (req, res) => {
  try {
    const resources = await getSystemResources();

    // 评估系统健康状态
    let status = 'healthy';
    const issues = [];

    if (resources.cpu.usage > 85) {
      status = 'critical';
      issues.push('CPU使用率过高');
    } else if (resources.cpu.usage > 70) {
      status = 'warning';
      issues.push('CPU使用率较高');
    }

    if (resources.memory.usage > 90) {
      status = 'critical';
      issues.push('内存使用率过高');
    } else if (resources.memory.usage > 75) {
      if (status !== 'critical') status = 'warning';
      issues.push('内存使用率较高');
    }

    if (resources.disk.usage > 95) {
      status = 'critical';
      issues.push('磁盘空间不足');
    } else if (resources.disk.usage > 85) {
      if (status !== 'critical') status = 'warning';
      issues.push('磁盘空间较少');
    }

    res.json({
      success: true,
      health: {
        status: status,
        issues: issues,
        resources: resources,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ 获取系统健康状态失败:', error);
    res.serverError('获取系统健康状态失败');
  }
});

/**
 * 内部函数：获取系统资源（复用上面的逻辑）
 */
async function getSystemResources() {
  const cpus = os.cpus();
  const cpuUsage = await getCPUUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  const loadAverage = os.loadavg();
  const networkInfo = await getNetworkInfo();
  const diskInfo = await getDiskInfo();

  return {
    cpu: {
      usage: cpuUsage,
      cores: cpus.length,
      loadAverage: loadAverage
    },
    memory: {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      usage: memoryUsage,
      available: Math.round(freeMemory / 1024 / 1024)
    },
    network: {
      activeConnections: networkInfo.connections,
      bandwidth: {
        upload: networkInfo.upload,
        download: networkInfo.download
      }
    },
    disk: {
      usage: diskInfo.usage,
      available: diskInfo.available
    },
    timestamp: Date.now()
  };
}

module.exports = router;
