/**
 * API集成测试
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../../backend/app'); // 假设有Express应用

describe('API集成测试', () => {
  let server;

  beforeAll(async () => {
    // 启动测试服务器
    server = app.listen(0);
  });

  afterAll(async () => {
    // 关闭测试服务器
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/test/performance', () => {
    it('应该能够启动性能测试', async () => {
      const response = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'https://example.com',
          config: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });

    it('应该验证URL参数', async () => {
      const response = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'invalid-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/test/:testId/status', () => {
    it('应该能够获取测试状态', async () => {
      // 先创建一个测试
      const createResponse = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'https://example.com'
        });

      const testId = createResponse.body.data.testId;

      // 获取测试状态
      const statusResponse = await request(app)
        .get(`/api/test/${testId}/status`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.testId).toBe(testId);
    });

    it('对于不存在的测试应该返回404', async () => {
      await request(app)
        .get('/api/test/nonexistent/status')
        .expect(404);
    });
  });

  describe('POST /api/test/seo', () => {
    it('应该能够启动SEO测试', async () => {
      const response = await request(app)
        .post('/api/test/seo')
        .send({
          url: 'https://example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });
  });

  describe('POST /api/test/security', () => {
    it('应该能够启动安全测试', async () => {
      const response = await request(app)
        .post('/api/test/security')
        .send({
          url: 'https://example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });
  });

  describe('GET /api/test/history', () => {
    it('应该能够获取测试历史', async () => {
      const response = await request(app)
        .get('/api/test/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/test/history?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });
});