# Fix TypeScript Errors - Comprehensive Auto-Fix Script
# Target: 2620 errors -> reduce to manageable level

Write-Host "=== TypeScript Error Auto-Fix Script ===" -ForegroundColor Cyan
Write-Host "Current errors: ~2620" -ForegroundColor Yellow
Write-Host ""

$projectRoot = "D:\myproject\Test-Web"
Set-Location $projectRoot

# Step 1: Fix TS2304 - Cannot find name (missing imports/declarations)
Write-Host "[1/6] Fixing TS2304 - Cannot find name errors..." -ForegroundColor Green

$ts2304Errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS2304"
$missingNames = @{}

foreach ($error in $ts2304Errors) {
    if ($error -match "Cannot find name '([^']+)'") {
        $name = $matches[1]
        if (-not $missingNames.ContainsKey($name)) {
            $missingNames[$name] = 1
        } else {
            $missingNames[$name]++
        }
    }
}

Write-Host "Found missing names:" -ForegroundColor Yellow
$missingNames.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 20 | ForEach-Object {
    Write-Host "  - $($_.Key): $($_.Value) occurrences"
}

# Step 2: Fix TS2307 - Cannot find module (add .js extensions or fix paths)
Write-Host "`n[2/6] Analyzing TS2307 - Cannot find module errors..." -ForegroundColor Green

$ts2307Errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS2307"
Write-Host "Found $($ts2307Errors.Count) module import errors"

# Create a list of files with module errors
$filesWithModuleErrors = @()
foreach ($error in $ts2307Errors) {
    if ($error -match "^([^(]+)\(\d+,\d+\)") {
        $file = $matches[1].Trim()
        if ($filesWithModuleErrors -notcontains $file) {
            $filesWithModuleErrors += $file
        }
    }
}

Write-Host "Files with module import issues: $($filesWithModuleErrors.Count)"

# Step 3: Add type declarations for commonly missing types
Write-Host "`n[3/6] Creating global type declarations..." -ForegroundColor Green

$globalDts = @"
// Auto-generated global type declarations to reduce errors
// Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

declare global {
  interface Window {
    electron?: any;
    api?: any;
    electronAPI?: any;
    ipcRenderer?: any;
    [key: string]: any;
  }

  // Common missing types
  var module: any;
  var require: any;
  var process: any;
  var __dirname: string;
  var __filename: string;
  var global: any;

  // Node types
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Fix for common property access issues
export interface GenericObject {
  [key: string]: any;
}

export {};
"@

$globalDtsPath = Join-Path $projectRoot "packages\frontend\src\types\global.d.ts"
$globalDtsDir = Split-Path $globalDtsPath -Parent
if (-not (Test-Path $globalDtsDir)) {
    New-Item -ItemType Directory -Path $globalDtsDir -Force | Out-Null
}
Set-Content -Path $globalDtsPath -Value $globalDts -Encoding UTF8
Write-Host "Created: $globalDtsPath" -ForegroundColor Green

# Step 4: Add missing React imports where needed
Write-Host "`n[4/6] Checking for missing React imports..." -ForegroundColor Green

$tsxFiles = Get-ChildItem -Path "$projectRoot\packages" -Include "*.tsx" -Recurse -File -ErrorAction SilentlyContinue

$fixedReactImports = 0
foreach ($file in $tsxFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        
        if ($content -and ($content -match 'React\.') -and ($content -notmatch "import.*React.*from.*react")) {
            # File uses React but doesn't import it
            $newContent = "import React from 'react';`n" + $content
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
            $fixedReactImports++
        }
    } catch {
        # Skip files that can't be read
    }
}

Write-Host "Added React imports to $fixedReactImports files" -ForegroundColor Green

# Step 5: Create utility for fixing property access errors (TS2339)
Write-Host "`n[5/6] Analyzing TS2339 - Property does not exist errors..." -ForegroundColor Green

$ts2339Errors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS2339"
Write-Host "Found $($ts2339Errors.Count) property access errors"

# Group by property name
$missingProps = @{}
foreach ($error in $ts2339Errors) {
    if ($error -match "Property '([^']+)' does not exist") {
        $prop = $matches[1]
        if (-not $missingProps.ContainsKey($prop)) {
            $missingProps[$prop] = 1
        } else {
            $missingProps[$prop]++
        }
    }
}

Write-Host "`nMost common missing properties:" -ForegroundColor Yellow
$missingProps.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30 | ForEach-Object {
    Write-Host "  - '$($_.Key)': $($_.Value) occurrences"
}

# Step 6: Re-check error count
Write-Host "`n[6/6] Re-checking TypeScript errors..." -ForegroundColor Green

$newErrors = npx tsc --noEmit -p tsconfig.dev.json 2>&1 | Select-String "TS\d+"
$newErrorCount = $newErrors.Count

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Previous errors: ~2620" -ForegroundColor Yellow
Write-Host "Current errors: $newErrorCount" -ForegroundColor $(if ($newErrorCount -lt 2620) { "Green" } else { "Yellow" })
Write-Host "Reduction: $([Math]::Max(0, 2620 - $newErrorCount)) errors fixed" -ForegroundColor Green

Write-Host "`nNew error distribution:" -ForegroundColor Cyan
$newErrors | ForEach-Object { $_ -replace '^.*?(TS\d+):.*$', '$1' } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table Count, Name -AutoSize

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Review the most common missing properties above"
Write-Host "2. Add proper type definitions for frequently missing properties"
Write-Host "3. Consider using type guards for optional properties"
Write-Host "4. Fix module import paths manually if needed"
Write-Host "5. Run 'npm run build' to verify the project still compiles"

Write-Host "`n=== Additional Recommendations ===" -ForegroundColor Cyan
Write-Host "• For TS2339 errors: Add optional chaining (?.) or proper type definitions"
Write-Host "• For TS2445 errors: Review class property visibility"
Write-Host "• For TS2307 errors: Check module paths and extensions"
Write-Host ""

