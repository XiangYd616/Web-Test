import localTestExecutionService from './localTestExecutionService';
import { normalizeTestLogLevel } from './localTestLogService';
import localTestOperationsRepository from './localTestOperationsRepository';
import localTestRepository, { type TestExecutionRecord } from './localTestRepository';

const parseTestConfig = (config?: string | null) => {
  if (!config) return {} as Record<string, unknown>;
  try {
    return typeof config === 'string' ? JSON.parse(config) : config;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 将引擎原始 BaseTestResult 包装成前端图表面板期望的格式。
 *
 * 服务端 testService.buildNormalizedDetails 从多张表拼装数据；
 * 桌面端直接存了引擎返回的 BaseTestResult，需要在返回前端之前做对等转换。
 *
 * 前端 parseResultPayloadText 期望顶层：{ summary, metrics, details, score, ... }
 * 其中 details.details.{webVitals, metrics, resources, recommendations} 是图表数据来源。
 */
const buildNormalizedResult = (
  engineType: string,
  raw: Record<string, unknown>
): Record<string, unknown> => {
  const summary = isRecord(raw.summary) ? raw.summary : {};
  const score =
    typeof raw.score === 'number'
      ? raw.score
      : typeof summary.score === 'number'
        ? summary.score
        : 0;
  // grade: 优先从 summary 取，不存在时根据分数自动生成
  const rawGrade = summary.grade;
  const grade =
    typeof rawGrade === 'string' && rawGrade
      ? rawGrade
      : score >= 90
        ? 'A'
        : score >= 75
          ? 'B'
          : score >= 60
            ? 'C'
            : score >= 40
              ? 'D'
              : 'F';
  const passed =
    typeof summary.passed === 'boolean'
      ? summary.passed
      : typeof raw.passed === 'boolean'
        ? raw.passed
        : score >= 60;

  // 引擎存储的 details 里有 results.details 才是图表数据
  const rawDetails = isRecord(raw.details) ? raw.details : {};

  // 性能引擎：details = { engine, version, success, results: { details: { webVitals, metrics, resources, ... } } }
  // 安全引擎：details 直接包含分析结果
  // 其它引擎：summary 中嵌入了图表数据
  let chartDetails: Record<string, unknown> = {};

  if (engineType === 'performance') {
    // 从 details.results.details 提取图表数据
    const results = isRecord(rawDetails.results) ? rawDetails.results : rawDetails;
    const innerDetails = isRecord(results.details) ? results.details : {};
    const innerSummary = isRecord(results.summary) ? results.summary : summary;
    chartDetails = {
      ...innerDetails,
      // 确保 summary 中的 webVitals/performanceMetrics 也可用
      webVitals:
        innerDetails.webVitals || (isRecord(innerSummary) ? innerSummary.webVitals : undefined),
      metrics: innerDetails.metrics || results.metrics,
      resources: innerDetails.resources,
      recommendations:
        innerDetails.recommendations || results.recommendations || raw.recommendations,
      httpInfo: innerDetails.httpInfo,
      contentAnalysis: innerDetails.contentAnalysis,
      iterations: innerDetails.iterations || results.iterations,
    };
  } else if (engineType === 'security') {
    chartDetails = rawDetails;
  } else if (engineType === 'seo') {
    chartDetails = rawDetails;
  } else if (engineType === 'accessibility') {
    // summary 中嵌入了 checks/recommendations
    const s = summary as Record<string, unknown>;
    if (s.checks) {
      chartDetails = {
        checks: s.checks,
        summary: s.summary ?? summary,
        recommendations: s.recommendations ?? [],
      };
    } else {
      chartDetails = rawDetails;
    }
  } else if (engineType === 'compatibility') {
    const s = summary as Record<string, unknown>;
    if (s.browsers || s.devices || s.matrix) {
      chartDetails = {
        summary: {
          overallScore: s.overallScore,
          browserCount: s.browserCount,
          deviceCount: s.deviceCount,
        },
        browsers: s.browsers ?? [],
        devices: s.devices ?? [],
        matrix: s.matrix ?? [],
        realBrowser: s.realBrowser ?? [],
        featureSummary: s.featureSummary ?? {},
        recommendations: s.recommendations ?? [],
        warnings: s.compatWarnings ?? [],
      };
    } else {
      chartDetails = rawDetails;
    }
  } else if (engineType === 'ux') {
    const s = summary as Record<string, unknown>;
    if (s.metrics || s.stats) {
      chartDetails = {
        url: s.url,
        metrics: s.metrics ?? {},
        stats: s.stats ?? {},
        recommendations: s.recommendations ?? [],
        samples: s.samples ?? [],
        sampleCount: s.sampleCount ?? 0,
        screenshot: s.screenshot,
        score: s.score,
        grade: s.grade,
        summary: {
          description: s.description,
          highlights: s.highlights ?? [],
          issues: s.issues ?? [],
        },
      };
    } else {
      chartDetails = rawDetails;
    }
  } else if (engineType === 'website') {
    const s = summary as Record<string, unknown>;
    if (s.checks || s.engineMetrics) {
      chartDetails = {
        results: {
          url: s.url,
          summary: s.websiteSummary ?? {},
          checks: s.checks ?? {},
          engineMetrics: s.engineMetrics ?? {},
          recommendations: s.recommendations ?? [],
        },
      };
    } else {
      chartDetails = rawDetails;
    }
  } else if (engineType === 'stress') {
    const base = isRecord(rawDetails) ? rawDetails : {};
    const innerDet = isRecord((base as { details?: unknown }).details)
      ? ((base as { details?: unknown }).details as Record<string, unknown>)
      : base;
    chartDetails = innerDet;
  } else {
    chartDetails = rawDetails;
  }

  // 过滤 summary 中的大型数据字段（和服务端 filterSummaryForOverview 对齐）
  const SUMMARY_DATA_KEYS = new Set([
    'metrics',
    'stats',
    'samples',
    'sampleCount',
    'screenshot',
    'navigation',
    'fcp',
    'lcp',
    'fid',
    'inp',
    'cls',
    'tbt',
    'longTaskCount',
    'userAgent',
    'timestamp',
    'browsers',
    'devices',
    'matrix',
    'realBrowser',
    'featureSummary',
    'compatWarnings',
    'checks',
    'websiteSummary',
    'engineMetrics',
    'engine',
    'version',
    'success',
    'testId',
    'results',
    'error',
    'testType',
  ]);
  const filteredSummary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(summary)) {
    if (!SUMMARY_DATA_KEYS.has(key)) {
      filteredSummary[key] = value;
    }
  }

  // 确保 grade / passed / score 在 summary 中存在（前端概览页从 summary 读取）
  filteredSummary.score = score;
  filteredSummary.grade = grade;
  filteredSummary.passed = passed;

  // 提取 issues / topIssues / recommendations 到 filteredSummary（概览页需要）
  const extractList = (key: string): unknown[] => {
    const fromSummary = summary[key];
    if (Array.isArray(fromSummary) && fromSummary.length) return fromSummary;
    const fromRaw = raw[key];
    if (Array.isArray(fromRaw) && fromRaw.length) return fromRaw;
    const fromChart = chartDetails[key];
    if (Array.isArray(fromChart) && fromChart.length) return fromChart;
    return [];
  };
  if (!filteredSummary.issues) {
    const issues = extractList('issues');
    if (issues.length) filteredSummary.issues = issues;
  }
  if (!filteredSummary.topIssues) {
    const topIssues = extractList('topIssues');
    if (topIssues.length) filteredSummary.topIssues = topIssues;
  }
  if (!filteredSummary.recommendations) {
    const recs = extractList('recommendations');
    if (recs.length) filteredSummary.recommendations = recs;
  }

  const metricsArr = Array.isArray(raw.metrics) ? raw.metrics : [];
  const warningsArr = Array.isArray(raw.warnings) ? raw.warnings : [];
  const errorsArr = Array.isArray(raw.errors) ? raw.errors : [];

  // 构造与 Web 端 buildNormalizedDetails 一致的 details 结构：
  // details.results.[engineType] = { summary, details, metrics, warnings, errors }
  // 前端 ResultSummary 通过 details.results[engine] 取 engineDetails
  const engineDetails: Record<string, unknown> = {
    summary: filteredSummary,
    details: chartDetails,
    metrics: metricsArr,
    warnings: warningsArr,
    errors: errorsArr,
  };

  return {
    testId: raw.testId,
    schemaVersion: '2.0',
    score,
    grade,
    passed,
    summary: filteredSummary,
    metrics: metricsArr,
    warnings: warningsArr,
    errors: errorsArr,
    details: {
      results: {
        [engineType]: engineDetails,
      },
    },
    config: isRecord(raw.config) ? raw.config : undefined,
    createdAt: raw.startTime || new Date().toISOString(),
  };
};

type TestLogEntry = {
  id: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  createdAt: Date;
};

type TestHistoryResponse = {
  tests: TestExecutionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type TestDetailResponse = {
  id: string;
  testType: string;
  url: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  testConfig?: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  progress?: number | null;
  errorMessage?: string | null;
};

const localTestService = {
  async getTestHistory(
    userId: string,
    page = 1,
    limit = 20,
    filters?: { testType?: string; keyword?: string }
  ): Promise<TestHistoryResponse> {
    const offset = (page - 1) * limit;
    const [tests, total] = await Promise.all([
      localTestRepository.findByUserId(userId, limit, offset, filters),
      localTestRepository.countByUserId(userId, filters),
    ]);
    return {
      tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getTestDetail(userId: string, testId: string): Promise<TestDetailResponse> {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    const parsedConfig = parseTestConfig(test.test_config);
    const parsedResults = parseTestConfig(test.results);
    return {
      id: test.test_id,
      testType: test.engine_type,
      url: test.test_url ?? '',
      status: test.status,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      testConfig: parsedConfig,
      results: parsedResults,
      progress: test.progress ?? null,
      errorMessage: test.error_message ?? null,
    };
  },

  async getTestStatus(userId: string, testId: string) {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    return {
      status: test.status,
      progress: test.progress ?? 0,
    };
  },

  async getTestProgress(userId: string, testId: string) {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    return {
      progress: test.progress ?? 0,
      status: test.status,
      currentStep: null as string | null,
    };
  },

  async getTestResult(userId: string, testId: string): Promise<Record<string, unknown>> {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    const raw = parseTestConfig(test.results);
    // 注入 testConfig 供配置页读取（ConfigSummaryPanel 读 parsed.config）
    if (!raw.config && test.test_config) {
      raw.config = parseTestConfig(test.test_config);
    }
    return buildNormalizedResult(test.engine_type, raw);
  },

  async getTestLogs(
    userId: string,
    testId: string,
    limit = 100,
    offset = 0,
    level?: string
  ): Promise<{ logs: TestLogEntry[]; total: number; hasMore: boolean }> {
    const test = (await localTestRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }

    const normalizedLevel = level ? normalizeTestLogLevel(level, 'info') : undefined;
    const result = await localTestOperationsRepository.getTestLogs(
      testId,
      userId,
      limit,
      offset,
      normalizedLevel
    );
    const logs = result.rows.map(row => {
      let context: Record<string, unknown> = {};
      if (row.context) {
        try {
          context =
            typeof row.context === 'string'
              ? JSON.parse(row.context)
              : (row.context as Record<string, unknown>);
        } catch {
          context = {};
        }
      }
      return {
        id: row.id,
        level: row.level,
        message: row.message,
        context,
        createdAt: new Date(row.created_at),
      };
    });

    return {
      logs,
      total: result.total,
      hasMore: offset + limit < result.total,
    };
  },

  async updateTestTags(userId: string, testId: string, tags: string[]): Promise<void> {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    const parsedConfig = parseTestConfig(test.test_config);
    const nextConfig = { ...parsedConfig, tags };
    await localTestOperationsRepository.updateTestConfig(testId, userId, {
      testName: test.test_name,
      testUrl: test.test_url ?? null,
      testConfig: nextConfig,
    });
  },

  async cancelTest(userId: string, testId: string): Promise<void> {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    // 先调用引擎取消（停止实际运行的测试）
    await localTestExecutionService.cancelTest(testId);
    await localTestOperationsRepository.updateStatus(testId, 'cancelled');
  },

  async deleteTest(userId: string, testId: string): Promise<void> {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    await localTestRepository.delete(testId);
  },

  async rerunTest(userId: string, testId: string) {
    const test = await localTestRepository.findById(testId, userId);
    if (!test) {
      throw new Error('测试不存在');
    }
    const parsedConfig = parseTestConfig(test.test_config);
    return await localTestExecutionService.startTest({
      testType:
        test.engine_type as import('../../../../shared/types/testEngine.types').TestEngineType,
      url: test.test_url ?? undefined,
      config: parsedConfig,
    });
  },

  async getBatchTestStatus(batchId: string, userId: string) {
    const rows = await localTestOperationsRepository.getBatchTests(batchId, userId);
    const tests = rows.map(row => ({
      testId: row.test_id,
      status: row.status,
      progress: typeof row.progress === 'number' ? row.progress : 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return {
      batchId,
      total: tests.length,
      tests,
    };
  },

  parseTestConfig,
};

export default localTestService;
