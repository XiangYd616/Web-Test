# 桌面端混合架构：本地优先 + 云端为辅

## 一、当前状态

### 已完成
- [x] Electron 桌面端打包（esbuild + electron-builder）
- [x] 前端离线优先：桌面端自动本地用户登录，不依赖 HTTP API
- [x] apiClient 桌面端拦截器：离线模式 HTTP 请求静默降级
- [x] 本地 SQLite 数据库 + IPC 通道（database/testEngine/report 等）
- [x] 报告中心频闪修复（stableRef 包装 useCallback）

### 后端已有基础设施
- 注册/登录/JWT（authController.ts）
- OAuth（GitHub/Google）
- MFA 二次验证
- Session 管理
- 限流中间件（rateLimiter）

## 二、架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React)                          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │          apiAdapter (统一数据访问层)              │   │
│   │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │   │
│   │  │ 离线模式  │  │ 在线模式  │  │ 混合模式      │  │   │
│   │  │ (IPC)    │  │ (HTTP)   │  │ (IPC+云端同步) │  │   │
│   │  └──────────┘  └──────────┘  └───────────────┘  │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │          权益管理 (LicenseManager)                │   │
│   │  - 本地证书缓存                                   │   │
│   │  - 离线校验（证书有效期内无需联网）                  │   │
│   │  - 功能门控（免费/专业/团队）                       │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 三、账户分层

| 类型 | 权益 | 服务器消耗 |
|------|------|-----------|
| 游客/未登录 | 本地测试全功能、本地存储报告 | 0 |
| 免费账户 | +云端同步(50条/月)、分享链接 | 极低（仅存 JSON 摘要） |
| 专业账户(付费) | +无限同步、高级模板、优先支持 | 极低 |
| 团队账户(付费) | +团队空间、成员管理、权限、SSO | 略高 |

## 四、核心原则

1. **计算永远在本地**：所有测试（性能/安全/API/压力）在用户机器执行
2. **云端只存轻量数据**：配置摘要(<10KB/条)、报告摘要(<1KB/条)
3. **付费权益本地可用**：加密证书缓存，断网也能用高级功能
4. **限流保护服务器**：登录 10次/分/IP，同步 10次/分/用户

## 五、落地步骤

### 第一步：桌面端基础可用 ✅
- Electron 打包、离线运行、IPC 数据通道

### 第二步：可选云端登录
- 设置页增加「登录云端账户」入口
- 登录后从服务器拉取权益证书（JSON），缓存到 `app.getPath('userData')`
- 启动时检查本地证书：有效→解锁增值功能，过期→静默降级为免费

### 第三步：基础云端同步
- 「一键同步」本地报告摘要到云端
- 分享链接生成（服务器只存跳转映射）
- 同步限额：免费 50条/月，付费无限

### 第四步：付费权益
- 接入支付（微信/支付宝/Stripe）
- 高级模板库（性能/安全/SEO 预设模板）
- 批量导出报告（PDF/Excel）

### 第五步：团队版（可选）
- 团队空间 + 成员邀请 + 权限控制
- 团队专属模板
- SSO 单点登录

## 六、技术实现要点

### 权益证书格式
```json
{
  "userId": "uuid",
  "plan": "pro",
  "features": ["unlimited_sync", "advanced_templates", "batch_export"],
  "quotas": { "syncPerMonth": -1 },
  "issuedAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-02-01T00:00:00Z",
  "signature": "hmac-sha256-signature"
}
```

### 功能门控示例
```typescript
// frontend/utils/license.ts
export const canUseFeature = (feature: string): boolean => {
  if (!isDesktop()) return true; // 浏览器端由后端控制
  const cert = getLicenseCert();
  if (!cert) return false; // 未登录 → 仅免费功能
  if (new Date(cert.expiresAt) < new Date()) return false; // 过期
  return cert.features.includes(feature);
};
```

### 同步策略
- 上传：本地数据 → JSON 摘要 → POST /api/sync/upload
- 下载：GET /api/sync/download → 合并到本地 SQLite
- 冲突：以最后修改时间为准（last-write-wins）
