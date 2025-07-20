/**
 * 时间显示调试工具
 * 用于诊断和修复时间显示问题
 */

export interface TimeDebugInfo {
  timestamp?: string;
  createdAt?: string;
  startTime?: string;
  savedAt?: string;
  endTime?: string;
  completedAt?: string;
}

export const debugTimeDisplay = (item: TimeDebugInfo, itemId?: string) => {
  console.group(`🕐 时间显示调试 ${itemId ? `(ID: ${itemId})` : ''}`);
  
  // 检查所有时间字段
  const timeFields = {
    timestamp: item.timestamp,
    createdAt: item.createdAt,
    startTime: item.startTime,
    savedAt: item.savedAt,
    endTime: item.endTime,
    completedAt: item.completedAt
  };

  console.log('📋 原始时间字段:', timeFields);

  // 检查哪些字段有值
  const validFields = Object.entries(timeFields)
    .filter(([_, value]) => value)
    .map(([key, value]) => ({ key, value }));

  console.log('✅ 有效时间字段:', validFields);

  if (validFields.length === 0) {
    console.warn('⚠️ 没有找到任何有效的时间字段！');
    console.groupEnd();
    return {
      hasValidTime: false,
      selectedTime: null,
      formattedTime: 'N/A',
      issue: '缺少时间字段'
    };
  }

  // 选择最佳时间字段
  const timeValue = item.timestamp || item.createdAt || item.startTime || item.savedAt;
  console.log('🎯 选择的时间值:', timeValue);

  // 验证时间格式
  if (!timeValue) {
    console.warn('⚠️ 选择的时间值为空！');
    console.groupEnd();
    return {
      hasValidTime: false,
      selectedTime: null,
      formattedTime: 'N/A',
      issue: '选择的时间值为空'
    };
  }

  const date = new Date(timeValue);
  const isValidDate = !isNaN(date.getTime());

  console.log('📅 解析的日期对象:', date);
  console.log('✅ 日期是否有效:', isValidDate);

  if (!isValidDate) {
    console.error('❌ 无效的日期格式:', timeValue);
    console.groupEnd();
    return {
      hasValidTime: false,
      selectedTime: timeValue,
      formattedTime: '无效时间',
      issue: '无效的日期格式'
    };
  }

  // 计算时间差
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  console.log('⏱️ 时间差异:', {
    毫秒: diffMs,
    分钟: diffMins,
    小时: diffHours,
    天数: diffDays
  });

  // 格式化时间
  let formattedTime = '';
  if (Math.abs(diffDays) > 365) {
    formattedTime = date.toLocaleDateString('zh-CN');
    console.log('📆 使用完整日期格式（时间差超过1年）');
  } else if (diffMs < 0) {
    const futureMins = Math.abs(diffMins);
    if (futureMins < 60) {
      formattedTime = `${futureMins}分钟后`;
    } else {
      const futureHours = Math.abs(diffHours);
      if (futureHours < 24) {
        formattedTime = `${futureHours}小时后`;
      } else {
        formattedTime = date.toLocaleDateString('zh-CN');
      }
    }
    console.log('🔮 未来时间格式');
  } else if (diffMins < 1) {
    formattedTime = '刚刚';
    console.log('⚡ 显示为"刚刚"');
  } else if (diffMins < 60) {
    formattedTime = `${diffMins}分钟前`;
    console.log('⏰ 显示分钟格式');
  } else if (diffHours < 24) {
    formattedTime = `${diffHours}小时前`;
    console.log('🕐 显示小时格式');
  } else if (diffDays < 7) {
    formattedTime = `${diffDays}天前`;
    console.log('📅 显示天数格式');
  } else {
    formattedTime = date.toLocaleDateString('zh-CN');
    console.log('📆 显示完整日期格式');
  }

  console.log('🎨 最终格式化结果:', formattedTime);
  console.groupEnd();

  return {
    hasValidTime: true,
    selectedTime: timeValue,
    formattedTime,
    issue: null,
    debugInfo: {
      原始字段: timeFields,
      有效字段: validFields,
      选择时间: timeValue,
      解析日期: date.toISOString(),
      时间差异: { diffMs, diffMins, diffHours, diffDays },
      格式化结果: formattedTime
    }
  };
};

