import { createContext, useContext } from 'react';

export type TestType =
  | 'website'
  | 'performance'
  | 'security'
  | 'seo'
  | 'api'
  | 'stress'
  | 'accessibility'
  | 'compatibility'
  | 'ux';

export type HistoryItem = {
  id: string;
  label: string;
  type: TestType;
  url: string;
  configText: string;
  score?: number;
  duration?: number;
  status?: TestStatus;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
};

export type TemplateItem = {
  id: string;
  name: string;
  engineType: TestType;
  config: Record<string, unknown>;
  description?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  isOfficial?: boolean;
  usageCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type RequestHeader = {
  key: string;
  value: string;
  enabled: boolean;
};

export type QueryParam = {
  key: string;
  value: string;
  enabled: boolean;
};

export type FormDataField = {
  key: string;
  value: string;
  type: 'text' | 'file';
};

export type RequestMeta = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  contentType: string;
  authType: 'none' | 'bearer' | 'basic' | 'apikey';
  authToken: string;
  headers: RequestHeader[];
  queryParams: QueryParam[];
  body: string;
  bodyType: 'none' | 'json' | 'form' | 'text' | 'xml' | 'formdata';
  formData?: FormDataField[];
};

// ── API 测试专用类型 ──

export type ApiAssertionType =
  | 'status'
  | 'header'
  | 'json'
  | 'jsonSchema'
  | 'bodyContains'
  | 'bodyRegex'
  | 'responseTime'
  | 'error'
  | 'allOf'
  | 'anyOf';

export type ApiAssertion = {
  id: string;
  type: ApiAssertionType;
  enabled: boolean;
  // status
  expected?: unknown;
  // header
  name?: string;
  value?: unknown;
  // json
  path?: string;
  operator?: string;
  // jsonSchema
  schema?: unknown;
  // bodyRegex
  pattern?: string;
  // responseTime
  max?: number;
  // error
  source?: string;
  // allOf / anyOf
  assertions?: ApiAssertion[];
};

export type ApiEndpoint = {
  id: string;
  name: string;
  url: string;
  method: RequestMeta['method'];
  headers: RequestHeader[];
  body: string;
  bodyType: RequestMeta['bodyType'];
  assertions: ApiAssertion[];
  variables: Record<string, string>;
  enabled: boolean;
};

export type ApiVariable = {
  key: string;
  value: string;
  enabled: boolean;
};

export type ApiExtraction = {
  id: string;
  name: string;
  source: 'header' | 'json' | 'regex';
  path: string;
  pattern?: string;
  enabled: boolean;
};

export type ApiTestMeta = {
  assertions: ApiAssertion[];
  endpoints: ApiEndpoint[];
  variables: ApiVariable[];
  extractions: ApiExtraction[];
};

export const DEFAULT_API_TEST_META: ApiTestMeta = {
  assertions: [],
  endpoints: [],
  variables: [],
  extractions: [],
};

export type HistoryMeta = {
  saveToHistory: boolean;
  title: string;
  tags: string[];
  baselineId: string;
  notes: string;
  retentionDays: number;
};

export type AdvancedSettings = {
  timeout: number;
  concurrency: number;
  duration: number;
  iterations: number;
  retryOnFail: boolean;
  maxRetries: number;
  followRedirects: boolean;
  device: string;
  userAgent: string;
  /** 桌面端：测试时显示 Puppeteer 浏览器窗口（可视化模式） */
  showBrowser: boolean;
  /** 桌面端：Puppeteer 引擎性能模式（eco=节能/balanced=平衡/performance=高性能） */
  engineMode: 'eco' | 'balanced' | 'performance';
};

export type TestStatus =
  | 'idle'
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'stopped';

export type TestResult = {
  status: TestStatus;
  duration: string;
  score: number;
  engine: TestType;
};

