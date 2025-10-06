# Rename files with incorrect abbreviation casing
# and update all import references

$ErrorActionPreference = 'Stop'
$projectRoot = "D:\myproject\Test-Web"

Write-Host "Starting file renaming process..." -ForegroundColor Green
Write-Host ""

# Define file mappings
$fileMappings = @{
    'SeoTest.tsx' = 'SEOTest.tsx'
    'UxTest.tsx' = 'UXTest.tsx'
    'CicdIntegration.tsx' = 'CICDIntegration.tsx'
}

# Step 1: Rename files
Write-Host "Step 1: Renaming files..." -ForegroundColor Cyan
foreach ($oldName in $fileMappings.Keys) {
    $newName = $fileMappings[$oldName]
    $oldPath = Join-Path $projectRoot "frontend\pages\$oldName"
    $newPath = Join-Path $projectRoot "frontend\pages\$newName"
    
    if (Test-Path $oldPath) {
        Write-Host "  Renaming: $oldName -> $newName" -ForegroundColor Yellow
        Move-Item -Path $oldPath -Destination $newPath -Force
        Write-Host "  Success!" -ForegroundColor Green
    } else {
        Write-Host "  File not found: $oldPath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 2: Updating import statements..." -ForegroundColor Cyan

# Update import statements in all TypeScript/TSX files
$filesToUpdate = @(
    "frontend\components\routing\AppRoutes.tsx"
)

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $projectRoot $file
    
    if (Test-Path $filePath) {
        Write-Host "  Updating: $file" -ForegroundColor Yellow
        $content = Get-Content $filePath -Raw
        
        # Update imports
        $content = $content -replace "from '../../pages/SeoTest'", "from '../../pages/SEOTest'"
        $content = $content -replace "from '../../pages/UxTest'", "from '../../pages/UXTest'"
        $content = $content -replace "from '../../pages/CicdIntegration'", "from '../../pages/CICDIntegration'"
        
        # Update variable names
        $content = $content -replace 'const SeoTest = lazy', 'const SEOTest = lazy'
        $content = $content -replace 'const UxTest = lazy', 'const UXTest = lazy'
        $content = $content -replace 'const CicdIntegration = lazy', 'const CICDIntegration = lazy'
        
        # Update JSX usage
        $content = $content -replace '<SeoTest />', '<SEOTest />'
        $content = $content -replace '<UxTest />', '<UXTest />'
        $content = $content -replace '<CicdIntegration />', '<CICDIntegration />'
        
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "  Updated!" -ForegroundColor Green
    } else {
        Write-Host "  File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 3: Searching for any other references..." -ForegroundColor Cyan

# Search for any remaining references
$searchPatterns = @('SeoTest', 'UxTest', 'CicdIntegration')
$foundReferences = @()

foreach ($pattern in $searchPatterns) {
    $results = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue |
        Select-String -Pattern $pattern -SimpleMatch |
        Where-Object { $_.Line -notmatch '^\s*//' } | # Exclude comments
        Select-Object -Unique Path, LineNumber, Line
    
    if ($results) {
        $foundReferences += $results
    }
}

if ($foundReferences.Count -gt 0) {
    Write-Host "  Found additional references that may need manual review:" -ForegroundColor Yellow
    foreach ($ref in $foundReferences) {
        Write-Host "    $($ref.Path):$($ref.LineNumber)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No additional references found!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Renaming process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm run type-check' to verify TypeScript compilation"
Write-Host "2. Run 'npm run lint' to check for any issues"
Write-Host "3. Test the application to ensure everything works"

