#!/usr/bin/env node
/**
 * StressTest.tsx 编码问题修复脚本
 * 修复文件中的字符编码问题和未正确结束的注释
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 StressTest.tsx 编码问题修复脚本');
console.log('='.repeat(60));

const filePath = path.join(__dirname, '../frontend/pages/StressTest.tsx');

console.log('\n📁 目标文件:', filePath);

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('\n🔍 开始修复编码问题...');
    
    // 定义需要修复的编码问题
    const fixes = [
        // 修复注释和代码合并问题
        { from: /\/\/ ([^?]*)\?([^?]*)\s*const /g, to: '// $1$2\n    const ', desc: '修复注释和const声明合并' },
        { from: /\/\/ ([^?]*)\?([^?]*)\s*if /g, to: '// $1$2\n    if ', desc: '修复注释和if语句合并' },
        { from: /\/\/ ([^?]*)\?([^?]*)\s*setStatus/g, to: '// $1$2\n                setStatus', desc: '修复注释和setStatus合并' },
        { from: /\/\/ ([^?]*)\?([^?]*)\s*console/g, to: '// $1$2\n                console', desc: '修复注释和console合并' },
        
        // 修复字符串中的编码问题
        { from: /测试开�/g, to: '测试开始', desc: '修复"测试开始"' },
        { from: /测试进行�/g, to: '测试进行中', desc: '修复"测试进行中"' },
        { from: /测试正在运行�/g, to: '测试正在运行中', desc: '修复"测试正在运行中"' },
        { from: /准备开始测试�/g, to: '准备开始测试', desc: '修复"准备开始测试"' },
        { from: /测试已完成�/g, to: '测试已完成', desc: '修复"测试已完成"' },
        { from: /测试已取�/g, to: '测试已取消', desc: '修复"测试已取消"' },
        { from: /测试被用户手动停�/g, to: '测试被用户手动停止', desc: '修复"测试被用户手动停止"' },
        { from: /开始压力测试�/g, to: '开始压力测试', desc: '修复"开始压力测试"' },
        { from: /快速模�/g, to: '快速模式', desc: '修复"快速模式"' },
        { from: /引擎状态�/g, to: '引擎状态', desc: '修复"引擎状态"' },
        { from: /连接状态�/g, to: '连接状态', desc: '修复"连接状态"' },
        { from: /已连�/g, to: '已连接', desc: '修复"已连接"' },
        { from: /实时错误检查�/g, to: '实时错误检查', desc: '修复"实时错误检查"' },
        { from: /重负�/g, to: '重负载', desc: '修复"重负载"' },
        { from: /并发用户�/g, to: '并发用户数', desc: '修复"并发用户数"' },
        { from: /错误�/g, to: '错误率', desc: '修复"错误率"' },
        { from: /成功�/g, to: '成功率', desc: '修复"成功率"' },
        { from: /吞吐量评�/g, to: '吞吐量评级', desc: '修复"吞吐量评级"' },
        { from: /一次�/g, to: '一般', desc: '修复"一般"' },
        { from: /接收数据�/g, to: '接收数据量', desc: '修复"接收数据量"' },
        { from: /响应时间分�/g, to: '响应时间分析', desc: '修复"响应时间分析"' },
        { from: /吞吐量分�/g, to: '吞吐量分析', desc: '修复"吞吐量分析"' },
        { from: /测试配�/g, to: '测试配置', desc: '修复"测试配置"' },
        { from: /请求\/�/g, to: '请求/秒', desc: '修复"请求/秒"' },
        { from: /�运行�/g, to: '运行中', desc: '修复"运行中"' },
        { from: /未连�/g, to: '未连接', desc: '修复"未连接"' },
        { from: /已连�/g, to: '已连接', desc: '修复"已连接"' },
        
        // 修复console.log中的编码问题
        { from: /console\.log\('([^']*?)�([^']*?)'\)/g, to: "console.log('$1$2')", desc: '修复console.log编码' },
        { from: /console\.error\('([^']*?)�([^']*?)'\)/g, to: "console.error('$1$2')", desc: '修复console.error编码' },
        { from: /console\.warn\('([^']*?)�([^']*?)'\)/g, to: "console.warn('$1$2')", desc: '修复console.warn编码' },
        
        // 修复字符串字面量中的编码问题
        { from: /'([^']*?)�([^']*?)'/g, to: "'$1$2'", desc: '修复字符串字面量编码' },
        { from: /"([^"]*?)�([^"]*?)"/g, to: '"$1$2"', desc: '修复双引号字符串编码' },
        
        // 修复未正确结束的字符串
        { from: /console\.log\('⚠️ 测试超时，自动取消测试\?\);/g, to: "console.log('⚠️ 测试超时，自动取消测试');", desc: '修复超时日志字符串' },
        { from: /console\.log\('🛑 测试超时，执行自动取消\?\);/g, to: "console.log('🛑 测试超时，执行自动取消');", desc: '修复自动取消日志字符串' },
        { from: /setStatusMessage\('测试超时，正在自动取消\?\.\.\'\);/g, to: "setStatusMessage('测试超时，正在自动取消...');", desc: '修复超时状态消息' },
        { from: /setStatusMessage\('测试超时已取消\?\);/g, to: "setStatusMessage('测试超时已取消');", desc: '修复超时取消消息' },
        
        // 修复HTML标签中的编码问题
        { from: /<p className="text-xs text-gray-300 mt-1">测试已成功完成�<\/p>/g, to: '<p className="text-xs text-gray-300 mt-1">测试已成功完成</p>', desc: '修复HTML标签编码' },
        { from: /<p className="text-sm font-medium text-yellow-300">测试已取�<\/p>/g, to: '<p className="text-sm font-medium text-yellow-300">测试已取消</p>', desc: '修复取消状态HTML' },
        { from: /<p className="text-xs text-gray-300 mt-1">测试被用户手动停�<\/p>/g, to: '<p className="text-xs text-gray-300 mt-1">测试被用户手动停止</p>', desc: '修复停止状态HTML' },
        { from: /<span>开始压力测试�<\/span>/g, to: '<span>开始压力测试</span>', desc: '修复按钮文本' },
        
        // 修复数字和单位的编码问题
        { from: /5用户\/30�/g, to: '5用户/30秒', desc: '修复时间单位' },
        { from: /20用户\/60�/g, to: '20用户/60秒', desc: '修复时间单位' },
        { from: /50用户\/120�/g, to: '50用户/120秒', desc: '修复时间单位' },
        
        // 修复特殊字符编码问题
        { from: /�/g, to: '', desc: '移除无效字符' },
        { from: /\?\)/g, to: ')', desc: '修复括号前的问号' },
        { from: /\?\./g, to: '.', desc: '修复句号前的问号' },
        { from: /\?;/g, to: ';', desc: '修复分号前的问号' },
        { from: /\?,/g, to: ',', desc: '修复逗号前的问号' }
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
console.log('   • 修复类型: 字符编码和注释问题');
console.log('   • 修复状态: 完成');

console.log('\n💡 建议:');
console.log('   • 运行 TypeScript 检查验证修复结果');
console.log('   • 测试页面功能确保正常工作');
console.log('   • 检查浏览器控制台确认无语法错误');
