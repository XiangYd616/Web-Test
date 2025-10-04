# Fix Missing Exports (TS2305 errors)
# Add all missing exports to type definition files

Write-Host "=== Fixing Missing Exports ===" -ForegroundColor Cyan
Write-Host "Target: Fix 131 TS2305 errors`n" -ForegroundColor Yellow

$projectRoot = "D:\myproject\Test-Web"
Set-Location $projectRoot

# Step 1: Add missing exports to common.d.ts
Write-Host "[1/5] Adding missing exports to common.d.ts..." -ForegroundColor Green

$commonAdditions = @"

// ============================================
// Additional Type Aliases and Basic Types
// ============================================

export type Email = string;
export type Timestamp = number | string | Date;
export type URL = string;
export type UUID = string;

// ============================================
// User Types
// ============================================

export interface User extends FlexibleObject {
  id: string;
  username: string;
  email: Email;
  role?: string;
  status?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  profile?: UserProfile;
  preferences?: UserPreferences;
}

export interface UserProfile extends FlexibleObject {
  displayName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

export interface UserPreferences extends FlexibleObject {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
};

export interface UserSession extends FlexibleObject {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// Authentication Types
// ============================================

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: Email;
  password: string;
  confirmPassword?: string;
  agreeTerm?: boolean;
}

export interface AuthResponse extends FlexibleObject {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface CreateUserData {
  username: string;
  email: Email;
  password: string;
  role?: string;
  profile?: Partial<UserProfile>;
}

export interface UpdateUserData {
  username?: string;
  email?: Email;
  role?: string;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

// ============================================
// Enums and Constants
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TestGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
  JA_JP = 'ja-JP',
}

export enum Timezone {
  ASIA_SHANGHAI = 'Asia/Shanghai',
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
}
"@

$commonPath = Join-Path $projectRoot "frontend\types\common.d.ts"
$commonContent = Get-Content $commonPath -Raw -Encoding UTF8
$commonContent += "`n" + $commonAdditions
Set-Content -Path $commonPath -Value $commonContent -Encoding UTF8 -NoNewline

# Also update packages location
$packagesCommonPath = Join-Path $projectRoot "packages\frontend\src\types\common.d.ts"
Set-Content -Path $packagesCommonPath -Value $commonContent -Encoding UTF8 -NoNewline

Write-Host "  ✓ Added user, auth, and enum types to common.d.ts" -ForegroundColor Green

# Step 2: Create/update unified test types
Write-Host "`n[2/5] Creating unified test types..." -ForegroundColor Green

$unifiedTestTypes = @"
// Unified Test Types
// Centralized test type definitions

export type TestType = 
  | 'stress'
  | 'performance'
  | 'api'
  | 'security'
  | 'seo'
  | 'accessibility'
  | 'content'
  | 'infrastructure'
  | 'documentation'
  | 'ux'
  | 'integration';

export type TestStatus = 
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type TestStatusType = TestStatus;

export interface TestTypeConfig {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  category?: string;
}

export const TEST_TYPE_CONFIG: Record<TestType, TestTypeConfig> = {
  stress: {
    name: 'stress',
    displayName: '压力测试',
    description: '测试系统承载能力',
    icon: 'activity',
    enabled: true,
    category: 'performance',
  },
  performance: {
    name: 'performance',
    displayName: '性能测试',
    description: '测试页面加载性能',
    icon: 'zap',
    enabled: true,
    category: 'performance',
  },
  api: {
    name: 'api',
    displayName: 'API测试',
    description: '测试API接口',
    icon: 'code',
    enabled: true,
    category: 'functional',
  },
  security: {
    name: 'security',
    displayName: '安全测试',
    description: '安全漏洞扫描',
    icon: 'shield',
    enabled: true,
    category: 'security',
  },
  seo: {
    name: 'seo',
    displayName: 'SEO测试',
    description: 'SEO优化分析',
    icon: 'search',
    enabled: true,
    category: 'optimization',
  },
  accessibility: {
    name: 'accessibility',
    displayName: '可访问性测试',
    description: 'WCAG标准检查',
    icon: 'eye',
    enabled: true,
    category: 'quality',
  },
  content: {
    name: 'content',
    displayName: '内容测试',
    description: '内容质量检查',
    icon: 'file-text',
    enabled: true,
    category: 'quality',
  },
  infrastructure: {
    name: 'infrastructure',
    displayName: '基础设施测试',
    description: '服务器配置检查',
    icon: 'server',
    enabled: true,
    category: 'infrastructure',
  },
  documentation: {
    name: 'documentation',
    displayName: '文档测试',
    description: '文档完整性检查',
    icon: 'book',
    enabled: true,
    category: 'quality',
  },
  ux: {
    name: 'ux',
    displayName: '用户体验测试',
    description: 'UX优化建议',
    icon: 'users',
    enabled: true,
    category: 'quality',
  },
  integration: {
    name: 'integration',
    displayName: '集成测试',
    description: '系统集成测试',
    icon: 'git-merge',
    enabled: true,
    category: 'functional',
  },
};

export function getAvailableTestTypes(): TestType[] {
  return Object.keys(TEST_TYPE_CONFIG) as TestType[];
}

export function getEnabledTestTypes(): TestType[] {
  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([type]) => type as TestType);
}

export function isValidTestType(type: string): type is TestType {
  return type in TEST_TYPE_CONFIG;
}

export function isValidTestStatus(status: string): status is TestStatus {
  return ['idle', 'pending', 'running', 'completed', 'failed', 'cancelled', 'paused'].includes(status);
}

export function getTestTypeConfig(type: TestType): TestTypeConfig | undefined {
  return TEST_TYPE_CONFIG[type];
}

export interface TestStatusInfo {
  status: TestStatus;
  message?: string;
  progress?: number;
  timestamp?: number;
}

export function getTestStatusInfo(status: TestStatus): TestStatusInfo {
  return {
    status,
    timestamp: Date.now(),
  };
}

export interface TestExecution {
  id: string;
  type: TestType;
  status: TestStatus;
  startTime?: number;
  endTime?: number;
  result?: any;
}

export interface TestHistory {
  executions: TestExecution[];
  total: number;
}

export {};
"@

$unifiedTypesDir = Join-Path $projectRoot "frontend\types\unified"
if (-not (Test-Path $unifiedTypesDir)) {
    New-Item -ItemType Directory -Path $unifiedTypesDir -Force | Out-Null
}
$unifiedTypesPath = Join-Path $unifiedTypesDir "testTypes.ts"
Set-Content -Path $unifiedTypesPath -Value $unifiedTestTypes -Encoding UTF8
Write-Host "  ✓ Created unified/testTypes.ts" -ForegroundColor Green

# Step 3: Create additional user types file
Write-Host "`n[3/5] Creating user types file..." -ForegroundColor Green

$userTypes = @"
// User management types

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  [key: string]: any;
}

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  bio?: string;
  [key: string]: any;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  [key: string]: any;
}

