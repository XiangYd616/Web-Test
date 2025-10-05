$file = "D:\myproject\Test-Web\frontend\components\pipeline\PipelineManagement.tsx"

Write-Host "正在一次性修复所有编码问题..." -ForegroundColor Yellow

# 使用.NET读取，保持原始换行符
$content = [System.IO.File]::ReadAllText($file, [System.Text.UTF8Encoding]::new($false))

# 所有替换映射
$replacements = @{
    '娴嬭瘯娴佹按绾跨鐞?/h2>' = '测试流水线管理</h2>'
    '杩愯涓?' = '运行中'
    '鎺掗槦涓?' = '排队中'
    '鍒涘缓娴佹按绾?/span>' = '创建流水线</span>'
    '娴佹按绾垮垪琛?/h3>' = '流水线列表</h3>'
    '鎵ц娴佹按绾?' = '执行流水线'
    '鍒犻櫎娴佹按绾?' = '删除流水线'
    '涓换鍔?/span>' = '个任务</span>'
    '瀹氭椂鎵ц' = '定时执行'
    '閫氱煡' = '通知'
    '鎵ц' = '执行'
    '閰嶇疆' = '配置'
    '浠诲姟娴佺▼' = '任务流程'
    '渚濊禆浜?' = '依赖于'
    '寮€濮?' = '开始'
    '鑰楁椂:' = '耗时:'
    '閲嶈瘯:' = '重试:'
    '娆?/span>' = '次</span>'
    '璐ㄩ噺闂ㄧ' = '质量门控'
    '閫氱煡閰嶇疆' = '通知配置'
    '閫夋嫨涓€涓祦姘寸嚎' = '选择一个流水线'
    '浠庡乏渚у垪琛ㄤ腑閫夋嫨涓€涓祦姘寸嚎鏉ユ煡鐪嬭缁嗕俊鎭拰绠＄悊閰嶇疆' = '从左侧列表中选择一个流水线来查看详细信息和管理配置'
    '鍒涘缓鏂版祦姘寸嚎' = '创建新流水线'
    '鍙栨秷' = '取消'
    'switch鍔熻兘鍑芥暟' = 'switch功能函数'
    '鍙傛暟瀵硅薄' = '参数对象'
    '杩斿洖缁撴灉' = '返回结果'
}

# 执行所有替换
$replacedCount = 0
foreach ($key in $replacements.Keys) {
    if ($content.Contains($key)) {
        $content = $content.Replace($key, $replacements[$key])
        $replacedCount++
        Write-Host "  ✓ $key" -ForegroundColor Gray
    }
}

# 修复模板数组 - 使用直接字符串替换，保持原始格式
$oldTemplate = "                { id: 'cicd', name: 'CI/CD 娴佹按绾?, description: '鏍囧噯鐨勬寔缁泦鎴愭祴璇曟祦绋? },`r`n" +
               "                { id: 'monitoring', name: '鐩戞帶娴佹按绾?, description: '鐢熶骇鐜鐩戞帶娴嬭瘯' },`r`n" +
               "                { id: 'regression', name: '鍥炲綊娴嬭瘯娴佹按绾?, description: '瀹屾暣鐨勫洖褰掓祴璇曞浠? },`r`n" +
               "                { id: 'security', name: '瀹夊叏娴嬭瘯娴佹按绾?, description: '鍏ㄩ潰鐨勫畨鍏ㄦ祴璇曟祦绋? }"

$newTemplate = "                { id: 'cicd', name: 'CI/CD 流水线', description: '标准的持续集成测试流程' },`r`n" +
               "                { id: 'monitoring', name: '监控流水线', description: '生产环境监控测试' },`r`n" +
               "                { id: 'regression', name: '回归测试流水线', description: '完整的回归测试套件' },`r`n" +
               "                { id: 'security', name: '安全测试流水线', description: '全面的安全测试流程' }"

if ($content.Contains($oldTemplate)) {
    $content = $content.Replace($oldTemplate, $newTemplate)
    $replacedCount += 4
    Write-Host "  ✓ 模板数组" -ForegroundColor Gray
}

# 保存，使用WriteAllText保持原始换行符
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "`n✅ 总共修复了 $replacedCount 处编码问题!" -ForegroundColor Green

