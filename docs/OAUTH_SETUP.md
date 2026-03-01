# OAuth2 第三方登录设置指南

本指南将帮助您配置Google、GitHub、Microsoft和Discord的OAuth2第三方登录功能。

## 🎯 概述

OAuth2集成已完成以下功能：

- ✅ 数据库表创建 (`user_oauth_accounts`, `oauth_applications`,
  `oauth_sessions`)
- ✅ 后端API路由 (`/api/auth/oauth/*`)
- ✅ 安全状态验证和会话管理
- ✅ 用户账户自动创建和关联
- ⏳ 需要配置OAuth提供商密钥
- ⏳ 需要创建前端登录组件

## 📋 可用的API端点

### 基础功能

- `GET /api/auth/oauth/providers` - 获取可用的OAuth提供商
- `GET /api/auth/oauth/{provider}/authorize` - 生成授权URL
- `GET /api/auth/oauth/{provider}/callback` - 处理OAuth回调

### 用户管理

- `GET /api/auth/oauth/accounts` - 获取用户关联的OAuth账户
- `POST /api/auth/oauth/{provider}/link` - 关联OAuth账户到当前用户
- `DELETE /api/auth/oauth/{provider}/unlink` - 解绑OAuth账户

### 管理功能

- `GET /api/auth/oauth/config/status` - 获取OAuth配置状态（仅管理员）

## ⚙️ 配置OAuth提供商

### 1. 复制环境配置文件

```bash
cp .env.oauth.example .env.oauth
```

### 2. Google OAuth2 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建OAuth2客户端凭据
5. 添加回调URL：`http://localhost:3001/api/auth/oauth/google/callback`

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/oauth/google/callback
```

### 3. GitHub OAuth2 配置

1. 访问
   [GitHub Settings > Developer settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - Application name: `Test-Web App`
   - Homepage URL: `http://localhost:5174`
   - Authorization callback URL:
     `http://localhost:3001/api/auth/oauth/github/callback`

```env
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/oauth/github/callback
```

### 4. Microsoft OAuth2 配置

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 进入 "Azure Active Directory" > "App registrations"
3. 点击 "New registration"
4. 添加重定向URI：`http://localhost:3001/api/auth/oauth/microsoft/callback`

```env
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/auth/oauth/microsoft/callback
```

### 5. Discord OAuth2 配置

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用
3. 进入 "OAuth2" 设置
4. 添加重定向：`http://localhost:3001/api/auth/oauth/discord/callback`

```env
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/oauth/discord/callback
```

### 6. 通用设置

```env
# OAuth2 安全设置
OAUTH_STATE_SECRET=your_random_32_character_secret_key
OAUTH_ENCRYPTION_KEY=your_32_character_encryption_key

# 前端回调URL
FRONTEND_OAUTH_SUCCESS_URL=http://localhost:5174/auth/oauth/success
FRONTEND_OAUTH_ERROR_URL=http://localhost:5174/auth/oauth/error

# OAuth行为设置
OAUTH_ALLOW_SIGNUP=true              # 允许OAuth注册新用户
OAUTH_AUTO_LINK_ACCOUNTS=false       # 自动链接相同邮箱的账户
OAUTH_SESSION_DURATION=86400         # 会话持续时间（秒）
```

## 🧪 测试OAuth配置

## 🔐 安全注意事项

1. **密钥保护**：
   - 不要将OAuth客户端密钥提交到版本控制
   - 在生产环境中使用环境变量
   - 定期轮换密钥

2. **回调URL验证**：
   - 确保回调URL与OAuth应用配置完全匹配
   - 在生产环境中使用HTTPS

3. **状态验证**：
   - 系统自动验证OAuth state参数防止CSRF攻击
   - 状态参数有10分钟有效期

4. **用户数据**：
   - 只获取必要的用户信息
   - 遵守各提供商的服务条款

## 🚀 下一步

1. **前端集成**：创建OAuth登录按钮组件
2. **用户体验**：设计登录流程UI
3. **错误处理**：完善错误提示和处理
4. **生产部署**：配置生产环境回调URL

## 📞 支持

如果遇到问题，请检查：

1. 环境变量是否正确设置
2. OAuth应用配置是否匹配
3. 防火墙是否阻止回调请求
4. 查看服务器日志获取详细错误信息

---

## 📋 配置检查清单

- [ ] 复制 `.env.oauth.example` 到 `.env.oauth`
- [ ] 配置Google OAuth2凭据
- [ ] 配置GitHub OAuth2凭据
- [ ] 配置Microsoft OAuth2凭据
- [ ] 配置Discord OAuth2凭据
- [ ] 设置安全密钥
- [ ] 运行测试脚本验证
- [ ] 创建前端OAuth登录组件
- [ ] 测试完整登录流程
