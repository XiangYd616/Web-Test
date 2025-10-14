/**
 * API文档生成脚本
 * 自动生成完整的API文档,包括所有路由的详细信息
 */

const fs = require('fs');
const path = require('path');

/**
 * 分析路由文件并提取API端点
 */
function analyzeRouteFiles() {
  const routesDir = path.join(__dirname, '../routes');
  const routes = {};
  
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  for (const file of files) {
    const routeName = file.replace('.js', '');
    const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
    
    // 提取路由定义
    const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g);
    
    if (routeMatches) {
      routes[routeName] = routeMatches.map(match => {
        const methodMatch = match.match(/router\.(\w+)\(['"]([^'"]+)['"]/);
        return {
          method: methodMatch[1].toUpperCase(),
          path: methodMatch[2]
        };
      });
    }
  }
  
  return routes;
}

/**
 * 生成Markdown格式的API文档
 */
function generateMarkdownDocs() {
  const routes = analyzeRouteFiles();
  
  let markdown = `# Test-Web-Backend API 文档

**生成时间**: ${new Date().toLocaleString('zh-CN')}  
**版本**: 1.0.0

---

## 📋 目录

`;

  // 生成目录
  Object.keys(routes).sort().forEach((routeName, index) => {
    markdown += `${index + 1}. [${routeName}](#${routeName})\n`;
  });

  markdown += `\n---\n\n`;

  // 生成详细内容
  Object.keys(routes).sort().forEach(routeName => {
    markdown += `## ${routeName}\n\n`;
    markdown += `**路由文件**: \`routes/${routeName}.js\`\n\n`;
    markdown += `| 方法 | 路径 | 描述 |\n`;
    markdown += `|------|------|------|\n`;
    
    routes[routeName].forEach(route => {
      const description = getRouteDescription(routeName, route.method, route.path);
      markdown += `| ${route.method} | \`${route.path}\` | ${description} |\n`;
    });
    
    markdown += `\n`;
  });

  // 添加认证说明
  markdown += `\n---\n\n## 🔐 认证说明\n\n`;
  markdown += `### JWT认证\n\n`;
  markdown += `大多数API端点需要JWT认证。请在请求头中包含:\n\n`;
  markdown += `\`\`\`\nAuthorization: Bearer {your_jwt_token}\n\`\`\`\n\n`;
  
  markdown += `### 获取Token\n\n`;
  markdown += `通过登录接口获取Token:\n\n`;
  markdown += `\`\`\`bash\nPOST /api/auth/login\nContent-Type: application/json\n\n{\n  "email": "user@example.com",\n  "password": "your_password"\n}\n\`\`\`\n\n`;

  // 添加响应格式说明
  markdown += `\n---\n\n## 📊 响应格式\n\n`;
  markdown += `### 成功响应\n\n`;
  markdown += `\`\`\`json\n{\n  "success": true,\n  "data": {...},\n  "message": "操作成功",\n  "timestamp": "2025-10-14T09:54:56Z"\n}\n\`\`\`\n\n`;
  
  markdown += `### 错误响应\n\n`;
  markdown += `\`\`\`json\n{\n  "success": false,\n  "error": {\n    "code": "ERROR_CODE",\n    "message": "错误描述",\n    "details": {...}\n  },\n  "timestamp": "2025-10-14T09:54:56Z"\n}\n\`\`\`\n\n`;

  // 添加常见状态码
  markdown += `\n---\n\n## 🚦 HTTP状态码\n\n`;
  markdown += `| 状态码 | 含义 | 说明 |\n`;
  markdown += `|--------|------|------|\n`;
  markdown += `| 200 | OK | 请求成功 |\n`;
  markdown += `| 201 | Created | 资源创建成功 |\n`;
  markdown += `| 400 | Bad Request | 请求参数错误 |\n`;
  markdown += `| 401 | Unauthorized | 未认证或Token无效 |\n`;
  markdown += `| 403 | Forbidden | 无权限访问 |\n`;
  markdown += `| 404 | Not Found | 资源不存在 |\n`;
  markdown += `| 409 | Conflict | 资源冲突 |\n`;
  markdown += `| 429 | Too Many Requests | 请求过于频繁 |\n`;
  markdown += `| 500 | Internal Server Error | 服务器错误 |\n\n`;

  return markdown;
}

/**
 * 获取路由描述
 */
