#!/usr/bin/env node

/**
 * 批量模板字符串修复工具
 * 专门修复apiTestEngine.ts中的模板字符串问题
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'services/testing/apiTestEngine.ts');

if (!fs.existsSync(filePath)) {
  console.error('文件不存在:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let fixCount = 0;

// 定义需要修复的模板字符串模式
const fixes = [
  // 修复包含变量的模板字符串
  {
    pattern: /`([^`]*)\$\{\s*([^}]+)\s*\}([^`]*)`/g,
    replacement: (match, before, variable, after) => {
      // 如果包含中文字符，转换为字符串拼接
      if (/[\u4e00-\u9fa5]/.test(before + after)) {
        let result = '';
        if (before) result += `'${before}' + `;
        result += variable.trim();
        if (after) result += ` + '${after}'`;
        return result;
      }
      return match;
    }
  }
];

// 应用修复
fixes.forEach(fix => {
  const beforeFix = content;
  content = content.replace(fix.pattern, fix.replacement);

  if (beforeFix !== content) {
    const matches = beforeFix.match(fix.pattern);
    if (matches) {
      fixCount += matches.length;
    }
  }
});

// 手动修复一些特定的问题模式
const manualFixes = [
  // 修复console.log中的emoji
  {
    from: /console\.log\(`🎯 综合评分计算完成: \$\{([^}]+)\}\/100`\)/g,
    to: "console.log('🎯 综合评分计算完成: ' + $1 + '/100')"
  },

  // 修复其他包含中文的模板字符串
  {
    from: /`发现 \$\{([^}]+)\} 个慢端点：\$\{([^}]+)\}`/g,
    to: "'发现 ' + $1 + ' 个慢端点：' + $2"
  },

  {
    from: /`当前吞吐量 \$\{([^}]+)\} req\/min 较低`/g,
    to: "'当前吞吐量 ' + $1 + ' req/min 较低'"
  },

  {
    from: /`发现 \$\{([^}]+)\} 个关键安全漏洞，需要立即修复`/g,
    to: "'发现 ' + $1 + ' 个关键安全漏洞，需要立即修复'"
  },

  {
    from: /`缺少 \$\{([^}]+)\} 个重要安全头：\$\{([^}]+)\}等`/g,
    to: "'缺少 ' + $1 + ' 个重要安全头：' + $2 + '等'"
  },

  {
    from: /`当前可用性 \$\{([^}]+)\}% 低于行业标准`/g,
    to: "'当前可用性 ' + $1 + '% 低于行业标准'"
  },

  {
    from: /`可用性可提升至 \$\{([^}]+)\}%`/g,
    to: "'可用性可提升至 ' + $1 + '%'"
  },

  {
    from: /`当前错误率 \$\{([^}]+)\}% 过高，影响用户体验`/g,
    to: "'当前错误率 ' + $1 + '% 过高，影响用户体验'"
  },

  {
    from: /`发现高影响错误模式：\$\{([^}]+)\}`/g,
    to: "'发现高影响错误模式：' + $1"
  },

  {
    from: /`重试成功率 \$\{([^}]+)\}% 偏低`/g,
    to: "'重试成功率 ' + $1 + '% 偏低'"
  },

  {
    from: /`\$\{([^}]+)\} 个端点测试失败，错误处理需要改进`/g,
    to: "$1 + ' 个端点测试失败，错误处理需要改进'"
  },

  {
    from: /`\$\{([^}]+)\} 个端点存在认证问题`/g,
    to: "$1 + ' 个端点存在认证问题'"
  },

  {
    from: /`\$\{([^}]+)\} 个端点出现服务器错误`/g,
    to: "$1 + ' 个端点出现服务器错误'"
  },

  {
    from: /`API端点数量 \$\{([^}]+)\} 较多，建议考虑微服务拆分`/g,
    to: "'API端点数量 ' + $1 + ' 较多，建议考虑微服务拆分'"
  },

  {
    from: /`平均数据传输量 \$\{([^}]+)\}KB 较大`/g,
    to: "'平均数据传输量 ' + $1 + 'KB 较大'"
  }
];

// 应用手动修复
manualFixes.forEach(fix => {
  const beforeFix = content;
  content = content.replace(fix.from, fix.to);

  if (beforeFix !== content) {
    const matches = beforeFix.match(fix.from);
    if (matches) {
      fixCount += matches.length;
    }
  }
});

// 写入修复后的内容
if (fixCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ 修复了 ${fixCount} 个模板字符串问题`);
  console.log('📄 文件已更新:', path.relative(process.cwd(), filePath));
} else {
  console.log('✅ 没有发现需要修复的问题');
}

console.log('\n🔍 建议运行 TypeScript 检查: npm run type-check');
