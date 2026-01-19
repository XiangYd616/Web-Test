"use strict";
// Common enumerations
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestStatus = exports.TestPriority = exports.TestType = exports.Theme = exports.Timezone = exports.Language = exports.ThemeMode = exports.TestGrade = exports.UserPlan = exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
    UserRole["GUEST"] = "guest";
    UserRole["MODERATOR"] = "moderator";
    UserRole["MANAGER"] = "manager";
    UserRole["TESTER"] = "tester";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["BANNED"] = "banned";
    UserStatus["PENDING"] = "pending";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var UserPlan;
(function (UserPlan) {
    UserPlan["FREE"] = "free";
    UserPlan["BASIC"] = "basic";
    UserPlan["PRO"] = "pro";
    UserPlan["ENTERPRISE"] = "enterprise";
})(UserPlan || (exports.UserPlan = UserPlan = {}));
var TestGrade;
(function (TestGrade) {
    TestGrade["A"] = "A";
    TestGrade["B"] = "B";
    TestGrade["C"] = "C";
    TestGrade["D"] = "D";
    TestGrade["F"] = "F";
})(TestGrade || (exports.TestGrade = TestGrade = {}));
var ThemeMode;
(function (ThemeMode) {
    ThemeMode["LIGHT"] = "light";
    ThemeMode["DARK"] = "dark";
    ThemeMode["AUTO"] = "auto";
})(ThemeMode || (exports.ThemeMode = ThemeMode = {}));
var Language;
(function (Language) {
    Language["ZH_CN"] = "zh-CN";
    Language["EN_US"] = "en-US";
    Language["JA_JP"] = "ja-JP";
})(Language || (exports.Language = Language = {}));
var Timezone;
(function (Timezone) {
    Timezone["ASIA_SHANGHAI"] = "Asia/Shanghai";
    Timezone["UTC"] = "UTC";
    Timezone["AMERICA_NEW_YORK"] = "America/New_York";
})(Timezone || (exports.Timezone = Timezone = {}));
var Theme;
(function (Theme) {
    Theme["LIGHT"] = "light";
    Theme["DARK"] = "dark";
    Theme["AUTO"] = "auto";
})(Theme || (exports.Theme = Theme = {}));
// Test Type as both enum and type
var TestType;
(function (TestType) {
    TestType["STRESS"] = "stress";
    TestType["PERFORMANCE"] = "performance";
    TestType["API"] = "api";
    TestType["SECURITY"] = "security";
    TestType["SEO"] = "seo";
    TestType["ACCESSIBILITY"] = "accessibility";
    TestType["UX"] = "ux";
    TestType["INTEGRATION"] = "integration";
    TestType["NETWORK"] = "network";
    TestType["COMPATIBILITY"] = "compatibility";
    TestType["DATABASE"] = "database";
    TestType["WEBSITE"] = "website";
})(TestType || (exports.TestType = TestType = {}));
var TestPriority;
(function (TestPriority) {
    TestPriority["LOW"] = "low";
    TestPriority["MEDIUM"] = "medium";
    TestPriority["HIGH"] = "high";
    TestPriority["CRITICAL"] = "critical";
})(TestPriority || (exports.TestPriority = TestPriority = {}));
var TestStatus;
(function (TestStatus) {
    TestStatus["IDLE"] = "idle";
    TestStatus["PENDING"] = "pending";
    TestStatus["RUNNING"] = "running";
    TestStatus["COMPLETED"] = "completed";
    TestStatus["FAILED"] = "failed";
    TestStatus["CANCELLED"] = "cancelled";
    TestStatus["PAUSED"] = "paused";
})(TestStatus || (exports.TestStatus = TestStatus = {}));
//# sourceMappingURL=enums.js.map