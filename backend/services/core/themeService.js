/**
 * 主题管理服务
 * 提供主题配置、用户偏好、动态主题切换功能
 */

const Logger = require('../../middleware/logger.js');

class ThemeService {
  constructor() {
    this.logger = Logger;
    this.themes = new Map();
    this.userPreferences = new Map();
    this.initializeDefaultThemes();
  }

  /**
   * 初始化默认主题
   */
  initializeDefaultThemes() {
    const defaultThemes = [
      {
        id: 'light',
        name: '浅色主题',
        description: '经典的浅色界面主题',
        type: 'built-in',
        colors: {
          primary: '#3B82F6',
          secondary: '#6B7280',
          background: '#FFFFFF',
          surface: '#F9FAFB',
          text: '#111827',
          textSecondary: '#6B7280',
          border: '#E5E7EB',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6'
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem'
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }
      },
      {
        id: 'dark',
        name: '深色主题',
        description: '护眼的深色界面主题',
        type: 'built-in',
        colors: {
          primary: '#60A5FA',
          secondary: '#9CA3AF',
          background: '#111827',
          surface: '#1F2937',
          text: '#F9FAFB',
          textSecondary: '#D1D5DB',
          border: '#374151',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#60A5FA'
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem'
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
        }
      }
    ];

    defaultThemes.forEach(theme => {
      this.themes.set(theme.id, {
        ...theme,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });
    });

    this.logger.info('默认主题初始化完成');
  }

