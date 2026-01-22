import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';

jest.mock('axios');

let WebsiteTestEngine: any;

const mockHtml = `
  <html>
    <head>
      <title>Test Page</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <h1>Title</h1>
      <img src="/logo.png" alt="logo" />
      <a href="/home">Home</a>
    </body>
  </html>
`;

describe('WebsiteTestEngine', () => {
  beforeAll(async () => {
    const module = await import('../../../backend/engines/website/WebsiteTestEngine');
    WebsiteTestEngine = (module as any).default || module;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应执行综合测试并返回汇总结果', async () => {
    const engine = new WebsiteTestEngine();
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    engine.performanceEngine = {
      executeTest: jest.fn().mockResolvedValue({ results: { summary: { score: 82 } } }),
    };
    engine.seoEngine = {
      executeTest: jest.fn().mockResolvedValue({ summary: { score: 78 } }),
    };
    engine.accessibilityEngine = {
      executeTest: jest.fn().mockResolvedValue({ results: { summary: { score: 88 } } }),
    };

    const result = await engine.executeTest({ url: 'https://example.com' });

    expect(result.success).toBe(true);
    expect(result.results.summary.overallScore).toBeGreaterThan(0);
    expect(result.results.checks.basic).toBeTruthy();
    expect(result.results.checks.performance).toBeTruthy();
  });

  it('缺少URL时应抛出错误', async () => {
    const engine = new WebsiteTestEngine();
    await expect(engine.executeTest({})).rejects.toThrow('网站测试URL不能为空');
  });
});
