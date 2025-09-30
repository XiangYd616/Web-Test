# 修复文件编码问题的脚本
# 将损坏的中文替换为英文占位符

$ErrorActionPreference = "Continue"

Write-Host "=== Fixing file encoding issues ===" -ForegroundColor Cyan
Write-Host ""

# 定义文件和修复规则
$fixes = @(
    @{
        File = "D:\myproject\Test-Web\frontend\components\charts\EnhancedCharts.tsx"
        Patterns = @(
            @{ Find = "name: '鎬绘敹鍏?,"; Replace = "name: 'Total Revenue'," }
            @{ Find = "name: '杞寲鐜?,"; Replace = "name: 'Conversion Rate'," }
            @{ Find = "name: '閿欒鐜?,"; Replace = "name: 'Error Rate'," }
            @{ Find = "name: '鏈嶅姟鍣ㄨ礋杞?,"; Replace = "name: 'Server Load'," }
            @{ Find = "label: '璁㈠崟鏁?,"; Replace = "label: 'Orders'," }
            @{ Find = "label: '璁块棶閲?,"; Replace = "label: 'Visits'," }
            @{ Find = "label: '璇锋眰鏁?绉?,"; Replace = "label: 'Requests Accumulated'," }
            @{ Find = "labels: \['鏂扮敤鎴?, '娲昏穬鐢ㄦ埛', '娴佸け鐢ㄦ埛', '鍥炴祦鐢ㄦ埛', '蹇犲疄鐢ㄦ埛'\]"; Replace = "labels: ['New Users', 'Active Users', 'Churned Users', 'Returned Users', 'Loyal Users']" }
            @{ Find = "label: '鐢ㄦ埛鏁?,"; Replace = "label: 'User Count'," }
            @{ Find = "label: '璁㈠崟鏁?,"; Replace = "label: 'Order Count'," }
            @{ Find = "label: '娲昏穬搴?,"; Replace = "label: 'Activity'," }
            @{ Find = "label: '澧為暱鐜?,"; Replace = "label: 'Growth Rate'," }
            @{ Find = "label: '鐩爣鍊?,"; Replace = "label: 'Target Value'," }
            @{ Find = "toast\.success\('鏁版嵁宸叉洿鏂?\);"; Replace = "toast.success('Data updated');" }
            @{ Find = "toast\.success\('娉ㄩ噴宸叉坊鍔?\);"; Replace = "toast.success('Annotation added');" }
            @{ Find = "text: '鏁板€?,"; Replace = "text: 'Value'," }
            @{ Find = "text: '澧為暱鐜?,"; Replace = "text: 'Growth Rate'," }
            @{ Find = "<h1 className=`"text-2xl font-bold text-gray-900`">鏁版嵁鍙鍖栦腑蹇?</h1>"; Replace = "<h1 className=`"text-2xl font-bold text-gray-900`">Data Visualization Center</h1>" }
            @{ Find = "<p className=`"text-sm text-gray-600`">瀹炴椂鐩戞帶鍜屽垎鏋愪笟鍔℃暟鎹?</p>"; Replace = "<p className=`"text-sm text-gray-600`">Real-time monitoring and business data analysis</p>" }
            @{ Find = "<option value=`"7d`">杩囧幓7澶?</option>"; Replace = "<option value=`"7d`">Past 7 Days</option>" }
            @{ Find = "<option value=`"30d`">杩囧幓30澶?</option>"; Replace = "<option value=`"30d`">Past 30 Days</option>" }
            @{ Find = "<option value=`"90d`">杩囧幓90澶?</option>"; Replace = "<option value=`"90d`">Past 90 Days</option>" }
            @{ Find = "title=\{isFullscreen \? '閫€鍑哄叏灞? : '鍏ㄥ睆'\}"; Replace = "title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}" }
            @{ Find = "<option value=`"svg`">SVG鐭㈤噺鍥?</option>"; Replace = "<option value=`"svg`">SVG Vector</option>" }
            @{ Find = "<h3 className=`"text-lg font-semibold text-gray-900 mb-3`">鏁版嵁婧?</h3>"; Replace = "<h3 className=`"text-lg font-semibold text-gray-900 mb-3`">Data Source</h3>" }
            @{ Find = "toast\.success\('璁剧疆宸查噸缃?\);"; Replace = "toast.success('Settings reset');" }
        )
    },
    @{
        File = "D:\myproject\Test-Web\frontend\components\common\Placeholder.tsx"
        Patterns = @(
            @{ Find = "<p className=`"text-sm text-gray-500 mt-1`">姝ょ粍浠舵鍦ㄥ紑鍙戜腑锛屾暚璇锋湡寰?</p>"; Replace = "<p className=`"text-sm text-gray-500 mt-1`">This component is under development</p>" }
        )
    },
    @{
        File = "D:\myproject\Test-Web\frontend\components\layout\Sidebar.tsx"
        Patterns = @(
            @{ Find = "name: '浠〃鏉?,"; Replace = "name: 'Dashboard'," }
            @{ Find = "name: '鍏煎鎬ф祴璇?,"; Replace = "name: 'Compatibility Test'," }
            @{ Find = "name: '鍙闂€ф祴璇?,"; Replace = "name: 'Accessibility Test'," }
            @{ Find = "name: '鏁版嵁搴撴祴璇?,"; Replace = "name: 'Database Test'," }
            @{ Find = "name: '绗笁鏂归泦鎴?,"; Replace = "name: 'Third-party Integration'," }
        )
    },
    @{
        File = "D:\myproject\Test-Web\frontend\components\navigation\Navigation.tsx"
        Patterns = @(
            @{ Find = "description: '鎼滅储寮曟搸浼樺寲妫€娴?"; Replace = "description: 'Search Engine Optimization Detection'" }
            @{ Find = "name: '瀹夊叏妫€娴?,"; Replace = "name: 'Security Detection'," }
            @{ Find = "name: '鍏煎鎬ф祴璇?,"; Replace = "name: 'Compatibility Test'," }
            @{ Find = "description: '璺ㄦ祻瑙堝櫒鍏煎鎬ф娴?"; Replace = "description: 'Cross-browser Compatibility Detection'" }
            @{ Find = "name: '鏁版嵁搴撴祴璇?,"; Replace = "name: 'Database Test'," }
            @{ Find = "description: '鏁版嵁搴撴€ц兘鍜屽畬鏁存€ф娴?"; Replace = "description: 'Database Performance and Integrity Detection'" }
            @{ Find = "description: '缃戠粶寤惰繜鍜屽甫瀹芥祴璇?"; Replace = "description: 'Network Latency and Bandwidth Test'" }
            @{ Find = "description: '瀹氭椂鍜屾壒閲忔祴璇曠鐞?"; Replace = "description: 'Scheduled and Batch Test Management'" }
            @{ Find = "name: '浠〃鏉?,"; Replace = "name: 'Dashboard'," }
            @{ Find = "name: '浼犵粺浠〃鏉?,"; Replace = "name: 'Traditional Dashboard'," }
            @{ Find = "<p className=`"text-xs text-gray-500`">閫夋嫨閫傚悎鐨勬祴璇曠被鍨?</p>"; Replace = "<p className=`"text-xs text-gray-500`">Choose the appropriate test type</p>" }
        )
    },
    @{
        File = "D:\myproject\Test-Web\frontend\pages\dashboard\ModernDashboard.tsx"
        Patterns = @(
            @{ Find = "\{ name: '缃戠粶娴嬭瘯', status: 'success', timestamp: '2鍒嗛挓鍓? \}"; Replace = "{ name: 'Network Test', status: 'success', timestamp: '2 min ago' }" }
            @{ Find = "\{ name: 'API娴嬭瘯', status: 'success', timestamp: '5鍒嗛挓鍓? \}"; Replace = "{ name: 'API Test', status: 'success', timestamp: '5 min ago' }" }
            @{ Find = "\{ name: '鍘嬪姏娴嬭瘯', status: 'failed', timestamp: '10鍒嗛挓鍓? \}"; Replace = "{ name: 'Stress Test', status: 'failed', timestamp: '10 min ago' }" }
            @{ Find = "\{ name: 'UX娴嬭瘯', status: 'success', timestamp: '15鍒嗛挓鍓? \}"; Replace = "{ name: 'UX Test', status: 'success', timestamp: '15 min ago' }" }
            @{ Find = "\{ name: '鏁版嵁搴撴祴璇?, status: 'running', timestamp: '20鍒嗛挓鍓? \}"; Replace = "{ name: 'Database Test', status: 'running', timestamp: '20 min ago' }" }
            @{ Find = "description: '妫€娴嬬綉缁滆繛鎺ヨ川閲? \}"; Replace = "description: 'Detect network connection quality' }" }
            @{ Find = "description: '楠岃瘉API鎺ュ彛鍔熻兘' \}"; Replace = "description: 'Verify API interface functionality' }" }
            @{ Find = "\{ name: '鏁版嵁搴撴祴璇?, icon: Database, path: '/database-test', color: 'bg-purple-500', description: '娴嬭瘯鏁版嵁搴撴€ц兘' \}"; Replace = "{ name: 'Database Test', icon: Database, path: '/database-test', color: 'bg-purple-500', description: 'Test database performance' }" }
            @{ Find = "description: '鍒嗘瀽鐢ㄦ埛浣撻獙' \}"; Replace = "description: 'Analyze user experience' }" }
            @{ Find = "description: '缁煎悎缃戠珯璇勪及' \}"; Replace = "description: 'Comprehensive website evaluation' }" }
            @{ Find = "<p className=`"text-sm font-medium text-gray-500`">鎬绘祴璇曟鏁?</p>"; Replace = "<p className=`"text-sm font-medium text-gray-500`">Total Tests</p>" }
            @{ Find = "<p className=`"text-sm font-medium text-gray-500`">鎴愬姛鐜?</p>"; Replace = "<p className=`"text-sm font-medium text-gray-500`">Success Rate</p>" }
            @{ Find = "<h2 className=`"text-lg font-semibold text-gray-900`">蹇€熷紑濮嬫祴璇?</h2>"; Replace = "<h2 className=`"text-lg font-semibold text-gray-900`">Quick Start Testing</h2>" }
            @{ Find = "<p className=`"text-sm text-gray-500 mt-1`">閫夋嫨娴嬭瘯绫诲瀷寮€濮嬫偍鐨勬祴璇?</p>"; Replace = "<p className=`"text-sm text-gray-500 mt-1`">Choose a test type to start</p>" }
            @{ Find = "<h2 className=`"text-lg font-semibold text-gray-900`">绯荤粺鐘舵€?</h2>"; Replace = "<h2 className=`"text-lg font-semibold text-gray-900`">System Status</h2>" }
            @{ Find = "<span className=`"text-sm text-gray-600`">鏁版嵁搴?</span>"; Replace = "<span className=`"text-sm text-gray-600`">Database</span>" }
            @{ Find = "<span className=`"text-sm text-yellow-600`">璐熻浇涓?</span>"; Replace = "<span className=`"text-sm text-yellow-600`">Loading</span>" }
            @{ Find = "\{test\.status === 'success' \? '鎴愬姛' : test\.status === 'failed' \? '澶辫触' : '杩涜涓?\}"; Replace = "{test.status === 'success' ? 'Success' : test.status === 'failed' ? 'Failed' : 'Running'}" }
            @{ Find = "<p className=`"mt-1 text-sm text-gray-500`">寮€濮嬫偍鐨勭涓€涓祴璇曞惂锛?</p>"; Replace = "<p className=`"mt-1 text-sm text-gray-500`">Start your first test!</p>" }
        )
    },
    @{
        File = "D:\myproject\Test-Web\frontend\pages\dashboard\RoleDashboardRouter.tsx"
        Patterns = @(
            @{ Find = "<p className=`"text-gray-500 text-sm mt-2`">姝ｅ湪涓烘偍鍑嗗涓€у寲宸ヤ綔鍙?</p>"; Replace = "<p className=`"text-gray-500 text-sm mt-2`">Preparing your personalized workspace</p>" }
        )
    }
)

$totalFixed = 0

foreach ($fix in $fixes) {
    if (Test-Path $fix.File) {
        Write-Host "Processing: $($fix.File)" -ForegroundColor Yellow
        
        $content = Get-Content $fix.File -Raw -Encoding UTF8
        $originalContent = $content
        $fileFixed = $false
        
        foreach ($pattern in $fix.Patterns) {
            if ($content -match [regex]::Escape($pattern.Find)) {
                $content = $content -replace [regex]::Escape($pattern.Find), $pattern.Replace
                $fileFixed = $true
            }
        }
        
        if ($fileFixed) {
            Set-Content -Path $fix.File -Value $content -NoNewline -Encoding UTF8
            Write-Host "  [FIXED]" -ForegroundColor Green
            $totalFixed++
        } else {
            Write-Host "  [NO CHANGES NEEDED]" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [FILE NOT FOUND]" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host "Files fixed: $totalFixed" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. npm run type-check" -ForegroundColor White
Write-Host "2. npm run build" -ForegroundColor White
