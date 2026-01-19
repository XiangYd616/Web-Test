"use strict";
/**
 * 测试引擎插件化架构 - 核心类型定义
 *
 * 用于统一管理所有测试引擎，解决功能重叠和耦合问题
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestStatus = exports.TestPriority = exports.DeprecatedTestEngineType = exports.TestEngineLayer = exports.TestEngineType = void 0;
/**
 * 测试引擎类型枚举 - 优化后的分层架构
 */
var TestEngineType;
(function (TestEngineType) {
    // 核心功能引擎 (Core Engines)
    TestEngineType["API"] = "api";
    TestEngineType["PERFORMANCE"] = "performance";
    TestEngineType["SECURITY"] = "security";
    TestEngineType["STRESS"] = "stress";
    // 分析引擎 (Analysis Engines)
    TestEngineType["SEO"] = "seo";
    TestEngineType["ACCESSIBILITY"] = "accessibility";
    TestEngineType["COMPATIBILITY"] = "compatibility";
    // 复合引擎 (Composite Engines)
    TestEngineType["WEBSITE"] = "website";
    TestEngineType["INFRASTRUCTURE"] = "infrastructure";
})(TestEngineType || (exports.TestEngineType = TestEngineType = {}));
/**
 * 测试引擎层次
 */
var TestEngineLayer;
(function (TestEngineLayer) {
    TestEngineLayer["CORE"] = "core";
    TestEngineLayer["ANALYSIS"] = "analysis";
    TestEngineLayer["COMPOSITE"] = "composite"; // 复合引擎
})(TestEngineLayer || (exports.TestEngineLayer = TestEngineLayer = {}));
/**
 * 弃用的测试引擎类型 (已移除)
 */
var DeprecatedTestEngineType;
(function (DeprecatedTestEngineType) {
    DeprecatedTestEngineType["SERVICES"] = "services";
    DeprecatedTestEngineType["CLIENTS"] = "clients";
    DeprecatedTestEngineType["CONTENT"] = "content";
    DeprecatedTestEngineType["DOCUMENTATION"] = "documentation";
    DeprecatedTestEngineType["NETWORK"] = "network";
    DeprecatedTestEngineType["REGRESSION"] = "regression";
    DeprecatedTestEngineType["AUTOMATION"] = "automation";
    DeprecatedTestEngineType["DATABASE"] = "database";
    DeprecatedTestEngineType["UX"] = "ux";
    DeprecatedTestEngineType["BASE"] = "base";
    DeprecatedTestEngineType["CORE"] = "core";
})(DeprecatedTestEngineType || (exports.DeprecatedTestEngineType = DeprecatedTestEngineType = {}));
/**
 * 测试优先级
 */
var TestPriority;
(function (TestPriority) {
    TestPriority["LOW"] = "low";
    TestPriority["MEDIUM"] = "medium";
    TestPriority["HIGH"] = "high";
    TestPriority["CRITICAL"] = "critical";
})(TestPriority || (exports.TestPriority = TestPriority = {}));
/**
 * 测试状态
 */
var TestStatus;
(function (TestStatus) {
    TestStatus["IDLE"] = "idle";
    TestStatus["PREPARING"] = "preparing";
    TestStatus["RUNNING"] = "running";
    TestStatus["COMPLETED"] = "completed";
    TestStatus["FAILED"] = "failed";
    TestStatus["CANCELLED"] = "cancelled";
})(TestStatus || (exports.TestStatus = TestStatus = {}));
//# sourceMappingURL=testEngine.types.js.map