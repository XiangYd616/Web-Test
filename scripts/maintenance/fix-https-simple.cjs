#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');

console.log('🚀 修复HTTPS检测逻辑...\n');

// 修复security-simple.js
const securityFile = path.join(projectRoot, 'backend/routes/security-simple.js');

try {
  let content = fs.readFileSync(securityFile, 'utf8');
  let modified = false;

  // 改进HTTPS检测（不区分大小写）
  if (content.includes('url.startsWith(\'https://\')')) {
    content = content.replace(
      'url.startsWith(\'https://\')',
      'url.toLowerCase().startsWith(\'https://\')'
    );
    modified = true;
    console.log('🔧 标准化HTTPS检测逻辑（不区分大小写）');
  }

  // 改进提示信息
  if (content.includes('httpsEnabled ? \'HTTPS已启用\' : \'建议启用HTTPS\'')) {
    content = content.replace(
      'httpsEnabled ? \'HTTPS已启用\' : \'建议启用HTTPS\'',
      'httpsEnabled ? \'HTTPS已启用，连接安全\' : \'建议启用HTTPS加密连接\''
    );
    modified = true;
    console.log('🔧 改进HTTPS状态提示信息');
  }

  if (modified) {
    fs.writeFileSync(securityFile, content, 'utf8');
    console.log('✅ 修复了 security-simple.js');
  }

} catch (error) {
  console.error('❌ 修复security-simple.js失败:', error.message);
}

// 修复sslAnalyzer.js
const sslFile = path.join(projectRoot, 'backend/engines/security/analyzers/sslAnalyzer.js');

try {
  let content = fs.readFileSync(sslFile, 'utf8');
  let modified = false;

  // 标准化协议检测
  if (content.includes('urlObj.protocol !== \'https:\'')) {
    content = content.replace(
      'urlObj.protocol !== \'https:\'',
      'urlObj.protocol.toLowerCase() !== \'https:\''
    );
    modified = true;
    console.log('🔧 标准化SSL分析器协议检测');
  }

  if (modified) {
    fs.writeFileSync(sslFile, content, 'utf8');
    console.log('✅ 修复了 sslAnalyzer.js');
  }

} catch (error) {
  console.error('❌ 修复sslAnalyzer.js失败:', error.message);
}

console.log('\n✅ HTTPS检测逻辑修复完成！');
console.log('📝 修复内容：');
console.log('   - 标准化HTTPS检测（不区分大小写）');
console.log('   - 改进状态提示信息');
console.log('   - 统一协议检测逻辑');
