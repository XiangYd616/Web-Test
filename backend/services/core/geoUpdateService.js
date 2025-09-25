const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const GeoDBDownloader = require('../../utils/download-geodb.js');

// 环境变量已在主应用中加载，无需重复加载

/**
 * MaxMind GeoLite2 数据库自动更新服务
 * 内置在应用程序中，无需外部定时任务
 */
class GeoUpdateService {
  constructor() {
    this.downloader = new GeoDBDownloader();
    this.updateTask = null;
    this.isUpdating = false;
    this.lastUpdateCheck = null;
    this.lastUpdateTime = null;
    this.updateInterval = 7 * 24 * 60 * 60 * 1000; // 7天
    this.config = {
      enabled: process.env.GEO_AUTO_UPDATE !== 'false' && !!process.env.MAXMIND_LICENSE_KEY, // 有许可证密钥时才启用
      schedule: process.env.GEO_UPDATE_SCHEDULE || '0 2 * * 3', // 每周三凌晨2点
      checkOnStartup: process.env.GEO_CHECK_STARTUP !== 'false' && !!process.env.MAXMIND_LICENSE_KEY, // 有许可证密钥时才启动检查
      maxRetries: 3,
      retryDelay: 60000 // 1分钟
    };

    this.init();
  }

  /**
   * 初始化更新服务
   */
  init() {

    const licenseKey = process.env.MAXMIND_LICENSE_KEY;

    if (!licenseKey) {
      
        console.log('⚠️  未设置 MAXMIND_LICENSE_KEY，地理位置自动更新已禁用');
      return;
      }

    if (!this.config.enabled) {
      
      return;
      }

    // 启动时检查数据库
    if (this.config.checkOnStartup) {
      setTimeout(() => this.checkAndUpdate(), 5000); // 延迟5秒启动
    }

    // 设置定时任务
    this.scheduleUpdates();

    console.log('✅ GeoLite2 自动更新服务已启动');
  }

  /**
   * 设置定时更新任务
   */
  scheduleUpdates() {
    if (this.updateTask) {
      this.updateTask.stop();
    }

    try {
      this.updateTask = cron.schedule(this.config.schedule, () => {
        this.performUpdate();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'Asia/Shanghai'
      });

    } catch (error) {
      console.error('❌ 设置定时任务失败:', error.message);
    }
  }

  /**
   * 检查并更新数据库
   */
  async checkAndUpdate() {
    if (this.isUpdating) {
      
      return false;
      }

    this.lastUpdateCheck = new Date();

    try {
      // 检查是否需要更新
      const needsUpdate = await this.needsUpdate();

      if (needsUpdate) {
        
        return await this.performUpdate();
      } else {
        console.log('✅ 数据库是最新的，无需更新');
        return true;
      }
    } catch (error) {
      console.error('❌ 检查更新失败:', error.message);
      return false;
    }
  }

  /**
   * 检查是否需要更新
   */
  async needsUpdate() {
    const dataDir = path.join(__dirname, '../data');
    const cityDbPath = path.join(dataDir, 'GeoLite2-City.mmdb');

    // 如果数据库文件不存在，需要下载
    if (!fs.existsSync(cityDbPath)) {
      return true;
    }

    // 检查文件修改时间
    const stats = fs.statSync(cityDbPath);
    const fileAge = Date.now() - stats.mtime.getTime();

    if (fileAge > this.updateInterval) {
      return true;
    }

    // 检查许可证密钥是否可用
    if (!process.env.MAXMIND_LICENSE_KEY) {
      
        return false;
      }

    return false;
  }

