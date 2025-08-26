#!/usr/bin/env node
/**
 * 批量修复编码问题脚本
 * 修复StressTest.tsx文件中的中文字符编码问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 批量编码修复脚本');
console.log('='.repeat(50));

const filePath = path.join(__dirname, '../frontend/pages/StressTest.tsx');

console.log('\n📁 目标文件:', filePath);

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');

    console.log('\n🔍 开始修复编码问题...');

    // 定义需要修复的编码问题
    const fixes = [
        // 修复"检查"字符
        { from: /检�/g, to: '检查', desc: '修复"检查"字符编码' },

        // 修复"队"字符
        { from: /排�/g, to: '排队', desc: '修复"排队"字符编码' },

        // 修复"取"字符
        { from: /获�/g, to: '获取', desc: '修复"获取"字符编码' },

        // 修复"秒"字符
        { from: /秒�/g, to: '秒', desc: '修复"秒"字符编码' },

        // 修复"收"字符
        { from: /�收/g, to: '收', desc: '修复"收"字符编码' },

        // 修复"成"字符
        { from: /完�/g, to: '完成', desc: '修复"完成"字符编码' },

        // 修复"间"字符
        { from: /时�/g, to: '时间', desc: '修复"时间"字符编码' },

        // 修复"度"字符
        { from: /长�/g, to: '长度', desc: '修复"长度"字符编码' },

        // 修复"态"字符
        { from: /状�/g, to: '状态', desc: '修复"状态"字符编码' },

        // 修复"行"字符
        { from: /进�/g, to: '进行', desc: '修复"进行"字符编码' },

        // 修复"试"字符
        { from: /测�/g, to: '测试', desc: '修复"测试"字符编码' },

        // 修复"到"字符
        { from: /达�/g, to: '达到', desc: '修复"达到"字符编码' },

        // 修复"用"字符
        { from: /专�/g, to: '专用', desc: '修复"专用"字符编码' },

        // 修复"容"字符
        { from: /内�/g, to: '内容', desc: '修复"内容"字符编码' },

        // 修复"房"字符
        { from: /房�/g, to: '房间', desc: '修复"房间"字符编码' },

        // 修复"次"字符
        { from: /一�/g, to: '一次', desc: '修复"一次"字符编码' },

        // 修复"在"字符
        { from: /�在/g, to: '在', desc: '修复"在"字符编码' },

        // 修复"个"字符
        { from: /�个/g, to: '个', desc: '修复"个"字符编码' },

        // 修复"后"字符
        { from: /�后/g, to: '后', desc: '修复"后"字符编码' },

        // 修复"最"字符
        { from: /�最/g, to: '最', desc: '修复"最"字符编码' }
    ];

    let fixCount = 0;

    // 应用所有修复
    fixes.forEach(fix => {
        const matches = content.match(fix.from);
        if (matches) {
            content = content.replace(fix.from, fix.to);
            fixCount += matches.length;
            console.log(`   ✅ ${fix.desc}: 修复了 ${matches.length} 处`);
        }
    });

    if (fixCount > 0) {
        // 写回文件
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`\n🎉 修复完成! 总共修复了 ${fixCount} 处编码问题`);
    } else {
        console.log('\n✅ 没有发现需要修复的编码问题');
    }

} catch (error) {
    console.error('\n❌ 修复过程中出现错误:', error.message);
    process.exit(1);
}

console.log('\n📊 修复统计:');
console.log('   • 目标文件: StressTest.tsx');
console.log('   • 修复类型: 中文字符编码问题');
console.log('   • 修复状态: 完成');

console.log('\n💡 建议:');
console.log('   • 运行 TypeScript 检查验证修复结果');
console.log('   • 测试页面功能确保正常工作');
console.log('   • 检查其他文件是否有类似问题');
