// 用户统计数据服务

export interface UserActivityStats {
  totalTests: number;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  favoriteTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  totalTestTime: number; // 分钟
  lastTestDate?: string;
  mostUsedTestType: string;
  testsByType: Record<string, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'test_completed' | 'test_failed' | 'bookmark_added' | 'profile_updated';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class UserStatsService {
  private readonly STORAGE_KEY = 'user_activity_stats';
  private readonly ACTIVITY_KEY = 'user_recent_activity';

  // 获取用户统计数据
  getUserStats(userId: string): UserActivityStats {
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
    if (stored) {
      try {
        const stats = JSON.parse(stored);
        // 确保数据结构完整
        return {
          totalTests: 0,
          testsToday: 0,
          testsThisWeek: 0,
          testsThisMonth: 0,
          favoriteTests: 0,
          successfulTests: 0,
          failedTests: 0,
          averageScore: 0,
          totalTestTime: 0,
          mostUsedTestType: '压力测试',
          testsByType: {},
          recentActivity: [],
          ...stats
        };
      } catch (error) {
        console.error('Failed to parse user stats:', error);
      }
    }

    // 返回默认统计数据
    return this.getDefaultStats();
  }

  // 获取默认统计数据
  private getDefaultStats(): UserActivityStats {
    return {
      totalTests: 0,
      testsToday: 0,
      testsThisWeek: 0,
      testsThisMonth: 0,
      favoriteTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageScore: 0,
      totalTestTime: 0,
      mostUsedTestType: '暂无',
      testsByType: {},
      recentActivity: []
    };
  }

  // 更新用户统计数据
  updateUserStats(userId: string, updates: Partial<UserActivityStats>): void {
    const currentStats = this.getUserStats(userId);
    const updatedStats = { ...currentStats, ...updates };
    
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Failed to save user stats:', error);
    }
  }

  // 记录测试完成
  recordTestCompletion(userId: string, testType: string, success: boolean, score?: number, duration?: number): void {
    const stats = this.getUserStats(userId);
    const now = new Date();
    const today = now.toDateString();
    
    // 更新基础统计
    stats.totalTests += 1;
    
    // 检查是否是今天的测试
    if (!stats.lastTestDate || new Date(stats.lastTestDate).toDateString() !== today) {
      stats.testsToday = 1;
    } else {
      stats.testsToday += 1;
    }

    // 更新成功/失败统计
    if (success) {
      stats.successfulTests += 1;
    } else {
      stats.failedTests += 1;
    }

    // 更新评分
    if (score !== undefined) {
      const totalScore = stats.averageScore * (stats.totalTests - 1) + score;
      stats.averageScore = Math.round((totalScore / stats.totalTests) * 10) / 10;
    }

    // 更新测试时间
    if (duration !== undefined) {
      stats.totalTestTime += duration;
    }

    // 更新测试类型统计
    stats.testsByType[testType] = (stats.testsByType[testType] || 0) + 1;
    
    // 更新最常用测试类型
    const mostUsedType = Object.entries(stats.testsByType).reduce((a, b) => 
      stats.testsByType[a[0]] > stats.testsByType[b[0]] ? a : b
    );
    stats.mostUsedTestType = mostUsedType[0];

    // 更新最后测试时间
    stats.lastTestDate = now.toISOString();

    // 添加活动记录
    this.addActivity(userId, {
      id: `test_${Date.now()}`,
      type: success ? 'test_completed' : 'test_failed',
      title: `${testType}${success ? '完成' : '失败'}`,
      description: success 
        ? `成功完成${testType}，评分：${score || 'N/A'}` 
        : `${testType}执行失败`,
      timestamp: now.toISOString(),
      metadata: { testType, success, score, duration }
    });

    this.updateUserStats(userId, stats);
  }

  // 记录收藏操作
  recordBookmarkAction(userId: string, action: 'add' | 'remove', itemTitle: string): void {
    const stats = this.getUserStats(userId);
    
    if (action === 'add') {
      stats.favoriteTests += 1;
      this.addActivity(userId, {
        id: `bookmark_${Date.now()}`,
        type: 'bookmark_added',
        title: '添加收藏',
        description: `收藏了 ${itemTitle}`,
        timestamp: new Date().toISOString(),
        metadata: { action, itemTitle }
      });
    } else {
      stats.favoriteTests = Math.max(0, stats.favoriteTests - 1);
    }

    this.updateUserStats(userId, stats);
  }

  // 记录用户活动
  addActivity(userId: string, activity: ActivityItem): void {
    const activities = this.getRecentActivity(userId);
    activities.unshift(activity);
    
    // 只保留最近20条活动
    const recentActivities = activities.slice(0, 20);
    
    try {
      localStorage.setItem(`${this.ACTIVITY_KEY}_${userId}`, JSON.stringify(recentActivities));
    } catch (error) {
      console.error('Failed to save user activity:', error);
    }
  }

  // 获取最近活动
  getRecentActivity(userId: string): ActivityItem[] {
    const stored = localStorage.getItem(`${this.ACTIVITY_KEY}_${userId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse user activity:', error);
      }
    }
    return [];
  }

  // 计算周统计
  calculateWeekStats(userId: string): void {
    const stats = this.getUserStats(userId);
    const activities = this.getRecentActivity(userId);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekActivities = activities.filter(activity => 
      new Date(activity.timestamp) >= oneWeekAgo
    );

    stats.testsThisWeek = weekActivities.filter(activity => 
      activity.type === 'test_completed' || activity.type === 'test_failed'
    ).length;

    this.updateUserStats(userId, stats);
  }

  // 计算月统计
  calculateMonthStats(userId: string): void {
    const stats = this.getUserStats(userId);
    const activities = this.getRecentActivity(userId);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const monthActivities = activities.filter(activity => 
      new Date(activity.timestamp) >= oneMonthAgo
    );

    stats.testsThisMonth = monthActivities.filter(activity => 
      activity.type === 'test_completed' || activity.type === 'test_failed'
    ).length;

    this.updateUserStats(userId, stats);
  }

  // 重置统计数据
  resetUserStats(userId: string): void {
    localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
    localStorage.removeItem(`${this.ACTIVITY_KEY}_${userId}`);
  }

  // 导出统计数据
  exportUserStats(userId: string): string {
    const stats = this.getUserStats(userId);
    const activities = this.getRecentActivity(userId);
    
    return JSON.stringify({
      stats,
      activities,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  // 导入统计数据
  importUserStats(userId: string, data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (imported.stats) {
        this.updateUserStats(userId, imported.stats);
      }
      if (imported.activities) {
        localStorage.setItem(`${this.ACTIVITY_KEY}_${userId}`, JSON.stringify(imported.activities));
      }
      return true;
    } catch (error) {
      console.error('Failed to import user stats:', error);
      return false;
    }
  }
}

export const userStatsService = new UserStatsService();