// 批量调试多个项目的时间显示
export const debugMultipleTimeDisplays = (items: (TimeDebugInfo & { id?: string })[]) => {
  console.group('🕐 批量时间显示调试');
  console.log(`📊 调试 ${items.length} 个项目`);

  const results = items.map(item => {
    const result = debugTimeDisplay(item, item.id);
    return {
      id: item.id,
      ...result
    };
  });

  // 统计问题
  const issues = results.filter(r => !r.hasValidTime);
  const validItems = results.filter(r => r.hasValidTime);

  console.log('📈 统计结果:', {
    总数: items.length,
    有效: validItems.length,
    问题: issues.length,
    问题率: `${((issues.length / items.length) * 100).toFixed(1)}%`
  });

  if (issues.length > 0) {
    console.group('❌ 问题项目详情');
    issues.forEach(issue => {
      console.log(`ID: ${issue.id}, 问题: ${issue.issue}, 时间值: ${issue.selectedTime}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
  return results;
};

// 检查 API 响应的时间字段
export const debugApiResponse = (apiResponse: any) => {
  console.group('🌐 API 响应时间字段调试');
  
  if (!apiResponse) {
    console.error('❌ API 响应为空');
    console.groupEnd();
    return;
  }

  console.log('📡 完整 API 响应:', apiResponse);

  if (apiResponse.success && apiResponse.data) {
    if (Array.isArray(apiResponse.data.tests)) {
      console.log(`📋 找到 ${apiResponse.data.tests.length} 条测试记录`);
      
      // 检查前3条记录的时间字段
      const sampleTests = apiResponse.data.tests.slice(0, 3);
      sampleTests.forEach((test: any, index: number) => {
        console.group(`📝 测试记录 ${index + 1} (ID: ${test.id})`);
        debugTimeDisplay(test, test.id);
        console.groupEnd();
      });
    } else if (Array.isArray(apiResponse.data)) {
      console.log(`📋 找到 ${apiResponse.data.length} 条记录（直接数组）`);
      
      const sampleTests = apiResponse.data.slice(0, 3);
      sampleTests.forEach((test: any, index: number) => {
        console.group(`📝 记录 ${index + 1} (ID: ${test.id})`);
        debugTimeDisplay(test, test.id);
        console.groupEnd();
      });
    } else {
      console.warn('⚠️ 数据格式不是预期的数组格式');
      console.log('📄 数据内容:', apiResponse.data);
    }
  } else {
    console.error('❌ API 响应格式错误或请求失败');
    console.log('📄 响应内容:', apiResponse);
  }

  console.groupEnd();
};

// 生成时间字段修复建议
export const generateTimeFixSuggestions = (debugResults: any[]) => {
  const issues = debugResults.filter(r => !r.hasValidTime);
  
  if (issues.length === 0) {
    return '✅ 所有时间字段都正常，无需修复。';
  }

  const suggestions = [
    '🔧 时间字段修复建议：',
    '',
    `❌ 发现 ${issues.length} 个问题项目`,
    ''
  ];

  // 分析问题类型
  const problemTypes = issues.reduce((acc: any, issue) => {
    const type = issue.issue || '未知问题';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  suggestions.push('📊 问题分布：');
  Object.entries(problemTypes).forEach(([type, count]) => {
    suggestions.push(`  • ${type}: ${count} 个`);
  });

  suggestions.push('');
  suggestions.push('🛠️ 修复建议：');
  
  if (problemTypes['缺少时间字段']) {
    suggestions.push('  1. 检查后端 API 是否正确返回时间字段');
    suggestions.push('  2. 确认数据库中的时间字段不为 NULL');
    suggestions.push('  3. 检查 formatTestRecord 方法是否正确映射时间字段');
  }

  if (problemTypes['无效的日期格式']) {
    suggestions.push('  1. 检查数据库中的时间格式是否为标准 ISO 格式');
    suggestions.push('  2. 确认时区设置是否正确');
    suggestions.push('  3. 检查数据类型转换是否正确');
  }

  if (problemTypes['选择的时间值为空']) {
    suggestions.push('  1. 检查前端时间字段选择逻辑');
    suggestions.push('  2. 确认后端返回的字段名称是否正确');
    suggestions.push('  3. 检查数据处理过程中是否丢失了时间信息');
  }

  return suggestions.join('\n');
};

// 在浏览器控制台中使用的便捷函数
(window as any).debugTimeDisplay = {
  debug: debugTimeDisplay,
  debugMultiple: debugMultipleTimeDisplays,
  debugApi: debugApiResponse,
  generateSuggestions: generateTimeFixSuggestions
};
