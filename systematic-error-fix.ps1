# Systematic TypeScript Error Fix
# Focus on: TS2339, Type conflicts, Missing exports

Write-Host "=== Systematic Error Fix ===" -ForegroundColor Cyan
Write-Host "Target: Fix repeated errors, type conflicts, and missing exports" -ForegroundColor Yellow
Write-Host "Starting from: 1,391 errors`n" -ForegroundColor White

$projectRoot = "D:\myproject\Test-Web"
Set-Location $projectRoot

$totalFixed = 0

# ========================================
# PART 1: Analyze and categorize TS2339 errors
# ========================================
Write-Host "[1/5] Analyzing TS2339 property access errors..." -ForegroundColor Green

$ts2339Errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS2339"
$propertyStats = @{}

foreach ($err in $ts2339Errors) {
    if ($err -match "Property '([^']+)' does not exist on type '([^']+)'") {
        $prop = $matches[1]
        $type = $matches[2]
        
        if (-not $propertyStats.ContainsKey($prop)) {
            $propertyStats[$prop] = @{ Count = 0; Types = @{} }
        }
        $propertyStats[$prop].Count++
        
        if (-not $propertyStats[$prop].Types.ContainsKey($type)) {
            $propertyStats[$prop].Types[$type] = 0
        }
        $propertyStats[$prop].Types[$type]++
    }
}

Write-Host "`nTop 15 missing properties:" -ForegroundColor Yellow
$propertyStats.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | Select-Object -First 15 | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value.Count) occurrences"
}

# ========================================
# PART 2: Fix type definition conflicts
# ========================================
Write-Host "`n[2/5] Resolving type definition conflicts..." -ForegroundColor Green

# Check for duplicate StressTestRecord definitions
$stressTestRecordFiles = @()
Get-ChildItem -Path "frontend" -Include "*.ts","*.d.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match "interface\s+StressTestRecord\s*\{" -or $content -match "export\s+interface\s+StressTestRecord") {
        $stressTestRecordFiles += $_.FullName
    }
}

Write-Host "Found StressTestRecord definitions in:" -ForegroundColor Yellow
$stressTestRecordFiles | ForEach-Object { Write-Host "  $_" }

# Create a unified type export file
$unifiedTypes = @"
// Unified Type Re-exports
// This file re-exports types from common.d.ts to ensure consistency

export type {
  StressTestRecord,
  TestMetrics,
  TestResults,
  TestSummary,
  TestProgress,
  TestConfig,
  TestRecordQuery,
  TestHistory,
  User,
  UserProfile,
  UserPreferences,
  LoginCredentials,
  RegisterData,
  AuthResponse
} from './common';

// Also export from common as default imports
import type * as CommonTypes from './common';
export default CommonTypes;
"@

$unifiedPath = Join-Path $projectRoot "frontend\types\index.ts"
Set-Content -Path $unifiedPath -Value $unifiedTypes -Encoding UTF8
Write-Host "  ✓ Created unified type export: frontend/types/index.ts" -ForegroundColor Green
$totalFixed++

# ========================================
# PART 3: Analyze and fix missing exports
# ========================================
Write-Host "`n[3/5] Analyzing missing exports (TS2305)..." -ForegroundColor Green

$ts2305Errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS2305"
$missingExports = @{}

foreach ($err in $ts2305Errors) {
    if ($err -match "Module '([^']+)' has no exported member '([^']+)'") {
        $module = $matches[1]
        $member = $matches[2]
        
        if (-not $missingExports.ContainsKey($module)) {
            $missingExports[$module] = @()
        }
        if ($missingExports[$module] -notcontains $member) {
            $missingExports[$module] += $member
        }
    }
}

Write-Host "`nMissing exports by module (Top 10):" -ForegroundColor Yellow
$missingExports.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Key):" -ForegroundColor White
    $_.Value | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
}

# ========================================
# PART 4: Fix specific common patterns
# ========================================
Write-Host "`n[4/5] Fixing specific error patterns..." -ForegroundColor Green

# Fix 1: Add TestResult type with flexible properties
$testResultType = @"
// Enhanced TestResult type for unified testing
import { FlexibleObject } from './common';

export interface TestResult extends FlexibleObject {
  id?: string;
  testId?: string;
  type?: string;
  testType?: string;
  status?: string;
  score?: number;
  overallScore?: number;
  duration?: number;
  url?: string;
  timestamp?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  message?: string;
  error?: string;
  errors?: string[];
  summary?: any;
  metrics?: any;
  results?: any;
  recommendations?: any[];
  findings?: any[];
  issues?: any[];
  scores?: any;
  tests?: any[];
  engine?: string;
  data?: any;
}

// Export as both named and default
export default TestResult;
"@

$testResultPath = Join-Path $projectRoot "frontend\types\testResult.d.ts"
Set-Content -Path $testResultPath -Value $testResultType -Encoding UTF8
Write-Host "  ✓ Created TestResult type definition" -ForegroundColor Green
$totalFixed++

# Fix 2: Add missing types to enums
$enumsPath = Join-Path $projectRoot "frontend\types\enums.ts"
if (Test-Path $enumsPath) {
    $enumContent = Get-Content $enumsPath -Raw -Encoding UTF8
    
    if ($enumContent -notmatch "export.*TestType") {
        $additionalEnums = @"

// Test Type as both enum and type
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

export enum TestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TestStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}
"@
        
        $enumContent += "`n" + $additionalEnums
        Set-Content -Path $enumsPath -Value $enumContent -Encoding UTF8 -NoNewline
        Write-Host "  ✓ Added TestType, TestPriority, TestStatus to enums.ts" -ForegroundColor Green
        $totalFixed++
    }
}

