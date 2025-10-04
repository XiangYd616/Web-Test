# Fix Missing Models and Exports
# Target remaining TS2305 and TS2614 errors

Write-Host "=== Fixing Missing Models and Exports ===" -ForegroundColor Cyan
Write-Host "Current: 1,411 errors" -ForegroundColor Yellow
Write-Host "Target: Under 1,000 errors`n" -ForegroundColor Green

$projectRoot = "D:\myproject\Test-Web"
Set-Location $projectRoot

# Create unified/models.ts with all needed types
Write-Host "[1/3] Creating unified/models.ts..." -ForegroundColor Green

$unifiedModels = @"
// Unified Models - All shared types
import { FlexibleObject } from '../common';

// ============================================
// API Response Models
// ============================================

export interface ApiResponse<T = any> extends FlexibleObject {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  message: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// User and Auth Models
// ============================================

export interface User extends FlexibleObject {
  id: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  profile?: UserProfile;
  preferences?: UserPreferences;
}

export interface UserProfile extends FlexibleObject {
  displayName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

export interface UserPreferences extends FlexibleObject {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: any;
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

export interface AuthResponse extends FlexibleObject {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface MFASetupResponse extends FlexibleObject {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface MFAVerificationResponse extends FlexibleObject {
  success: boolean;
  message?: string;
  token?: string;
}

// ============================================
// Project Models
// ============================================

export interface Project extends FlexibleObject {
  id: string;
  name: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export type ProjectType = 'web' | 'api' | 'mobile' | 'desktop';
export type ProjectStatus = 'active' | 'inactive' | 'archived';

export interface CreateProjectRequest {
  name: string;
  description?: string;
  type?: ProjectType;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
}

export interface ProjectResponse extends FlexibleObject {
  project: Project;
}

export interface ProjectListResponse extends FlexibleObject {
  projects: Project[];
  total: number;
  pagination?: PaginationInfo;
}

export interface ProjectStatsResponse extends FlexibleObject {
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

// ============================================
// System Models
// ============================================

export interface SystemStatus {
  status: 'online' | 'offline' | 'maintenance';
  version: string;
  uptime?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLog {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: any;
}

export interface MaintenanceInfo {
  enabled: boolean;
  message?: string;
  startTime?: string | number;
  endTime?: string | number;
}
"@

$unifiedModelsDir = Join-Path $projectRoot "frontend\types\unified"
if (-not (Test-Path $unifiedModelsDir)) {
    New-Item -ItemType Directory -Path $unifiedModelsDir -Force | Out-Null
}
$unifiedModelsPath = Join-Path $unifiedModelsDir "models.ts"
Set-Content -Path $unifiedModelsPath -Value $unifiedModels -Encoding UTF8
Write-Host "  ✓ Created frontend/types/unified/models.ts" -ForegroundColor Green

# Update project types
Write-Host "`n[2/3] Creating project types..." -ForegroundColor Green

$projectTypes = @"
// Project-related types
export { Project, ProjectType, ProjectStatus } from './unified/models';
export type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  ProjectListResponse,
  ProjectStatsResponse
} from './unified/models';
"@

$projectTypesPath = Join-Path $projectRoot "frontend\types\project.ts"
Set-Content -Path $projectTypesPath -Value $projectTypes -Encoding UTF8
Write-Host "  ✓ Created frontend/types/project.ts" -ForegroundColor Green

# Update system types
$systemTypes = @"
// System-related types
export type { SystemStatus, LogLevel, SystemLog, MaintenanceInfo } from './unified/models';
"@

$systemTypesPath = Join-Path $projectRoot "frontend\types\system.ts"
Set-Content -Path $systemTypesPath -Value $systemTypes -Encoding UTF8
Write-Host "  ✓ Created frontend/types/system.ts" -ForegroundColor Green

# Update auth types to include MFA types
Write-Host "`n[3/3] Updating auth types..." -ForegroundColor Green

$authTypesPath = Join-Path $projectRoot "frontend\types\auth.ts"
if (Test-Path $authTypesPath) {
    $authContent = Get-Content $authTypesPath -Raw -Encoding UTF8
    
    if ($authContent -notmatch "MFASetupResponse") {
        $mfaTypes = @"

// MFA Types
export interface MFASetupResponse {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface MFAVerificationResponse {
  success: boolean;
  message?: string;
  token?: string;
}
"@
        $authContent += "`n" + $mfaTypes
        Set-Content -Path $authTypesPath -Value $authContent -Encoding UTF8 -NoNewline
        Write-Host "  ✓ Added MFA types to auth.ts" -ForegroundColor Green
    }
}

# Re-check errors
Write-Host "`n[Checking] Running TypeScript check..." -ForegroundColor Cyan

$errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS\d+"
$newCount = $errors.Count

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Previous: 1,411 errors" -ForegroundColor Yellow
Write-Host "Current: $newCount errors" -ForegroundColor $(if ($newCount -lt 1411) { "Green" } elseif ($newCount -eq 1411) { "Yellow" } else { "Red" })

if ($newCount -lt 1411) {
    $reduction = 1411 - $newCount
    $percent = [math]::Round(($reduction / 1411) * 100, 1)
    Write-Host "✓ Reduced by $reduction errors ($percent%)" -ForegroundColor Green
    
    if ($newCount -lt 1000) {
        Write-Host "🎉 TARGET ACHIEVED! Under 1,000 errors!" -ForegroundColor Green
    }
}

Write-Host "`nError distribution:" -ForegroundColor Cyan
$errors | ForEach-Object { $_ -replace '^.*?(TS\d+):.*$', '$1' } | Group-Object | Sort-Object Count -Descending | Select-Object -First 8 | Format-Table Count, Name -AutoSize

Write-Host "`nFiles created:" -ForegroundColor Cyan
Write-Host "  • frontend/types/unified/models.ts" -ForegroundColor White
Write-Host "  • frontend/types/project.ts" -ForegroundColor White
Write-Host "  • frontend/types/system.ts" -ForegroundColor White
Write-Host "  • Updated: frontend/types/auth.ts" -ForegroundColor White

Write-Host ""

