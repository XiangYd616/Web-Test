#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs
import sys

file_path = r"D:\myproject\Test-Web\frontend\components\pipeline\PipelineManagement.tsx"

print("正在修复所有剩余的编码问题...")
print("=" * 50)

# 读取文件
with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 定义所有需要修复的乱码及其正确形式
fixes = [
    ('娴嬭瘯娴佹按绾跨鐞?/h2>', '测试流水线管理</h2>'),
    ('杩愯涓?', '运行中'),
    ('执行娴佹按绾?', '执行流水线"'),  # 第181行缺少结束引号
    ('涓换鍔?/span>', '个任务</span>'),
]

# 执行修复
fixed_count = 0
for old, new in fixes:
    if old in content:
        # 统计出现次数
        count = content.count(old)
        content = content.replace(old, new)
        fixed_count += count
        print(f"✓ 修复 {count} 处: '{old}' -> '{new}'")
    else:
        print(f"✗ 未找到: '{old}'")

# 保存文件
with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("=" * 50)
print(f"\n✅ 总共修复了 {fixed_count} 处编码问题!")
print(f"✅ 文件已保存: {file_path}")

sys.exit(0)

