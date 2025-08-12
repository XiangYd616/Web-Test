# 手动部署指南

## 🚀 快速部署步骤

### 1. 准备部署文件

已创建的部署包：`testweb-deploy.zip`

### 2. 上传文件到服务器

#### 方法A：使用PuTTY工具
```bash
# 使用PSCP上传（如果有PuTTY套件）
pscp -i your-key.ppk testweb-deploy.zip root@8.137.111.126:/tmp/

# 或使用WinSCP图形界面工具
```

#### 方法B：使用阿里云控制台
1. 登录阿里云控制台
2. 进入ECS实例管理
3. 使用"远程连接"功能
4. 通过Web界面上传文件

#### 方法C：使用FTP/SFTP客户端
```bash
# 使用FileZilla等FTP客户端
# 服务器：8.137.111.126
# 用户名：root
# 使用您的私钥文件连接
```

### 3. 服务器端部署命令

连接到服务器后，执行以下命令：

```bash
# 1. 进入部署目录
cd /opt/test-web-app

# 2. 备份当前版本（如果存在）
if [ -d "current" ]; then
    cp -r current backup-$(date +%Y%m%d-%H%M%S)
fi

# 3. 解压新版本
cd /tmp
unzip -o testweb-deploy.zip -d /opt/test-web-app/new-version

# 4. 停止服务
pm2 stop test-web-app || true
sudo systemctl stop nginx || true

# 5. 更新文件
cd /opt/test-web-app
rm -rf current
mv new-version current

# 6. 安装依赖
cd current/server
npm install --production

# 7. 更新前端文件
sudo cp -r ../dist/* /var/www/html/

# 8. 重启服务
pm2 start current/server/app.js --name test-web-app
sudo systemctl start nginx

# 9. 检查状态
pm2 status
sudo systemctl status nginx
```

### 4. 验证部署

访问以下地址确认部署成功：

- 前端：http://8.137.111.126
- API：http://8.137.111.126/api/health
- 管理后台：http://8.137.111.126/admin

### 5. 故障排除

如果遇到问题：

```bash
# 查看应用日志
pm2 logs test-web-app

# 查看Nginx日志
sudo tail -f /var/log/nginx/error.log

# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :80

# 重启所有服务
pm2 restart all
sudo systemctl restart nginx
```

## 🔧 SSH密钥配置（可选）

如果需要配置SSH密钥：

### Windows (使用OpenSSH)

1. **转换PuTTY密钥**：
```bash
# 使用puttygen转换为OpenSSH格式
puttygen your-key.ppk -O private-openssh -o id_rsa
```

2. **配置SSH**：
```bash
# 复制到SSH目录
mkdir ~/.ssh
cp id_rsa ~/.ssh/
chmod 600 ~/.ssh/id_rsa

# 测试连接
ssh -i ~/.ssh/id_rsa root@8.137.111.126
```

### 使用SSH配置文件

创建 `~/.ssh/config` 文件：

```
Host aliyun-server
    HostName 8.137.111.126
    User root
    IdentityFile ~/.ssh/id_rsa
    StrictHostKeyChecking no
```

然后可以使用：
```bash
ssh aliyun-server
scp testweb-deploy.zip aliyun-server:/tmp/
```

## 📞 需要帮助？

如果遇到问题，请提供：
1. 错误信息截图
2. 执行的具体命令
3. 服务器返回的日志

我会帮您进一步排查和解决问题。
