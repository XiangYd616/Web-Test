import type { StandardResponse } from '../types/api.types';
import { getLocalTestEngine } from '../utils/environment';
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  generateLocalId,
  localQuery,
} from '../utils/localDb';
import { apiClient, unwrapResponse } from './apiClient';
import { routeByMode } from './serviceAdapter';

const unwrap = <T>(payload: StandardResponse<T>) => unwrapResponse(payload);

const getElectronTestEngine = getLocalTestEngine;

const normalizeHistoryItem = (item: Record<string, unknown>) => ({
  id: String(item.test_id || item.testId || item.id || ''),
  testType: String(item.testType || item.engine_type || 'performance'),
  url: String(item.url || item.test_url || ''),
  status: String(item.status || 'pending'),
  score: (() => {
    const raw = item.score;
    if (raw === null || raw === undefined || raw === '') {
      return undefined;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  })(),
  createdAt: item.createdAt || item.created_at || null,
  updatedAt: item.updatedAt || item.updated_at || null,
  testConfig:
    (item.testConfig as Record<string, unknown> | undefined) ||
    (item.test_config as Record<string, unknown> | undefined) ||
    undefined,
  tags:
    (item.tags as string[] | undefined) ||
    ((item.testConfig as Record<string, unknown> | undefined)?.tags as string[] | undefined) ||
    ((item.test_config as Record<string, unknown> | undefined)?.tags as string[] | undefined) ||
    [],
});

const normalizeHistoryDetail = (item: Record<string, unknown>) => ({
  ...item,
  id: String(item.test_id || item.testId || item.id || ''),
  testType: String(item.testType || item.engine_type || 'performance'),
  url: String(item.url || item.test_url || ''),
  status: String(item.status || 'pending'),
  createdAt: item.createdAt || item.created_at || null,
  updatedAt: item.updatedAt || item.updated_at || null,
  tags:
    (item.tags as string[] | undefined) ||
    ((item.testConfig as Record<string, unknown> | undefined)?.tags as string[] | undefined) ||
    ((item.test_config as Record<string, unknown> | undefined)?.tags as string[] | undefined) ||
    [],
});

const normalizeTemplateItem = (item: Record<string, unknown>) => ({
  id: String(item.id || ''),
  name: String(item.name || item.template_name || 'Untitled'),
  engineType: String(item.engineType || item.engine_type || 'performance'),
  description: String(item.description || ''),
  isPublic: Boolean(item.isPublic ?? item.is_public),
  isDefault: Boolean(item.isDefault ?? item.is_default),
  userId: (item.userId ?? item.user_id) as string | null | undefined,
  config: item.config as Record<string, unknown>,
  usageCount: Number(item.usageCount ?? item.usage_count ?? 0),
  tags: Array.isArray(item.tags)
    ? (item.tags as string[])
    : typeof item.tags === 'string'
      ? safeParseJson<string[]>(item.tags, [])
      : [],
  createdAt: item.createdAt
    ? String(item.createdAt)
    : item.created_at
      ? String(item.created_at)
      : undefined,
  updatedAt: item.updatedAt
    ? String(item.updatedAt)
    : item.updated_at
      ? String(item.updated_at)
      : undefined,
});

const safeParseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export type TestConfigPayload = {
  testId?: string;
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  concurrency?: number;
  duration?: number;
  templateId?: string;
  workspaceId?: string;
};

export const createAndStartTest = async (payload: TestConfigPayload) => {
  const electron = getElectronTestEngine();
  if (electron) {
    const result = await electron.startLocalTest({
      testType: payload.testType,
      url: payload.url,
      config: payload,
    });
    return {
      testId: result.testId || result.id,
      status: result.status,
    } as Record<string, unknown>;
  }
  const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
    '/test/create-and-start',
    payload
  );
  return unwrap(data);
};

