/**
 * 国际化服务
 * 提供多语言支持、翻译管理、本地化功能
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../../middleware/logger.js');

class I18nService {
  constructor() {
    this.logger = Logger;
    this.translations = new Map();
    this.supportedLocales = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
    this.defaultLocale = 'zh-CN';
    this.fallbackLocale = 'en-US';
    this.loadTranslations();
  }

  /**
   * 加载翻译文件
   */
  loadTranslations() {
    try {
      const localesDir = path.join(__dirname, '../locales');
      
      // 如果目录不存在，创建默认翻译
      if (!fs.existsSync(localesDir)) {
        this.createDefaultTranslations();
        return;
      }

      this.supportedLocales.forEach(locale => {
        const filePath = path.join(localesDir, `${locale}.json`);
        
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const translations = JSON.parse(content);
            this.translations.set(locale, translations);
            this.logger.info(`翻译文件已加载: ${locale}`);
          } catch (error) {
            this.logger.error(`加载翻译文件失败: ${locale}`, error);
          }
        } else {
          this.logger.warn(`翻译文件不存在: ${filePath}`);
        }
      });

      // 如果没有加载到任何翻译，创建默认翻译
      if (this.translations.size === 0) {
        this.createDefaultTranslations();
      }
    } catch (error) {
      this.logger.error('加载翻译文件失败:', error);
      this.createDefaultTranslations();
    }
  }

  /**
   * 创建默认翻译
   */
  createDefaultTranslations() {
    try {
      const defaultTranslations = {
        'zh-CN': {
          common: {
            success: '成功',
            error: '错误',
            warning: '警告',
            info: '信息',
            loading: '加载中...',
            save: '保存',
            cancel: '取消',
            confirm: '确认',
            delete: '删除',
            edit: '编辑',
            add: '添加',
            search: '搜索',
            filter: '筛选',
            export: '导出',
            import: '导入'
          },
          test: {
            performance: '性能测试',
            security: '安全测试',
            content: '内容测试',
            api: 'API测试',
            stress: '压力测试',
            compatibility: '兼容性测试',
            start: '开始测试',
            stop: '停止测试',
            results: '测试结果',
            history: '测试历史',
            report: '测试报告'
          },
          user: {
            login: '登录',
            logout: '退出',
            register: '注册',
            profile: '个人资料',
            settings: '设置',
            preferences: '偏好设置'
          },
          error: {
            notFound: '未找到',
            unauthorized: '未授权',
            forbidden: '禁止访问',
            serverError: '服务器错误',
            networkError: '网络错误',
            validationError: '验证错误'
          }
        },
        'en-US': {
          common: {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information',
            loading: 'Loading...',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            delete: 'Delete',
            edit: 'Edit',
            add: 'Add',
            search: 'Search',
            filter: 'Filter',
            export: 'Export',
            import: 'Import'
          },
          test: {
            performance: 'Performance Test',
            security: 'Security Test',
            content: 'Content Test',
            api: 'API Test',
            stress: 'Stress Test',
            compatibility: 'Compatibility Test',
            start: 'Start Test',
            stop: 'Stop Test',
            results: 'Test Results',
            history: 'Test History',
            report: 'Test Report'
          },
          user: {
            login: 'Login',
            logout: 'Logout',
            register: 'Register',
            profile: 'Profile',
            settings: 'Settings',
            preferences: 'Preferences'
          },
          error: {
            notFound: 'Not Found',
            unauthorized: 'Unauthorized',
            forbidden: 'Forbidden',
            serverError: 'Server Error',
            networkError: 'Network Error',
            validationError: 'Validation Error'
          }
        }
      };

      // 存储到内存
      for (const [locale, translations] of Object.entries(defaultTranslations)) {
        this.translations.set(locale, translations);
      }

      this.logger.info('默认翻译已创建');
    } catch (error) {
      this.logger.error('创建默认翻译失败:', error);
    }
  }

  /**
   * 获取翻译
   */
  translate(key, locale = this.defaultLocale, params = {}) {
    try {
      // 获取指定语言的翻译
      let translations = this.translations.get(locale);
      
      // 如果指定语言不存在，使用回退语言
      if (!translations) {
        translations = this.translations.get(this.fallbackLocale);
      }

      // 如果回退语言也不存在，返回key
      if (!translations) {
        return key;
      }

      // 解析嵌套的key（如 'common.success'）
      const keys = key.split('.');
      let value = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // 如果找不到，尝试回退语言
          if (locale !== this.fallbackLocale) {
            return this.translate(key, this.fallbackLocale, params);
          }
          return key;
        }
      }

      // 如果value不是字符串，返回key
      if (typeof value !== 'string') {
        return key;
      }

      // 替换参数
      return this.interpolate(value, params);
    } catch (error) {
      this.logger.error('翻译失败:', error);
      return key;
    }
  }

  /**
   * 参数插值
   */
  interpolate(text, params) {
    try {
      let result = text;
      
      for (const [key, value] of Object.entries(params)) {
        const regex = new RegExp(`{{//s*${key}//s*}}`, 'g');
        result = result.replace(regex, value);
      }

      return result;
    } catch (error) {
      this.logger.error('参数插值失败:', error);
      return text;
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLocales() {
    return {
      success: true,
      data: this.supportedLocales.map(locale => ({
        code: locale,
        name: this.getLocaleName(locale),
        isDefault: locale === this.defaultLocale
      }))
    };
  }

  /**
   * 获取语言名称
   */
  getLocaleName(locale) {
    const names = {
      'zh-CN': '简体中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'ko-KR': '한국어'
    };
    return names[locale] || locale;
  }

  /**
   * 获取指定语言的所有翻译
   */
  getTranslations(locale = this.defaultLocale) {
    try {
      const translations = this.translations.get(locale);
      
      if (!translations) {
        return {
          success: false,
          error: '不支持的语言'
        };
      }

      return {
        success: true,
        data: {
          locale,
          translations
        }
      };
    } catch (error) {
      this.logger.error('获取翻译失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新翻译
   */
  updateTranslation(locale, key, value) {
    try {
      if (!this.supportedLocales.includes(locale)) {
        return {
          success: false,
          error: '不支持的语言'
        };
      }

      let translations = this.translations.get(locale);
      if (!translations) {
        translations = {};
        this.translations.set(locale, translations);
      }

      // 解析嵌套的key
      const keys = key.split('.');
      let current = translations;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = value;

      this.logger.info(`翻译已更新: ${locale}.${key}`);

      return {
        success: true,
        message: '翻译更新成功'
      };
    } catch (error) {
      this.logger.error('更新翻译失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量翻译
   */
  batchTranslate(keys, locale = this.defaultLocale) {
    try {
      const results = {};

      keys.forEach(key => {
        results[key] = this.translate(key, locale);
      });

      return {
        success: true,
        data: {
          locale,
          translations: results
        }
      };
    } catch (error) {
      this.logger.error('批量翻译失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检测语言
   */
  detectLocale(acceptLanguage) {
    try {
      if (!acceptLanguage) {
        return this.defaultLocale;
      }

      // 解析Accept-Language头
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const parts = lang.trim().split(';');
          const code = parts[0];
          const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1;
          return { code, quality };
        })
        .sort((a, b) => b.quality - a.quality);

      // 查找支持的语言
      for (const lang of languages) {
        if (this.supportedLocales.includes(lang.code)) {
          return lang.code;
        }

        // 尝试匹配语言前缀
        const prefix = lang.code.split('-')[0];
        const match = this.supportedLocales.find(locale => 
          locale.startsWith(prefix)
        );
        if (match) {
          return match;
        }
      }

      return this.defaultLocale;
    } catch (error) {
      this.logger.error('语言检测失败:', error);
      return this.defaultLocale;
    }
  }

  /**
   * 导出翻译文件
   */
  async exportTranslations(locale, format = 'json') {
    try {
      const translations = this.translations.get(locale);
      
      if (!translations) {
        return {
          success: false,
          error: '语言不存在'
        };
      }

      let content;
      let filename;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(translations, null, 2);
          filename = `${locale}.json`;
          break;
        case 'csv':
          content = this.convertToCSV(translations);
          filename = `${locale}.csv`;
          break;
        default:
          throw new Error('不支持的格式');
      }

      const outputDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');

      return {
        success: true,
        data: {
          filePath,
          format,
          locale
        }
      };
    } catch (error) {
      this.logger.error('导出翻译失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(obj, prefix = '') {
    let csv = '';
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        csv += this.convertToCSV(value, fullKey);
      } else {
        csv += `"${fullKey}","${String(value).replace(/"/g, '""')}"/n`;
      }
    }
    
    return csv;
  }

  /**
   * 获取翻译统计
   */
  getStatistics() {
    try {
      const stats = {
        supportedLocales: this.supportedLocales.length,
        defaultLocale: this.defaultLocale,
        locales: {}
      };

      for (const locale of this.supportedLocales) {
        const translations = this.translations.get(locale);
        if (translations) {
          stats.locales[locale] = {
            name: this.getLocaleName(locale),
            keyCount: this.countKeys(translations),
            isLoaded: true
          };
        } else {
          stats.locales[locale] = {
            name: this.getLocaleName(locale),
            keyCount: 0,
            isLoaded: false
          };
        }
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 计算翻译键数量
   */
  countKeys(obj) {
    let count = 0;
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        count += this.countKeys(value);
      } else {
        count++;
      }
    }
    
    return count;
  }
}

module.exports = new I18nService();
