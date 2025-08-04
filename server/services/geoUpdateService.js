const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const GeoDBDownloader = require('../scripts/download-geodb');

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
      enabled: process.env.GEO_AUTO_UPDATE !== 'false', // 默认启用
      schedule: process.env.GEO_UPDATE_SCHEDULE || '0 2 * * 3', // 每周三凌晨2点
      checkOnStartup: process.env.GEO_CHECK_STARTUP !== 'false', // 启动时检查
      maxRetries: 3,
      retryDelay: 60000 // 1分钟
    };
    
    this.init();
  }

  /**
   * 初始化更新服务
   */
  init() {
    console.log('🔄 初始化 GeoLite2 自动更新服务...');
    
    if (!this.config.enabled) {
      console.log('⏸️  自动更新已禁用');
      return;
    }

    // 启动时检查数据库
    if (this.config.checkOnStartup) {
      setTimeout(() => this.checkAndUpdate(), 5000); // 延迟5秒启动
    }

    // 设置定时任务
    this.scheduleUpdates();
    
    console.log('✅ GeoLite2 自动更新服务已启动');
    console.log(`📅 更新计划: ${this.config.schedule}`);
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

      console.log(`⏰ 定时更新任务已设置: ${this.config.schedule}`);
    } catch (error) {
      console.error('❌ 设置定时任务失败:', error.message);
    }
  }

  /**
   * 检查并更新数据库
   */
  async checkAndUpdate() {
    if (this.isUpdating) {
      console.log('🔄 更新正在进行中，跳过检查');
      return false;
    }

    this.lastUpdateCheck = new Date();
    
    try {
      // 检查是否需要更新
      const needsUpdate = await this.needsUpdate();
      
      if (needsUpdate) {
        console.log('📥 检测到需要更新数据库');
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
      console.log('📂 未找到数据库文件，需要下载');
      return true;
    }

    // 检查文件修改时间
    const stats = fs.statSync(cityDbPath);
    const fileAge = Date.now() - stats.mtime.getTime();
    
    if (fileAge > this.updateInterval) {
      console.log(`📅 数据库文件过期 (${Math.floor(fileAge / (24 * 60 * 60 * 1000))} 天前)，需要更新`);
      return true;
    }

    // 检查许可证密钥是否可用
    if (!process.env.MAXMIND_LICENSE_KEY) {
      console.log('⚠️  未设置许可证密钥，跳过更新检查');
      return false;
    }

    return false;
  }

  /**
   * 执行数据库更新
   */
  async performUpdate() {
    if (this.isUpdating) {
      console.log('🔄 更新已在进行中');
      return false;
    }

    this.isUpdating = true;
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        console.log(`🚀 开始更新 GeoLite2 数据库 (尝试 ${retries + 1}/${this.config.maxRetries})`);
        
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
        console.error(`❌ 更新失败 (尝试 ${retries}/${this.config.maxRetries}):`, error.message);
        
        if (retries < this.config.maxRetries) {
          console.log(`⏳ ${this.config.retryDelay / 1000} 秒后重试...`);
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
        console.log('🔄 重新加载地理位置服务...');
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
    console.log('🎯 手动触发数据库更新');
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
      nextUpdate: this.updateTask ? this.updateTask.nextDate() : null
    };
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
      console.log('⏸️  自动更新已禁用');
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
    console.log('🛑 GeoLite2 自动更新服务已停止');
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
