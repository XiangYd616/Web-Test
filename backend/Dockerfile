# Test-Web Backend Dockerfile
# 多阶段构建，优化镜像大小

# 阶段1：构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖（包括devDependencies用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 如果有构建步骤，执行构建
# RUN npm run build

# 阶段2：生产阶段
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache \
    dumb-init \
    tini \
    postgresql-client

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 创建必要的目录
RUN mkdir -p logs uploads temp && \
    chown -R nodejs:nodejs logs uploads temp

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用tini作为init进程
ENTRYPOINT ["/sbin/tini", "--"]

# 启动应用
CMD ["node", "src/app.js"]