  /**
   * 获取所有主题
   */
  getAllThemes() {
    try {
      const themes = Array.from(this.themes.values())
        .filter(theme => theme.isActive)
        .map(theme => ({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          type: theme.type,
          preview: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            text: theme.colors.text
          },
          createdAt: theme.createdAt,
          updatedAt: theme.updatedAt
        }));

      return {
        success: true,
        data: themes
      };
    } catch (error) {
      this.logger.error('获取主题列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取主题详情
   */
  getTheme(themeId) {
    try {
      const theme = this.themes.get(themeId);
      
      if (!theme || !theme.isActive) {
        return {
          success: false,
          error: '主题不存在'
        };
      }

      return {
        success: true,
        data: theme
      };
    } catch (error) {
      this.logger.error('获取主题详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建自定义主题
   */
  createTheme(themeData, userId) {
    try {
      const themeId = `custom-${Date.now()}`;
      
      const theme = {
        id: themeId,
        name: themeData.name || '自定义主题',
        description: themeData.description || '',
        type: 'custom',
        colors: this.validateColors(themeData.colors),
        typography: themeData.typography || this.getDefaultTypography(),
        spacing: themeData.spacing || this.getDefaultSpacing(),
        borderRadius: themeData.borderRadius || this.getDefaultBorderRadius(),
        shadows: themeData.shadows || this.getDefaultShadows(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      this.themes.set(themeId, theme);
      this.logger.info(`自定义主题创建成功: ${themeId}`);

      return {
        success: true,
        data: theme
      };
    } catch (error) {
      this.logger.error('创建主题失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新主题
   */
  updateTheme(themeId, updates, userId) {
    try {
      const theme = this.themes.get(themeId);
      
      if (!theme) {
        return {
          success: false,
          error: '主题不存在'
        };
      }

      if (theme.type === 'built-in') {
        return {
          success: false,
          error: '内置主题不能修改'
        };
      }

      if (theme.createdBy !== userId) {
        return {
          success: false,
          error: '只能修改自己创建的主题'
        };
      }

      const updatedTheme = {
        ...theme,
        ...updates,
        id: themeId, // 确保ID不被修改
        type: 'custom', // 确保类型不被修改
        updatedAt: new Date().toISOString()
      };

      if (updates.colors) {
        updatedTheme.colors = this.validateColors(updates.colors);
      }

      this.themes.set(themeId, updatedTheme);
      this.logger.info(`主题更新成功: ${themeId}`);

      return {
        success: true,
        data: updatedTheme
      };
    } catch (error) {
      this.logger.error('更新主题失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除主题
   */
  deleteTheme(themeId, userId) {
    try {
      const theme = this.themes.get(themeId);
      
      if (!theme) {
        return {
          success: false,
          error: '主题不存在'
        };
      }

      if (theme.type === 'built-in') {
        return {
          success: false,
          error: '内置主题不能删除'
        };
      }

      if (theme.createdBy !== userId) {
        return {
          success: false,
          error: '只能删除自己创建的主题'
        };
      }

      // 软删除
      theme.isActive = false;
      theme.deletedAt = new Date().toISOString();

      this.logger.info(`主题删除成功: ${themeId}`);

      return {
        success: true,
        message: '主题删除成功'
      };
    } catch (error) {
      this.logger.error('删除主题失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户主题偏好
   */
  getUserPreference(userId) {
    try {
      const preference = this.userPreferences.get(userId) || {
        themeId: 'light',
        autoSwitch: false,
        switchTime: {
          lightStart: '06:00',
          darkStart: '18:00'
        },
        followSystem: true
      };

      return {
        success: true,
        data: preference
      };
    } catch (error) {
      this.logger.error('获取用户偏好失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 设置用户主题偏好
   */
  setUserPreference(userId, preference) {
    try {
      const currentPreference = this.userPreferences.get(userId) || {};
      
      const updatedPreference = {
        ...currentPreference,
        ...preference,
        updatedAt: new Date().toISOString()
      };

      this.userPreferences.set(userId, updatedPreference);
      this.logger.info(`用户主题偏好更新成功: ${userId}`);

      return {
        success: true,
        data: updatedPreference
      };
    } catch (error) {
      this.logger.error('设置用户偏好失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证颜色配置
   */
  validateColors(colors) {
    const requiredColors = [
      'primary', 'secondary', 'background', 'surface', 
      'text', 'textSecondary', 'border', 'success', 
      'warning', 'error', 'info'
    ];

    const validatedColors = {};

    requiredColors.forEach(colorKey => {
      if (colors[colorKey] && this.isValidColor(colors[colorKey])) {
        validatedColors[colorKey] = colors[colorKey];
      } else {
        // 使用默认颜色
        const defaultTheme = this.themes.get('light');
        validatedColors[colorKey] = defaultTheme.colors[colorKey];
      }
    });

    return validatedColors;
  }

  /**
   * 验证颜色格式
   */
  isValidColor(color) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb/(/s*/d+/s*,/s*/d+/s*,/s*/d+/s*/)$/;
    const rgbaRegex = /^rgba/(/s*/d+/s*,/s*/d+/s*,/s*/d+/s*,/s*[/d.]+/s*/)$/;
    
    return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
  }

  /**
   * 获取默认字体配置
   */
  getDefaultTypography() {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    };
  }

  /**
   * 获取默认间距配置
   */
  getDefaultSpacing() {
    return {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    };
  }

  /**
   * 获取默认圆角配置
   */
  getDefaultBorderRadius() {
    return {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem'
    };
  }

  /**
   * 获取默认阴影配置
   */
  getDefaultShadows() {
    return {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    };
  }

  /**
   * 生成主题CSS
   */
  generateThemeCSS(themeId) {
    try {
      const theme = this.themes.get(themeId);
      
      if (!theme) {
        return {
          success: false,
          error: '主题不存在'
        };
      }

      const css = this.buildCSSFromTheme(theme);

      return {
        success: true,
        data: {
          css,
          theme: {
            id: theme.id,
            name: theme.name
          }
        }
      };
    } catch (error) {
      this.logger.error('生成主题CSS失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 从主题配置构建CSS
   */
  buildCSSFromTheme(theme) {
    const { colors, typography, spacing, borderRadius, shadows } = theme;

    return `:root {
  /* Colors */
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-border: ${colors.border};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};

  /* Typography */
  --font-family: ${typography.fontFamily};
  --font-size-xs: ${typography.fontSize.xs};
  --font-size-sm: ${typography.fontSize.sm};
  --font-size-base: ${typography.fontSize.base};
  --font-size-lg: ${typography.fontSize.lg};
  --font-size-xl: ${typography.fontSize.xl};
  --font-size-2xl: ${typography.fontSize['2xl']};
  --font-size-3xl: ${typography.fontSize['3xl']};

  /* Spacing */
  --spacing-xs: ${spacing.xs};
  --spacing-sm: ${spacing.sm};
  --spacing-md: ${spacing.md};
  --spacing-lg: ${spacing.lg};
  --spacing-xl: ${spacing.xl};
  --spacing-2xl: ${spacing['2xl']};

  /* Border Radius */
  --border-radius-sm: ${borderRadius.sm};
  --border-radius-md: ${borderRadius.md};
  --border-radius-lg: ${borderRadius.lg};
  --border-radius-xl: ${borderRadius.xl};

  /* Shadows */
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};
  --shadow-lg: ${shadows.lg};
}`;
  }
}

module.exports = new ThemeService();
