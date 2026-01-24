const UXTestEngine = require('../../engines/ux/UXTestEngine');

jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../../repositories/testRepository', () => ({
  saveResult: jest.fn().mockResolvedValue('result-1'),
  saveMetrics: jest.fn().mockResolvedValue(undefined),
}));

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

const createProgressTracker = () => {
  const progressUpdates: Array<Record<string, unknown>> = [];
  return {
    progressUpdates,
    callback: (progress: Record<string, unknown>) => {
      progressUpdates.push(progress);
    },
  };
};

describe('UXTestEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNewPage.mockResolvedValue(createPageMock());
    mockLaunch.mockResolvedValue(createBrowserMock());
  });

  test('应在缺少URL时抛出错误', async () => {
    const engine = new UXTestEngine();
    await expect(engine.executeTest({})).rejects.toThrow('配置验证失败');
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
    expect(result.results.summary).toBeDefined();
    expect(result.results.summary.tags).toBeDefined();
    expect(result.results.summary.level).toBeDefined();
    expect(result.results.recommendations).toBeDefined();
  });

  test('浏览器启动失败时应返回失败结果', async () => {
    const engine = new UXTestEngine();
    mockLaunch.mockRejectedValue(new Error('launch failed'));

    const result = await engine.executeTest({
      url: 'https://example.com',
      timeout: 1000,
      confirmPuppeteer: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('launch failed');
  });

  test('应输出进度回调', async () => {
    const engine = new UXTestEngine();
    const tracker = createProgressTracker();
    engine.setProgressCallback(tracker.callback);
    mockEvaluate.mockResolvedValue({
      navigation: { ttfb: 900 },
      fcp: 800,
      lcp: 2400,
      fid: 35,
      cls: 0.05,
      userAgent: 'jest',
      timestamp: new Date().toISOString(),
    });

    await engine.executeTest({
      url: 'https://example.com',
      timeout: 1000,
      confirmPuppeteer: true,
    });

    expect(tracker.progressUpdates.length).toBeGreaterThan(0);
    expect(tracker.progressUpdates.some(item => item.progress === 100)).toBe(true);
  });
});
