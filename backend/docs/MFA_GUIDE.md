# MFA (多因素认证) 使用指南

## 📋 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [API参考](#api参考)
- [使用流程](#使用流程)
- [客户端集成](#客户端集成)
- [故障排查](#故障排查)
- [安全最佳实践](#安全最佳实践)

---

## 概述

多因素认证(MFA)为用户账户提供额外的安全保护层。除了用户名和密码,用户还需要提供第二个身份验证因素(通常是手机上的TOTP代码)才能完成登录。

### 支持的MFA方式

1. **TOTP (Time-based One-Time Password)** - 基于时间的一次性密码
   - 支持Google Authenticator
   - 支持Microsoft Authenticator
   - 支持Authy等其他TOTP应用

2. **备用码** - 用于紧急访问
   - 每个账户生成8-10个备用码
   - 每个备用码只能使用一次
   - 建议安全保存

3. **短信验证码** (可选)
   - 通过SMS发送验证码
   - 需要配置短信服务

4. **邮件验证码** (可选)
   - 通过邮件发送验证码
   - 使用现有邮件服务

---

## 功能特性

### ✅ 已实现功能

- ✅ TOTP设置和验证
- ✅ QR码生成
- ✅ 备用码生成和管理
- ✅ 备用码验证
- ✅ MFA启用/禁用
- ✅ 登录二次验证
- ✅ 设备信任机制
- ✅ 安全日志记录
- ✅ 会话管理

### 📊 安全增强

- 🔒 SHA-256哈希存储备用码
- 🔒 时间窗口防重放攻击
- 🔒 失败尝试次数限制
- 🔒 会话过期管理
- 🔒 设备指纹识别

---

## 快速开始

### 1. 启用MFA (用户视角)

#### 步骤1: 初始化MFA设置

```http
POST /api/auth/mfa/setup
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "password": "your_current_password"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "MFA设置初始化成功",
  "secretKey": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KG...",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "...more codes"
  ],
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

#### 步骤2: 扫描QR码

使用Google Authenticator或其他TOTP应用扫描返回的QR码,或手动输入密钥。

#### 步骤3: 验证并完成设置

```http
POST /api/auth/mfa/verify-setup
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "token": "123456"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "MFA设置完成"
}
```

⚠️ **重要**: 请妥善保存备用码,在无法使用TOTP应用时可用于恢复访问。

### 2. 使用MFA登录

#### 步骤1: 常规登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**如果用户启用了MFA,响应:**
```json
{
  "success": false,
  "requireMfa": true,
  "message": "需要MFA验证"
}
```

#### 步骤2: MFA验证

```http
POST /api/auth/mfa/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456",
  "trustDevice": false
}
```

**成功响应:**
```json
{
  "success": true,
  "message": "MFA验证成功",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user",
    "role": "user",
    "mfaEnabled": true
  },
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ...",
  "expiresIn": 3600,
  "trustedDevice": false
}
```

---

## API参考

### MFA设置相关

#### 1. 初始化MFA设置
```http
POST /api/auth/mfa/setup
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "current_password"
}
```

**参数:**
- `password` (必填): 当前账户密码

**响应:**
- `secretKey`: TOTP密钥
- `qrCodeUrl`: QR码Data URL
- `backupCodes`: 备用码数组
- `manualEntryKey`: 手动输入密钥

---

#### 2. 验证并完成MFA设置
```http
POST /api/auth/mfa/verify-setup
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "123456"
}
```

**参数:**
- `token` (必填): 6位TOTP验证码

---

#### 3. 禁用MFA
```http
POST /api/auth/mfa/disable
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "current_password",
  "token": "123456"
}
```

**参数:**
- `password` (必填): 当前账户密码
- `token` (必填): 6位TOTP验证码

---

#### 4. 获取MFA状态
```http
GET /api/auth/mfa/status
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "mfaEnabled": true,
    "backupCodesRemaining": 8,
    "setupRequired": false
  }
}
```

---

#### 5. 重新生成备用码
```http
POST /api/auth/mfa/regenerate-backup-codes
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "current_password",
  "token": "123456"
}
```

**响应:**
```json
{
  "success": true,
  "message": "备用码重新生成成功",
  "backupCodes": [
    "NEW1CODE",
    "NEW2CODE",
    "...8 codes total"
  ]
}
```

---

### MFA验证相关

#### 6. MFA登录验证
```http
POST /api/auth/mfa/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456",
  "trustDevice": false
}
```

**参数:**
- `email` (必填): 用户邮箱
- `token` (必填): 6位TOTP验证码
- `trustDevice` (可选): 是否信任此设备,默认false

---

#### 7. 使用备用码验证
```http
POST /api/auth/mfa/verify-backup
Content-Type: application/json

