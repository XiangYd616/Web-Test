# 测试结果统一 Schema

本文档定义测试引擎输出的统一结果结构，用于结果落库、日志记录与后续扩展。

## 顶层返回（Engine Result Envelope）

```json
{
  "engine": "SecurityTestEngine",
  "version": "1.0.0",
  "success": true,
  "testId": "security_1700000000000_xxxxx",
  "results": {
    "testId": "security_1700000000000_xxxxx",
    "status": "completed",
    "score": 92,
    "summary": {},
    "metrics": {},
    "warnings": [],
    "errors": [],
    "details": {}
  },
  "timestamp": "2026-01-21T00:00:00.000Z"
}
```

### 字段说明

| 字段      | 类型    | 必填       | 说明                       |
| --------- | ------- | ---------- | -------------------------- |
| engine    | string  | 是         | 引擎名称（对应 this.name） |
| version   | string  | 否         | 引擎版本（若存在）         |
| success   | boolean | 是         | 是否执行成功               |
| testId    | string  | 是         | 测试实例 ID                |
| results   | object  | 成功时必填 | 标准化结果对象             |
| error     | string  | 失败时常见 | 错误信息摘要               |
| timestamp | string  | 否         | 结果生成时间（ISO）        |

## 标准化结果（Normalized Result）

```json
{
  "testId": "security_1700000000000_xxxxx",
  "status": "completed",
  "score": 92,
  "summary": {},
  "metrics": {},
  "warnings": [],
  "errors": [],
  "details": {}
}
```

### 字段规范

| 字段     | 类型     | 必填 | 说明                                           |
| -------- | -------- | ---- | ---------------------------------------------- |
| testId   | string   | 是   | 测试 ID                                        |
| status   | string   | 是   | 枚举：completed / failed / cancelled / running |
| score    | number   | 是   | 0-100 分数                                     |
| summary  | object   | 是   | 摘要（用于落库 summary）                       |
| metrics  | object   | 是   | 统一指标对象（键值对）                         |
| warnings | string[] | 是   | 警告列表                                       |
| errors   | string[] | 是   | 错误列表                                       |
| details  | object   | 否   | 引擎原始结果                                   |

### 失败场景要求

失败时需返回最小结构，确保落库稳定：

```json
{
  "status": "failed",
  "score": 0,
  "summary": {},
  "metrics": {},
  "warnings": [],
  "errors": ["错误信息"]
}
```

## 结果落库关联

- `summary`：用于 `test_results.summary` 与状态汇总。
- `metrics`：用于 `test_metrics` 落库（支持键值或列表转换）。
- `warnings/errors`：用于 `test_results` 与执行日志。

## 引擎实现要求（Checklist）

- [ ] 成功路径返回标准化结果结构（含 `summary/metrics/warnings/errors`）
- [ ] 失败路径返回 `status: failed` 且 `metrics` 至少为空对象 `{}`
- [ ] `warnings/errors` 必须为数组
- [ ] `score` 失败时为 0
