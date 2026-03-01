import { apiClient } from './apiClient';
import { routeByMode } from './serviceAdapter';

const unwrap = (data: unknown) => {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: unknown }).data;
  }
  return data;
};

const DESKTOP_ENGINES = [
  'performance',
  'security',
  'seo',
  'accessibility',
  'compatibility',
  'ux',
  'stress',
  'website',
  'api',
];

/* ---------- 引擎状态 ---------- */

export const getEngineStatus = routeByMode(
  async () => ({
    mode: 'desktop',
    engines: DESKTOP_ENGINES.reduce((acc, e) => ({ ...acc, [e]: 'available' }), {}),
    timestamp: new Date().toISOString(),
  }),
  async () => {
    const { data } = await apiClient.get('/core/status');
    return unwrap(data) as Record<string, unknown>;
  }
);

export const getEnginesHealth = routeByMode(
  async () => ({
    engines: DESKTOP_ENGINES.map(type => ({
      type,
      status: 'healthy',
      initialized: true,
      lastUsed: null,
    })),
  }),
  async () => {
    const { data } = await apiClient.get('/core/engines/health');
    return unwrap(data) as Record<string, unknown>;
  }
);

export const healthCheck = routeByMode(
  async () => ({ status: 'ok', mode: 'desktop', timestamp: new Date().toISOString() }),
  async () => {
    const { data } = await apiClient.get('/core/health');
    return unwrap(data) as Record<string, unknown>;
  }
);

export const getEngineMetrics = routeByMode(
  async () => ({
    engines: DESKTOP_ENGINES.reduce(
      (acc, e) => ({
        ...acc,
        [e]: { activeTests: 0, totalRuns: 0 },
      }),
      {}
    ),
  }),
  async () => {
    const { data } = await apiClient.get('/core/metrics');
    return unwrap(data) as Record<string, unknown>;
  }
);

export const resetEngine = routeByMode(
  async (engineType?: string) => ({ success: true, engine: engineType || 'all' }),
  async (engineType?: string) => {
    const { data } = await apiClient.post('/core/reset', { engineType });
    return unwrap(data);
  }
);

/* ---------- 配置验证 ---------- */

export const validateConfig = routeByMode(
  async (config: Record<string, unknown>) => {
    const errors: string[] = [];
    if (!config.url) errors.push('URL 不能为空');
    return { isValid: errors.length === 0, errors } as {
      isValid: boolean;
      errors: string[];
      warnings?: string[];
    };
  },
  async (config: Record<string, unknown>) => {
    const { data } = await apiClient.post('/core/validate', config);
    return unwrap(data) as { isValid: boolean; errors: string[]; warnings?: string[] };
  }
);

/* ---------- 基准测试 ---------- */

export const runBenchmark = routeByMode(
  async (_config: Record<string, unknown>) =>
    ({ message: '桌面端暂不支持基准测试' }) as Record<string, unknown>,
  async (config: Record<string, unknown>) => {
    const { data } = await apiClient.post('/core/benchmark', config);
    return unwrap(data) as Record<string, unknown>;
  }
);

export const getCoreBenchmarks = routeByMode(
  async () => [] as Record<string, unknown>[],
  async () => {
    const { data } = await apiClient.get('/core/benchmarks');
    return unwrap(data) as Record<string, unknown>[];
  }
);

/* ---------- Puppeteer 浏览器引擎状态 ---------- */

export interface PuppeteerStatus {
  available: boolean;
  browserLaunchVerified: boolean;
  electronMode: boolean;
  chromiumPath: string | null;
  chromiumSource: string;
  chromiumVersion: string | null;
  browsers: number;
  totalActivePages: number;
  waitQueueLength: number;
  launchFailures: number;
  totalLaunchAttempts: number;
  lastLaunchError: string | null;
  totalPagesServed: number;
  config: {
    maxBrowsers: number;
    maxPagesPerBrowser: number;
    maxTotalPages: number;
  };
  error?: string;
}

export const getPuppeteerStatus = routeByMode(
  async (): Promise<PuppeteerStatus> => {
    if (window.electronAPI?.puppeteer?.getStatus) {
      return (await window.electronAPI.puppeteer.getStatus()) as unknown as PuppeteerStatus;
    }
    return {
      available: false,
      browserLaunchVerified: false,
      electronMode: true,
      chromiumPath: null,
      chromiumSource: 'unknown',
      chromiumVersion: null,
      browsers: 0,
      totalActivePages: 0,
      waitQueueLength: 0,
      launchFailures: 0,
      totalLaunchAttempts: 0,
      lastLaunchError: 'IPC 未就绪',
      totalPagesServed: 0,
      config: { maxBrowsers: 0, maxPagesPerBrowser: 0, maxTotalPages: 0 },
      error: 'electronAPI.puppeteer 不可用',
    };
  },
  async (): Promise<PuppeteerStatus> => {
    const { data } = await apiClient.get('/core/puppeteer/status');
    return unwrap(data) as PuppeteerStatus;
  }
);

export const resetPuppeteerPool = routeByMode(
  async (): Promise<{ success: boolean; error?: string }> => {
    if (window.electronAPI?.puppeteer?.reset) {
      return await window.electronAPI.puppeteer.reset();
    }
    return { success: false, error: 'electronAPI.puppeteer 不可用' };
  },
  async (): Promise<{ success: boolean; error?: string }> => {
    const { data } = await apiClient.post('/core/puppeteer/reset');
    return unwrap(data) as { success: boolean; error?: string };
  }
);
