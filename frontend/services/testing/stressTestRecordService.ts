// StressTestRecordService - 测试记录服务
export interface TestRecord {
  id: string;
  type: 'stress' | 'compatibility' | 'performance
  name: string;
  status: 'running' | 'completed' | 'failed
  startTime: Date;
  endTime?: Date;
  results?: any;
}

export class StressTestRecordService {
  private records: Map<string, TestRecord> = new Map();

  /**
   * 创建测试记录
   */
  public createRecord(type: TestRecord['type'], name: string): string {
    const id = Date.now().toString();
    const record: TestRecord = {
      id,
      type,
      name,
      status: 'running',
      startTime: new Date()
    };

    this.records.set(id, record);
    console.log('创建测试记录:', name);
    return id;
  }

  /**
   * 更新测试记录
   */
  public updateRecord(id: string, updates: Partial<TestRecord>): boolean {
    try {
      const record = this.records.get(id);
      if (record) {
        Object.assign(record, updates);
        this.records.set(id, record);
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新测试记录失败:', error);
      return false;
    }
  }

  /**
   * 完成测试记录
   */
  public completeRecord(id: string, results: any): boolean {
    return this.updateRecord(id, {
      status: 'completed',
      endTime: new Date(),
      results
    });
  }

  /**
   * 获取测试记录
   */
  public getRecord(id: string): TestRecord | undefined {
    return this.records.get(id);
  }

  /**
   * 获取所有记录
   */
  public getAllRecords(): TestRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * 删除测试记录
   */
  public deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }
}

export default StressTestRecordService;
