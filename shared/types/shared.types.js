"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeValidator = exports.TestTypeConverter = exports.UserTypeConverter = exports.FieldMapper = exports.TEST_FIELD_MAPPING = exports.USER_FIELD_MAPPING = exports.UserPlan = exports.UserStatus = exports.UserRole = void 0;
const test_types_1 = require("./test.types");
// ==================== 枚举类型 ====================
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
    UserRole["GUEST"] = "guest";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING"] = "pending";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var UserPlan;
(function (UserPlan) {
    UserPlan["FREE"] = "free";
    UserPlan["BASIC"] = "basic";
    UserPlan["PRO"] = "pro";
    UserPlan["ENTERPRISE"] = "enterprise";
})(UserPlan || (exports.UserPlan = UserPlan = {}));
// ==================== 字段映射配置 ====================
exports.USER_FIELD_MAPPING = {
    // 基础字段
    id: 'id',
    username: 'username',
    email: 'email',
    role: 'role',
    plan: 'plan',
    status: 'status',
    // 个人信息
    firstName: 'first_name',
    lastName: 'last_name',
    avatarUrl: 'avatar_url',
    bio: 'bio',
    location: 'location',
    website: 'website',
    // 安全相关
    emailVerified: 'email_verified',
    emailVerifiedAt: 'email_verified_at',
    twoFactorEnabled: 'two_factor_enabled',
    loginAttempts: 'failed_login_attempts',
    lockedUntil: 'locked_until',
    // 统计信息
    loginCount: 'login_count',
    lastLoginAt: 'last_login_at',
    testCount: 'test_count',
    // 时间戳
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    // JSON字段
    preferences: 'preferences',
    metadata: 'metadata',
    permissions: 'permissions',
};
exports.TEST_FIELD_MAPPING = {
    id: 'id',
    userId: 'user_id',
    sessionId: 'session_id',
    testType: 'test_type',
    status: 'status',
    progress: 'progress',
    currentStep: 'current_step',
    startTime: 'start_time',
    endTime: 'end_time',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    config: 'config',
    result: 'result',
    error: 'error',
};
// ==================== 类型转换工具 ====================
/**
 * 字段映射转换器
 */
class FieldMapper {
    /**
     * 将前端camelCase对象转换为后端snake_case对象
     */
    static toSnakeCase(obj, mapping) {
        const result = {};
        for (const [camelKey, snakeKey] of Object.entries(mapping)) {
            if (obj.hasOwnProperty(camelKey) && obj[camelKey] !== undefined) {
                result[snakeKey] = obj[camelKey];
            }
        }
        return result;
    }
    /**
     * 将后端snake_case对象转换为前端camelCase对象
     */
    static toCamelCase(obj, mapping) {
        const result = {};
        for (const [camelKey, snakeKey] of Object.entries(mapping)) {
            if (obj.hasOwnProperty(snakeKey) && obj[snakeKey] !== undefined) {
                result[camelKey] = obj[snakeKey];
            }
        }
        return result;
    }
    /**
     * 处理JSON字段的序列化和反序列化
     */
    static processJsonFields(obj, jsonFields, operation) {
        const result = { ...obj };
        for (const field of jsonFields) {
            if (result[field] !== undefined && result[field] !== null) {
                try {
                    if (operation === 'serialize') {
                        // 前端 -> 后端：对象转JSON字符串
                        if (typeof result[field] === 'object') {
                            result[field] = JSON.stringify(result[field]);
                        }
                    }
                    else {
                        // 后端 -> 前端：JSON字符串转对象
                        if (typeof result[field] === 'string') {
                            result[field] = JSON.parse(result[field]);
                        }
                    }
                }
                catch (error) {
                    console.warn(`Failed to ${operation} JSON field ${field}:`, error);
                    result[field] = operation === 'serialize' ? '{}' : {};
                }
            }
        }
        return result;
    }
}
exports.FieldMapper = FieldMapper;
// ==================== 用户类型转换器 ====================
class UserTypeConverter {
    /**
     * 将前端User对象转换为数据库UserDatabase对象
     */
    static toDatabase(user) {
        // 先转换字段名
        let dbUser = FieldMapper.toSnakeCase(user, exports.USER_FIELD_MAPPING);
        // 处理JSON字段序列化
        dbUser = FieldMapper.processJsonFields(dbUser, this.JSON_FIELDS, 'serialize');
        return dbUser;
    }
    /**
     * 将数据库UserDatabase对象转换为前端User对象
     */
    static fromDatabase(dbUser) {
        // 先处理JSON字段反序列化
        let user = FieldMapper.processJsonFields(dbUser, this.JSON_FIELDS, 'deserialize');
        // 再转换字段名
        user = FieldMapper.toCamelCase(user, exports.USER_FIELD_MAPPING);
        return user;
    }
}
exports.UserTypeConverter = UserTypeConverter;
UserTypeConverter.JSON_FIELDS = ['preferences', 'metadata', 'permissions'];
// ==================== 测试类型转换器 ====================
class TestTypeConverter {
    /**
     * 将前端TestSession对象转换为数据库对象
     */
    static toDatabase(test) {
        let dbTest = FieldMapper.toSnakeCase(test, exports.TEST_FIELD_MAPPING);
        dbTest = FieldMapper.processJsonFields(dbTest, this.JSON_FIELDS, 'serialize');
        return dbTest;
    }
    /**
     * 将数据库对象转换为前端TestSession对象
     */
    static fromDatabase(dbTest) {
        let test = FieldMapper.processJsonFields(dbTest, this.JSON_FIELDS, 'deserialize');
        test = FieldMapper.toCamelCase(test, exports.TEST_FIELD_MAPPING);
        return test;
    }
}
exports.TestTypeConverter = TestTypeConverter;
TestTypeConverter.JSON_FIELDS = ['config', 'result', 'error'];
// ==================== 验证工具 ====================
class TypeValidator {
    /**
     * 验证用户对象
     */
    static validateUser(user) {
        return (user &&
            typeof user.id === 'string' &&
            typeof user.username === 'string' &&
            typeof user.email === 'string' &&
            Object.values(UserRole).includes(user.role) &&
            Object.values(UserStatus).includes(user.status) &&
            Object.values(UserPlan).includes(user.plan));
    }
    /**
     * 验证测试会话对象
     */
    static validateTestSession(session) {
        return (session &&
            typeof session.id === 'string' &&
            typeof session.userId === 'string' &&
            test_types_1.TestTypeValues.includes(session.type) &&
            test_types_1.TestStatusValues.includes(session.status));
    }
    /**
     * 验证API响应格式
     */
    static validateApiResponse(response) {
        return (response &&
            typeof response.success === 'boolean' &&
            typeof response.message === 'string' &&
            response.meta &&
            typeof response.meta.timestamp === 'string' &&
            typeof response.meta.requestId === 'string');
    }
}
exports.TypeValidator = TypeValidator;
//# sourceMappingURL=shared.types.js.map