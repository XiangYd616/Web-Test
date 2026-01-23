const UXTestEngine = require('../../engines/ux/UXTestEngine');

const mockLaunch = jest.fn();
const mockNewPage = jest.fn();
const mockGoto = jest.fn();
const mockSetUserAgent = jest.fn();
const mockSetViewport = jest.fn();
const mockEvaluate = jest.fn();
const mockClose = jest.fn();

jest.mock('puppeteer', () => ({
  launch: (...args: unknown[]) => mockLaunch(...args),
}));

const createPageMock = () => ({
  on: jest.fn(),
  goto: mockGoto,
  setUserAgent: mockSetUserAgent,
  setViewport: mockSetViewport,
  evaluate: mockEvaluate,
});

const createBrowserMock = () => ({
  newPage: mockNewPage,
  close: mockClose,
});

describe('UXTestEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNewPage.mockResolvedValue(createPageMock());
    mockLaunch.mockResolvedValue(createBrowserMock());
  });

  test('应在缺少URL时抛出错误', async () => {
    const engine = new UXTestEngine();
    await expect(engine.executeTest({})).rejects.toThrow('UX测试URL不能为空');
  });

  test('应在未确认Puppeteer时抛出错误', async () => {
    const engine = new UXTestEngine();
    await expect(engine.executeTest({ url: 'https://example.com' })).rejects.toThrow(
      '需确认Puppeteer环境后才能执行UX测试'
    );
  });

  test('应返回UX指标与评分', async () => {
    const engine = new UXTestEngine();
    mockEvaluate.mockResolvedValue({
      navigation: { ttfb: 1200 },
      fcp: 900,
      lcp: 3200,
      fid: 45,
      cls: 0.2,
      userAgent: 'jest',
      timestamp: new Date().toISOString(),
    });

    const result = await engine.executeTest({
      url: 'https://example.com',
      timeout: 1000,
      confirmPuppeteer: true,
    });

    expect(result.success).toBe(true);
    expect(result.results.metrics).toBeDefined();
    expect(result.results.metrics.fcp).toBe(900);
    expect(result.results.metrics.lcp).toBe(3200);
    expect(result.results.metrics.fid).toBe(45);
    expect(result.results.score).toBeGreaterThanOrEqual(0);
    expect(result.results.grade).toBeDefined();
  });
});
