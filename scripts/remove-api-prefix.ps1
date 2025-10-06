# Script to remove /api prefix from all frontend API calls
# This is a breaking change - all frontend code must update API paths

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend API Path Migration Script" -ForegroundColor Cyan
Write-Host "  Removing /api prefix from all calls" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\myproject\Test-Web"
$frontendDir = Join-Path $projectRoot "frontend"

# File extensions to process
$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx")

$totalFiles = 0
$totalReplacements = 0

# Function to process a file
function Update-ApiPaths {
    param(
        [string]$filePath
    )
    
    try {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $originalContent = $content
        
        # Replace patterns - we need to be careful not to replace documentation or comments
        # Pattern 1: '/api/... in fetch calls and URLs
        $content = $content -replace "(['""`])\/api\/([a-zA-Z0-9\-_\/]+)", '$1/$2'
        
        # Pattern 2: `/api/... in template literals
        $content = $content -replace '`\/api\/([a-zA-Z0-9\-_\/\$\{\}]+)', '`/$1'
        
        # Pattern 3: process.env references with /api/
        $content = $content -replace '(\$\{[^}]+\})\/api\/', '$1/'
        
        # Check if any changes were made
        if ($content -ne $originalContent) {
            # Count the number of replacements
            $matches = ([regex]::Matches($originalContent, '\/api\/')).Count
            $script:totalReplacements += $matches
            
            # Write the updated content back to the file
            [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
            
            Write-Host "✓ Updated: $filePath ($matches replacements)" -ForegroundColor Green
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "✗ Error processing $filePath : $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "Scanning frontend directory..." -ForegroundColor Yellow
Write-Host ""

# Process all files
foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $frontendDir -Filter $ext -Recurse -File | 
             Where-Object { 
                 $_.FullName -notmatch "node_modules" -and 
                 $_.FullName -notmatch "\.next" -and
                 $_.FullName -notmatch "dist" -and
                 $_.FullName -notmatch "build"
             }
    
    foreach ($file in $files) {
        $totalFiles++
        Update-ApiPaths -filePath $file.FullName
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Summary:" -ForegroundColor Cyan
Write-Host "  Files scanned: $totalFiles" -ForegroundColor White
Write-Host "  Total replacements: $totalReplacements" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: This is a breaking change!" -ForegroundColor Yellow
Write-Host "   Please review the changes and test thoroughly." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the changes with: git diff" -ForegroundColor White
Write-Host "  2. Update backend to remove /api prefix from routes" -ForegroundColor White  
Write-Host "  3. Test all API endpoints" -ForegroundColor White
Write-Host "  4. Update documentation in docs/FRONTEND_API_CHANGES.md" -ForegroundColor White
Write-Host ""

