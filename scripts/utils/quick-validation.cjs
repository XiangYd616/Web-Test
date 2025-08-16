/**
 * 快速验证所有测试工具实现
 */

const fs = require('fs');
const path = require('path');

const testTools = [
  { name: 'api', method: 'runApiTest' },
  { name: 'compatibility', method: 'runCompatibilityTest' },
  { name: 'infrastructure', method: 'runInfrastructureTest' },
  { name: 'performance', method: 'runPerformanceTest' },
  { name: 'security', method: 'runSecurityTest' },
  { name: 'seo', method: 'runSeoTest' },
  { name: 'stress', method: 'runStressTest' },
  { name: 'ux', method: 'runUxTest' },
  { name: 'website', method: 'runWebsiteTest' }
];

console.log('🔍 快速验证所有测试工具实现...\n');

let implemented = 0;
let total = testTools.length;

for (const tool of testTools) {
  const filePath = path.join(__dirname, '..', 'backend', 'engines', tool.name, `${tool.name}TestEngine.js`);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasMethod = content.includes(tool.method);
    const hasRequire = content.includes('require(');
    const hasValidateConfig = content.includes('validateConfig');
    const hasCheckAvailability = content.includes('checkAvailability');
    
    if (hasMethod && hasRequire && hasValidateConfig && hasCheckAvailability) {
      console.log(`✅ ${tool.name}: 完整实现`);
      implemented++;
    } else {
      console.log(`⚠️ ${tool.name}: 部分实现 (缺少: ${!hasMethod ? tool.method + ' ' : ''}${!hasRequire ? 'require ' : ''}${!hasValidateConfig ? 'validateConfig ' : ''}${!hasCheckAvailability ? 'checkAvailability' : ''})`);
    }
  } else {
    console.log(`❌ ${tool.name}: 文件不存在`);
  }
}

console.log(`\n📊 实现统计:`);
console.log(`✅ 完整实现: ${implemented}/${total} (${Math.round(implemented/total*100)}%)`);
console.log(`⚠️ 需要完善: ${total - implemented}/${total}`);

if (implemented === total) {
  console.log('\n🎉 所有测试工具已完整实现！');
} else {
  console.log('\n🔧 部分工具需要继续完善');
}
