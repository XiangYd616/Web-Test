# 日志系统迁移计划

## 🎯 目标

将项目中的 **180+ 处** `console.log/console.error` 替换为结构化的 Winston 日志系统。

---

## 📊 当前状况

### 问题分析
```bash
# console.log 使用统计（routes/ 目录）
routes/test.js:          150+ 处
routes/auth.js:           13 处
routes/data.js:           17 处
routes/seo.js:            10 处
其他文件:                ~50 处
总计:                    ~240 处
```

### 主要问题
1. **无结构化**: 无法解析和分析
2. **无级别控制**: 无法按严重程度过滤
3. **无持久化策略**: 日志轮转困难
4. **生产环境污染**: 大量调试信息
5. **性能影响**: 同步 I/O 操作
6. **安全风险**: 可能泄露敏感信息

---

## ✅ 已有 Winston 配置

项目已安装 Winston：
```json
"winston": "^3.17.0",
"winston-daily-rotate-file": "^5.0.0"
```

---

## 🏗️ 实施方案

### Phase 1: 创建统一日志模块 (1-2小时)

#### 文件: `utils/logger.js`

```javascript
/**
 * 统一日志系统
 * 基于 Winston，支持多种传输方式和日志级别
 */

const winston = require('winston');
const path = require('path');

const env = require('../config/environment');

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志级别颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台输出格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 传输方式配置
const transports = [
  // 错误日志
  new winston.transports.DailyRotateFile({
    filename: path.join(env.LOG_FILE_PATH || './logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
  }),
  
  // 综合日志
  new winston.transports.DailyRotateFile({
    filename: path.join(env.LOG_FILE_PATH || './logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
  }),
];

// 开发环境添加控制台输出
if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// 创建 logger 实例
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// 便捷方法
logger.http = (message, meta) => logger.log('http', message, meta);

// 流式接口（供 Morgan 使用）
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
```

### Phase 2: 创建迁移辅助工具 (30分钟)

#### 文件: `scripts/migrate-console-logs.js`

```javascript
#!/usr/bin/env node
/**
 * 自动化迁移 console.log 到 logger
 * 用法: node scripts/migrate-console-logs.js <file-path>
 */

const fs = require('fs');
const path = require('path');

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 添加 logger 导入（如果不存在）
  if (!content.includes("require('../utils/logger')") && 
      !content.includes("require('./utils/logger')")) {
    const importLine = "const logger = require('../utils/logger');\n";
    content = importLine + content;
    changes++;
  }

  // 替换模式
  const replacements = [
    // console.log -> logger.info
    {
      pattern: /console\.log\((.*?)\);/g,
      replacement: 'logger.info($1);'
    },
    // console.error -> logger.error
    {
      pattern: /console\.error\((.*?)\);/g,
      replacement: 'logger.error($1);'
    },
    // console.warn -> logger.warn
    {
      pattern: /console\.warn\((.*?)\);/g,
      replacement: 'logger.warn($1);'
    },
    // console.debug -> logger.debug
    {
      pattern: /console\.debug\((.*?)\);/g,
      replacement: 'logger.debug($1);'
    },
  ];

  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes += matches.length;
    }
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}: ${changes} changes`);
  } else {
    console.log(`⏭️  ${filePath}: no changes needed`);
  }

  return changes;
}

// 主程序
const targetPath = process.argv[2];
if (!targetPath) {
  console.error('Usage: node migrate-console-logs.js <file-or-directory>');
  process.exit(1);
}

// 批量处理
if (fs.statSync(targetPath).isDirectory()) {
  const files = fs.readdirSync(targetPath)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(targetPath, f));
  
  let totalChanges = 0;
  files.forEach(file => {
    totalChanges += migrateFile(file);
  });
  
  console.log(`\n📊 Total: ${totalChanges} changes in ${files.length} files`);
} else {
  migrateFile(targetPath);
}
```

### Phase 3: 逐步迁移 (2-3天)

#### 优先级顺序

1. **P0 - 关键路由** (4-6小时)
   - `routes/auth.js` - 认证相关
   - `routes/test.js` - 核心测试路由
   - `middleware/errorHandler.js` - 错误处理

2. **P1 - 服务层** (4-6小时)
   - `services/` 目录
   - `engines/` 目录

3. **P2 - 其余文件** (8-12小时)
   - 其他路由文件
   - 工具函数
   - 配置文件

---

## 📝 使用示例

### Before (Console)
```javascript
// ❌ 旧方式
console.log('🚀 Starting test:', testId);
console.error('Test failed:', error);
console.log('User logged in:', user.id);
```

### After (Logger)
```javascript
// ✅ 新方式
const logger = require('../utils/logger');

logger.info('Starting test', { testId, url });
logger.error('Test failed', { 
  testId, 
  error: error.message, 
  stack: error.stack 
});
logger.info('User logged in', { 
  userId: user.id, 
  username: user.username 
});
```

### 好处对比

| 功能 | Console | Logger |
|------|---------|--------|
| 结构化 | ❌ | ✅ JSON 格式 |
| 日志级别 | ❌ | ✅ 5 个级别 |
| 文件输出 | ❌ | ✅ 自动轮转 |
| 生产环境 | ❌ 全部输出 | ✅ 可配置 |
| 分析 | ❌ | ✅ 可解析 |
| 性能 | ❌ 同步 | ✅ 异步 |

---

## 🔧 配置管理

### 环境变量
```bash
# .env
LOG_LEVEL=info              # error, warn, info, http, debug
LOG_FILE_PATH=./logs        # 日志文件路径
LOG_MAX_SIZE=20m            # 单文件最大大小
LOG_MAX_FILES=14d           # 保留天数
```

### 动态调整
```javascript
// 运行时更改日志级别
logger.level = 'debug';
```

---

## 📊 迁移进度追踪

### 自动化脚本
```bash
# 批量迁移整个目录
node scripts/migrate-console-logs.js routes/

# 迁移单个文件
node scripts/migrate-console-logs.js routes/test.js

# 验证
grep -r "console\\.log" routes/ | wc -l
```

### Checklist

- [ ] Phase 1: 创建 `utils/logger.js`
- [ ] Phase 1: 创建迁移脚本
- [ ] Phase 2: 迁移 `routes/auth.js`
- [ ] Phase 2: 迁移 `routes/test.js`
- [ ] Phase 2: 迁移 `middleware/errorHandler.js`
- [ ] Phase 3: 迁移 `services/` 目录
- [ ] Phase 3: 迁移 `engines/` 目录
- [ ] Phase 4: 迁移其余文件
- [ ] Phase 5: 验证和测试
- [ ] Phase 6: 更新 ESLint 规则

---

## ⚙️ ESLint 配置

迁移完成后，强制使用 logger：

```javascript
// eslint.config.js
rules: {
  'no-console': ['error', {
    allow: ['warn', 'error']  // 仅允许 warn/error 用于紧急情况
  }]
}
```

---

## 🎯 成功标准

1. ✅ 所有 `console.log` 替换为 `logger.info`
2. ✅ 所有 `console.error` 替换为 `logger.error`
3. ✅ 日志文件正常轮转
4. ✅ 生产环境不输出 debug 日志
5. ✅ ESLint 检查通过
6. ✅ 日志可以被分析工具解析

---

## 📚 参考资源

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Node.js Logging Best Practices](https://blog.appsignal.com/2021/09/01/best-practices-for-logging-in-nodejs.html)
- [12-Factor App: Logs](https://12factor.net/logs)

---

**预计工作量**: 2-3 天  
**优先级**: P1（重要）  
**状态**: ⏳ 计划中

