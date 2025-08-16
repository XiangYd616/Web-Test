// 通知服务
export class NotificationService {
  async sendNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {'
    console.log(`[${type.toUpperCase()}] ${message}`);`
  }

  async sendTestCompleteNotification(testId: string, results: any): Promise<void> {
    
    console.log(`Test ${testId} completed with results:`, results);`
  }

  async sendTestFailedNotification(testId: string, error: any): Promise<void> {
    
    console.error(`Test ${testId} failed:`, error);`
  }
}

export const notificationService = new NotificationService();
