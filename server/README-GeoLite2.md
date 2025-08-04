# MaxMind GeoLite2 集成指南

## 🌍 概述

本项目已集成 MaxMind GeoLite2 免费地理位置数据库，提供快速、准确的 IP 地理位置查询服务。

## 🚀 快速开始

### 1. 注册 MaxMind 账户

1. 访问：https://www.maxmind.com/en/geolite2/signup
2. 注册免费账户
3. 验证邮箱

### 2. 获取许可证密钥

1. 登录 MaxMind 账户
2. 访问：https://www.maxmind.com/en/accounts/current/license-key
3. 点击 "Generate new license key"
4. 复制生成的许可证密钥

### 3. 设置环境变量

```bash
# Windows
set MAXMIND_LICENSE_KEY=your_license_key_here

# Linux/Mac
export MAXMIND_LICENSE_KEY=your_license_key_here

# 或者在 .env 文件中添加
MAXMIND_LICENSE_KEY=your_license_key_here
```

### 4. 下载数据库

```bash
# 下载 GeoLite2 数据库
npm run download-geodb

# 检查数据库状态
npm run geodb-status
```

### 5. 重启服务器

```bash
npm start
```

## 📊 功能特性

### 自动降级机制

- **优先使用本地数据库**：MaxMind GeoLite2（无网络依赖，<1ms 查询）
- **备选 API 查询**：多个免费 API 轮换（有网络依赖，100-500ms）

### 智能缓存

- **24小时缓存**：避免重复查询相同 IP
- **内存缓存**：快速响应重复请求
- **自动清理**：定期清理过期缓存

### 多数据源支持

1. **MaxMind GeoLite2-City**：详细的城市级别信息
2. **MaxMind GeoLite2-Country**：国家级别信息（备选）
3. **ip-api.com**：免费 API（备选）
4. **ipapi.co**：免费 API（备选）

## 🔧 API 接口

### 代理测试接口

```http
POST /api/test/proxy-test
```

**响应示例：**
```json
{
  "success": true,
  "message": "代理连接测试成功",
  "proxyIp": "154.193.0.187",
  "location": {
    "country": "South Korea",
    "countryCode": "KR",
    "region": "Seoul",
    "city": "Seoul",
    "timezone": "Asia/Seoul",
    "source": "maxmind"
  },
  "responseTime": 150
}
```

### 地理位置服务状态

```http
GET /api/test/geo-status
```

**响应示例：**
```json
{
  "success": true,
  "status": {
    "initialized": true,
    "useLocalDB": true,
    "cityDBLoaded": true,
    "countryDBLoaded": true,
    "cacheSize": 15
  },
  "message": "MaxMind 本地数据库已启用"
}
```

## 📁 文件结构

```
server/
├── services/
│   └── geoLocationService.js    # 地理位置服务
├── scripts/
│   └── download-geodb.js        # 数据库下载脚本
├── data/                        # 数据库文件目录
│   ├── GeoLite2-City.mmdb      # 城市数据库
│   └── GeoLite2-Country.mmdb   # 国家数据库
└── README-GeoLite2.md          # 本文档
```

## 🛠️ 维护

### 更新数据库

MaxMind 每周二更新数据库，建议定期更新：

```bash
# 手动更新
npm run download-geodb

# 设置定时任务（Linux/Mac）
# 每周三凌晨2点更新
0 2 * * 3 cd /path/to/project/server && npm run download-geodb
```

### 监控状态

```bash
# 检查数据库状态
npm run geodb-status

# 检查服务状态
curl http://localhost:3001/api/test/geo-status
```

## 🚨 故障排除

### 常见问题

1. **许可证密钥错误**
   ```
   ❌ 请设置 MAXMIND_LICENSE_KEY 环境变量
   ```
   - 检查环境变量是否正确设置
   - 确认许可证密钥有效

2. **下载失败**
   ```
   ❌ GeoLite2-City 下载失败: HTTP 401
   ```
   - 检查许可证密钥是否正确
   - 确认网络连接正常

3. **数据库加载失败**
   ```
   ❌ MaxMind 数据库加载失败
   ```
   - 检查数据库文件是否存在
   - 确认文件权限正确

### 降级模式

如果本地数据库不可用，系统会自动降级到 API 查询模式：

- 查询速度较慢（100-500ms）
- 有网络依赖
- 可能有频率限制

## 📈 性能对比

| 查询方式 | 响应时间 | 准确性 | 网络依赖 | 频率限制 |
|----------|----------|--------|----------|----------|
| MaxMind 本地 | <1ms | 高 | 无 | 无 |
| API 查询 | 100-500ms | 中等 | 是 | 有 |

## 📄 许可证

- **GeoLite2**：Creative Commons Attribution-ShareAlike 4.0 International License
- **商业使用**：建议升级到 GeoIP2 付费版本

## 🔗 相关链接

- [MaxMind 官网](https://www.maxmind.com/)
- [GeoLite2 免费数据库](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
- [许可证说明](https://www.maxmind.com/en/geolite2/eula)
