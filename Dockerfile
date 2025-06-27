# 多阶段构建 Dockerfile
# 阶段1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 阶段2: 生产阶段
FROM nginx:alpine AS production

# 安装必要的工具
RUN apk add --no-cache curl

# 复制nginx配置
COPY docker/nginx.conf /etc/nginx/nginx.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建健康检查脚本
RUN echo '#!/bin/sh' > /usr/local/bin/healthcheck.sh && \
    echo 'curl -f http://localhost:80/ || exit 1' >> /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]

# 开发环境 Dockerfile
FROM node:18-alpine AS development

WORKDIR /app

# 安装开发依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 暴露开发端口
EXPOSE 5174

# 启动开发服务器
CMD ["npm", "run", "dev"]

# 测试环境 Dockerfile
FROM node:18-alpine AS test

WORKDIR /app

# 安装所有依赖（包括开发依赖）
COPY package*.json ./
RUN npm ci

# 安装测试工具
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    py3-pip

# 设置Chromium环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 安装Python测试工具
RUN pip3 install playwright pytest

# 复制源代码
COPY . .

# 安装Playwright浏览器
RUN npx playwright install

# 运行测试
CMD ["npm", "run", "test:run"]
