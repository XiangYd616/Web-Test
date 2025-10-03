# Fix unused variables script
$ErrorActionPreference = 'Continue'

Write-Host "Starting fixes..." -ForegroundColor Green

# Fix BackupCodes.tsx
$file1 = "D:\myproject\Test-Web\frontend\components\auth\BackupCodes.tsx"
if (Test-Path $file1) {
    $content = Get-Content $file1 -Raw
    $content = $content -replace 'const \[downloadReady, setDownloadReady\]', 'const [_downloadReady, setDownloadReady]'
    Set-Content -Path $file1 -Value $content -NoNewline
    Write-Host "Fixed BackupCodes.tsx" -ForegroundColor Green
}

# Fix LoginPrompt.tsx  
$file2 = "D:\myproject\Test-Web\frontend\components\auth\LoginPrompt.tsx"
if (Test-Path $file2) {
    $content = Get-Content $file2 -Raw
    $content = $content -replace '  feature = ', '  _feature = '
    Set-Content -Path $file2 -Value $content -NoNewline
    Write-Host "Fixed LoginPrompt.tsx" -ForegroundColor Green
}

# Fix MFAWizard.tsx
$file3 = "D:\myproject\Test-Web\frontend\components\auth\MFAWizard.tsx"
if (Test-Path $file3) {
    $content = Get-Content $file3 -Raw
    $content = $content -replace 'const \[setupComplete, setSetupComplete\]', 'const [_setupComplete, setSetupComplete]'
    Set-Content -Path $file3 -Value $content -NoNewline
    Write-Host "Fixed MFAWizard.tsx" -ForegroundColor Green
}

# Fix ReportManagement.tsx
$file4 = "D:\myproject\Test-Web\frontend\components\analytics\ReportManagement.tsx"
if (Test-Path $file4) {
    $content = Get-Content $file4 -Raw
    $content = $content -replace '  const downloadReport = async', '  const _downloadReport = async'
    Set-Content -Path $file4 -Value $content -NoNewline
    Write-Host "Fixed ReportManagement.tsx" -ForegroundColor Green
}

Write-Host "All fixes completed!" -ForegroundColor Green

