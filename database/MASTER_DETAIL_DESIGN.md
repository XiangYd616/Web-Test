# 测试记录主从表设计说明

## 🎯 设计理念

采用主从表设计模式，将测试数据分层存储，提高查询效率和数据组织的清晰度。

## 📊 主从表结构

### 主表层级

#### 1. `test_sessions` - 测试会话主表
**作用**: 管理测试会话的整体信息
- 会话级别的状态管理
- 批次测试支持（batch_id）
- 会话级别的统计汇总
- 全局配置和环境信息

**关键字段**:
```sql
id UUID                    -- 会话唯一标识
user_id UUID              -- 用户ID
session_name VARCHAR(200)  -- 会话名称
batch_id VARCHAR(100)      -- 批次ID
status VARCHAR(20)         -- 会话状态
total_tests INTEGER        -- 总测试数
completed_tests INTEGER    -- 完成测试数
failed_tests INTEGER       -- 失败测试数
```

### 从表层级

#### 2. `test_records` - 测试记录从表
**作用**: 存储具体的测试执行记录
- 每个具体测试的执行信息
- 测试类型和目标URL
- 测试配置和基本结果
- 与会话的关联关系

**关键字段**:
```sql
id UUID                    -- 记录唯一标识
session_id UUID           -- 关联会话ID (外键)
test_name VARCHAR(200)     -- 测试名称
test_type VARCHAR(20)      -- 测试类型
target_url TEXT           -- 目标URL
overall_score INTEGER     -- 总体评分
```

#### 3. `test_results` - 测试结果详情表
**作用**: 存储测试的详细结果数据
- 结构化的结果数据存储
- 按类型分类的结果
- 支持多种数据格式

**关键字段**:
```sql
id UUID                    -- 结果唯一标识
record_id UUID            -- 关联测试记录ID (外键)
result_type VARCHAR(50)    -- 结果类型
category VARCHAR(50)       -- 结果分类
data JSONB                 -- 结果数据
severity VARCHAR(20)       -- 严重程度
```

#### 4. `test_metrics` - 测试指标表
**作用**: 存储量化的测试指标
- 数值型指标的专门存储
- 阈值和权重管理
- 关键指标标识

**关键字段**:
```sql
id UUID                    -- 指标唯一标识
record_id UUID            -- 关联测试记录ID (外键)
metric_name VARCHAR(100)   -- 指标名称
numeric_value DECIMAL      -- 数值
unit VARCHAR(20)           -- 单位
is_key_metric BOOLEAN      -- 是否关键指标
```

#### 5. `test_issues` - 测试问题表
**作用**: 存储发现的问题和建议
- 问题的详细描述
- 严重程度分级
- 修复建议和复杂度评估

**关键字段**:
```sql
id UUID                    -- 问题唯一标识
record_id UUID            -- 关联测试记录ID (外键)
issue_type VARCHAR(20)     -- 问题类型
severity VARCHAR(20)       -- 严重程度
title VARCHAR(200)         -- 问题标题
recommendation TEXT       -- 修复建议
```

## 🔗 关系设计

```
test_sessions (1) ←→ (N) test_records
                              ↓
                         (1) ←→ (N) test_results
                         (1) ←→ (N) test_metrics  
                         (1) ←→ (N) test_issues
```

## 💡 设计优势

### 1. 数据组织清晰
- **会话级别**: 管理整体测试流程
- **记录级别**: 管理单个测试执行
- **详情级别**: 管理具体结果数据

### 2. 查询性能优化
- 主表查询快速获取概览信息
- 从表按需加载详细数据
- 索引优化支持各种查询场景

### 3. 扩展性强
- 新增测试类型无需修改表结构
- 结果数据格式灵活（JSONB）
- 支持复杂的数据分析需求

### 4. 数据完整性
- 外键约束保证数据一致性
- 级联删除避免孤立数据
- 约束检查确保数据逻辑正确

## 📈 使用场景

### 批量测试
```sql
-- 创建测试会话
INSERT INTO test_sessions (session_name, batch_id, user_id) 
VALUES ('网站全面测试', 'BATCH_001', user_id);

-- 添加多个测试记录
INSERT INTO test_records (session_id, test_name, test_type, target_url)
VALUES 
  (session_id, 'API测试', 'api', 'https://example.com/api'),
  (session_id, 'SEO测试', 'seo', 'https://example.com'),
  (session_id, '性能测试', 'website', 'https://example.com');
```

### 结果查询
```sql
-- 查询会话概览
SELECT * FROM user_test_overview WHERE user_id = ?;

-- 查询详细结果
SELECT tr.*, ts.session_name 
FROM test_records tr 
JOIN test_sessions ts ON tr.session_id = ts.id 
WHERE ts.user_id = ?;

-- 查询问题统计
SELECT severity, COUNT(*) 
FROM test_issues ti
JOIN test_records tr ON ti.record_id = tr.id
JOIN test_sessions ts ON tr.session_id = ts.id
WHERE ts.user_id = ?
GROUP BY severity;
```

## 🎉 总结

新的主从表设计提供了：
- ✅ **22个表** 的完整架构
- ✅ **主从分离** 的清晰结构  
- ✅ **8种测试类型** 的统一支持
- ✅ **灵活的数据存储** 和查询优化
- ✅ **完整的约束** 和数据完整性保证

这个设计既满足了当前的功能需求，又为未来的扩展提供了良好的基础。