export const getTestStatus = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.getLocalTestStatus({ testId });
  }
  const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/status`,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const getTestProgress = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.getLocalTestProgress({ testId });
  }
  const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/progress`,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const getTestResult = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.getLocalTestResult({ testId });
  }
  const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/result`,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const getTestLogs = async (
  testId: string,
  params?: { workspaceId?: string; limit?: number; offset?: number; level?: string }
) => {
  const electron = getElectronTestEngine();
  if (electron) {
    const data = await electron.getLocalTestLogs({
      testId,
      limit: params?.limit,
      offset: params?.offset,
      level: params?.level,
    });
    return {
      logs: (data.logs || []).map((log: Record<string, unknown>) => ({
        level: String(log.level || 'info'),
        message: String(log.message || ''),
        createdAt: log.createdAt || log.created_at || null,
        context:
          log.context && typeof log.context === 'object' && !Array.isArray(log.context)
            ? (log.context as Record<string, unknown>)
            : undefined,
      })),
    };
  }
  const { data } = await apiClient.get<StandardResponse<{ logs: Array<Record<string, unknown>> }>>(
    `/test/${testId}/logs`,
    { params }
  );
  return unwrap(data);
};

export const getTestHistory = async (params?: {
  testType?: string;
  page?: number;
  limit?: number;
  workspaceId?: string;
  keyword?: string;
}) => {
  const electron = getElectronTestEngine();
  if (electron) {
    const payload = await electron.getLocalTestHistory({
      page: params?.page,
      limit: params?.limit,
      testType: params?.testType,
      keyword: params?.keyword,
    });
    return {
      ...payload,
      tests: (payload.tests || []).map(normalizeHistoryItem),
    };
  }
  const { data } = await apiClient.get<
    StandardResponse<{ tests: Array<Record<string, unknown>>; pagination: Record<string, unknown> }>
  >('/test/history', { params });
  const payload = unwrap(data);
  return {
    ...payload,
    tests: (payload.tests || []).map(normalizeHistoryItem),
  };
};

export const getTestTemplates = routeByMode(
  async (params?: { engineType?: string; workspaceId?: string }) => {
    const conditions = ['1=1'];
    const sqlParams: unknown[] = [];
    if (params?.engineType) {
      conditions.push('engine_type = ?');
      sqlParams.push(params.engineType);
    }
    const { rows } = await localQuery(
      `SELECT * FROM test_templates WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      sqlParams
    );
    return rows.map((row: Record<string, unknown>) =>
      normalizeTemplateItem({
        ...row,
        config: typeof row.config === 'string' ? JSON.parse(row.config as string) : row.config,
        isPublic: Boolean(row.is_public),
        isDefault: Boolean(row.is_default),
        engineType: row.engine_type,
      })
    );
  },
  async (params?: { engineType?: string; workspaceId?: string }) => {
    const { data } = await apiClient.get<StandardResponse<Array<Record<string, unknown>>>>(
      '/test/templates',
      { params }
    );
    return (unwrap(data) || []).map(normalizeTemplateItem);
  }
);

export type TemplatePayload = {
  name: string;
  description?: string;
  engineType: string;
  config: Record<string, unknown>;
  isPublic?: boolean;
  isDefault?: boolean;
  workspaceId?: string;
};

export const createTemplate = routeByMode(
  async (payload: TemplatePayload) => {
    const id = generateLocalId();
    const now = new Date().toISOString();
    await localQuery(
      'INSERT INTO test_templates (id, user_id, workspace_id, engine_type, name, description, config, is_public, is_default, usage_count, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        DEFAULT_USER_ID,
        payload.workspaceId || DEFAULT_WORKSPACE_ID,
        payload.engineType,
        payload.name,
        payload.description || '',
        JSON.stringify(payload.config),
        payload.isPublic ? 1 : 0,
        payload.isDefault ? 1 : 0,
        0,
        '[]',
        now,
        now,
      ]
    );
    return normalizeTemplateItem({
      id,
      name: payload.name,
      description: payload.description || '',
      engineType: payload.engineType,
      config: payload.config,
      isPublic: payload.isPublic,
      isDefault: payload.isDefault,
      created_at: now,
      updated_at: now,
    });
  },
  async (payload: TemplatePayload) => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      '/test/templates',
      payload
    );
    return unwrap(data);
  }
);

