const fs = require('fs');
const path = require('path');

// 修复JSX错误的脚本
function fixJSXErrors() {
    const filePath = path.join(__dirname, '../frontend/pages/StressTest.tsx');
    
    if (!fs.existsSync(filePath)) {
        console.error('文件不存在:', filePath);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 修复常见的JSX错误
    const fixes = [
        // 修复未闭合的span标签
        { pattern: /<span([^>]*)>([^<]*)\?\/span>/g, replacement: '<span$1>$2</span>' },
        { pattern: /<span([^>]*)>([^<]*)\?\/span>/g, replacement: '<span$1>$2</span>' },
        
        // 修复未闭合的div标签
        { pattern: /<div([^>]*)>([^<]*)\?\/div>/g, replacement: '<div$1>$2</div>' },
        
        // 修复未闭合的h5标签
        { pattern: /<h5([^>]*)>([^<]*)\?\/h5>/g, replacement: '<h5$1>$2</h5>' },
        
        // 修复未闭合的p标签
        { pattern: /<p([^>]*)>([^<]*)\?\/p>/g, replacement: '<p$1>$2</p>' },
        
        // 修复字符串字面量错误
        { pattern: /5用户\/30\?/g, replacement: '5用户/30秒' },
        { pattern: /20用户\/60\?/g, replacement: '20用户/60秒' },
        { pattern: /50用户\/120\?/g, replacement: '50用户/120秒' },
        { pattern: /重负载\?/g, replacement: '重负载' },
        { pattern: /实时错误检查\?/g, replacement: '实时错误检查' },
        { pattern: /已连接\?/g, replacement: '已连接' },
        { pattern: /请求\/秒\?/g, replacement: '请求/秒' },
        { pattern: /并发用户数\?/g, replacement: '并发用户数' },
        { pattern: /接收数据量\?/g, replacement: '接收数据量' },
        { pattern: /成功率\?/g, replacement: '成功率' },
        { pattern: /错误率\?/g, replacement: '错误率' },
        { pattern: /吞吐量评级\?/g, replacement: '吞吐量评级' },
        { pattern: /\?运行\?/g, replacement: '运行中' },
        { pattern: /压力测试开始\?/g, replacement: '压力测试开始' },
        { pattern: /未连接\?/g, replacement: '未连接' },
        
        // 修复字符串字面量终止错误
        { pattern: /'([^']*)\n'/g, replacement: "'$1'" },
        { pattern: /"([^"]*)\n"/g, replacement: '"$1"' },
        
        // 修复模板字符串错误
        { pattern: /errorRate\.toFixed\(1'\)/g, replacement: 'errorRate.toFixed(1)' },
        
        // 修复条件表达式错误
        { pattern: /转换后数据长度\?/g, replacement: '转换后数据长度:' },
        { pattern: /测试状态\?/g, replacement: '测试状态:' },
        { pattern: /是否运行\?/g, replacement: '是否运行:' },
        { pattern: /是否完成:/g, replacement: '是否完成:' },
        
        // 修复其他常见错误
        { pattern: /\{testConfig\.duration\}\?/g, replacement: '{testConfig.duration}秒' },
    ];
    
    console.log('开始修复JSX错误...');
    let fixCount = 0;
    
    fixes.forEach((fix, index) => {
        const beforeLength = content.length;
        content = content.replace(fix.pattern, fix.replacement);
        const afterLength = content.length;
        
        if (beforeLength !== afterLength) {
            fixCount++;
            console.log(`修复 ${index + 1}: ${fix.pattern} -> ${fix.replacement}`);
        }
    });
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`修复完成! 共应用了 ${fixCount} 个修复。`);
}

// 运行修复
fixJSXErrors();