  /**
   * 执行数据库更新
   */
  async performUpdate() {
    if (this.isUpdating) {
      
      return false;
      }

    this.isUpdating = true;
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        console.log(`🚀 开始更新 GeoLite2 数据库 (尝试 ${retries + 1}/${this.config.maxRetries})`);


        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        const success = await this.downloader.downloadAll();

        if (success) {
          
        this.lastUpdateTime = new Date();
          console.log('✅ GeoLite2 数据库更新成功');

          // 通知地理位置服务重新加载
          this.notifyGeoService();

          this.isUpdating = false;
          return true;
      } else {
          throw new Error('数据库下载失败');
        }
      } catch (error) {
        retries++;

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        console.error(`❌ 更新失败 (尝试 ${retries}/${this.config.maxRetries}):`, error.message);

        if (retries < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay);
        }
      }
    }

    this.isUpdating = false;
    console.error('❌ 所有更新尝试都失败了');
    return false;
  }

  /**
   * 通知地理位置服务重新加载数据库
   */
  notifyGeoService() {
    try {
      const geoLocationService = require('./geoLocationService');
      if (geoLocationService && typeof geoLocationService.init === 'function') {
        geoLocationService.init();
      }
    } catch (error) {
      console.warn('⚠️  通知地理位置服务失败:', error.message);
    }
  }

  /**
   * 手动触发更新
   */
  async triggerUpdate() {
    return await this.performUpdate();
  }

  /**
   * 获取更新状态
   */
  getStatus() {
    const dataDir = path.join(__dirname, '../data');
    const cityDbPath = path.join(dataDir, 'GeoLite2-City.mmdb');

    let dbInfo = null;
    if (fs.existsSync(cityDbPath)) {
      const stats = fs.statSync(cityDbPath);
      dbInfo = {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        age: Date.now() - stats.mtime.getTime()
      };
    }

    return {
      enabled: this.config.enabled,
      schedule: this.config.schedule,
      isUpdating: this.isUpdating,
      lastUpdateCheck: this.lastUpdateCheck,
      lastUpdateTime: this.lastUpdateTime,
      database: dbInfo,
      hasLicenseKey: !!process.env.MAXMIND_LICENSE_KEY,
      nextUpdate: this.updateTask ? this.getNextUpdateTime() : null
    };
  }

  /**
   * 获取下次更新时间（简化实现）
   */
  getNextUpdateTime() {
    if (!this.updateTask) return null;

    try {
      // 简化实现：基于当前时间和更新间隔估算
      const now = new Date();
      const schedule = this.config.schedule; // "0 2 * * 3" (每周三凌晨2点)

      // 解析 cron 表达式 "0 2 * * 3"
      const parts = schedule.split(' ');
      if (parts.length >= 5) {
        const minute = parseInt(parts[0]) || 0;
        const hour = parseInt(parts[1]) || 2;
        const dayOfWeek = parseInt(parts[4]); // 3 = 周三

        if (!isNaN(dayOfWeek)) {
          // 计算下一个指定星期几的时间
          const nextDate = new Date(now);
          const currentDay = nextDate.getDay();
          const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;

          if (daysUntilNext === 0 && (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute))) {
            // 今天已经过了执行时间，计算下周
            nextDate.setDate(nextDate.getDate() + 7);
          } else {
            nextDate.setDate(nextDate.getDate() + daysUntilNext);
          }

          nextDate.setHours(hour, minute, 0, 0);
          return nextDate;
        }
      }

      // 默认返回明天同一时间
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;

    } catch (error) {
      console.warn('计算下次更新时间失败:', error.message);
      return null;
    }
  }

  /**
   * 启用/禁用自动更新
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;

    if (enabled) {
      this.scheduleUpdates();
      console.log('✅ 自动更新已启用');
    } else {
      if (this.updateTask) {
        this.updateTask.stop();
        this.updateTask = null;
      }
    }
  }

  /**
   * 更新定时计划
   */
  setSchedule(schedule) {
    this.config.schedule = schedule;
    if (this.config.enabled) {
      this.scheduleUpdates();
    }
  }

  /**
   * 停止更新服务
   */
  stop() {
    if (this.updateTask) {
      this.updateTask.stop();
      this.updateTask = null;
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例实例
const geoUpdateService = new GeoUpdateService();

// 优雅关闭
process.on('SIGINT', () => {
  geoUpdateService.stop();
});

process.on('SIGTERM', () => {
  geoUpdateService.stop();
});

module.exports = geoUpdateService;
