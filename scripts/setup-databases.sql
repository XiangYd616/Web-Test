-- 数据库初始化脚本
-- 创建开发和生产数据库

-- 创建开发数据库
CREATE DATABASE testweb_dev;

-- 创建生产数据库  
CREATE DATABASE testweb_prod;

-- 授权给postgres用户（如果需要）
GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO postgres;

-- 显示创建的数据库
\l testweb_dev
\l testweb_prod
