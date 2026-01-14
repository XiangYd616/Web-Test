/**
 * 测试状态管理Hook类型定义
 * 统一管理所有测试状态管理Hook的类型
 */

import { TestStatus } from '../enums';

// ==================== 基础测试状态类型 ====================

/** 测试状态基础接口 */
export interface BaseTestState {
  /** 测试状态 */
  status: TestStatus;
  /** 测试进度（0-100） */
  progress: number;
  /** 当前步骤 */
  currentStep: string;
  /** 测试结果 */
  result: any;
  /** 错误信息 */
  error: string | null;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 是否有错误 */
  hasError: boolean;
}

/** 测试操作接口 */
export interface BaseTestActions {
  /** 开始测试 */
  startTest: (config: any) => Promise<void>;
  /** 停止测试 */
  stopTest: () => void;
  /** 重置状态 */
  reset: () => void;
  /** 清除错误 */
  clearError: () => void;
}

/** 基础测试Hook返回值 */
export interface BaseTestHook extends BaseTestState, BaseTestActions {}

// ==================== API测试Hook类型 ====================

/** API测试配置 */
export interface APITestConfig {
  /** 测试端点列表 */
  endpoints: APIEndpoint[];
  /** 全局认证配置 */
  authentication?: AuthenticationConfig;
  /** 并发数 */
  concurrency?: number;
  /** 超时时间 */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}

/** API端点配置 */
export interface APIEndpoint {
  /** 端点ID */
  id: string;
  /** 端点名称 */
  name: string;
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 端点URL */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数 */
  params?: Record<string, any>;
  /** 请求体 */
  body?: any;
  /** 预期状态码 */
  expectedStatus?: number;
  /** 响应验证 */
  validation?: ValidationRule[];
  /** 是否启用 */
  enabled: boolean;
}

/** 认证配置 */
export interface AuthenticationConfig {
  /** 认证类型 */
  type: 'none' | 'bearer' | 'basic' | 'api-key';
  /** Bearer令牌 */
  bearerToken?: string;
  /** Basic认证用户名 */
  username?: string;
  /** Basic认证密码 */
  password?: string;
  /** API密钥 */
  apiKey?: string;
  /** API密钥头名称 */
  apiKeyHeader?: string;
}

/** 验证规则 */
export interface ValidationRule {
  /** 字段路径 */
  field: string;
  /** 验证类型 */
  type: 'required' | 'type' | 'value' | 'range';
  /** 期望值 */
  expected?: any;
  /** 错误消息 */
  message?: string;
}

/** API测试结果 */
export interface APITestResult {
  /** 总端点数 */
  totalEndpoints: number;
  /** 通过的端点数 */
  passedEndpoints: number;
  /** 失败的端点数 */
  failedEndpoints: number;
  /** 成功率 */
  successRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 端点结果详情 */
  endpointResults: APIEndpointResult[];
  /** 测试开始时间 */
  startTime: string;
  /** 测试结束时间 */
  endTime: string;
  /** 总耗时 */
  duration: number;
}

/** API端点测试结果 */
export interface APIEndpointResult {
  /** 端点ID */
  endpointId: string;
  /** 端点名称 */
  name: string;
  /** 测试状态 */
  status: 'passed' | 'failed' | 'skipped';
  /** 响应时间 */
  responseTime: number;
  /** 状态码 */
  statusCode: number;
  /** 响应数据 */
  responseData?: any;
  /** 错误信息 */
  error?: string;
  /** 验证结果 */
  validationResults?: ValidationResult[];
}

/** 验证结果 */
export interface ValidationResult {
  /** 字段路径 */
  field: string;
  /** 是否通过 */
  passed: boolean;
  /** 实际值 */
  actualValue: any;
  /** 期望值 */
  expectedValue: any;
  /** 错误消息 */
  message?: string;
}

/** API测试状态 */
export interface APITestState extends BaseTestState {
  /** 测试配置 */
  config: APITestConfig;
  /** 测试结果 */
  result: APITestResult | null;
  /** 当前测试的端点 */
  currentEndpoint: string | null;
  /** 已完成的端点数 */
  completedEndpoints: number;
}

/** API测试操作 */
export interface APITestActions extends BaseTestActions {
  /** 开始测试 */
  startTest: (config: APITestConfig) => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<APITestConfig>) => void;
  /** 添加端点 */
  addEndpoint: (endpoint: APIEndpoint) => void;
  /** 移除端点 */
  removeEndpoint: (endpointId: string) => void;
  /** 更新端点 */
  updateEndpoint: (endpointId: string, endpoint: Partial<APIEndpoint>) => void;
}

