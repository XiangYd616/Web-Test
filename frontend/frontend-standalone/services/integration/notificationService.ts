// 通知服务
export class NotificationService {
  async sendNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    
  }

  async sendTestCompleteNotification(testId: string, results: unknown): Promise<void> {
    
  }

  async sendTestFailedNotification(testId: string, error: unknown): Promise<void> {
    
    console.error(`Test ${testId} failed:`, error);
  }
}

export const _notificationService = new NotificationService();
