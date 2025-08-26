import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 调试JSX语法错误的脚本
const filePath = path.join(__dirname, 'frontend/pages/StressTest.tsx');

try {
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // 检查第6259行的十六进制内容
    console.log('检查第6259行:');
    console.log('内容:', JSON.stringify(lines[6258]));
    console.log('长度:', lines[6258].length);
    
    // 显示每个字符的十六进制值
    for (let i = 0; i < lines[6258].length; i++) {
        const char = lines[6258][i];
        const code = char.charCodeAt(0);
        console.log(`位置${i}: "${char}" (0x${code.toString(16).padStart(4, '0')})`);
    }
    
    console.log('\n检查第6260行:');
    console.log('内容:', JSON.stringify(lines[6259]));
    console.log('长度:', lines[6259].length);
    
    // 显示每个字符的十六进制值
    for (let i = 0; i < lines[6259].length; i++) {
        const char = lines[6259][i];
        const code = char.charCodeAt(0);
        console.log(`位置${i}: "${char}" (0x${code.toString(16).padStart(4, '0')})`);
    }
    
} catch (error) {
    console.error('❌ 调试失败:', error.message);
}