/** API测试Hook返回值 */
export interface APITestHook extends APITestState, APITestActions {}

// ==================== 兼容性测试Hook类型 ====================

/** 兼容性测试配置 */
export interface CompatibilityTestConfig {
  /** 测试URL */
  url: string;
  /** 目标浏览器 */
  browsers: BrowserConfig[];
  /** 目标设备 */
  devices: DeviceConfig[];
  /** 测试项目 */
  testItems: CompatibilityTestItem[];
}

/** 浏览器配置 */
export interface BrowserConfig {
  /** 浏览器名称 */
  name: string;
  /** 浏览器版本 */
  version: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 设备配置 */
export interface DeviceConfig {
  /** 设备名称 */
  name: string;
  /** 设备类型 */
  type: 'desktop' | 'mobile' | 'tablet';
  /** 屏幕尺寸 */
  screenSize: {
    width: number;
    height: number;
  };
  /** 是否启用 */
  enabled: boolean;
}

/** 兼容性测试项目 */
export interface CompatibilityTestItem {
  /** 项目ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 兼容性测试结果 */
export interface CompatibilityTestResult {
  /** 总测试数 */
  totalTests: number;
  /** 通过的测试数 */
  passedTests: number;
  /** 失败的测试数 */
  failedTests: number;
  /** 兼容性评分 */
  compatibilityScore: number;
  /** 浏览器测试结果 */
  browserResults: BrowserTestResult[];
  /** 设备测试结果 */
  deviceResults: DeviceTestResult[];
}

/** 浏览器测试结果 */
export interface BrowserTestResult {
  /** 浏览器名称 */
  browser: string;
  /** 浏览器版本 */
  version: string;
  /** 测试状态 */
  status: 'passed' | 'failed' | 'partial';
  /** 兼容性评分 */
  score: number;
  /** 问题列表 */
  issues: CompatibilityIssue[];
}

/** 设备测试结果 */
export interface DeviceTestResult {
  /** 设备名称 */
  device: string;
  /** 设备类型 */
  type: 'desktop' | 'mobile' | 'tablet';
  /** 测试状态 */
  status: 'passed' | 'failed' | 'partial';
  /** 兼容性评分 */
  score: number;
  /** 问题列表 */
  issues: CompatibilityIssue[];
}

/** 兼容性问题 */
export interface CompatibilityIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: 'layout' | 'functionality' | 'performance' | 'accessibility';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 问题描述 */
  description: string;
  /** 建议修复方案 */
  suggestion?: string;
  /** 影响的元素 */
  element?: string;
}

/** 兼容性测试状态 */
export interface CompatibilityTestState extends BaseTestState {
  /** 测试配置 */
  config: CompatibilityTestConfig;
  /** 测试结果 */
  result: CompatibilityTestResult | null;
  /** 当前测试的浏览器 */
  currentBrowser: string | null;
  /** 当前测试的设备 */
  currentDevice: string | null;
}

/** 兼容性测试操作 */
export interface CompatibilityTestActions extends BaseTestActions {
  /** 开始测试 */
  startTest: (config: CompatibilityTestConfig) => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<CompatibilityTestConfig>) => void;
  /** 添加浏览器 */
  addBrowser: (browser: BrowserConfig) => void;
  /** 移除浏览器 */
  removeBrowser: (browserName: string) => void;
  /** 添加设备 */
  addDevice: (device: DeviceConfig) => void;
  /** 移除设备 */
  removeDevice: (deviceName: string) => void;
}

/** 兼容性测试Hook返回值 */
export interface CompatibilityTestHook extends CompatibilityTestState, CompatibilityTestActions {}

// ==================== UX测试Hook类型 ====================

/** UX测试配置 */
export interface UXTestConfig {
  /** 测试URL */
  url: string;
  /** 用户流程 */
  userFlows: UserFlow[];
  /** 可访问性检查 */
  accessibilityChecks: boolean;
  /** 性能指标检查 */
  performanceChecks: boolean;
}

/** 用户流程 */
export interface UserFlow {
  /** 流程ID */
  id: string;
  /** 流程名称 */
  name: string;
  /** 流程描述 */
  description: string;
  /** 操作步骤 */
  steps: UserAction[];
  /** 是否启用 */
  enabled: boolean;
}

