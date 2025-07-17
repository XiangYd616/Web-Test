// 全局搜索服务
export interface SearchResult {
  id: string;
  type: 'test' | 'report' | 'config' | 'user';
  title: string;
  description: string;
  url?: string;
  score: number;
  metadata?: any;
}

export interface SearchOptions {
  query: string;
  types?: string[];
  limit?: number;
  offset?: number;
  filters?: any;
}

export interface GlobalSearchService {
  search(options: SearchOptions): Promise<SearchResult[]>;
  indexData(data: any): Promise<void>;
  removeFromIndex(id: string): Promise<void>;
  clearIndex(): Promise<void>;
}

export class DefaultGlobalSearchService implements GlobalSearchService {
  private index: Map<string, any> = new Map();

  async search(options: SearchOptions): Promise<SearchResult[]> {
    // 临时实现
    const { query, limit = 10 } = options;
    const results: SearchResult[] = [];
    
    // 简单的模拟搜索
    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        id: `result-${i}`,
        type: 'test',
        title: `搜索结果 ${i + 1}`,
        description: `包含关键词 "${query}" 的搜索结果`,
        score: Math.random()
      });
    }
    
    return results;
  }

  async indexData(data: any): Promise<void> {
    // 临时实现
    this.index.set(data.id || Date.now().toString(), data);
  }

  async removeFromIndex(id: string): Promise<void> {
    // 临时实现
    this.index.delete(id);
  }

  async clearIndex(): Promise<void> {
    // 临时实现
    this.index.clear();
  }
}

const globalSearchService = new DefaultGlobalSearchService();
export default globalSearchService;
