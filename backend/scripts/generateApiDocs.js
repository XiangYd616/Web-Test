/**
 * API文档生成脚本
 * 自动生成和更新API文档
 */

const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test-Web API',
      version: '1.0.0',
      description: '现代化Web测试平台API文档',
      contact: {
        name: 'Test-Web Team',
        email: 'support@testweb.com'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}',
        description: '开发环境'
      },
      {
        url: 'https://api.testweb.com',
        description: '生产环境'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../api/v1/*.js')
  ]
};

/**
 * 生成API文档
 */
async function generateApiDocs() {
  
  try {
    // 生成Swagger规范
    const specs = swaggerJsdoc(swaggerOptions);
    
    // 确保输出目录存在
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // 保存JSON格式的API规范
    const jsonPath = path.join(docsDir, 'api-spec.json');
    fs.writeFileSync(jsonPath, JSON.stringify(specs, null, 2));
    console.log(`✅ JSON API规范已生成: ${jsonPath}`);
    
    // 生成Markdown格式的文档
    const markdownDoc = generateMarkdownDoc(specs);
    const mdPath = path.join(docsDir, 'api-documentation.md');
    fs.writeFileSync(mdPath, markdownDoc);
    console.log(`✅ Markdown文档已生成: ${mdPath}`);
    
    // 生成HTML格式的文档
    const htmlDoc = generateHtmlDoc(specs);
    const htmlPath = path.join(docsDir, 'api-documentation.html');
    fs.writeFileSync(htmlPath, htmlDoc);
    console.log(`✅ HTML文档已生成: ${htmlPath}`);
    
    // 统计信息
    const stats = analyzeApiSpecs(specs);
    
    
  } catch (error) {
    console.error('❌ API文档生成失败:', error);
    process.exit(1);
  }
}

/**
 * 生成Markdown格式的文档
 */
function generateMarkdownDoc(specs) {
  let markdown = `# ${specs.info.title}\n\n`;
  markdown += `${specs.info.description}\n\n`;
  markdown += `**版本:** ${specs.info.version}\n\n`;
  
  if (specs.servers && specs.servers.length > 0) {
    markdown += `## 服务器\n\n`;
    specs.servers.forEach(server => {
      markdown += `- **${server.description}:** ${server.url}\n`;
    });
    markdown += '\n';
  }
  
  if (specs.paths) {
    markdown += `## API端点\n\n`;
    
    Object.entries(specs.paths).forEach(([path, methods]) => {
      markdown += `### ${path}\n\n`;
      
      Object.entries(methods).forEach(([method, operation]) => {
        markdown += `#### ${method.toUpperCase()}\n\n`;
        
        if (operation.summary) {
          markdown += `**摘要:** ${operation.summary}\n\n`;
        }
        
        if (operation.description) {
          markdown += `**描述:** ${operation.description}\n\n`;
        }
        
        if (operation.parameters && operation.parameters.length > 0) {
          markdown += `**参数:**\n\n`;
          operation.parameters.forEach(param => {
            markdown += `- **${param.name}** (${param.in}): ${param.description || '无描述'}\n`;
          });
          markdown += '\n';
        }
        
        if (operation.requestBody) {
          markdown += `**请求体:** 需要\n\n`;
        }
        
        if (operation.responses) {
          markdown += `**响应:**\n\n`;
          Object.entries(operation.responses).forEach(([code, response]) => {
            markdown += `- **${code}:** ${response.description || '无描述'}\n`;
          });
          markdown += '\n';
        }
        
        markdown += '---\n\n';
      });
    });
  }
  
  return markdown;
}

/**
 * 生成HTML格式的文档
 */
function generateHtmlDoc(specs) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${specs.info.title} - API文档</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1, h2, h3 { color: #333; }
        .endpoint { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }
        .get { background-color: #61affe; }
        .post { background-color: #49cc90; }
        .put { background-color: #fca130; }
        .delete { background-color: #f93e3e; }
        .patch { background-color: #50e3c2; }
        pre { background-color: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .parameter { margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${specs.info.title}</h1>
        <p>${specs.info.description}</p>
        <p><strong>版本:</strong> ${specs.info.version}</p>
        
        ${specs.servers ? `
        <h2>服务器</h2>
        <ul>
            ${specs.servers.map(server => `<li><strong>${server.description}:</strong> ${server.url}</li>`).join('')}
        </ul>
        ` : ''}
        
        <h2>API端点</h2>
        ${Object.entries(specs.paths || {}).map(([path, methods]) => `
            <div class="endpoint">
                <h3>${path}</h3>
                ${Object.entries(methods).map(([method, operation]) => `
                    <div>
                        <h4><span class="method ${method}">${method.toUpperCase()}</span> ${operation.summary || '无标题'}</h4>
                        ${operation.description ? `<p>${operation.description}</p>` : ''}
                        ${operation.parameters && operation.parameters.length > 0 ? `
                            <h5>参数</h5>
                            ${operation.parameters.map(param => `
                                <div class="parameter">
                                    <strong>${param.name}</strong> (${param.in}) - ${param.description || '无描述'}
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
}

/**
 * 分析API规范统计信息
 */
function analyzeApiSpecs(specs) {
  let totalPaths = 0;
  let totalOperations = 0;
  let documentedOperations = 0;
  
  if (specs.paths) {
    totalPaths = Object.keys(specs.paths).length;
    
    Object.values(specs.paths).forEach(methods => {
      Object.values(methods).forEach(operation => {
        totalOperations++;
        if (operation.summary || operation.description) {
          documentedOperations++;
        }
      });
    });
  }
  
  return {
    totalPaths,
    totalOperations,
    documentedOperations
  };
}

/**
 * 验证API文档
 */
function validateApiDocs() {
  console.log('🔍 验证API文档...');
  
  try {
    const specs = swaggerJsdoc(swaggerOptions);
    const stats = analyzeApiSpecs(specs);
    
    console.log('✅ API文档验证通过');
    console.log(`📊 统计: ${stats.totalPaths}个路径, ${stats.totalOperations}个操作`);
    
    // 检查文档化率
    const documentationRate = stats.documentedOperations / stats.totalOperations;
    if (documentationRate < 0.8) {
      console.warn(`⚠️  文档化率较低: ${(documentationRate * 100).toFixed(1)}%`);
      console.warn('建议为更多API端点添加文档注释');
    }
    
    return true;
  } catch (error) {
    console.error('❌ API文档验证失败:', error);
    return false;
  }
}

/**
 * 命令行接口
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      await generateApiDocs();
      break;
      
    case 'validate':
      validateApiDocs();
      break;
      
    default:
📚 API文档生成工具

使用方法:
  npm run docs:generate  - 生成API文档
  npm run docs:validate  - 验证API文档

输出文件:
  - docs/api-spec.json           - JSON格式API规范
  - docs/api-documentation.md    - Markdown格式文档
  - docs/api-documentation.html  - HTML格式文档
      `);
      break;
  }
}

// 运行命令行接口
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateApiDocs, validateApiDocs };
