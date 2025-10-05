$file = "D:\myproject\Test-Web\frontend\components\pipeline\PipelineManagement.tsx"

Write-Host "正在修复 PipelineManagement.tsx 编码问题..." -ForegroundColor Yellow

# 读取文件为UTF8，不添加BOM
$content = [System.IO.File]::ReadAllText($file, [System.Text.UTF8Encoding]::new($false))

# 创建完整的替换映射
$replacements = @(
    @{ Old = '娴嬭瘯娴佹按绾跨鐞?/h2>'; New = '测试流水线管理</h2>' },
    @{ Old = '杩愯涓?'; New = '运行中' },
    @{ Old = '鎺掗槦涓?'; New = '排队中' },
    @{ Old = '鍒涘缓娴佹按绾?/span>'; New = '创建流水线</span>' },
    @{ Old = '娴佹按绾垮垪琛?/h3>'; New = '流水线列表</h3>' },
    @{ Old = '鎵ц娴佹按绾?'; New = '执行流水线' },
    @{ Old = '鍒犻櫎娴佹按绾?'; New = '删除流水线' },
    @{ Old = '涓换鍔?/span>'; New = '个任务</span>' },
    @{ Old = '瀹氭椂鎵ц'; New = '定时执行' },
    @{ Old = '閫氱煡'; New = '通知' },
    @{ Old = '鎵ц'; New = '执行' },
    @{ Old = '閰嶇疆'; New = '配置' },
    @{ Old = '浠诲姟娴佺▼'; New = '任务流程' },
    @{ Old = '渚濊禆浜?'; New = '依赖于' },
    @{ Old = '寮€濮?'; New = '开始' },
    @{ Old = '鑰楁椂:'; New = '耗时:' },
    @{ Old = '閲嶈瘯:'; New = '重试:' },
    @{ Old = '娆?/span>'; New = '次</span>' },
    @{ Old = '璐ㄩ噺闂ㄧ'; New = '质量门控' },
    @{ Old = '通知配置'; New = '通知配置' },
    @{ Old = '閫夋嫨涓€涓祦姘寸嚎'; New = '选择一个流水线' },
    @{ Old = '浠庡乏渚у垪琛ㄤ腑閫夋嫨涓€涓祦姘寸嚎鏉ユ煡鐪嬭缁嗕俊鎭拰绠＄悊配置'; New = '从左侧列表中选择一个流水线来查看详细信息和管理配置' },
    @{ Old = '鍒涘缓鏂版祦姘寸嚎'; New = '创建新流水线' },
    @{ Old = '鍙栨秷'; New = '取消' },
    @{ Old = 'switch鍔熻兘鍑芥暟'; New = 'switch功能函数' },
    @{ Old = '鍙傛暟瀵硅薄'; New = '参数对象' },
    @{ Old = '杩斿洖缁撴灉'; New = '返回结果' }
)

# 执行所有替换
$replacedCount = 0
foreach ($replacement in $replacements) {
    if ($content.Contains($replacement.Old)) {
        $content = $content.Replace($replacement.Old, $replacement.New)
        $replacedCount++
        Write-Host "  ✓ 替换: $($replacement.Old)" -ForegroundColor Gray
    }
}

# 修复模板数组（第370-373行）
$oldTemplate = @'
                { id: 'cicd', name: 'CI/CD 娴佹按绾?, description: '鏍囧噯鐨勬寔缁泦鎴愭祴璇曟祦绋? },
                { id: 'monitoring', name: '鐩戞帶娴佹按绾?, description: '鐢熶骇鐜鐩戞帶娴嬭瘯' },
                { id: 'regression', name: '鍥炲綊娴嬭瘯娴佹按绾?, description: '瀹屾暣鐨勫洖褰掓祴璇曞浠? },
                { id: 'security', name: '瀹夊叏娴嬭瘯娴佹按绾?, description: '鍏ㄩ潰鐨勫畨鍏ㄦ祴璇曟祦绋? }
'@

$newTemplate = @'
                { id: 'cicd', name: 'CI/CD 流水线', description: '标准的持续集成测试流程' },
                { id: 'monitoring', name: '监控流水线', description: '生产环境监控测试' },
                { id: 'regression', name: '回归测试流水线', description: '完整的回归测试套件' },
                { id: 'security', name: '安全测试流水线', description: '全面的安全测试流程' }
'@

if ($content.Contains($oldTemplate)) {
    $content = $content.Replace($oldTemplate, $newTemplate)
    $replacedCount += 4
    Write-Host "  ✓ 修复了模板数组" -ForegroundColor Gray
}

# 保存文件，保持原有的UTF8编码，无BOM
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "`n✅ 总共修复了 $replacedCount 处编码问题!" -ForegroundColor Green