function getRouteDescription(routeName, method, path) {
  const descriptions = {
    // 认证相关
    'auth': {
      'POST /register': '用户注册',
      'POST /login': '用户登录',
      'POST /logout': '用户登出',
      'POST /refresh': '刷新Token',
      'POST /forgot-password': '忘记密码',
      'POST /reset-password': '重置密码',
      'POST /verify-email': '验证邮箱',
      'GET /me': '获取当前用户信息'
    },
    // 用户相关
    'users': {
      'GET /profile': '获取用户资料',
      'PUT /profile': '更新用户资料',
      'GET /': '获取用户列表(管理员)',
      'GET /:id': '获取指定用户信息',
      'PUT /:id': '更新用户信息',
      'DELETE /:id': '删除用户'
    },
    // 测试相关
    'test': {
      'POST /performance': '执行性能测试',
      'POST /seo': '执行SEO测试',
      'POST /security': '执行安全测试',
      'POST /api': '执行API测试',
      'POST /stress': '执行压力测试',
      'POST /compatibility': '执行兼容性测试',
      'GET /history': '获取测试历史',
      'GET /:testId': '获取测试结果',
      'DELETE /:testId': '删除测试记录'
    },
    // 报告相关
    'reports': {
      'GET /': '获取报告列表',
      'GET /:reportId': '获取报告详情',
      'POST /generate': '生成报告',
      'POST /export': '导出报告',
      'DELETE /:reportId': '删除报告'
    }
  };

  const key = `${method} ${path}`;
  return descriptions[routeName]?.[key] || '暂无描述';
}

/**
 * 生成API统计信息
 */
function generateApiStats() {
  const routes = analyzeRouteFiles();
  
  const stats = {
    totalRoutes: Object.keys(routes).length,
    totalEndpoints: 0,
    methods: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 }
  };

  Object.values(routes).forEach(endpoints => {
    stats.totalEndpoints += endpoints.length;
    endpoints.forEach(endpoint => {
      stats.methods[endpoint.method] = (stats.methods[endpoint.method] || 0) + 1;
    });
  });

  return stats;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始生成API文档...\n');

  try {
    // 1. 生成Markdown文档
    console.log('📝 生成Markdown文档...');
    const markdown = generateMarkdownDocs();
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'API_DOCUMENTATION.md'), markdown, 'utf-8');
    console.log('✅ Markdown文档已生成: docs/API_DOCUMENTATION.md\n');

    // 2. 生成Swagger JSON (需要安装swagger-jsdoc依赖)
    // console.log('📋 生成Swagger规范...');
    // 跳过Swagger生成

    // 3. 生成统计信息
    console.log('📊 生成API统计信息...');
    const stats = generateApiStats();
    const statsMarkdown = `# API统计信息

**生成时间**: ${new Date().toLocaleString('zh-CN')}

## 总体统计

- **总路由文件数**: ${stats.totalRoutes}
- **总端点数**: ${stats.totalEndpoints}

## 按方法统计

- **GET**: ${stats.methods.GET || 0}
- **POST**: ${stats.methods.POST || 0}
- **PUT**: ${stats.methods.PUT || 0}
- **DELETE**: ${stats.methods.DELETE || 0}
- **PATCH**: ${stats.methods.PATCH || 0}

## API覆盖率

${Object.entries(stats.methods).map(([method, count]) => 
  `- ${method}: ${((count / stats.totalEndpoints) * 100).toFixed(1)}%`
).join('\n')}
`;

    fs.writeFileSync(
      path.join(docsDir, 'API_STATS.md'),
      statsMarkdown,
      'utf-8'
    );
    console.log('✅ 统计信息已生成: docs/API_STATS.md\n');

    // 4. 显示摘要
    console.log('📈 API文档生成完成!\n');
    console.log('='.repeat(50));
    console.log('📊 统计摘要:');
    console.log('='.repeat(50));
    console.log(`  路由文件: ${stats.totalRoutes}`);
    console.log(`  API端点: ${stats.totalEndpoints}`);
    console.log(`  GET: ${stats.methods.GET || 0}`);
    console.log(`  POST: ${stats.methods.POST || 0}`);
    console.log(`  PUT: ${stats.methods.PUT || 0}`);
    console.log(`  DELETE: ${stats.methods.DELETE || 0}`);
    console.log('='.repeat(50));
    console.log('\n📚 文档位置:');
    console.log(`  - API文档: ${path.join(docsDir, 'API_DOCUMENTATION.md')}`);
    console.log(`  - 统计: ${path.join(docsDir, 'API_STATS.md')}`);
    console.log('\n🌐 在线文档:');
    console.log(`  - Swagger UI: http://localhost:3001/docs (需要安装swagger依赖)`);
    console.log('\n✨ 完成!\n');

  } catch (error) {
    console.error('❌ 生成文档时出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateMarkdownDocs,
  generateApiStats,
  analyzeRouteFiles
};

