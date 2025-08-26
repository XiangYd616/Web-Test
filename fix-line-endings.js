import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修复行结尾和JSX语法错误的脚本
const filePath = path.join(__dirname, 'frontend/pages/StressTest.tsx');

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('原始文件大小:', content.length);
    
    // 统一行结尾为LF
    content = content.replace(/\r\n/g, '\n');
    content = content.replace(/\r/g, '\n');
    
    console.log('修复行结尾后文件大小:', content.length);
    
    // 修复div标签中的空格问题
    content = content.replace(/(<\/div)\s+(>)/g, '$1$2');
    
    // 特别处理最后几行
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('</div') && lines[i].includes('>')) {
            // 移除div标签中的所有空白字符，但保留缩进
            const match = lines[i].match(/^(\s*)(.*<\/div)\s*(>.*)/);
            if (match) {
                lines[i] = match[1] + match[2] + match[3];
            }
        }
    }
    content = lines.join('\n');
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ JSX语法错误和行结尾问题已修复！');
    console.log('- 统一了行结尾格式为LF');
    console.log('- 修复了div标签中的多余空格问题');
    
} catch (error) {
    console.error('❌ 修复失败:', error.message);
}
