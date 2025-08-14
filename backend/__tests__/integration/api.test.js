const request = require('supertest');
const app = require('../../app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('POST /api/test/start', () => {
    it('should start an API test successfully', async () => {
      const testConfig = {
        type: 'api',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        config: {
          method: 'GET',
          timeout: 5000
        },
        name: 'Test API Endpoint'
      };

      const response = await request(app)
        .post('/api/test/start')
        .send(testConfig)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('testId');
      expect(response.body.testId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });

    it('should validate required fields', async () => {
      const invalidConfig = {
        type: 'api',
        // missing url
        config: {},
        name: 'Invalid Test'
      };

      const response = await request(app)
        .post('/api/test/start')
        .send(invalidConfig)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid test type', async () => {
      const invalidConfig = {
        type: 'invalid-type',
        url: 'https://example.com',
        config: {},
        name: 'Invalid Type Test'
      };

      const response = await request(app)
        .post('/api/test/start')
        .send(invalidConfig)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid test type');
    });
  });

  describe('GET /api/test/:testId/status', () => {
    let testId;

    beforeEach(async () => {
      // Start a test to get a valid test ID
      const testConfig = {
        type: 'api',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        config: { method: 'GET' },
        name: 'Status Test'
      };

      const startResponse = await request(app)
        .post('/api/test/start')
        .send(testConfig);

      testId = startResponse.body.testId;
    });

    it('should get test status successfully', async () => {
      const response = await request(app)
        .get(`/api/test/${testId}/status`)
        .expect(200);

      expect(response.body).toHaveProperty('testId', testId);
      expect(response.body).toHaveProperty('status');
      expect(['pending', 'running', 'completed', 'failed']).toContain(response.body.status);
    });

    it('should return 404 for non-existent test', async () => {
      const fakeTestId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/test/${fakeTestId}/status`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Test not found');
    });

    it('should return 400 for invalid test ID format', async () => {
      const invalidTestId = 'invalid-id';

      const response = await request(app)
        .get(`/api/test/${invalidTestId}/status`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid test ID format');
    });
  });

  describe('POST /api/test/:testId/stop', () => {
    let testId;

    beforeEach(async () => {
      const testConfig = {
        type: 'stress',
        url: 'https://httpbin.org/delay/10', // Long-running request
        config: {
          duration: 30,
          concurrency: 5
        },
        name: 'Stop Test'
      };

      const startResponse = await request(app)
        .post('/api/test/start')
        .send(testConfig);

      testId = startResponse.body.testId;

      // Wait a bit to ensure test is running
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should stop a running test successfully', async () => {
      const response = await request(app)
        .post(`/api/test/${testId}/stop`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify test is actually stopped
      const statusResponse = await request(app)
        .get(`/api/test/${testId}/status`);

      expect(['cancelled', 'stopped']).toContain(statusResponse.body.status);
    });

    it('should return 404 for non-existent test', async () => {
      const fakeTestId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/test/${fakeTestId}/stop`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/test/:testId/result', () => {
    let testId;

    beforeEach(async () => {
      const testConfig = {
        type: 'api',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        config: { method: 'GET' },
        name: 'Result Test'
      };

      const startResponse = await request(app)
        .post('/api/test/start')
        .send(testConfig);

      testId = startResponse.body.testId;

      // Wait for test to complete
      let status = 'pending';
      while (status !== 'completed' && status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 500));
        const statusResponse = await request(app)
          .get(`/api/test/${testId}/status`);
        status = statusResponse.body.status;
      }
    });

    it('should get test results successfully', async () => {
      const response = await request(app)
        .get(`/api/test/${testId}/result`)
        .expect(200);

      expect(response.body).toHaveProperty('testId', testId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
    });

    it('should return 404 for non-existent test', async () => {
      const fakeTestId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/test/${fakeTestId}/result`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/history', () => {
    beforeEach(async () => {
      // Create some test history
      const testConfigs = [
        {
          type: 'api',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          config: { method: 'GET' },
          name: 'History Test 1'
        },
        {
          type: 'security',
          url: 'https://example.com',
          config: { checkSSL: true },
          name: 'History Test 2'
        }
      ];

      for (const config of testConfigs) {
        await request(app)
          .post('/api/test/start')
          .send(config);
      }
    });

    it('should get test history successfully', async () => {
      const response = await request(app)
        .get('/api/history')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/history?page=1&limit=1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should support filtering by test type', async () => {
      const response = await request(app)
        .get('/api/history?type=api')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every(test => test.type === 'api')).toBe(true);
    });
  });
});