/** 用户操作 */
export interface UserAction {
  /** 操作ID */
  id: string;
  /** 操作类型 */
  type: 'click' | 'input' | 'scroll' | 'wait' | 'navigate' | 'screenshot';
  /** 目标选择器 */
  selector?: string;
  /** 输入值 */
  value?: string;
  /** 等待时间 */
  waitTime?: number;
  /** 操作描述 */
  description: string;
}

/** UX测试结果 */
export interface UXTestResult {
  /** 总体UX评分 */
  overallScore: number;
  /** 用户流程结果 */
  userFlowResults: UserFlowResult[];
  /** 可访问性结果 */
  accessibilityResult?: AccessibilityResult;
  /** 性能结果 */
  performanceResult?: PerformanceResult;
}

/** 用户流程结果 */
export interface UserFlowResult {
  /** 流程ID */
  flowId: string;
  /** 流程名称 */
  name: string;
  /** 执行状态 */
  status: 'passed' | 'failed' | 'partial';
  /** 执行时间 */
  duration: number;
  /** 步骤结果 */
  stepResults: UserActionResult[];
  /** 问题列表 */
  issues: UXIssue[];
}

/** 用户操作结果 */
export interface UserActionResult {
  /** 操作ID */
  actionId: string;
  /** 执行状态 */
  status: 'passed' | 'failed' | 'skipped';
  /** 执行时间 */
  duration: number;
  /** 错误信息 */
  error?: string;
  /** 截图路径 */
  screenshot?: string;
}

/** 可访问性结果 */
export interface AccessibilityResult {
  /** 可访问性评分 */
  score: number;
  /** 违规项目 */
  violations: AccessibilityViolation[];
  /** 通过的检查 */
  passes: AccessibilityCheck[];
}

/** 可访问性违规 */
export interface AccessibilityViolation {
  /** 违规ID */
  id: string;
  /** 违规描述 */
  description: string;
  /** 严重程度 */
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  /** 影响的元素 */
  nodes: AccessibilityNode[];
}

/** 可访问性检查 */
export interface AccessibilityCheck {
  /** 检查ID */
  id: string;
  /** 检查描述 */
  description: string;
}

/** 可访问性节点 */
export interface AccessibilityNode {
  /** 元素选择器 */
  target: string;
  /** 元素HTML */
  html: string;
  /** 失败消息 */
  failureMessage?: string;
}

/** 性能结果 */
export interface PerformanceResult {
  /** 性能评分 */
  score: number;
  /** 核心Web指标 */
  coreWebVitals: CoreWebVitals;
  /** 其他指标 */
  metrics: PerformanceMetrics;
}

/** 核心Web指标 */
export interface CoreWebVitals {
  /** 最大内容绘制 */
  lcp: number;
  /** 首次输入延迟 */
  fid: number;
  /** 累积布局偏移 */
  cls: number;
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 首次内容绘制 */
  fcp: number;
  /** 首次有意义绘制 */
  fmp: number;
  /** 速度指数 */
  speedIndex: number;
  /** 交互时间 */
  tti: number;
}

/** UX问题 */
export interface UXIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: 'usability' | 'accessibility' | 'performance' | 'functionality';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 问题描述 */
  description: string;
  /** 建议修复方案 */
  suggestion?: string;
  /** 相关元素 */
  element?: string;
}

/** UX测试状态 */
export interface UXTestState extends BaseTestState {
  /** 测试配置 */
  config: UXTestConfig;
  /** 测试结果 */
  result: UXTestResult | null;
  /** 当前执行的流程 */
  currentFlow: string | null;
}

/** UX测试操作 */
export interface UXTestActions extends BaseTestActions {
  /** 开始测试 */
  startTest: (config: UXTestConfig) => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<UXTestConfig>) => void;
  /** 添加用户流程 */
  addUserFlow: (flow: UserFlow) => void;
  /** 移除用户流程 */
  removeUserFlow: (flowId: string) => void;
  /** 更新用户流程 */
  updateUserFlow: (flowId: string, flow: Partial<UserFlow>) => void;
}

/** UX测试Hook返回值 */
export interface UXTestHook extends UXTestState, UXTestActions {}

// ==================== 网络测试Hook类型 ====================

/** 网络测试配置 */
export interface NetworkTestConfig {
  /** 目标主机 */
  host: string;
  /** 目标地址（别名，向后兼容） */
  target?: string;
  /** 目标URL（用于HTTP/HTTPS测试） */
  url?: string;
  /** 测试端口 */
  ports: number[];
  /** 协议类型 */
  protocols: ('tcp' | 'udp' | 'http' | 'https')[];
  /** 超时时间 */
  timeout: number;
  /** 重试次数 */
  retries: number;
}

