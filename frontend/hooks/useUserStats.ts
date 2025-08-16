import { useCallback, useEffect, useState    } from 'react';import { ActivityItem, UserActivityStats, userStatsService    } from '../services/user/userStatsService';import { useAuth    } from './useAuth';export const useUserStats = () => {'
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户统计数据
  const loadStats = useCallback(() => {
    if (!user?.id) {
      
        setStats(null);
      setLoading(false);
      return;
      }

    try {
      const userStats = userStatsService.getUserStats(user.id);
      // 计算周和月统计
      userStatsService.calculateWeekStats(user.id);
      userStatsService.calculateMonthStats(user.id);

      // 重新获取更新后的统计数据
      const updatedStats = userStatsService.getUserStats(user.id);
      setStats(updatedStats);
    } catch (error) {
      console.error('Failed to load user stats: ', error);'
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 初始化加载
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [isAuthenticated, loadStats]);

  // 记录测试完成
  const recordTestCompletion = useCallback((
    testType: string,
    success: boolean,
    score?: number,
    duration?: number
  ) => {
    if (!user?.id) return;

    userStatsService.recordTestCompletion(user.id, testType, success, score, duration);
    loadStats(); // 重新加载统计数据
  }, [user?.id, loadStats]);

  // 记录收藏操作
  const recordBookmarkAction = useCallback((action: 'add' | 'remove', itemTitle: string) => {'
    if (!user?.id) return;

    userStatsService.recordBookmarkAction(user.id, action, itemTitle);
    loadStats(); // 重新加载统计数据
  }, [user?.id, loadStats]);

  // 添加活动记录
  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {'
    if (!user?.id) return;

    const fullActivity: ActivityItem  = {
      ...activity,
      id: `activity_${Date.now()}`,`
      timestamp: new Date().toISOString()
    };
    userStatsService.addActivity(user.id, fullActivity);
    loadStats(); // 重新加载统计数据
  }, [user?.id, loadStats]);

  // 获取最近活动
  const getRecentActivity = useCallback((): ActivityItem[]  => {
    if (!user?.id) return [];
    return userStatsService.getRecentActivity(user.id);
  }, [user?.id]);

  // 重置统计数据
  const resetStats = useCallback(() => {
    if (!user?.id) return;

    userStatsService.resetUserStats(user.id);
    loadStats(); // 重新加载统计数据
  }, [user?.id, loadStats]);

  // 导出统计数据
  const exportStats = useCallback((): string | null  => {
    if (!user?.id) return null;
    return userStatsService.exportUserStats(user.id);
  }, [user?.id]);

  // 导入统计数据
  const importStats = useCallback((data: string): boolean  => {
    if (!user?.id) return false;

    const success = userStatsService.importUserStats(user.id, data);
    if (success) {
      loadStats(); // 重新加载统计数据
    }
    return success;
  }, [user?.id, loadStats]);

  // 刷新统计数据
  const refreshStats = useCallback(() => {
    loadStats();
  }, [loadStats]);

  return {
    // 数据
    stats,
    loading,
    isAuthenticated,

    // 方法
    recordTestCompletion,
    recordBookmarkAction,
    addActivity,
    getRecentActivity,
    resetStats,
    exportStats,
    importStats,
    refreshStats,

    // 计算属性
    successRate: stats ? (stats.totalTests > 0 ? (stats.successfulTests / stats.totalTests) * 100 : 0) : 0,
    averageTestsPerDay: stats ? (stats.testsThisWeek > 0 ? stats.testsThisWeek / 7 : 0) : 0,
    totalTestHours: stats ? Math.round((stats.totalTestTime / 60) * 10) / 10 : 0,
  };
};
