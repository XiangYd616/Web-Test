#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs

file_path = r"D:\myproject\Test-Web\frontend\components\pipeline\PipelineManagement.tsx"

print("正在修复 PipelineManagement.tsx 所有编码问题...")

# 读取文件
with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 定义所有替换（包括之前遗漏的）
replacements = {
    # 第126行
    '娴嬭瘯娴佹按绾跨鐞?/h2>': '测试流水线管理</h2>',
    # 第132行
    '杩愯涓?': '运行中',
    # 排队
    '鎺掗槦涓?': '排队中',
    # 创建
    '鍒涘缓娴佹按绾?/span>': '创建流水线</span>',
    # 列表
    '娴佹按绾垮垪琛?/h3>': '流水线列表</h3>',
    # 第181行 - 执行
    '执行娴佹按绾?': '执行流水线',
    '鎵ц娴佹按绾?': '执行流水线',
    # 第191行 - 删除（缺引号）
    '删除流水线': '删除流水线',
    '鍒犻櫎娴佹按绾?': '删除流水线',
    # 第199行 - 个任务
    '涓换鍔?/span>': '个任务</span>',
    # 其他
    '瀹氭椂鎵ц': '定时执行',
    '閫氱煡': '通知',
    '鎵ц': '执行',
    '閰嶇疆': '配置',
    '浠诲姟娴佺▼': '任务流程',
    '渚濊禆浜?': '依赖于',
    '寮€濮?': '开始',
    '鑰楁椂:': '耗时:',
    '閲嶈瘯:': '重试:',
    '娆?/span>': '次</span>',
    '璐ㄩ噺闂ㄧ': '质量门控',
    '閫氱煡閰嶇疆': '通知配置',
    '閫夋嫨涓€涓祦姘寸嚎': '选择一个流水线',
    '浠庡乏渚у垪琛ㄤ腑閫夋嫨涓€涓祦姘寸嚎鏉ユ煡鐪嬭缁嗕俊鎭拰绠＄悊閰嶇疆': '从左侧列表中选择一个流水线来查看详细信息和管理配置',
    '鍒涘缓鏂版祦姘寸嚎': '创建新流水线',
    '鍙栨秷': '取消',
    'switch鍔熻兘鍑芥暟': 'switch功能函数',
    '鍙傛暟瀵硅薄': '参数对象',
    '杩斿洖缁撴灉': '返回结果',
}

# 执行所有替换
replaced_count = 0
for old, new in replacements.items():
    if old in content:
        content = content.replace(old, new)
        replaced_count += 1
        print(f"  ✓ {old}")

# 特殊处理：修复缺少结束引号的title属性
# 第181行
old_181 = 'title="执行流水线'
new_181 = 'title="执行流水线"'
if old_181 in content and old_181 + '"' not in content:
    content = content.replace(old_181, new_181)
    replaced_count += 1
    print(f"  ✓ 修复第181行结束引号")

# 第191行
old_191 = 'title="删除流水线'
new_191 = 'title="删除流水线"'
if old_191 in content and old_191 + '"' not in content:
    content = content.replace(old_191, new_191)
    replaced_count += 1
    print(f"  ✓ 修复第191行结束引号")

# 修复模板数组（第370-373行）
old_template = """                { id: 'cicd', name: 'CI/CD 娴佹按绾?, description: '鏍囧噯鐨勬寔缁泦鎴愭祴璇曟祦绋? },
                { id: 'monitoring', name: '鐩戞帶娴佹按绾?, description: '鐢熶骇鐜鐩戞帶娴嬭瘯' },
                { id: 'regression', name: '鍥炲綊娴嬭瘯娴佹按绾?, description: '瀹屾暣鐨勫洖褰掓祴璇曞浠? },
                { id: 'security', name: '瀹夊叏娴嬭瘯娴佹按绾?, description: '鍏ㄩ潰鐨勫畨鍏ㄦ祴璇曟祦绋? }"""

new_template = """                { id: 'cicd', name: 'CI/CD 流水线', description: '标准的持续集成测试流程' },
                { id: 'monitoring', name: '监控流水线', description: '生产环境监控测试' },
                { id: 'regression', name: '回归测试流水线', description: '完整的回归测试套件' },
                { id: 'security', name: '安全测试流水线', description: '全面的安全测试流程' }"""

if old_template in content:
    content = content.replace(old_template, new_template)
    replaced_count += 4
    print("  ✓ 模板数组")

# 保存文件
with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ 总共修复了 {replaced_count} 处编码问题!")