/** 网络测试结果 */
export interface NetworkTestResult {
  /** 主机可达性 */
  hostReachable: boolean;
  /** 端口测试结果 */
  portResults: PortTestResult[];
  /** 协议测试结果 */
  protocolResults: ProtocolTestResult[];
  /** 网络延迟 */
  latency: number;
  /** 丢包率 */
  packetLoss: number;
}

/** 端口测试结果 */
export interface PortTestResult {
  /** 端口号 */
  port: number;
  /** 是否开放 */
  open: boolean;
  /** 响应时间 */
  responseTime: number;
  /** 服务信息 */
  service?: string;
}

/** 协议测试结果 */
export interface ProtocolTestResult {
  /** 协议类型 */
  protocol: string;
  /** 是否支持 */
  supported: boolean;
  /** 响应时间 */
  responseTime: number;
  /** 错误信息 */
  error?: string;
}

/** 网络测试状态 */
export interface NetworkTestState extends BaseTestState {
  /** 测试配置 */
  config: NetworkTestConfig;
  /** 测试结果 */
  result: NetworkTestResult | null;
  /** 当前测试的端口 */
  currentPort: number | null;
}

/** 网络测试操作 */
export interface NetworkTestActions extends BaseTestActions {
  /** 开始测试 */
  startTest: (config: NetworkTestConfig) => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<NetworkTestConfig>) => void;
}

/** 网络测试Hook返回值 */
export interface NetworkTestHook extends NetworkTestState, NetworkTestActions {}

// ==================== 数据库测试Hook类型 ====================

/** 数据库测试配置 */
export interface DatabaseTestConfig {
  /** 数据库类型 */
  dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  /** 连接字符串 */
  connectionString: string;
  /** 测试查询 */
  testQueries: DatabaseQuery[];
  /** 连接超时 */
  connectionTimeout: number;
  /** 查询超时 */
  queryTimeout: number;
}

/** 数据库查询 */
export interface DatabaseQuery {
  /** 查询ID */
  id: string;
  /** 查询名称 */
  name: string;
  /** SQL查询语句 */
  sql: string;
  /** 预期结果类型 */
  expectedType: 'select' | 'insert' | 'update' | 'delete';
  /** 是否启用 */
  enabled: boolean;
}

/** 数据库测试结果 */
export interface DatabaseTestResult {
  /** 连接状态 */
  connectionStatus: 'success' | 'failed';
  /** 连接时间 */
  connectionTime: number;
  /** 查询结果 */
  queryResults: DatabaseQueryResult[];
  /** 数据库信息 */
  databaseInfo?: DatabaseInfo;
}

/** 数据库查询结果 */
export interface DatabaseQueryResult {
  /** 查询ID */
  queryId: string;
  /** 查询名称 */
  name: string;
  /** 执行状态 */
  status: 'success' | 'failed';
  /** 执行时间 */
  executionTime: number;
  /** 影响行数 */
  affectedRows?: number;
  /** 结果数据 */
  data?: unknown[];
  /** 错误信息 */
  error?: string;
}

/** 数据库信息 */
export interface DatabaseInfo {
  /** 数据库版本 */
  version: string;
  /** 数据库大小 */
  size?: number;
  /** 表数量 */
  tableCount?: number;
  /** 连接数 */
  connectionCount?: number;
}

/** 数据库测试状态 */
export interface DatabaseTestState extends BaseTestState {
  /** 测试配置 */
  config: DatabaseTestConfig;
  /** 测试结果 */
  result: DatabaseTestResult | null;
  /** 当前执行的查询 */
  currentQuery: string | null;
}

/** 数据库测试操作 */
export interface DatabaseTestActions extends BaseTestActions {
  /** 开始测试 */
  startTest: (config: DatabaseTestConfig) => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<DatabaseTestConfig>) => void;
  /** 添加查询 */
  addQuery: (query: DatabaseQuery) => void;
  /** 移除查询 */
  removeQuery: (queryId: string) => void;
  /** 更新查询 */
  updateQuery: (queryId: string, query: Partial<DatabaseQuery>) => void;
}

/** 数据库测试Hook返回值 */
export interface DatabaseTestHook extends DatabaseTestState, DatabaseTestActions {}