export type TestProgressInfo = {
  progress: number;
  status?: TestStatus;
  currentStep?: string;
  /** 压力测试等引擎推送的实时统计数据 */
  stats?: {
    completed?: number;
    failed?: number;
    avgResponseTime?: number;
    activeConnections?: number;
    [key: string]: unknown;
  };
};

export type LogEntry = {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp?: string;
  context?: Record<string, unknown>;
};

export type HistoryPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  typeCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
  avgScore?: number | null;
  avgDuration?: number | null;
};

export type WorkspaceOption = {
  id: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
};

export const DEFAULT_HISTORY_PAGINATION: HistoryPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

type TestState = {
  testTypes: TestType[];
  templates: TemplateItem[];
  history: HistoryItem[];
  historyPagination: HistoryPagination;
  selectedType: TestType;
  selectedTemplateId: string | null;
  progressInfo: TestProgressInfo | null;
  selectedHistoryId: string | null;
  activeTestId: string | null;
  workspaceId: string | null;
  workspaceOptions: WorkspaceOption[];
  url: string;
  configText: string;
  result: TestResult;
  resultPayloadText: string;
  logs: LogEntry[];
  systemStatus: string[];
  requestMeta: RequestMeta;
  apiTestMeta: ApiTestMeta;
  historyMeta: HistoryMeta;
  advancedSettings: AdvancedSettings;
  isProcessing: boolean;
  selectTestType: (type: TestType) => void;
  selectHistory: (id: string) => void;
  selectTemplate: (id: string) => void;
  clearTemplate: () => void;
  updateUrl: (value: string) => void;
  updateConfigText: (value: string) => void;
  updateResultPayloadText: (value: string) => void;
  updateResult: (value: Partial<TestResult>) => void;
  updateLogs: (value: LogEntry[]) => void;
  updateRequestMeta: (value: RequestMeta) => void;
  updateApiTestMeta: (value: ApiTestMeta) => void;
  updateHistoryMeta: (value: HistoryMeta) => void;
  updateAdvancedSettings: (value: AdvancedSettings) => void;
  applyPreset: (preset: 'High' | 'Fast' | 'Custom') => void;
  runTest: () => void;
  stopTest: () => void;
  updateWorkspaceId: (workspaceId: string | null) => void;
  removeWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (payload: {
    name: string;
    description?: string;
    visibility?: string;
  }) => Promise<void>;
  updateWorkspace: (
    workspaceId: string,
    payload: { name?: string; description?: string; visibility?: string }
  ) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  currentUser: Record<string, unknown> | null;
  setCurrentUser: (value: Record<string, unknown> | null) => void;
  refreshHistory: (params?: {
    page?: number;
    limit?: number;
    testType?: string;
    keyword?: string;
  }) => Promise<void>;
  createTemplate: (payload: {
    name: string;
    description?: string;
    engineType: string;
    config: Record<string, unknown>;
    isPublic?: boolean;
    isDefault?: boolean;
  }) => Promise<void>;
  updateTemplate: (
    templateId: string,
    payload: {
      name?: string;
      description?: string;
      engineType?: string;
      config?: Record<string, unknown>;
      isPublic?: boolean;
      isDefault?: boolean;
    }
  ) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
};

type TestConfigState = {
  testTypes: TestType[];
  selectedType: TestType;
  selectedTemplateId: string | null;
  progressInfo: TestProgressInfo | null;
  activeTestId: string | null;
  url: string;
  configText: string;
  requestMeta: RequestMeta;
  apiTestMeta: ApiTestMeta;
  historyMeta: HistoryMeta;
  advancedSettings: AdvancedSettings;
  isProcessing: boolean;
  selectTestType: (type: TestType) => void;
  selectTemplate: (id: string) => void;
  clearTemplate: () => void;
  updateUrl: (value: string) => void;
  updateConfigText: (value: string) => void;
  updateRequestMeta: (value: RequestMeta) => void;
  updateApiTestMeta: (value: ApiTestMeta) => void;
  updateHistoryMeta: (value: HistoryMeta) => void;
  updateAdvancedSettings: (value: AdvancedSettings) => void;
  applyPreset: (preset: 'High' | 'Fast' | 'Custom') => void;
  runTest: () => void;
  stopTest: () => void;
};

