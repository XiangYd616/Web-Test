/**
 * 精确修复第1355行的catch缩进问题
 * 将缩进从12个空格改为8个空格
 */

const fs = require('fs');
const path = require('path');

class CatchIndentFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复第1355行的catch缩进问题...\n');

    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');

    let hasChanges = false;

    // 修复第1355行和第1356行
    if (lines[1354]) { // 0-based index
      const line = lines[1354];
      console.log(`原始第1355行: "${line}"`);

      if (line.includes('} catch (error: any) {')) {
        // 强制设置为8个空格的缩进
        const newLine = '        } catch (error: any) {';
        lines[1354] = newLine;
        hasChanges = true;

        console.log(`修复第1355行: "${newLine}"`);
      } else if (line.includes('catch (error: any) {')) {
        // 处理没有}的catch情况
        const newLine = '        } catch (error: any) {';
        lines[1354] = newLine;
        hasChanges = true;

        console.log(`修复第1355行: "${newLine}"`);
      }
    }

    // 修复第1356行
    if (lines[1355]) { // 0-based index
      const line = lines[1355];
      console.log(`原始第1356行: "${line}"`);

      if (line.includes('} catch (error: any) {')) {
        // 强制设置为8个空格的缩进
        const newLine = '        } catch (error: any) {';
        lines[1355] = newLine;
        hasChanges = true;

        console.log(`修复第1356行: "${newLine}"`);
      }
    }

    // 同时修复catch块内部的缩进（从16个空格改为12个空格）
    for (let i = 1355; i <= 1390; i++) { // 1-based to 0-based
      if (lines[i - 1]) {
        const line = lines[i - 1];
        if (line.startsWith('                ')) { // 16个空格
          const newLine = line.replace(/^                /, '            '); // 改为12个空格
          if (newLine !== line) {
            lines[i - 1] = newLine;
            hasChanges = true;
            console.log(`修复第${i}行缩进`);
          }
        }
      }
    }

    if (hasChanges) {
      const newContent = lines.join('\n');
      fs.writeFileSync(this.filePath, newContent, 'utf8');
      console.log('\n✅ 文件已更新');

      // 验证修复结果
      console.log('\n🔍 验证修复结果:');
      const verifyContent = fs.readFileSync(this.filePath, 'utf8');
      const verifyLines = verifyContent.split('\n');
      const line1355 = verifyLines[1354];
      const indent = line1355.match(/^(\s*)/)[1].length;

      console.log(`第1355行当前缩进: ${indent}个空格`);
      console.log(`第1355行内容: "${line1355}"`);

      if (indent === 8) {
        console.log('✅ 缩进修复成功！');
      } else {
        console.log('❌ 缩进修复失败！');
      }
    } else {
      console.log('ℹ️ 没有需要修复的内容');
    }
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new CatchIndentFixer();
  fixer.fix().catch(console.error);
}

module.exports = CatchIndentFixer;
