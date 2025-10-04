# 模块导入修复脚本
# 修复由于删除重复文件导致的导入问题

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   修复模块导入问题" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

$projectRoot = "D:\myproject\Test-Web"
$fixedCount = 0

# Problem 1: ErrorBoundary 被删除，需要更新导入
Write-Host "1. 修复 ErrorBoundary 导入..." -ForegroundColor Cyan
$appFile = "$projectRoot\frontend\App.tsx"
if (Test-Path $appFile) {
    $content = Get-Content $appFile -Raw
    $content = $content -replace "import ErrorBoundary from './components/ui/ErrorBoundary';", 
        "import ErrorBoundary from './components/common/ErrorBoundary';"
    $content | Out-File -FilePath $appFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 App.tsx" -ForegroundColor Green
    $fixedCount++
}

# Problem 2: MFA 组件被删除，需要更新导入指向 pages/auth
Write-Host "`n2. 修复 MFA 组件导入..." -ForegroundColor Cyan

# 修复 auth/index.ts
$authIndexFile = "$projectRoot\frontend\components\auth\index.ts"
if (Test-Path $authIndexFile) {
    $content = Get-Content $authIndexFile -Raw
    $content = $content -replace "export \{ default as MFASetup \} from './MFASetup';", 
        "export { default as MFASetup } from '../../pages/auth/MFASetup';"
    $content = $content -replace "export \{ default as MFAManagement \} from './MFAManagement';", 
        "export { default as MFAManagement } from '../../pages/auth/MFAManagement';"
    $content = $content -replace "export \{ default as MFAVerification \} from './MFAVerification';", 
        "export { default as MFAVerification } from '../../pages/auth/MFAVerification';"
    $content | Out-File -FilePath $authIndexFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 components/auth/index.ts" -ForegroundColor Green
    $fixedCount += 3
}

# 修复 MFAWizard.tsx
$mfaWizardFile = "$projectRoot\frontend\components\auth\MFAWizard.tsx"
if (Test-Path $mfaWizardFile) {
    $content = Get-Content $mfaWizardFile -Raw
    $content = $content -replace "import MFASetup from './MFASetup';", 
        "import MFASetup from '../../pages/auth/MFASetup';"
    $content | Out-File -FilePath $mfaWizardFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 MFAWizard.tsx" -ForegroundColor Green
    $fixedCount++
}

# Problem 3: StatCard 被删除，需要更新导入指向 ui/StatCard
Write-Host "`n3. 修复 StatCard 导入..." -ForegroundColor Cyan

$filesToFix = @(
    "$projectRoot\frontend\components\common\index.ts",
    "$projectRoot\frontend\components\data\DataStats.tsx"
)

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "from '../modern/StatCard'", "from '../ui/StatCard'"
        $content = $content -replace "from '\.\./modern/StatCard'", "from '../ui/StatCard'"
        $content | Out-File -FilePath $file -Encoding UTF8 -NoNewline
        $fileName = Split-Path $file -Leaf
        Write-Host "  ✓ 修复 $fileName" -ForegroundColor Green
        $fixedCount++
    }
}

# Problem 4: Chart 被删除，需要更新导入
Write-Host "`n4. 修复 Chart 导入..." -ForegroundColor Cyan
$chartFiles = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.tsx","*.ts" -File | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "from ['\"].*\/ui\/Chart['\"]" }

foreach ($file in $chartFiles) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "from ['\"]\.\.\/ui\/Chart['\"]", "from '../charts/Chart'"
    $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 $($file.Name)" -ForegroundColor Green
    $fixedCount++
}

# Problem 5: dataService 被删除，需要更新导入
Write-Host "`n5. 修复 dataService 导入..." -ForegroundColor Cyan
$dataManagerFile = "$projectRoot\frontend\components\data\DataManager.tsx"
if (Test-Path $dataManagerFile) {
    $content = Get-Content $dataManagerFile -Raw
    $content = $content -replace "from '\.\.\/\.\.\/services\/dataService'", 
        "from '../../services/integration/dataService'"
    $content | Out-File -FilePath $dataManagerFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 DataManager.tsx" -ForegroundColor Green
    $fixedCount++
}

# Problem 6: Layout 被删除，需要更新导入
Write-Host "`n6. 修复 Layout 导入..." -ForegroundColor Cyan
$layoutFile = "$projectRoot\frontend\components\layout\Layout.tsx"
if (Test-Path $layoutFile) {
    $content = Get-Content $layoutFile -Raw
    # 检查是否有从 common/Layout 导入的
    if ($content -match "from ['\"]\.\.\/common\/Layout['\"]") {
        # 这个文件本身就是 Layout，需要移除或重构导入
        Write-Host "  ⚠️  Layout.tsx 导入自身，需要手动检查" -ForegroundColor Yellow
    }
}

# Problem 7: 修复大小写问题
Write-Host "`n7. 修复文件名大小写问题..." -ForegroundColor Cyan

# 修复 withAuthCheck/WithAuthCheck
$files = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.tsx","*.ts" -File | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "from ['\"].*withAuthCheck" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "withAuthCheck", "WithAuthCheck"
    $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 $($file.Name) 中的 withAuthCheck" -ForegroundColor Green
    $fixedCount++
}

# 修复 TestOrchestrator
$files = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.tsx","*.ts" -File | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "TestOrchestrator" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "orchestration/TestOrchestrator", "orchestration/testOrchestrator"
    $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 $($file.Name) 中的 TestOrchestrator" -ForegroundColor Green
    $fixedCount++
}

# 修复 StateManager
$files = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.tsx","*.ts" -File | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "state/StateManager" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "state/StateManager", "state/stateManager"
    $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复 $($file.Name) 中的 StateManager" -ForegroundColor Green
    $fixedCount++
}

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   修复完成" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "修复统计:" -ForegroundColor Yellow
Write-Host "  • 已修复的文件/导入: $fixedCount 处" -ForegroundColor Green

Write-Host "`n验证修复效果..." -ForegroundColor Cyan
Write-Host "运行: node_modules\.bin\tsc --noEmit --project tsconfig.dev.json`n" -ForegroundColor Gray

