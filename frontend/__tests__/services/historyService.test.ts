import { historyService } from '../historyService';

// Mock fetch
global.fetch = jest.fn();

describe('HistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('getTestHistory', () => {
    it('should get test history successfully', async () => {
      const mockHistory = {
        success: true,
        data: [
          {
            id: 'test-1',
            type: 'api',
            name: 'API Test 1',
            status: 'completed',
            createdAt: '2025-01-01T00:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      const result = await historyService.getTestHistory();

      expect(fetch).toHaveBeenCalledWith('/api/history?page=1&limit=20');
      expect(result).toEqual(mockHistory);
    });

    it('should handle pagination parameters', async () => {
      const mockHistory = { success: true, data: [], pagination: {} };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      await historyService.getTestHistory({ page: 2, limit: 10 });

      expect(fetch).toHaveBeenCalledWith('/api/history?page=2&limit=10');
    });

    it('should handle filter parameters', async () => {
      const mockHistory = { success: true, data: [], pagination: {} };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      await historyService.getTestHistory({
        type: 'api',
        status: 'completed',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/history?page=1&limit=20&type=api&status=completed&startDate=2025-01-01&endDate=2025-01-31'
      );
    });
  });

  describe('deleteTestHistory', () => {
    it('should delete single test history', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Test deleted' })
      });

      await historyService.deleteTestHistory('test-123');

      expect(fetch).toHaveBeenCalledWith('/api/history/test-123', {
        method: 'DELETE'
      });
    });

    it('should delete multiple test histories', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '2 tests deleted' })
      });

      await historyService.deleteTestHistory(['test-1', 'test-2']);

      expect(fetch).toHaveBeenCalledWith('/api/history/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testIds: ['test-1', 'test-2'] })
      });
    });
  });
});
