import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';

jest.mock('axios');

let CompatibilityTestEngine: any;

const mockHtml = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <h1>Compatibility</h1>
    </body>
  </html>
`;

describe('CompatibilityTestEngine', () => {
  beforeAll(async () => {
    const module = await import('../../../backend/engines/compatibility/CompatibilityTestEngine');
    CompatibilityTestEngine = (module as any).default || module;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应执行兼容性测试并返回结果', async () => {
    const engine = new CompatibilityTestEngine();
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValue({ data: mockHtml, status: 200 });

    const result = await engine.executeTest({ url: 'https://example.com' });

    expect(result.success).toBe(true);
    expect(result.results.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.results.browsers.length).toBeGreaterThan(0);
  });

  it('缺少URL时应报错', async () => {
    const engine = new CompatibilityTestEngine();
    await expect(engine.executeTest({})).rejects.toThrow('兼容性测试URL不能为空');
  });
});
