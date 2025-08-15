import { configService } from '../configService';

// Mock fetch
global.fetch = jest.fn();

describe('ConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('getDefaultConfig', () => {
    it('should return default config for test type', () => {
      const apiConfig = configService.getDefaultConfig('api');

      expect(apiConfig).toHaveProperty('baseUrl');
      expect(apiConfig).toHaveProperty('timeout');
      expect(apiConfig).toHaveProperty('retries');
    });

    it('should return empty config for unknown test type', () => {
      const unknownConfig = configService.getDefaultConfig('unknown' as any);

      expect(unknownConfig).toEqual({});
    });
  });

  describe('validateConfig', () => {
    it('should validate API config successfully', () => {
      const validConfig = {
        baseUrl: 'https://api.example.com',
        endpoints: [
          {
            name: 'Test Endpoint',
            method: 'GET',
            path: '/test',
            expectedStatus: [200]
          }
        ],
        timeout: 10000
      };

      const result = configService.validateConfig('api', validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid config', () => {
      const invalidConfig = {
        // missing baseUrl
        endpoints: [],
        timeout: -1 // invalid timeout
      };

      const result = configService.validateConfig('api', invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('baseUrl is required');
    });
  });

  describe('saveConfigTemplate', () => {
    it('should save config template successfully', async () => {
      const template = {
        name: 'My API Template',
        testType: 'api',
        config: { baseUrl: 'https://api.example.com' },
        description: 'Custom API template'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'template-123' })
      });

      const result = await configService.saveConfigTemplate(template);

      expect(fetch).toHaveBeenCalledWith('/api/config/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });

      expect(result).toBe('template-123');
    });
  });

  describe('getConfigTemplates', () => {
    it('should get config templates for test type', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'API Template 1',
          testType: 'api',
          config: { baseUrl: 'https://api1.example.com' }
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTemplates })
      });

      const result = await configService.getConfigTemplates('api');

      expect(fetch).toHaveBeenCalledWith('/api/config/templates?type=api');
      expect(result).toEqual(mockTemplates);
    });
  });
});
