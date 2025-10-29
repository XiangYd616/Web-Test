# 安全最佳实践

## 环境变量管理

### ✅ 正确做法
```typescript
// 使用环境变量
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

### ❌ 错误做法
```typescript
// 不要硬编码敏感信息
const apiKey = "sk-1234567890abcdef"; // 错误！
const password = "MyPassword123"; // 错误！
```

## 日志记录

### ✅ 正确做法
```typescript
import Logger from '@/utils/logger';

// 使用统一的日志系统
Logger.info('User logged in', { userId: user.id });
Logger.error('API request failed', error);
```

### ❌ 错误做法
```typescript
// 避免在生产环境使用 console.log
console.log('User data:', userData); // 可能泄露敏感信息
console.log('API response:', response); // 可能包含 token
```

## XSS 防护

### ✅ 正确做法
```typescript
// React 默认转义内容
<div>{userInput}</div>

// 使用 DOMPurify 清理 HTML
import DOMPurify from 'dompurify';
const cleanHTML = DOMPurify.sanitize(dirtyHTML);
```

### ❌ 错误做法
```typescript
// 避免使用 dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // 危险！

// 避免使用 eval
eval(userCode); // 极度危险！
```

## 认证和授权

### ✅ 正确做法
```typescript
// Token 存储在 httpOnly Cookie 或安全的存储中
const token = sessionStorage.getItem('auth_token');

// 在请求中包含 token
headers: {
  'Authorization': `Bearer ${token}`
}
```

### ❌ 错误做法
```typescript
// 不要在 URL 中传递敏感信息
window.location.href = `/api/data?token=${token}`; // 错误！

// 不要在 localStorage 中存储高度敏感的数据
localStorage.setItem('creditCard', cardNumber); // 错误！
```

## 依赖管理

### 定期更新
```bash
# 检查过时的包
npm outdated

# 检查安全漏洞
npm audit

# 修复安全漏洞
npm audit fix
```

### 审查依赖
- 只安装必要的依赖
- 审查第三方包的安全性
- 关注 GitHub Security Advisories

## API 安全

### ✅ 正确做法
```typescript
// 使用 HTTPS
const API_URL = 'https://api.example.com';

// 实现请求超时
axios.get(url, { timeout: 5000 });

// 验证响应数据
if (response.data && typeof response.data === 'object') {
  // 处理数据
}
```

### ❌ 错误做法
```typescript
// 不要忽略 SSL 证书验证
axios.get(url, { rejectUnauthorized: false }); // 危险！

// 不要信任未验证的数据
const userData = response.data;
eval(userData.code); // 极度危险！
```

## CSP (Content Security Policy)

在 index.html 中添加 CSP 头：
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

## 定期安全检查清单

- [ ] 运行 `npm audit` 检查安全漏洞
- [ ] 更新所有依赖到最新稳定版本
- [ ] 检查是否有硬编码的敏感信息
- [ ] 验证所有用户输入
- [ ] 使用 HTTPS 进行所有 API 请求
- [ ] 实现适当的错误处理（不泄露敏感信息）
- [ ] 定期审查和更新依赖
- [ ] 使用 ESLint 安全规则
- [ ] 代码审查时关注安全问题

## 报告安全问题

如果发现安全漏洞，请发送邮件到 security@example.com，不要公开披露。

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/security)
- [npm Security Best Practices](https://docs.npmjs.com/about-security)