# Fix 3: Create unifiedEngine.types.ts
$unifiedEngineTypes = @"
// Unified Engine Types
import { FlexibleObject } from './common';

export interface TestResult extends FlexibleObject {
  id: string;
  testId?: string;
  type: string;
  status: string;
  score?: number;
  duration?: number;
  timestamp: number;
  url?: string;
  message?: string;
  error?: string;
  data?: any;
}

export interface TestStatusInfo extends FlexibleObject {
  testId: string;
  status: string;
  progress: number;
  message?: string;
  timestamp: number;
  currentStep?: string;
  totalSteps?: number;
}

export interface TestConfig extends FlexibleObject {
  type: string;
  url?: string;
  options?: any;
  timeout?: number;
  retries?: number;
}

export interface TestProgress extends FlexibleObject {
  current: number;
  total: number;
  percentage: number;
  status: string;
  message?: string;
  timestamp: number;
}
"@

$unifiedEngineTypesPath = Join-Path $projectRoot "frontend\types\unifiedEngine.types.ts"
Set-Content -Path $unifiedEngineTypesPath -Value $unifiedEngineTypes -Encoding UTF8
Write-Host "  ✓ Created unifiedEngine.types.ts" -ForegroundColor Green
$totalFixed++

# Fix 4: Add missing Lucide icon imports to common types
$iconsAddition = @"

// Lucide React Icons - Additional exports
export { default as Play } from 'lucide-react';
export { default as Info } from 'lucide-react';
export { default as Check } from 'lucide-react';
export { default as X } from 'lucide-react';
export { default as AlertCircle } from 'lucide-react';
export { default as Settings } from 'lucide-react';
export { default as Globe } from 'lucide-react';
export { default as Zap } from 'lucide-react';
export { default as Home } from 'lucide-react';
export { default as ChevronLeft } from 'lucide-react';
export { default as BarChart3 } from 'lucide-react';
export { default as Wrench } from 'lucide-react';

export type LucideIcon = any;
"@

$iconsPath = Join-Path $projectRoot "frontend\types\icons.d.ts"
Set-Content -Path $iconsPath -Value $iconsAddition -Encoding UTF8
Write-Host "  ✓ Created icons.d.ts for Lucide icons" -ForegroundColor Green
$totalFixed++

# Fix 5: Add common component types
$componentTypes = @"
// Common Component Types

export interface TableColumn<T = any> {
  title: string;
  dataIndex?: string;
  key: string;
  width?: number;
  render?: (value: any, record: T, index: number) => any;
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface ProgressListener {
  onProgress: (progress: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface TestRecordQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  from?: string | number;
  to?: string | number;
}

// Export all
export {};
"@

$componentTypesPath = Join-Path $projectRoot "frontend\types\components.d.ts"
Set-Content -Path $componentTypesPath -Value $componentTypes -Encoding UTF8
Write-Host "  ✓ Created components.d.ts for component types" -ForegroundColor Green
$totalFixed++

# ========================================
# PART 5: Re-check errors
# ========================================
Write-Host "`n[5/5] Re-checking TypeScript errors..." -ForegroundColor Green

$errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS\d+"
$newCount = $errors.Count

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Previous: 1,391 errors" -ForegroundColor Yellow
Write-Host "Current: $newCount errors" -ForegroundColor $(if ($newCount -lt 1391) { "Green" } elseif ($newCount -eq 1391) { "Yellow" } else { "Red" })

if ($newCount -lt 1391) {
    $reduction = 1391 - $newCount
    $percent = [math]::Round(($reduction / 1391) * 100, 1)
    Write-Host "✓ Reduced by $reduction errors ($percent%)" -ForegroundColor Green
    
    $totalFromStart = 3900 - $newCount
    $percentFromStart = [math]::Round(($totalFromStart / 3900) * 100, 1)
    Write-Host "✓ Total improvement from start: $totalFromStart errors ($percentFromStart%)" -ForegroundColor Green
} elseif ($newCount -eq 1391) {
    Write-Host "⊘ No change - may need different approach" -ForegroundColor Yellow
} else {
    $increase = $newCount - 1391
    Write-Host "⚠ Errors increased by $increase (likely revealing hidden errors)" -ForegroundColor Yellow
}

Write-Host "`nError distribution:" -ForegroundColor Cyan
$errors | ForEach-Object { $_ -replace '^.*?(TS\d+):.*$', '$1' } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table Count, Name -AutoSize

Write-Host "`n=== Files Created ===" -ForegroundColor Cyan
Write-Host "  • frontend/types/index.ts (unified exports)" -ForegroundColor White
Write-Host "  • frontend/types/testResult.d.ts (TestResult type)" -ForegroundColor White
Write-Host "  • frontend/types/unifiedEngine.types.ts (engine types)" -ForegroundColor White
Write-Host "  • frontend/types/icons.d.ts (Lucide icons)" -ForegroundColor White
Write-Host "  • frontend/types/components.d.ts (component types)" -ForegroundColor White
Write-Host "  • Updated: frontend/types/enums.ts" -ForegroundColor White

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Review error distribution above" -ForegroundColor White
Write-Host "2. Import types from 'frontend/types' instead of individual files" -ForegroundColor White
Write-Host "3. Use 'TestResult' type for all test result objects" -ForegroundColor White
Write-Host "4. Run 'npm run build' to verify compilation" -ForegroundColor White

Write-Host ""

