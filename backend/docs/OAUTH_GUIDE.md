# OAuth 第三方登录使用指南

## 📋 目录

- [概述](#概述)
- [支持的OAuth提供商](#支持的oauth提供商)
- [配置说明](#配置说明)
- [API参考](#api参考)
- [使用流程](#使用流程)
- [客户端集成](#客户端集成)
- [账户关联](#账户关联)
- [安全注意事项](#安全注意事项)
- [故障排查](#故障排查)

---

## 概述

OAuth 2.0是一个开放标准的授权协议,允许用户使用第三方账号(如Google、GitHub)登录应用,无需创建新的账户密码。这提升了用户体验并增强了安全性。

### 核心特性

- ✅ 无需密码注册/登录
- ✅ 使用已有的可信任账户
- ✅ 自动获取用户基本信息
- ✅ 支持账户关联和解绑
- ✅ 一键登录体验
- ✅ 减少密码管理风险

---

## 支持的OAuth提供商

### 1. Google OAuth 2.0

**优势:**
- 全球最广泛使用的身份提供商
- 高安全性和可靠性
- 完善的API和文档

**获取的用户信息:**
- 用户名 (name)
- 邮箱 (email)
- 头像 (picture)
- Google用户ID

---

### 2. GitHub OAuth

**优势:**
- 开发者首选身份提供商
- 适合技术型产品
- 提供丰富的用户档案信息

**获取的用户信息:**
- GitHub用户名 (login)
- 显示名称 (name)
- 邮箱 (email)
- 头像 (avatar_url)
- GitHub用户ID

---

## 配置说明

### 前置要求

在使用OAuth功能前,需要在对应平台注册应用并获取凭证。

### 1. 配置Google OAuth

#### 步骤1: 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google+ API" 或 "Google People API"

#### 步骤2: 创建OAuth 2.0凭据

1. 导航到 **APIs & Services → Credentials**
2. 点击 **Create Credentials → OAuth 2.0 Client ID**
3. 选择应用类型: **Web application**
4. 配置授权重定向URI:
   ```
   http://localhost:3000/auth/oauth/google/callback
   https://yourdomain.com/auth/oauth/google/callback
   ```
5. 获取 **Client ID** 和 **Client Secret**

#### 步骤3: 配置环境变量

```bash
# .env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback
```

---

### 2. 配置GitHub OAuth

#### 步骤1: 注册OAuth应用

1. 访问 [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写应用信息:
   - **Application name**: Test Web Platform
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/oauth/github/callback`
4. 点击 **Register application**

#### 步骤2: 获取凭据

1. 复制 **Client ID**
2. 生成并复制 **Client Secret**

#### 步骤3: 配置环境变量

```bash
# .env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/oauth/github/callback
```

---

### 完整环境变量示例

```bash
# .env

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwx
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678
GITHUB_CALLBACK_URL=http://localhost:3000/auth/oauth/github/callback

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/testwebdb
```

---

## API参考

### 1. 发起OAuth授权

#### Google登录
```http
GET /auth/oauth/google
```

**功能:** 重定向用户到Google授权页面

**流程:**
1. 用户点击"使用Google登录"按钮
2. 浏览器跳转到Google授权页面
3. 用户授权后返回callback URL

---

#### GitHub登录
```http
GET /auth/oauth/github
```

**功能:** 重定向用户到GitHub授权页面

**流程:**
1. 用户点击"使用GitHub登录"按钮
2. 浏览器跳转到GitHub授权页面
3. 用户授权后返回callback URL

---

### 2. OAuth回调处理

#### Google回调
```http
GET /auth/oauth/google/callback?code={authorization_code}
```

**参数:**
- `code` (自动由Google提供): 授权码

**成功响应:**
```json
{
  "success": true,
  "message": "Google OAuth登录成功",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "username": "user",
    "provider": "google",
    "providerId": "google_user_id"
  },
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ...",
  "expiresIn": 3600
}
```

---

#### GitHub回调
```http
GET /auth/oauth/github/callback?code={authorization_code}
```

**参数:**
- `code` (自动由GitHub提供): 授权码

**成功响应:**
```json
{
  "success": true,
  "message": "GitHub OAuth登录成功",
  "user": {
    "id": "uuid",
    "email": "user@users.noreply.github.com",
    "username": "githubuser",
    "provider": "github",
    "providerId": "12345678"
  },
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ...",
  "expiresIn": 3600
}
```

---

### 3. 关联OAuth账户

#### 关联Google账户
```http
POST /auth/oauth/link/google
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "authorization_code"
}
```

**功能:** 将Google账户关联到现有用户

**响应:**
```json
{
  "success": true,
  "message": "Google账户关联成功",
  "linkedAccounts": ["google"]
}
```

---

#### 关联GitHub账户
```http
POST /auth/oauth/link/github
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "authorization_code"
}
```

---

### 4. 解绑OAuth账户

#### 解绑Google账户
```http
DELETE /auth/oauth/unlink/google
Authorization: Bearer {access_token}
```

**响应:**
```json
{
  "success": true,
  "message": "Google账户解绑成功"
}
```

---

#### 解绑GitHub账户
```http
DELETE /auth/oauth/unlink/github
Authorization: Bearer {access_token}
```

---

### 5. 查看关联账户

```http
GET /auth/oauth/linked-accounts
Authorization: Bearer {access_token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "linkedAccounts": [
      {
        "provider": "google",
        "providerId": "google_user_id",
        "email": "user@gmail.com",
        "linkedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "provider": "github",
        "providerId": "12345678",
        "email": "user@users.noreply.github.com",
        "linkedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  }
}
```

---

## 使用流程

### 新用户注册流程

```
用户访问登录页
    ↓
点击"使用Google登录"
    ↓
GET /auth/oauth/google (重定向到Google)
    ↓
用户在Google页面授权
    ↓
Google重定向回 /auth/oauth/google/callback?code=xxx
    ↓
后端处理:
  1. 使用code换取access_token
  2. 获取Google用户信息
  3. 检查邮箱是否已注册
  4. 如果未注册,创建新用户
  5. 生成JWT tokens
    ↓
返回用户信息和tokens
    ↓
前端存储tokens并跳转到主页
```

---

### 已有用户登录流程

```
用户访问登录页
    ↓
点击"使用GitHub登录"
    ↓
GET /auth/oauth/github (重定向到GitHub)
    ↓
用户在GitHub页面授权
    ↓
GitHub重定向回 /auth/oauth/github/callback?code=xxx
    ↓
后端处理:
  1. 使用code换取access_token
  2. 获取GitHub用户信息
  3. 检查providerId是否已关联
  4. 如果已关联,直接登录
  5. 如果未关联但邮箱已存在,提示关联
  6. 生成JWT tokens
    ↓
返回用户信息和tokens
    ↓
前端存储tokens并跳转到主页
```

---

### 关联账户流程

```
已登录用户访问设置页
    ↓
点击"关联Google账户"
    ↓
前端发起OAuth授权 (弹出窗口或重定向)
    ↓
用户在Google授权
    ↓
前端获取authorization_code
    ↓
POST /auth/oauth/link/google
Authorization: Bearer {user_token}
Body: { code: "authorization_code" }
    ↓
后端处理:
  1. 验证用户身份
  2. 使用code换取access_token
  3. 获取Google用户信息
  4. 检查providerId是否已被其他用户使用
  5. 关联到当前用户
    ↓
返回关联成功
    ↓
前端显示关联成功提示
```

---

## 客户端集成

### React示例

```javascript
import React from 'react';

// OAuth登录按钮组件
function OAuthButtons() {
  const handleGoogleLogin = () => {
    // 方法1: 直接重定向
    window.location.href = 'http://localhost:3000/auth/oauth/google';
  };

  const handleGitHubLogin = () => {
    window.location.href = 'http://localhost:3000/auth/oauth/github';
  };

  return (
    <div className="oauth-buttons">
      <h3>或使用以下方式登录</h3>
      
      <button 
        onClick={handleGoogleLogin}
        className="btn-google"
      >
        <img src="/icons/google.svg" alt="Google" />
        使用Google登录
      </button>
      
      <button 
        onClick={handleGitHubLogin}
        className="btn-github"
      >
        <img src="/icons/github.svg" alt="GitHub" />
        使用GitHub登录
      </button>
    </div>
  );
}

// OAuth回调处理页面
function OAuthCallback() {
  React.useEffect(() => {
    // URL中的tokens参数由后端重定向时添加
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error) {
      alert('登录失败: ' + error);
      window.location.href = '/login';
      return;
    }

    if (accessToken && refreshToken) {
      // 保存tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // 跳转到主页
      window.location.href = '/dashboard';
    }
  }, []);

  return <div>正在处理登录...</div>;
}

// 账户关联组件
function LinkAccountSettings({ user }) {
  const [linkedAccounts, setLinkedAccounts] = React.useState([]);

  React.useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    const response = await fetch('/auth/oauth/linked-accounts', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setLinkedAccounts(data.data.linkedAccounts);
    }
  };

  const handleLinkGoogle = () => {
    // 打开OAuth授权窗口
    const width = 600, height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const popup = window.open(
      '/auth/oauth/google',
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // 监听回调
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'oauth-callback') {
        popup.close();
        
        // 使用code关联账户
        const response = await fetch('/auth/oauth/link/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ code: event.data.code })
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Google账户关联成功!');
          fetchLinkedAccounts();
        } else {
          alert('关联失败: ' + data.message);
        }
      }
    });
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('确定要解绑Google账户吗?')) return;
    
    const response = await fetch('/auth/oauth/unlink/google', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Google账户解绑成功');
      fetchLinkedAccounts();
    }
  };

  const isLinked = (provider) => {
    return linkedAccounts.some(acc => acc.provider === provider);
  };

  return (
    <div className="linked-accounts">
      <h3>已关联账户</h3>
      
      <div className="account-item">
        <img src="/icons/google.svg" alt="Google" />
        <span>Google</span>
        {isLinked('google') ? (
          <>
            <span className="linked">✓ 已关联</span>
            <button onClick={handleUnlinkGoogle}>解绑</button>
          </>
        ) : (
          <button onClick={handleLinkGoogle}>关联</button>
        )}
      </div>
      
      {/* 类似的GitHub关联UI */}
    </div>
  );
}

export { OAuthButtons, OAuthCallback, LinkAccountSettings };
```

---

### HTML + Vanilla JS示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>OAuth登录示例</title>
  <style>
    .oauth-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .oauth-btn:hover {
      background-color: #f5f5f5;
    }
    .oauth-btn img {
      width: 24px;
      height: 24px;
    }
  </style>
</head>
<body>
  <div id="login-container">
    <h2>登录</h2>
    
    <button class="oauth-btn" onclick="loginWithGoogle()">
      <img src="https://www.google.com/favicon.ico" alt="Google">
      使用Google登录
    </button>
    
    <button class="oauth-btn" onclick="loginWithGitHub()">
      <img src="https://github.com/favicon.ico" alt="GitHub">
      使用GitHub登录
    </button>
  </div>

  <script>
    const API_BASE_URL = 'http://localhost:3000';

    function loginWithGoogle() {
      window.location.href = `${API_BASE_URL}/auth/oauth/google`;
    }

    function loginWithGitHub() {
      window.location.href = `${API_BASE_URL}/auth/oauth/github`;
    }

    // 检查URL中的回调参数
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('accessToken');
      const error = params.get('error');

      if (error) {
        alert('登录失败: ' + decodeURIComponent(error));
        // 清理URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        alert('登录成功!');
        // 跳转到主页
        window.location.href = '/dashboard.html';
      }
    });
  </script>
</body>
</html>
```

---

## 账户关联

### 关联策略

系统支持以下账户关联场景:

#### 1. 自动关联

**场景:** OAuth邮箱与现有用户邮箱匹配

```javascript
// 后端逻辑
if (existingUser && existingUser.email === oauthProfile.email) {
  // 自动关联OAuth账户到现有用户
  await linkOAuthAccount(existingUser.id, provider, providerId);
}
```

#### 2. 手动关联

**场景:** 用户已登录,主动关联新的OAuth账户

```javascript
// 用户在设置页面点击"关联Google账户"
// 流程同上述"关联账户流程"
```

#### 3. 多账户关联

**限制:**
- 一个用户可以关联多个不同的OAuth提供商
- 同一个OAuth账户只能关联到一个用户
- 至少保留一种登录方式(密码或OAuth)

```javascript
// 示例: 一个用户可以同时关联
const user = {
  id: 'user-123',
  email: 'user@example.com',
  password: 'hashed_password', // 传统密码登录
  linkedAccounts: [
    { provider: 'google', providerId: 'google-id-123' },
    { provider: 'github', providerId: 'github-id-456' }
  ]
};
```

---

### 解绑限制

**安全策略:** 不能移除最后一种登录方式

```javascript
// 后端验证逻辑
if (user.linkedAccounts.length === 1 && !user.password) {
  return res.status(400).json({
    success: false,
    message: '不能解绑最后一种登录方式,请先设置密码'
  });
}
```

---

## 安全注意事项

### 1. CSRF防护

使用`state`参数防止CSRF攻击:

```javascript
// 后端生成state
const state = crypto.randomBytes(32).toString('hex');
req.session.oauthState = state;

// OAuth授权URL包含state
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}&` +
  `redirect_uri=${callbackUrl}&` +
  `response_type=code&` +
  `scope=profile email&` +
  `state=${state}`;

// 回调时验证state
if (req.query.state !== req.session.oauthState) {
  throw new Error('Invalid state parameter');
}
```

---

### 2. 回调URL验证

**配置白名单:**

```javascript
// config/oauth.js
const ALLOWED_CALLBACK_URLS = [
  'http://localhost:3000',
  'https://testwebplatform.com',
  'https://app.testwebplatform.com'
];

// 验证回调URL
function validateCallbackUrl(url) {
  const parsed = new URL(url);
  return ALLOWED_CALLBACK_URLS.includes(parsed.origin);
}
```

---

### 3. Token安全

**最佳实践:**

```javascript
// ✅ 正确: 将tokens作为HttpOnly cookie
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});

// ❌ 避免: 通过URL传递tokens (容易泄露)
// res.redirect(`/dashboard?token=${accessToken}`);
```

---

### 4. 权限最小化

**只请求必要的权限:**

```javascript
// Google OAuth scopes
const GOOGLE_SCOPES = [
  'profile',  // 基本信息
  'email'     // 邮箱地址
  // ❌ 不要请求不必要的权限,如'https://www.googleapis.com/auth/drive'
];

// GitHub OAuth scopes
const GITHUB_SCOPES = [
  'user:email'  // 仅邮箱
  // ❌ 不要请求'repo'等不必要权限
];
```

---

### 5. 数据存储

**敏感信息处理:**

```javascript
// ✅ 正确: 只存储必要信息
const oauthAccount = {
  provider: 'google',
  providerId: profile.id,      // Google用户ID
  email: profile.email,
  // ❌ 不存储: accessToken, refreshToken (除非业务需要)
};

// 如果需要调用第三方API,加密存储tokens
const encryptedToken = encrypt(oauthAccessToken);
await db.save({ oauth_token: encryptedToken });
```

---

## 故障排查

### 常见问题

#### 1. 回调地址不匹配

**错误信息:**
```
Error: redirect_uri_mismatch
```

**原因:**
- 配置的回调URL与OAuth应用设置不一致

**解决方案:**
```bash
# 检查环境变量
echo $GOOGLE_CALLBACK_URL

# 确保与OAuth应用配置一致
# Google Console: http://localhost:3000/auth/oauth/google/callback
# .env文件:      http://localhost:3000/auth/oauth/google/callback
```

---

#### 2. 无效的client_id或client_secret

**错误信息:**
```
Error: invalid_client
```

**原因:**
- Client ID或Client Secret配置错误
- 凭据过期或被撤销

**解决方案:**
1. 重新检查`.env`文件中的凭据
2. 确保凭据正确复制(无多余空格)
3. 如果怀疑泄露,重新生成新的Client Secret

---

#### 3. 权限不足

**错误信息:**
```
Error: insufficient_scope
```

**原因:**
- 请求的scope不足以获取所需信息

**解决方案:**
```javascript
// 确保请求了正确的scopes
const GOOGLE_SCOPES = [
  'profile',
  'email'  // 必须包含email scope才能获取邮箱
];
```

---

#### 4. 邮箱已被使用

**错误信息:**
```json
{
  "success": false,
  "message": "该邮箱已被其他账户使用"
}
```

**原因:**
- OAuth返回的邮箱已关联到其他用户

**解决方案:**
- 提示用户使用已有账户登录
- 或提供账户合并功能

---

#### 5. CORS错误

**错误信息:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**原因:**
- 前端和后端域名不同且未配置CORS

**解决方案:**
```javascript
// backend/server.js
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3001', 'https://yourdomain.com'],
  credentials: true
}));
```

---

## 测试清单

### 功能测试

- [ ] Google OAuth登录
  - [ ] 新用户注册
  - [ ] 已有用户登录
  - [ ] 取消授权处理
  
- [ ] GitHub OAuth登录
  - [ ] 新用户注册
  - [ ] 已有用户登录
  - [ ] 私有邮箱处理

- [ ] 账户关联
  - [ ] 关联Google账户
  - [ ] 关联GitHub账户
  - [ ] 关联冲突处理
  - [ ] 解绑账户
  - [ ] 最后登录方式保护

### 安全测试

- [ ] CSRF防护(state参数)
- [ ] 回调URL验证
- [ ] Token过期处理
- [ ] 重复关联检测
- [ ] 权限最小化验证

---

## 数据库表结构

```sql
-- users表扩展字段
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),  -- 可为空(纯OAuth用户)
  
  -- OAuth相关字段
  provider VARCHAR(50),       -- 'google', 'github', 'local'
  provider_id VARCHAR(255),   -- OAuth提供商的用户ID
  
  -- 其他字段...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- oauth_accounts表(支持多账户关联)
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,       -- 'google', 'github'
  provider_id VARCHAR(255) NOT NULL,   -- OAuth用户ID
  email VARCHAR(255),
  profile_data JSONB,                  -- 存储完整profile
  linked_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_id);
```

---

## 相关资源

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth 文档](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OWASP OAuth安全指南](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

---

**最后更新**: 2025-10-16  
**版本**: 1.0  
**状态**: ✅ 已启用并可用

