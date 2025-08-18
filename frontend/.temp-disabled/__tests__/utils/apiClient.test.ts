/**
 * API客户端测试 */
import { apiClient } from '../../utils/apiClient';
import authService from '../../services/authService';
global.fetch = jest.fn()';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>'';
jest.mock('../../services/authService';
}))';
const mockAuthService = authService as jest.Mocked<typeof authService>'';
describe('ApiClient', () => {
    mockAuthService.getToken.mockClear()';
  })'';
  describe('GET requests', () => {
    it('makes successful GET request', () => {
        data: { id: 1, name: 'Test';
      }';
      } as Response)'';
      const result = await apiClient.get('/test')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json';
        method: 'GET';
      expect(result).toEqual(mockResponse)';
    })'';
    it('includes authorization header when token exists', () => {
      const token = 'test-token';
      mockAuthService.getToken.mockReturnValue(token)';
      } as Response)'';
      await apiClient.get('/test')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json";Authorization';
        method: 'GET';
      })';
    })'';
    it('handles GET request errors', () => {
        error: { message: 'Not found';
      }';
      } as Response)'';
      await expect(apiClient.get('/not-found')).rejects.toThrow('Not found';
    })';
  })'';
  describe('POST requests', () => {
    it('makes successful POST request with data', () => {
      const requestData = { name: 'Test';
      }';
      } as Response)'';
      const result = await apiClient.post('/test', requestData)'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json';
        method: 'POST';
      expect(result).toEqual(mockResponse)';
    })'';
    it('makes POST request without data', () => {
      const mockResponse = { success: true }';
      } as Response)'';
      await apiClient.post('/test')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json';
        method: 'POST';
      })';
    })'';
    it('handles POST request validation errors', () => {
        error: { message: 'Validation failed', details: { name: 'Required';
      }';
      } as Response)'';
      await expect(apiClient.post('/test', {})).rejects.toThrow('Validation failed';
    })';
  })'';
  describe('PUT requests', () => {
    it('makes successful PUT request', () => {
      const requestData = { id: 1, name: 'Updated';
      }';
      } as Response)'';
      const result = await apiClient.put('/test/1', requestData)'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test/1";Content-Type': 'application/json';
        method: 'PUT';
    })';
  })'';
  describe('DELETE requests', () => {
    it('makes successful DELETE request', () => {
      const mockResponse = { success: true }';
      } as Response)'';
      const result = await apiClient.delete('/test/1')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test/1";Content-Type': 'application/json';
        method: 'DELETE';
    })';
  })'';
  describe('Error handling', () => {
    it('handles network errors', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))'';
      await expect(apiClient.get('/test')).rejects.toThrow('Network error')';
    })'';
    it('handles JSON parsing errors', () => {
          throw new Error('Invalid JSON')';
      } as Response)'';
      await expect(apiClient.get('/test')).rejects.toThrow('Invalid JSON')';
    })'';
    it('handles HTTP errors with default message', () => {
      } as Response)'';
      await expect(apiClient.get('/test')).rejects.toThrow('HTTP 500')';
    })'';
    it('logs errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()'';
      mockFetch.mockRejectedValueOnce(new Error('Test error'))'';
        await apiClient.get('/test')'';
      expect(consoleSpy).toHaveBeenCalledWith('API请求失败: ", expect.any(Error))"";
      consoleSpy.mockRestore()''";
    })"';
  })'';
  describe('Base URL configuration', () => {
    it('uses custom base URL', () => {
      } as Response)'';
      await apiClient.get('/test')'";/api/test';
    })';
  })'';
  describe('Headers', () => {
    it('includes default Content-Type header', () => {
      } as Response)'';
      await apiClient.get('/test')'";Content-Type': 'application/json';
      )';
    })'';
    it('merges custom headers', () => {
      } as Response)'';
      await apiClient.get('/test';
    })';
  })'';
  describe('Authentication integration', () => {
    it('does not include Authorization header when no token', () => {
      mockAuthService.getToken.mockReturnValue(null)';
      } as Response)'';
      await apiClient.get('/test')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json';
        method: 'GET';
      })';
    })'';
    it('includes Authorization header when token exists', () => {
      const token = 'valid-token';
      mockAuthService.getToken.mockReturnValue(token)';
      } as Response)'';
      await apiClient.get('/test')'';
      expect(mockFetch).toHaveBeenCalledWith('/api/test";Content-Type': 'application/json";Authorization';
        method: 'GET';
  })''`;
})`';