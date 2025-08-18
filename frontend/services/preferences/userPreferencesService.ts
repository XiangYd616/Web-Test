// UserPreferencesService - 用户偏好设置服务
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
}

export class UserPreferencesService {
  private storageKey = 'userPreferences
  private defaultPreferences: UserPreferences = {
    theme: 'light',
    language: 'zh-CN',
    notifications: {
      email: true,
      push: true,
      desktop: false
    },
    dashboard: {
      layout: 'grid',
      widgets: ['overview', 'charts', 'recent']
    }
  };

  /**
   * 获取用户偏好设置
   */
  public getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.defaultPreferences, ...JSON.parse(stored) };
      }
      return this.defaultPreferences;
    } catch (error) {
      console.error('获取用户偏好设置失败:', error);
      return this.defaultPreferences;
    }
  }

  /**
   * 更新用户偏好设置
   */
  public updatePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
      console.log('用户偏好设置已更新');
    } catch (error) {
      console.error('更新用户偏好设置失败:', error);
    }
  }

  /**
   * 重置为默认设置
   */
  public resetToDefaults(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.defaultPreferences));
      console.log('用户偏好设置已重置为默认值');
    } catch (error) {
      console.error('重置用户偏好设置失败:', error);
    }
  }

  /**
   * 导出设置
   */
  public exportPreferences(): string {
    const preferences = this.getPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  /**
   * 导入设置
   */
  public importPreferences(data: string): boolean {
    try {
      const preferences = JSON.parse(data);
      this.updatePreferences(preferences);
      return true;
    } catch (error) {
      console.error('导入用户偏好设置失败:', error);
      return false;
    }
  }
}

export default UserPreferencesService;
