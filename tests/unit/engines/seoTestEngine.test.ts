import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';

jest.mock('axios');

let SeoTestEngine: any;

const mockHtml = `
  <html>
    <head>
      <title>SEO Title Example</title>
      <meta name="description" content="A long enough description for testing SEO behavior." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <h1>Main Heading</h1>
      <img src="/image.png" alt="image" />
      <a href="/internal">Internal</a>
    </body>
  </html>
`;

describe('SeoTestEngine', () => {
  beforeAll(async () => {
    const module = await import('../../../backend/engines/seo/SEOTestEngine');
    SeoTestEngine = (module as any).default || module;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应执行SEO检查并返回结果', async () => {
    const engine = new SeoTestEngine();
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValue({ data: mockHtml, status: 200 });

    const result = await engine.execute({ url: 'https://example.com' });

    expect(result.success).toBe(true);
    expect(result.results.summary).toBeTruthy();
    expect(result.results.metrics).toBeTruthy();
  });

  it('URL非法时应报错', async () => {
    const engine = new SeoTestEngine();
    await expect(engine.execute({ url: 'not-a-url' })).rejects.toThrow();
  });
});
