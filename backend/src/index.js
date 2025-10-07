/**
 * SEO测试后端API服务
 * 解决前端CORS跨域访问问题
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));

// 解析JSON
app.use(express.json());

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use('/', limiter);

// 创建axios实例，配置更好的请求头
const createAxiosInstance = () => {
  return axios.create({
    timeout: process.env.REQUEST_TIMEOUT || 30000, // 30秒超时
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  });
};

// 验证URL格式
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 清理和标准化URL
const cleanUrl = (url) => {
  let cleanedUrl = url.trim();
  
  // 移除常见错误
  cleanedUrl = cleanedUrl.replace(/,/g, '.');
  cleanedUrl = cleanedUrl.replace(/\s+/g, '');
  
  // 确保有协议
  if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
    cleanedUrl = 'https://' + cleanedUrl;
  }
  
  return cleanedUrl;
};

// 获取网页内容的主要API端点
app.post('/seo/fetch-page', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url } = req.body;
    
    if (!url) {
      
        return res.status(400).json({
        success: false,
        error: '缺少URL参数'
      });
    }
    
    const cleanedUrl = cleanUrl(url);
    
    if (!isValidUrl(cleanedUrl)) {
      return res.status(400).json({
        success: false,
        error: '无效的URL格式'
      });
    }
    
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get(cleanedUrl);
    
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ 成功获取页面: ${cleanedUrl} (${loadTime}ms)`);
    
    // 返回页面数据
    res.json({
      success: true,
      data: {
        html: response.data,
        headers: response.headers,
        status: response.status,
        url: cleanedUrl,
        loadTime
      }
    });
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    
    console.error(`❌ 获取页面失败:`, error.message);
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = '获取页面内容失败';
    let statusCode = 500;
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = '域名解析失败，请检查URL是否正确';
      statusCode = 404;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '连接被拒绝，目标服务器可能不可用';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请稍后重试';
      statusCode = 408;
    } else if (error.response) {
      statusCode = error.response.status;
      if (statusCode === 403) {
        errorMessage = '访问被禁止，网站可能有访问限制';
      } else if (statusCode === 404) {
        errorMessage = '页面不存在 (404)';
      } else if (statusCode >= 500) {
        errorMessage = '服务器错误，请稍后重试';
      } else {
        errorMessage = `HTTP错误 ${statusCode}`;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        code: error.code,
        status: error.response?.status,
        loadTime
      }
    });
  }
});

// 获取robots.txt
app.post('/seo/fetch-robots', async (req, res) => {
  try {
    const { baseUrl } = req.body;
    
    if (!baseUrl) {
      
        return res.status(400).json({
        success: false,
        error: '缺少baseUrl参数'
      });
    }
    
    const robotsUrl = `${baseUrl}/robots.txt`;
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get(robotsUrl);
    
    res.json({
      success: true,
      data: {
        exists: true,
        content: response.data,
        accessible: response.status === 200
      }
    });
    
  } catch (error) {
    console.log(`❌ robots.txt获取失败:`, error.message);
    
    res.json({
      success: true,
      data: {
        exists: false,
        content: '',
        accessible: false
      }
    });
  }
});

// 获取sitemap
app.post('/seo/fetch-sitemap', async (req, res) => {
  try {
    const { sitemapUrl } = req.body;
    
    if (!sitemapUrl) {
      
        return res.status(400).json({
        success: false,
        error: '缺少sitemapUrl参数'
      });
    }
    
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get(sitemapUrl);
    
    // 简单解析sitemap中的URL
    const urls = [];
    const urlMatches = response.data.match(/<loc>(.*?)<\/loc>/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/<\/?loc>/g, '').trim();
        if (url) {
          urls.push(url);
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        exists: true,
        content: response.data,
        accessible: response.status === 200,
        urls
      }
    });
    
  } catch (error) {
    console.log(`❌ sitemap获取失败:`, error.message);
    
    res.json({
      success: true,
      data: {
        exists: false,
        content: '',
        accessible: false,
        urls: []
      }
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SEO API服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SEO API服务已启动`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});