type TestHistoryState = {
  history: HistoryItem[];
  historyPagination: HistoryPagination;
  selectedHistoryId: string | null;
  selectHistory: (id: string) => void;
  refreshHistory: (params?: {
    page?: number;
    limit?: number;
    testType?: string;
    keyword?: string;
  }) => Promise<void>;
};

type TestTemplateState = {
  templates: TemplateItem[];
  selectedTemplateId: string | null;
  createTemplate: (payload: {
    name: string;
    description?: string;
    engineType: string;
    config: Record<string, unknown>;
    isPublic?: boolean;
    isDefault?: boolean;
  }) => Promise<void>;
  updateTemplate: (
    templateId: string,
    payload: {
      name?: string;
      description?: string;
      engineType?: string;
      config?: Record<string, unknown>;
      isPublic?: boolean;
      isDefault?: boolean;
    }
  ) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
};

type TestResultState = {
  result: TestResult;
  resultPayloadText: string;
  updateResult: (value: Partial<TestResult>) => void;
  updateResultPayloadText: (value: string) => void;
};

export type LogStatus = 'idle' | 'loading' | 'live' | 'done';

type TestLogState = {
  logs: LogEntry[];
  logStatus: LogStatus;
  logTestId: string | null;
  updateLogs: (value: LogEntry[], testId?: string) => void;
};

type TestWorkspaceState = {
  workspaceId: string | null;
  workspaceOptions: WorkspaceOption[];
  updateWorkspaceId: (workspaceId: string | null) => void;
  removeWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (payload: {
    name: string;
    description?: string;
    visibility?: string;
  }) => Promise<void>;
  updateWorkspace: (
    workspaceId: string,
    payload: { name?: string; description?: string; visibility?: string }
  ) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
};

type EnvironmentItemCompact = {
  id: string;
  name: string;
  isActive: boolean;
};

type TestEnvironmentState = {
  selectedEnvId: string | null;
  setSelectedEnvId: (id: string | null) => void;
  environments: EnvironmentItemCompact[];
  resolvedVariables: Record<string, string>;
  refreshEnvironments: () => Promise<void>;
};

type TestSystemState = {
  systemStatus: string[];
};

type TestUserState = {
  currentUser: Record<string, unknown> | null;
  setCurrentUser: (value: Record<string, unknown> | null) => void;
};

export const TEST_TYPES: TestType[] = [
  'website',
  'performance',
  'security',
  'seo',
  'api',
  'stress',
  'accessibility',
  'compatibility',
  'ux',
];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  website: 'testType.website',
  performance: 'testType.performance',
  security: 'testType.security',
  seo: 'testType.seo',
  api: 'testType.api',
  stress: 'testType.stress',
  accessibility: 'testType.accessibility',
  compatibility: 'testType.compatibility',
  ux: 'testType.ux',
};

export const DEFAULT_REQUEST_META: RequestMeta = {
  method: 'GET',
  contentType: 'text/html',
  authType: 'none',
  authToken: '',
  headers: [
    {
      key: 'Accept',
      value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      enabled: true,
    },
  ],
  queryParams: [],
  body: '',
  bodyType: 'none',
};

export const getDefaultAcceptHeader = (testType: TestType): string => {
  switch (testType) {
    case 'api':
      return 'application/json';
    case 'performance':
    case 'security':
    case 'seo':
    case 'accessibility':
    case 'compatibility':
    case 'ux':
    case 'website':
      return 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    case 'stress':
      return '*/*';
    default:
      return 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  }
};

