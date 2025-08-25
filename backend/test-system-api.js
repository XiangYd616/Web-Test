/**
 * 测试系统API
 */

const express = require('express');
const systemRoutes = require('./routes/system.js');

const app = express();
app.use(express.json());

// 直接挂载系统路由到根路径进行测试
app.use('/system', systemRoutes);

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`🧪 测试服务器运行在端口 ${PORT}`);
  console.log(`📊 测试系统资源API: http://localhost:${PORT}/system/resources`);
});
