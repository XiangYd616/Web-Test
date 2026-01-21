# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# 安装依赖
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production && \
    cd ../backend && npm ci --only=production

# 复制源代码
COPY . .

# 构建前端
RUN cd frontend && npm run build

# 构建后端
RUN cd backend && npm run build

# 生产阶段
FROM node:18-alpine AS production

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S testweb -u 1001

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 复制构建产物
COPY --from=builder --chown=testweb:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=testweb:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=testweb:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=testweb:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=testweb:nodejs /app/package*.json ./

# 复制配置文件
COPY --chown=testweb:nodejs config ./config
COPY --chown=testweb:nodejs scripts/start.sh ./scripts/

# 创建必要的目录
RUN mkdir -p logs uploads backups && \
    chown -R testweb:nodejs logs uploads backups

# 设置权限
RUN chmod +x scripts/start.sh

# 切换到非root用户
USER testweb

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/start.sh"]