export const DEFAULT_HISTORY_META: HistoryMeta = {
  saveToHistory: true,
  title: 'Example Run',
  tags: ['baseline'],
  baselineId: '',
  notes: '',
  retentionDays: 30,
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  timeout: 60000,
  concurrency: 10,
  duration: 300,
  iterations: 1,
  retryOnFail: true,
  maxRetries: 2,
  followRedirects: true,
  device: 'desktop',
  userAgent: '',
  showBrowser: false,
  engineMode: 'balanced',
};

export const DEFAULT_CONFIG = `{
  "testType": "performance",
  "url": "https://example.com",
  "request": {
    "method": "GET",
    "contentType": "text/html",
    "authToken": "",
    "headers": [
      { "key": "Accept", "value": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "enabled": true }
    ]
  },
  "history": {
    "saveToHistory": true,
    "title": "Example Run",
    "tags": ["baseline"],
    "baselineId": "",
    "notes": "",
    "retentionDays": 30
  },
  "advanced": {
    "timeout": 60000,
    "concurrency": 10,
    "duration": 300,
    "iterations": 1,
    "retryOnFail": true,
    "maxRetries": 2,
    "followRedirects": true,
    "device": "desktop",
    "userAgent": ""
  }
}`;

export const DEFAULT_RESULT_PAYLOAD = '';

export const HISTORY_ITEMS: HistoryItem[] = [];

export const TEMPLATE_ITEMS: TemplateItem[] = [];

export const SYSTEM_STATUS: string[] = [];

export const LOG_SEED: LogEntry[] = [];

export const TestContext = createContext<TestState | null>(null);

export const TestConfigContext = createContext<TestConfigState | null>(null);
export const TestHistoryContext = createContext<TestHistoryState | null>(null);
export const TestTemplateContext = createContext<TestTemplateState | null>(null);
export const TestResultContext = createContext<TestResultState | null>(null);
export const TestLogContext = createContext<TestLogState | null>(null);
export const TestWorkspaceContext = createContext<TestWorkspaceState | null>(null);
export const TestEnvironmentContext = createContext<TestEnvironmentState | null>(null);
export const TestSystemContext = createContext<TestSystemState | null>(null);
export const TestUserContext = createContext<TestUserState | null>(null);

export const useTestContext = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTestContext must be used within TestProvider');
  }
  return context;
};

export const useTestConfig = () => {
  const context = useContext(TestConfigContext);
  if (!context) {
    throw new Error('useTestConfig must be used within TestProvider');
  }
  return context;
};

export const useTestHistory = () => {
  const context = useContext(TestHistoryContext);
  if (!context) {
    throw new Error('useTestHistory must be used within TestProvider');
  }
  return context;
};

export const useTestTemplates = () => {
  const context = useContext(TestTemplateContext);
  if (!context) {
    throw new Error('useTestTemplates must be used within TestProvider');
  }
  return context;
};

export const useTestResult = () => {
  const context = useContext(TestResultContext);
  if (!context) {
    throw new Error('useTestResult must be used within TestProvider');
  }
  return context;
};

export const useTestLogs = () => {
  const context = useContext(TestLogContext);
  if (!context) {
    throw new Error('useTestLogs must be used within TestProvider');
  }
  return context;
};

export const useTestWorkspace = () => {
  const context = useContext(TestWorkspaceContext);
  if (!context) {
    throw new Error('useTestWorkspace must be used within TestProvider');
  }
  return context;
};

export const useTestEnvironment = () => {
  const context = useContext(TestEnvironmentContext);
  if (!context) {
    throw new Error('useTestEnvironment must be used within TestProvider');
  }
  return context;
};

export const useTestSystem = () => {
  const context = useContext(TestSystemContext);
  if (!context) {
    throw new Error('useTestSystem must be used within TestProvider');
  }
  return context;
};

export const useTestUser = () => {
  const context = useContext(TestUserContext);
  if (!context) {
    throw new Error('useTestUser must be used within TestProvider');
  }
  return context;
};
