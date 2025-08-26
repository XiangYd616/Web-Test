import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修复JSX语法错误的脚本
const filePath = path.join(__dirname, 'frontend/pages/StressTest.tsx');

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');

    // 修复div标签中的空格问题和其他隐藏字符
    content = content.replace(/(<\/div)\s+(>)/g, '$1$2');
    content = content.replace(/(<\/div)[\u00A0\u2000-\u200B\u2028\u2029\uFEFF]+(>)/g, '$1$2');

    // 检查并修复特定行的问题
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('</div') && lines[i].includes('>')) {
            // 移除div标签中的所有空白字符
            lines[i] = lines[i].replace(/(<\/div)[\s\u00A0\u2000-\u200B\u2028\u2029\uFEFF]+(>)/g, '$1$2');
        }
    }
    content = lines.join('\n');

    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');

    console.log('✅ JSX语法错误已修复！');
    console.log('修复了div标签中的多余空格问题');

} catch (error) {
    console.error('❌ 修复失败:', error.message);
}
