const { APITestEngine } = require('../../engines/api/APITestEngine');
const { SecurityTestEngine } = require('../../engines/security/SecurityTestEngine');
const { StressTestEngine } = require('../../engines/stress/StressTestEngine');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');

describe('Service Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('API Test Engine Integration', () => {
    let apiEngine;

    beforeEach(() => {
      apiEngine = new APITestEngine();
    });

    it('should run complete API test workflow', async () => {
      const config = {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [
          {
            name: 'Get Post',
            method: 'GET',
            path: '/posts/1',
            expectedStatus: [200]
          }
        ],
        timeout: 10000
      };

      const result = await apiEngine.runAPITest('https://jsonplaceholder.typicode.com', config);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.summary).toBeDefined();
      expect(result.results.endpoints).toHaveLength(1);
      expect(result.results.endpoints[0].success).toBe(true);
    });

    it('should handle API test failures gracefully', async () => {
      const config = {
        baseUrl: 'https://nonexistent-api.example.com',
        endpoints: [
          {
            name: 'Invalid Endpoint',
            method: 'GET',
            path: '/invalid',
            expectedStatus: [200]
          }
        ],
        timeout: 5000
      };

      const result = await apiEngine.runAPITest('https://nonexistent-api.example.com', config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Security Test Engine Integration', () => {
    let securityEngine;

    beforeEach(() => {
      securityEngine = new SecurityTestEngine();
    });

    it('should run complete security test workflow', async () => {
      const config = {
        checkSSL: true,
        checkHeaders: true,
        checkCookies: true,
        depth: 'basic',
        timeout: 30000
      };

      const result = await securityEngine.runSecurityTest('https://example.com', config);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.ssl).toBeDefined();
      expect(result.results.headers).toBeDefined();
      expect(result.results.score).toBeGreaterThanOrEqual(0);
    });

    it('should detect security issues', async () => {
      const config = {
        checkSSL: true,
        checkHeaders: true,
        depth: 'standard',
        timeout: 30000
      };

      // Test against a site with known security issues (for testing)
      const result = await securityEngine.runSecurityTest('http://example.com', config);

      expect(result.success).toBe(true);
      expect(result.results.issues).toBeDefined();
      expect(Array.isArray(result.results.issues)).toBe(true);
    });
  });

  describe('Stress Test Engine Integration', () => {
    let stressEngine;

    beforeEach(() => {
      stressEngine = new StressTestEngine();
    });

    it('should run basic stress test', async () => {
      const config = {
        duration: 5, // Short duration for testing
        concurrency: 2,
        rampUp: 1,
        rampDown: 1,
        timeout: 10000
      };

      const result = await stressEngine.runStressTest('https://httpbin.org/get', config);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.summary).toBeDefined();
      expect(result.results.summary.totalRequests).toBeGreaterThan(0);
      expect(result.results.summary.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle stress test cancellation', async () => {
      const config = {
        duration: 30, // Longer duration
        concurrency: 5,
        timeout: 10000
      };

      // Start stress test
      const testPromise = stressEngine.runStressTest('https://httpbin.org/delay/1', config);

      // Cancel after 2 seconds
      setTimeout(() => {
        stressEngine.stopTest();
      }, 2000);

      const result = await testPromise;

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle multiple concurrent tests', async () => {
      const apiEngine = new APITestEngine();
      const securityEngine = new SecurityTestEngine();

      const apiConfig = {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [
          {
            name: 'Get Posts',
            method: 'GET',
            path: '/posts',
            expectedStatus: [200]
          }
        ]
      };

      const securityConfig = {
        checkSSL: true,
        checkHeaders: true,
        depth: 'basic'
      };

      // Run tests concurrently
      const [apiResult, securityResult] = await Promise.all([
        apiEngine.runAPITest('https://jsonplaceholder.typicode.com', apiConfig),
        securityEngine.runSecurityTest('https://example.com', securityConfig)
      ]);

      expect(apiResult.success).toBe(true);
      expect(securityResult.success).toBe(true);
    });

    it('should maintain test isolation', async () => {
      const engine1 = new APITestEngine();
      const engine2 = new APITestEngine();

      const config1 = {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [{ name: 'Test 1', method: 'GET', path: '/posts/1', expectedStatus: [200] }]
      };

      const config2 = {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [{ name: 'Test 2', method: 'GET', path: '/posts/2', expectedStatus: [200] }]
      };

      const [result1, result2] = await Promise.all([
        engine1.runAPITest('https://jsonplaceholder.typicode.com', config1),
        engine2.runAPITest('https://jsonplaceholder.typicode.com', config2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.results.endpoints[0].name).toBe('Test 1');
      expect(result2.results.endpoints[0].name).toBe('Test 2');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      const apiEngine = new APITestEngine();

      const config = {
        baseUrl: 'https://httpbin.org',
        endpoints: [
          {
            name: 'Timeout Test',
            method: 'GET',
            path: '/delay/10', // 10 second delay
            expectedStatus: [200]
          }
        ],
        timeout: 2000 // 2 second timeout
      };

      const result = await apiEngine.runAPITest('https://httpbin.org', config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should recover from temporary failures', async () => {
      const apiEngine = new APITestEngine();

      const config = {
        baseUrl: 'https://httpbin.org',
        endpoints: [
          {
            name: 'Retry Test',
            method: 'GET',
            path: '/status/500', // Returns 500 error
            expectedStatus: [500] // We expect this error
          }
        ],
        retries: 2
      };

      const result = await apiEngine.runAPITest('https://httpbin.org', config);

      expect(result.success).toBe(true);
      expect(result.results.endpoints[0].statusCode).toBe(500);
    });
  });
});