export {};
"@

Set-Content -Path "$projectRoot\frontend\types\user.ts" -Value $userTypes -Encoding UTF8
Write-Host "  ✓ Created user.ts" -ForegroundColor Green

# Step 4: Create enums file
Write-Host "`n[4/5] Creating enums file..." -ForegroundColor Green

$enumsFile = @"
// Common enumerations

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  PENDING = 'pending',
}

export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TestGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
  JA_JP = 'ja-JP',
}

export enum Timezone {
  ASIA_SHANGHAI = 'Asia/Shanghai',
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export {};
"@

Set-Content -Path "$projectRoot\frontend\types\enums.ts" -Value $enumsFile -Encoding UTF8
Write-Host "  ✓ Created enums.ts" -ForegroundColor Green

# Step 5: Create testHistory types
Write-Host "`n[5/5] Creating testHistory types..." -ForegroundColor Green

$testHistoryTypes = @"
// Test history and session types

export interface TestSession {
  id: string;
  type: string;
  status: string;
  startTime: number;
  endTime?: number;
  userId?: string;
  [key: string]: any;
}

export interface TestHistoryQuery {
  page?: number;
  pageSize?: number;
  testType?: string;
  status?: string;
  dateFrom?: string | number;
  dateTo?: string | number;
}

export interface TestHistoryResponse {
  items: TestSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TestStatistics {
  total: number;
  passed: number;
  failed: number;
  running: number;
  [key: string]: any;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  total: number;
  errors?: string[];
}

export type TestType = 
  | 'stress'
  | 'performance'
  | 'api'
  | 'security'
  | 'seo'
  | 'accessibility';

export {};
"@

Set-Content -Path "$projectRoot\frontend\types\testHistory.ts" -Value $testHistoryTypes -Encoding UTF8
Write-Host "  ✓ Created testHistory.ts" -ForegroundColor Green

# Re-check errors
Write-Host "`n[Checking] Running TypeScript check..." -ForegroundColor Cyan

$errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS\d+"
$newCount = $errors.Count

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Previous: 1,822 errors" -ForegroundColor Yellow
Write-Host "Current: $newCount errors" -ForegroundColor $(if ($newCount -lt 1822) { "Green" } else { "Yellow" })

if ($newCount -lt 1822) {
    $reduction = 1822 - $newCount
    $percent = [math]::Round(($reduction / 1822) * 100, 1)
    Write-Host "✓ Reduced by $reduction errors ($percent%)" -ForegroundColor Green
}

Write-Host "`nTop error types:" -ForegroundColor Cyan
$errors | ForEach-Object { $_ -replace '^.*?(TS\d+):.*$', '$1' } | Group-Object | Sort-Object Count -Descending | Select-Object -First 8 | Format-Table Count, Name -AutoSize

Write-Host "`nFiles created:" -ForegroundColor Cyan
Write-Host "  • frontend/types/unified/testTypes.ts"
Write-Host "  • frontend/types/user.ts"
Write-Host "  • frontend/types/enums.ts"
Write-Host "  • frontend/types/testHistory.ts"
Write-Host "  • Updated: frontend/types/common.d.ts"
Write-Host ""