export const updateTemplate = routeByMode(
  async (templateId: string, payload: Partial<TemplatePayload>) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (payload.name !== undefined) {
      sets.push('name = ?');
      params.push(payload.name);
    }
    if (payload.description !== undefined) {
      sets.push('description = ?');
      params.push(payload.description);
    }
    if (payload.engineType !== undefined) {
      sets.push('engine_type = ?');
      params.push(payload.engineType);
    }
    if (payload.config !== undefined) {
      sets.push('config = ?');
      params.push(JSON.stringify(payload.config));
    }
    if (payload.isPublic !== undefined) {
      sets.push('is_public = ?');
      params.push(payload.isPublic ? 1 : 0);
    }
    if (payload.isDefault !== undefined) {
      sets.push('is_default = ?');
      params.push(payload.isDefault ? 1 : 0);
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(templateId);
    await localQuery(`UPDATE test_templates SET ${sets.join(', ')} WHERE id = ?`, params);
    const { rows } = await localQuery('SELECT * FROM test_templates WHERE id = ?', [templateId]);
    if (rows.length === 0) throw new Error('模板不存在');
    const row = rows[0];
    return normalizeTemplateItem({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config as string) : row.config,
      isPublic: Boolean(row.is_public),
      isDefault: Boolean(row.is_default),
      engineType: row.engine_type,
    });
  },
  async (templateId: string, payload: Partial<TemplatePayload>) => {
    const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
      `/test/templates/${templateId}`,
      payload
    );
    return unwrap(data);
  }
);

export const deleteTemplate = routeByMode(
  async (templateId: string, _workspaceId?: string) => {
    await localQuery('DELETE FROM test_templates WHERE id = ?', [templateId]);
    return null;
  },
  async (templateId: string, workspaceId?: string) => {
    const { data } = await apiClient.delete<StandardResponse<Record<string, unknown>>>(
      `/test/templates/${templateId}`,
      { params: workspaceId ? { workspaceId } : undefined }
    );
    return unwrap(data);
  }
);

export const previewTemplate = routeByMode(
  async (
    templateId: string,
    payload?: { variables?: Record<string, unknown>; workspaceId?: string }
  ) => {
    const { rows } = await localQuery('SELECT * FROM test_templates WHERE id = ?', [templateId]);
    if (rows.length === 0) throw new Error('模板不存在');
    const row = rows[0];
    const config = typeof row.config === 'string' ? JSON.parse(row.config as string) : row.config;
    if (payload?.variables) {
      let configStr = JSON.stringify(config);
      for (const [key, value] of Object.entries(payload.variables)) {
        configStr = configStr.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), String(value));
      }
      return JSON.parse(configStr);
    }
    return config;
  },
  async (
    templateId: string,
    payload?: { variables?: Record<string, unknown>; workspaceId?: string }
  ) => {
    const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
      `/test/templates/${templateId}/preview`,
      payload || {}
    );
    return unwrap(data);
  }
);

export const getHistoryDetail = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    const payload = await electron.getLocalTestDetail({ testId });
    return normalizeHistoryDetail(payload);
  }
  const { data } = await apiClient.get<StandardResponse<Record<string, unknown>>>(
    `/test/history/${testId}`,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return normalizeHistoryDetail(unwrap(data));
};

export const cancelTest = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.cancelLocalTest({ testId });
  }
  const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/cancel`,
    undefined,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const rerunTest = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.rerunLocalTest({ testId });
  }
  const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/rerun`,
    undefined,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const deleteTest = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.deleteLocalTest({ testId });
  }
  const { data } = await apiClient.delete<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}`,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const updateTest = async (
  testId: string,
  payload: Record<string, unknown>,
  workspaceId?: string
) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.updateLocalTest({ testId, tags: payload.tags as string[] | undefined });
  }
  const nextPayload = workspaceId ? { ...payload, workspaceId } : payload;
  const { data } = await apiClient.put<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}`,
    nextPayload,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};

