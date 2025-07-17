// 通知服务
export class NotificationService {
  async sendNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    // 临时实现
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async sendTestCompleteNotification(testId: string, results: any): Promise<void> {
    // 临时实现
    console.log(`Test ${testId} completed with results:`, results);
  }

  async sendTestFailedNotification(testId: string, error: any): Promise<void> {
    // 临时实现
    console.error(`Test ${testId} failed:`, error);
  }
}

export const notificationService = new NotificationService();
