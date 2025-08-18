/**
 * 测试引擎服务测试 */
import { TestEngineService } from '../../services/testing/testEngine';
import { apiClient } from '../../utils/apiClient';
jest.mock('../../utils/apiClient')';
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>'';
describe('TestEngineService', () => {
    jest.clearAllMocks()';
  })'';
  describe('Initialization', () => {
    it('initializes with default configuration', () => {
      expect(testEngine).toBeInstanceOf(TestEngineService)';
    })'';
    it('initializes available engines', () => {
          engines: ['performance', 'seo', 'security', 'compatibility';
      })';
      await testEngine.initializeEngines()'';
      expect(mockApiClient.get).toHaveBeenCalledWith('/test-engines';
    })';
  })'';
  describe('Performance Testing', () => {
    it('runs performance test successfully', () => {
          sessionId: 'test-session-123';
          status: 'running';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockResult)'';
        url: 'https://example.com';
        device: 'desktop';
        throttling: 'none';
      }';
      const result = await testEngine.runPerformanceTest(config)'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/performance', config)'';
      expect(result).toBe('test-session-123')';
    })'';
    it('handles performance test errors', () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'))'';
        url: 'https://example.com';
        device: 'desktop';
      }'';
      await expect(testEngine.runPerformanceTest(config)).rejects.toThrow('Network error';
    })';
  })'';
  describe('SEO Testing', () => {
    it('runs SEO test successfully', () => {
          sessionId: 'seo-session-456';
          status: 'running';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockResult)'';
        url: 'https://example.com';
        checks: ['meta-tags', 'headings', 'images';
      }';
      const result = await testEngine.runSeoTest(config)'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/seo', config)'';
      expect(result).toBe('seo-session-456';
    })';
  })'';
  describe('Security Testing', () => {
    it('runs security test successfully', () => {
          sessionId: 'security-session-789';
          status: 'running';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockResult)'';
        url: 'https://example.com';
        scanType: 'basic';
      }';
      const result = await testEngine.runSecurityTest(config)'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/security', config)'';
      expect(result).toBe('security-session-789';
    })';
  })'';
  describe('Test Results', () => {
    it('gets test result successfully', () => {
          sessionId: 'test-session-123';
          status: 'completed';
      }';
      mockApiClient.get.mockResolvedValueOnce(mockResult)'';
      const result = await testEngine.getTestResult('test-session-123')'';
      expect(mockApiClient.get).toHaveBeenCalledWith('/tests/test-session-123/result';
      expect(result).toEqual(mockResult.data)';
    })'';
    it('handles test result not found', () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Test session not found'))'';
      await expect(testEngine.getTestResult('invalid-session')).rejects.toThrow('Test session not found';
    })';
  })'';
  describe('Test Status', () => {
    it('gets test status successfully', () => {
          sessionId: 'test-session-123';
          status: 'running';
      }';
      mockApiClient.get.mockResolvedValueOnce(mockStatus)'';
      const result = await testEngine.getTestStatus('test-session-123')'';
      expect(mockApiClient.get).toHaveBeenCalledWith('/tests/test-session-123/status';
    })';
  })'';
  describe('Test Cancellation', () => {
    it('cancels test successfully', () => {
          sessionId: 'test-session-123';
          status: 'cancelled';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockResponse)'';
      const result = await testEngine.cancelTest('test-session-123')'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/test-session-123/cancel';
      expect(result).toBe(true)';
    })'';
    it('handles cancellation errors', () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Cannot cancel completed test'))'';
      await expect(testEngine.cancelTest('completed-session')).rejects.toThrow('Cannot cancel completed test';
    })';
  })'';
  describe('Test History', () => {
    it('gets test history successfully', () => {
              sessionId: 'session-1';
              type: 'performance';
              url: 'https://example.com';
              status: 'completed';
              createdAt: '2023-01-01T00:00:00Z';
              sessionId: 'session-2';
              type: 'seo';
              url: 'https://example.com';
              status: 'completed';
              createdAt: '2023-01-02T00:00:00Z';
      mockApiClient.get.mockResolvedValueOnce(mockHistory)';
      const result = await testEngine.getTestHistory({ page: 1, limit: 10 })'';
      expect(mockApiClient.get).toHaveBeenCalledWith('/tests/history?page=1&limit=10';
      expect(result).toEqual(mockHistory.data)';
    })'';
    it('gets test history with filters', () => {
      }';
      mockApiClient.get.mockResolvedValueOnce(mockHistory)'';
        type: 'performance';
        status: 'completed';
        url: 'https://example.com';
        dateFrom: '2023-01-01';
        dateTo: '2023-01-31';
      }';
      await testEngine.getTestHistory({ page: 1, limit: 10, ...filters })'";/tests/history?page=1&limit=10&type=performance&status=completed&url=https%3A%2F%2Fexample.com&dateFrom=2023-01-01&dateTo=2023-01-31';
    })';
  })'';
  describe('Export Results', () => {
    it('exports test results successfully', () => {
          downloadUrl: '/api/exports/test-session-123.pdf';
          expiresAt: '2023-01-01T01:00:00Z';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockExport)'';
      const result = await testEngine.exportTestResult('test-session-123', 'pdf')'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/test-session-123/export';
        format: 'pdf';
      expect(result).toEqual(mockExport.data)';
    })'';
    it('supports different export formats', () => {
          downloadUrl: '/api/exports/test-session-123.json';
          expiresAt: '2023-01-01T01:00:00Z';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockExport)'';
      await testEngine.exportTestResult('test-session-123', 'json')'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/test-session-123/export';
        format: 'json';
    })';
  })'';
  describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()'';
      mockApiClient.post.mockRejectedValueOnce(new Error('API Error'))'';
      await expect(testEngine.runPerformanceTest({})).rejects.toThrow('API Error';
      consoleSpy.mockRestore()';
    })'';
    it('validates test configuration', () => {
    })';
  })'';
  describe('Batch Operations', () => {
    it('runs multiple tests in batch', () => {
          batchId: 'batch-123';
          sessions: ['session-1', 'session-2', 'session-3';
      }';
      mockApiClient.post.mockResolvedValueOnce(mockBatchResult)'';
        { type: 'performance', url: 'https://example1.com';
        { type: 'seo', url: 'https://example2.com';
        { type: 'security', url: 'https://example3.com';
      ]';
      const result = await testEngine.runBatchTests(configs)'';
      expect(mockApiClient.post).toHaveBeenCalledWith('/tests/batch';
  })';
})'';