export const exportTestResult = async (
  testId: string,
  options?: { workspaceId?: string; format?: string }
) => {
  const electron = getElectronTestEngine();
  if (electron) {
    const payload = await electron.getLocalTestResult({ testId });
    const format = options?.format || 'json';
    const contentType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
    const toCsv = (value: Record<string, unknown>) => {
      if (Array.isArray(value)) {
        const headers = Array.from(
          new Set(value.flatMap(item => Object.keys(item as Record<string, unknown>)))
        );
        const rows = value.map(item =>
          headers.map(key => JSON.stringify((item as Record<string, unknown>)[key] ?? '')).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }
      const headers = Object.keys(value);
      const row = headers.map(key => JSON.stringify(value[key] ?? '')).join(',');
      return [headers.join(','), row].join('\n');
    };
    const body =
      format === 'csv'
        ? toCsv(payload as Record<string, unknown>)
        : JSON.stringify(payload, null, 2);
    return { data: new Blob([body], { type: contentType }) } as { data: Blob };
  }
  const response = await apiClient.get(`/test/${testId}/export`, {
    params: {
      ...(options?.workspaceId ? { workspaceId: options.workspaceId } : {}),
      ...(options?.format ? { format: options.format } : {}),
    },
    responseType: 'blob',
  });
  return response;
};

export type PerformanceTrendPoint = {
  testId: string;
  createdAt: string;
  score: number | null;
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
};

export type PerformanceTrendResponse = {
  url: string;
  dataPoints: PerformanceTrendPoint[];
  trend: Record<string, string> | null;
};

export const getPerformanceTrend = routeByMode(
  async (
    url: string,
    params?: { workspaceId?: string; limit?: number }
  ): Promise<PerformanceTrendResponse> => {
    const limit = params?.limit ?? 20;
    try {
      const { rows } = await localQuery(
        `SELECT test_id, score, results, created_at
         FROM test_executions
         WHERE engine_type IN ('performance', 'website', 'ux')
           AND status = 'completed'
           AND test_url = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [url, limit]
      );
      const dataPoints: PerformanceTrendPoint[] = rows
        .map((row: Record<string, unknown>) => {
          const testId = String(row.test_id || '');
          const createdAt = String(row.created_at || '');
          const scoreVal = typeof row.score === 'number' ? row.score : null;
          let lcp: number | null = null;
          let fcp: number | null = null;
          let cls: number | null = null;
          let inp: number | null = null;
          let ttfb: number | null = null;
          try {
            const results = typeof row.results === 'string' ? JSON.parse(row.results) : row.results;
            // 尝试从多层嵌套中提取 webVitals
            const wv =
              results?.details?.results?.details?.webVitals ||
              results?.details?.details?.webVitals ||
              results?.summary?.webVitals ||
              results?.webVitals;
            if (wv && typeof wv === 'object') {
              lcp =
                typeof wv.lcp === 'number' ? wv.lcp : typeof wv.LCP === 'number' ? wv.LCP : null;
              fcp =
                typeof wv.fcp === 'number' ? wv.fcp : typeof wv.FCP === 'number' ? wv.FCP : null;
              cls =
                typeof wv.cls === 'number' ? wv.cls : typeof wv.CLS === 'number' ? wv.CLS : null;
              inp =
                typeof wv.inp === 'number' ? wv.inp : typeof wv.INP === 'number' ? wv.INP : null;
              ttfb =
                typeof wv.ttfb === 'number'
                  ? wv.ttfb
                  : typeof wv.TTFB === 'number'
                    ? wv.TTFB
                    : null;
            }
          } catch {
            /* ignore parse errors */
          }
          return { testId, createdAt, score: scoreVal, lcp, fcp, cls, inp, ttfb };
        })
        .reverse(); // 按时间正序
      return { url, dataPoints, trend: null };
    } catch {
      return { url, dataPoints: [], trend: null };
    }
  },
  async (
    url: string,
    params?: { workspaceId?: string; limit?: number }
  ): Promise<PerformanceTrendResponse> => {
    const { data } = await apiClient.get<StandardResponse<PerformanceTrendResponse>>(
      '/comparison/performance-trend',
      { params: { url, ...params } }
    );
    return unwrap(data);
  }
);

export const stopTest = async (testId: string, workspaceId?: string) => {
  const electron = getElectronTestEngine();
  if (electron) {
    return electron.cancelLocalTest({ testId });
  }
  const { data } = await apiClient.post<StandardResponse<Record<string, unknown>>>(
    `/test/${testId}/stop`,
    undefined,
    { params: workspaceId ? { workspaceId } : undefined }
  );
  return unwrap(data);
};