{
  "email": "user@example.com",
  "backupCode": "A1B2C3D4",
  "trustDevice": false
}
```

**参数:**
- `email` (必填): 用户邮箱
- `backupCode` (必填): 备用码
- `trustDevice` (可选): 是否信任此设备

**响应:**
```json
{
  "success": true,
  "message": "备用码验证成功",
  "backupCodesRemaining": 7,
  "user": {...},
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## 使用流程

### 完整流程图

```
用户注册/登录
    ↓
启用MFA设置
    ↓
1. 调用 /mfa/setup (提供密码)
    ↓
2. 接收QR码和备用码
    ↓
3. 扫描QR码到Authenticator应用
    ↓
4. 保存备用码到安全位置
    ↓
5. 调用 /mfa/verify-setup (提供TOTP码)
    ↓
MFA启用成功
    ↓
后续登录需要MFA验证
    ↓
1. 常规登录 /auth/login
    ↓
2. 系统提示需要MFA (requireMfa: true)
    ↓
3. 提供TOTP码或备用码 /mfa/verify
    ↓
4. 验证成功,获得访问令牌
```

---

## 客户端集成

### React示例

```javascript
import React, { useState } from 'react';
import QRCode from 'qrcode.react';

// MFA设置组件
function MFASetup({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [mfaData, setMfaData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  // 步骤1: 初始化MFA
  const handleSetup = async () => {
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMfaData(data);
        setStep(2);
      } else {
        alert('设置失败: ' + data.message);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 步骤2: 验证并完成
  const handleVerify = async () => {
    try {
      const response = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ token: verificationCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('MFA设置成功!');
        onComplete();
      } else {
        alert('验证失败: ' + data.message);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <h2>启用双因素认证</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入当前密码"
          />
          <button onClick={handleSetup}>开始设置</button>
        </div>
      )}

      {step === 2 && mfaData && (
        <div>
          <h2>扫描QR码</h2>
          <p>使用Google Authenticator扫描下方二维码</p>
          
          <img src={mfaData.qrCodeUrl} alt="QR Code" />
          
          <p>或手动输入密钥: <code>{mfaData.manualEntryKey}</code></p>
          
          <div>
            <h3>备用码 (请妥善保存!)</h3>
            <ul>
              {mfaData.backupCodes.map((code, i) => (
                <li key={i}><code>{code}</code></li>
              ))}
            </ul>
          </div>
          
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="输入6位验证码"
            maxLength={6}
          />
          <button onClick={handleVerify}>完成设置</button>
        </div>
      )}
    </div>
  );
}

// MFA登录组件
function MFALogin({ email, onSuccess }) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);

  const handleVerify = async () => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: code,
          trustDevice
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSuccess(data);
      } else {
        alert('验证失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  return (
    <div>
      <h2>双因素认证</h2>
      <p>请输入Authenticator应用中的6位验证码</p>
      
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        maxLength={6}
      />
      
      <label>
        <input
          type="checkbox"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
        />
        信任此设备30天
      </label>
      
      <button onClick={handleVerify}>验证</button>
      
      <p>
        <a href="/mfa/backup">使用备用码</a>
      </p>
    </div>
  );
}

export { MFASetup, MFALogin };
```

---

## 故障排查

### 常见问题

#### 1. 验证码总是提示无效

**原因:**
- 时间不同步
- 输入错误的验证码
- 验证码已过期

**解决方案:**
```bash
# 检查服务器时间
date

# 确保客户端和服务器时间一致
# 验证码有30秒有效期,允许±1个时间窗口(共90秒)
```

---

#### 2. QR码无法扫描

**原因:**
- 图片未完全加载
- QR码数据损坏

**解决方案:**
- 使用手动输入密钥(manualEntryKey)
- 重新生成QR码

---

#### 3. 备用码不可用

**原因:**
- 备用码已被使用
- 输入格式错误(大小写敏感)

**解决方案:**
```javascript
// 备用码使用注意事项:
// 1. 每个备用码只能使用一次
// 2. 使用后立即重新生成新的备用码
// 3. 大写输入,不含空格和特殊字符
```

---

#### 4. 无法禁用MFA

**原因:**
- 密码错误
- 未提供TOTP验证码
- TOTP验证码错误

**解决方案:**
- 确保提供正确的当前密码
- 必须提供有效的TOTP验证码
- 如果丢失Authenticator,使用备用码完成验证

---

#### 5. 设备信任不生效

**原因:**
- Cookie被清除
- 设备指纹变化
- 信任已过期(30天)

**解决方案:**
- 重新登录并勾选"信任此设备"
- 确保浏览器允许Cookie
- 定期重新验证设备

---

## 安全最佳实践

### 用户端

1. **备用码管理**
   - ✅ 立即保存备用码到安全位置
   - ✅ 使用密码管理器加密存储
   - ✅ 打印并存放在物理保险箱
   - ❌ 不要截图保存在手机相册
   - ❌ 不要发送给任何人

2. **Authenticator应用**
   - ✅ 使用官方应用(Google/Microsoft Authenticator)
   - ✅ 启用应用锁定(PIN/指纹)
   - ✅ 备份Authenticator数据
   - ❌ 不要在公共设备上使用

3. **设备信任**
   - ✅ 只在私人设备上信任
   - ✅ 定期清理信任设备列表
   - ❌ 不要在公共或共享设备上信任

### 开发端

1. **密钥存储**
   ```javascript
   // ✅ 正确: 哈希后存储
   const hashedCode = crypto
     .createHash('sha256')
     .update(code)
     .digest('hex');
   
   // ❌ 错误: 明文存储
   // await db.save({ backupCode: code });
   ```

2. **时间窗口配置**
   ```javascript
   // 推荐配置
   const TOTP_CONFIG = {
     window: 2,        // 允许±60秒误差
     step: 30,         // 30秒刷新
     digits: 6         // 6位数字
   };
   ```

3. **失败尝试限制**
   ```javascript
   // 实现速率限制
   const MAX_ATTEMPTS = 3;
   const LOCKOUT_DURATION = 300; // 5分钟
   ```

4. **会话管理**
   ```javascript
   // MFA验证后的Token应标记
   const tokenPayload = {
     userId: user.id,
     mfa_verified: true,  // 重要标记
     exp: Date.now() + 3600000
   };
   ```

---

## 测试清单

### 功能测试

- [ ] MFA设置流程
  - [ ] 密码验证
  - [ ] QR码生成
  - [ ] 备用码生成
  - [ ] TOTP验证成功
  - [ ] TOTP验证失败
  
- [ ] MFA登录流程
  - [ ] 需要MFA提示
  - [ ] TOTP验证成功
  - [ ] TOTP验证失败
  - [ ] 备用码验证
  - [ ] 设备信任

- [ ] MFA管理
  - [ ] 查看MFA状态
  - [ ] 重新生成备用码
  - [ ] 禁用MFA

### 安全测试

- [ ] 备用码哈希存储
- [ ] TOTP时间窗口
- [ ] 重放攻击防护
- [ ] 暴力破解防护
- [ ] 会话管理安全

---

## 配置参考

### 环境变量

```bash
# .env
APP_NAME=Test Web Platform
MFA_ISSUER=TestWeb
```

### 数据库表结构

```sql
-- 参考 migrations/001-add-mfa-fields.js
CREATE TABLE IF NOT EXISTS users (
  -- 其他字段...
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT,
  mfa_temp_secret TEXT
);

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type VARCHAR(100),
  event_data JSONB,
  created_at TIMESTAMP
);
```

---

## 相关资源

- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [OWASP MFA指南](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

---

**最后更新**: 2025-10-16  
**版本**: 1.0  
**状态**: ✅ 已启用并可用

