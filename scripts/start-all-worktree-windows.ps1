# Auto-start all worktree development windows

$baseDir = "D:\myproject"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting All Worktree Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Window 2 - Backend Development
if (Test-Path "$baseDir\Test-Web-backend") {
    Write-Host "Starting Window 2 - Backend Development..." -ForegroundColor Green
    
    $backendScript = @"
cd $baseDir\Test-Web-backend
Write-Host '========================================'
Write-Host '  Window 2: Backend API Development'
Write-Host '  Branch: feature/backend-api-dev'
Write-Host '  Port: 3001'
Write-Host '========================================'
Write-Host ''
npm run backend:dev
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
    Write-Host "  Backend window opened" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Window 3 - Electron Integration
if (Test-Path "$baseDir\Test-Web-electron") {
    Write-Host "Starting Window 3 - Electron Integration..." -ForegroundColor Green
    
    $electronScript = @"
cd $baseDir\Test-Web-electron
Write-Host '========================================'
Write-Host '  Window 3: Electron Integration'
Write-Host '  Branch: feature/electron-integration'
Write-Host '========================================'
Write-Host ''
Write-Host 'Available commands:'
Write-Host '  npm run dev             - Full stack development'
Write-Host '  npm run electron:dev    - Electron only'
Write-Host '  npm run frontend        - Frontend only'
Write-Host ''
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $electronScript
    Write-Host "  Electron window opened" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Window 4 - Testing
if (Test-Path "$baseDir\Test-Web-testing") {
    Write-Host "Starting Window 4 - Testing..." -ForegroundColor Green
    
    $testingScript = @"
cd $baseDir\Test-Web-testing
Write-Host '========================================'
Write-Host '  Window 4: Testing and Maintenance'
Write-Host '  Branch: test/integration-testing'
Write-Host '========================================'
Write-Host ''
Write-Host 'Available commands:'
Write-Host '  npm run test            - Run all tests'
Write-Host '  npm run test:watch      - Watch mode'
Write-Host '  npm run test:ui         - UI mode'
Write-Host '  npm run e2e             - E2E tests'
Write-Host '  npm run lint            - Code check'
Write-Host '  npm run type-check      - TypeScript check'
Write-Host ''
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $testingScript
    Write-Host "  Testing window opened" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All windows started!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Window 1 (current): Frontend UI Development" -ForegroundColor White
Write-Host "  cd $baseDir\Test-Web" -ForegroundColor Gray
Write-Host "  npm run frontend" -ForegroundColor Cyan
Write-Host ""
Write-Host "Window 2: Backend API Development (PORT 3001)" -ForegroundColor White
Write-Host "Window 3: Electron Integration" -ForegroundColor White
Write-Host "Window 4: Testing and Maintenance" -ForegroundColor White
Write-Host ""
Write-Host "TIP: Start frontend in current window with:" -ForegroundColor Yellow
Write-Host "  npm run frontend" -ForegroundColor Cyan
Write-Host ""

