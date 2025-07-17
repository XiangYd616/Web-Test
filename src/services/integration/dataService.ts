// 数据服务
export class DataService {
  async saveTestResult(result: any): Promise<string> {
    // 临时实现
    return Date.now().toString();
  }

  async getTestResult(id: string): Promise<any> {
    // 临时实现
    return {
      id,
      timestamp: new Date().toISOString(),
      data: {}
    };
  }

  async getTestHistory(limit: number = 10): Promise<any[]> {
    // 临时实现
    return [];
  }

  async deleteTestResult(id: string): Promise<boolean> {
    // 临时实现
    return true;
  }
}

export const dataService = new DataService();
