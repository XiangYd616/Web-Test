import { testService } from '../testService';

// Mock fetch
global.fetch = jest.fn();

describe('TestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('startTest', () => {
    it('should start a test successfully', async () => {
      const mockResponse = {
        success: true,
        testId: 'test-123',
        message: 'Test started successfully'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await testService.startTest('api', 'https://example.com', {}, 'API Test');

      expect(fetch).toHaveBeenCalledWith('/api/test/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'api',
          url: 'https://example.com',
          config: {},
          name: 'API Test'
        })
      });

      expect(result).toBe('test-123');
    });

    it('should handle start test failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid configuration' })
      });

      await expect(
        testService.startTest('api', 'https://example.com', {}, 'API Test')
      ).rejects.toThrow('Failed to start test: Invalid configuration');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        testService.startTest('api', 'https://example.com', {}, 'API Test')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getTestStatus', () => {
    it('should get test status successfully', async () => {
      const mockStatus = {
        testId: 'test-123',
        status: 'running',
        progress: 50,
        message: 'Test in progress'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      const result = await testService.getTestStatus('test-123');

      expect(fetch).toHaveBeenCalledWith('/api/test/test-123/status');
      expect(result).toEqual(mockStatus);
    });

    it('should handle status fetch failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Test not found' })
      });

      await expect(
        testService.getTestStatus('test-123')
      ).rejects.toThrow('Failed to get test status: Test not found');
    });
  });

  describe('stopTest', () => {
    it('should stop test successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Test stopped' })
      });

      await testService.stopTest('test-123');

      expect(fetch).toHaveBeenCalledWith('/api/test/test-123/stop', {
        method: 'POST'
      });
    });

    it('should handle stop test failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Cannot stop completed test' })
      });

      await expect(
        testService.stopTest('test-123')
      ).rejects.toThrow('Failed to stop test: Cannot stop completed test');
    });
  });

  describe('getTestResult', () => {
    it('should get test results successfully', async () => {
      const mockResults = {
        testId: 'test-123',
        status: 'completed',
        results: {
          score: 85,
          details: 'Test completed successfully'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const result = await testService.getTestResult('test-123');

      expect(fetch).toHaveBeenCalledWith('/api/test/test-123/result');
      expect(result).toEqual(mockResults);
    });
  });

  describe('progress and result callbacks', () => {
    it('should register progress callback', () => {
      const progressCallback = jest.fn();
      testService.onProgress('test-123', progressCallback);

      // Simulate progress update
      testService.handleProgressUpdate('test-123', { progress: 50 });

      expect(progressCallback).toHaveBeenCalledWith({ progress: 50 });
    });

    it('should register result callback', () => {
      const resultCallback = jest.fn();
      testService.onResult('test-123', resultCallback);

      // Simulate result update
      testService.handleResultUpdate('test-123', { status: 'completed' });

      expect(resultCallback).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should handle multiple callbacks for same test', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testService.onProgress('test-123', callback1);
      testService.onProgress('test-123', callback2);

      testService.handleProgressUpdate('test-123', { progress: 75 });

      expect(callback1).toHaveBeenCalledWith({ progress: 75 });
      expect(callback2).toHaveBeenCalledWith({ progress: 75 });
    });
  });
});
