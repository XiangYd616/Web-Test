# -*- coding: utf-8 -*-
import codecs

file_path = r"D:\myproject\Test-Web\frontend\components\pipeline\PipelineManagement.tsx"
print("正在修复剩余的编码问题...")

with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = {
    '娴嬭瘯娴佹按绾跨鐞?/h2>': '测试流水线管理</h2>',
    '杩愯涓?': '运行中',
    '执行娴佹按绾?': '执行流水线',
    '涓换鍔?/span>': '个任务</span>',
}

count = 0
for old, new in fixes.items():
    if old in content:
        content = content.replace(old, new)
        count += 1
        print(f"  ✓ {old} -> {new}")

# 确保引号闭合
if 'title="执行流水线' in content and 'title="执行流水线"' not in content:
    content = content.replace('title="执行流水线', 'title="执行流水线"')
    count += 1
    print("  ✓ 修复第181行引号")

with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ 修复了 {count} 处问题!")
