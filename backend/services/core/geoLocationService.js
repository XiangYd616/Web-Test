const maxmind = require('maxmind');
const path = require('path');
const fs = require('fs');

/**
 * 地理位置查询服务
 * 支持 MaxMind GeoLite2 本地数据库和 API 备选方案
 */
class GeoLocationService {
  constructor() {
    this.cityLookup = null;
    this.countryLookup = null;
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24小时缓存
    this.isInitialized = false;
    this.useLocalDB = false;
    
    // 数据库文件路径
    this.cityDbPath = path.join(__dirname, '../data/GeoLite2-City.mmdb');
    this.countryDbPath = path.join(__dirname, '../data/GeoLite2-Country.mmdb');
    
    this.init();
  }

  /**
   * 初始化地理位置服务
   */
  async init() {
    try {
      
      // 检查本地数据库文件是否存在
      if (fs.existsSync(this.cityDbPath)) {
        await this.initMaxMind();
      } else {
        this.useLocalDB = false;
      }
      
      this.isInitialized = true;
      console.log('✅ 地理位置服务初始化完成');
    } catch (error) {
      console.error('❌ 地理位置服务初始化失败:', error);
      this.useLocalDB = false;
      this.isInitialized = true;
    }
  }

  /**
   * 初始化 MaxMind 数据库
   */
  async initMaxMind() {
    try {
      // 加载城市数据库
      if (fs.existsSync(this.cityDbPath)) {
        this.cityLookup = await maxmind.open(this.cityDbPath);
        console.log('✅ MaxMind 城市数据库加载成功');
      }
      
      // 加载国家数据库（备选）
      if (fs.existsSync(this.countryDbPath)) {
        this.countryLookup = await maxmind.open(this.countryDbPath);
        console.log('✅ MaxMind 国家数据库加载成功');
      }
      
      this.useLocalDB = true;
    } catch (error) {
      console.error('❌ MaxMind 数据库加载失败:', error);
      throw error;
    }
  }

  /**
   * 查询 IP 地理位置
   * @param {string} ip - IP地址
   * @returns {Object|null} 地理位置信息
   */
  async getLocation(ip) {
    if (!this.isInitialized) {
      await this.init();
    }

    // 检查缓存
    const cacheKey = `geo_${ip}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.data;
    }

    let location = null;
    
    try {
      if (this.useLocalDB) {
        location = await this.getLocationFromMaxMind(ip);
      } else {
        location = await this.getLocationFromAPI(ip);
      }

      // 缓存结果
      if (location) {
        this.cache.set(cacheKey, {
          data: location,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn(`地理位置查询失败 (${ip}):`, error.message);
    }

    return location;
  }

  /**
   * 使用 MaxMind 本地数据库查询
   * @param {string} ip - IP地址
   * @returns {Object|null} 地理位置信息
   */
  async getLocationFromMaxMind(ip) {
    if (!this.cityLookup && !this.countryLookup) {
      throw new Error('MaxMind 数据库未加载');
    }

    let result = null;
    
    // 优先使用城市数据库
    if (this.cityLookup) {
      result = this.cityLookup.get(ip);
    } else if (this.countryLookup) {
      result = this.countryLookup.get(ip);
    }

    if (!result) {
      
        return null;
      }

    return {
      country: result.country?.names?.en || result.country?.names?.zh_CN,
      countryCode: result.country?.iso_code,
      region: result.subdivisions?.[0]?.names?.en || result.subdivisions?.[0]?.names?.zh_CN,
      city: result.city?.names?.en || result.city?.names?.zh_CN,
      timezone: result.location?.time_zone,
      latitude: result.location?.latitude,
      longitude: result.location?.longitude,
      source: 'maxmind'
    };
  }

  /**
   * 使用 API 查询（备选方案）
   * @param {string} ip - IP地址
   * @returns {Object|null} 地理位置信息
   */
  async getLocationFromAPI(ip) {
    const apis = [
      {
        url: `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,timezone,lat,lon`,
        parser: (data) => data.status === 'success' ? {
          country: data.country,
          countryCode: data.countryCode,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
          latitude: data.lat,
          longitude: data.lon,
          source: 'ip-api'
        } : null
      },
      {
        url: `https://ipapi.co/${ip}/json/`,
        parser: (data) => data.error ? null : {
          country: data.country_name,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
          latitude: data.latitude,
          longitude: data.longitude,
          source: 'ipapi'
        }
      }
    ];

    for (const api of apis) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'TestWeb-GeoLocation/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          
        const data = await response.json();
          const location = api.parser(data);
          if (location) {
            return location;
      }
        }
      } catch (error) {
        console.warn(`API ${api.url} 查询失败:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * 清理过期缓存
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      useLocalDB: this.useLocalDB,
      cityDBLoaded: !!this.cityLookup,
      countryDBLoaded: !!this.countryLookup,
      cacheSize: this.cache.size
    };
  }
}

// 创建单例实例
const geoLocationService = new GeoLocationService();

module.exports = geoLocationService;
