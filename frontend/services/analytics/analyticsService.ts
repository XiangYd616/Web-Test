// AnalyticsService - 分析服务
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsMetrics {
  pageViews: number;
  uniqueUsers: number;
  sessionDuration: number;
  bounceRate: number;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  /**
   * 跟踪事件
   */
  public track(name: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date()
    };

    this.events.push(event);
    console.log('跟踪事件:', name, properties);
  }

  /**
   * 获取指标
   */
  public getMetrics(): AnalyticsMetrics {
    return {
      pageViews: this.events.filter(e => e.name === 'page_view').length,
      uniqueUsers: Math.floor(Math.random() * 1000),
      sessionDuration: Math.floor(Math.random() * 3600),
      bounceRate: Math.random() * 100
    };
  }

  /**
   * 获取事件列表
   */
  public getEvents(limit?: number): AnalyticsEvent[] {
    const events = this.events.slice().reverse();
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * 清理旧事件
   */
  public cleanupOldEvents(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.events = this.events.filter(event => 
      event.timestamp && event.timestamp > cutoffDate
    );

    console.log('清理了旧的分析事件');
  }
}

export default AnalyticsService;
