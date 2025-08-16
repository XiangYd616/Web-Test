/**
 * JWT令牌服务
 * 实现访问令牌和刷新令牌机制
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../../config/database.js');
const { ErrorFactory } = require('../../utils/apiError');

class JwtService {
    constructor() {
        // JWT配置
        this.accessTokenSecret = process.env.JWT_SECRET || 'testweb-super-secret-jwt-key-change-in-production-2024';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'testweb-refresh-secret-key-change-in-production-2024';
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        this.issuer = process.env.JWT_ISSUER || 'testweb-app';
        this.audience = process.env.JWT_AUDIENCE || 'testweb-users';
    }

    /**
     * 生成访问令牌
     * @param {Object} payload - 令牌载荷
     * @param {string} [expiresIn] - 过期时间
     * @returns {string} 访问令牌
     */
    generateAccessToken(payload, expiresIn = null) {
        const tokenPayload = {
            ...payload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000)
        };

        return jwt.sign(tokenPayload, this.accessTokenSecret, {
            expiresIn: expiresIn || this.accessTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            algorithm: 'HS256'
        });
    }

    /**
     * 生成刷新令牌
     * @param {Object} payload - 令牌载荷
     * @param {string} [expiresIn] - 过期时间
     * @returns {string} 刷新令牌
     */
    generateRefreshToken(payload, expiresIn = null) {
        const tokenPayload = {
            ...payload,
            type: 'refresh',
            jti: crypto.randomUUID(), // JWT ID，用于令牌撤销
            iat: Math.floor(Date.now() / 1000)
        };

        return jwt.sign(tokenPayload, this.refreshTokenSecret, {
            expiresIn: expiresIn || this.refreshTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            algorithm: 'HS256'
        });
    }

    /**
     * 生成令牌对（访问令牌 + 刷新令牌）
     * @param {number} userId - 用户ID
     * @param {Object} [additionalPayload] - 额外载荷
     * @returns {Object} 令牌对
     */
    async generateTokenPair(userId, additionalPayload = {}) {
        try {
            // 获取用户信息
            const userResult = await query(
                'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                throw ErrorFactory.notFound('用户');
            }

            const user = userResult.rows[0];

            if (!user.is_active) {
                throw ErrorFactory.forbidden('用户账户已被禁用');
            }

            const basePayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                ...additionalPayload
            };

            const accessToken = this.generateAccessToken(basePayload);
            const refreshToken = this.generateRefreshToken({ userId: user.id });

            // 存储刷新令牌到数据库
            await this.storeRefreshToken(userId, refreshToken);

            return {
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: this.parseExpiryToSeconds(this.accessTokenExpiry),
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isActive: user.is_active
                }
            };
        } catch (error) {
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 验证访问令牌
     * @param {string} token - 访问令牌
     * @returns {Object} 解码后的令牌载荷
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: ['HS256']
            });

            if (decoded.type !== 'access') {
                throw ErrorFactory.token('invalid', '令牌类型错误');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw ErrorFactory.token('expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw ErrorFactory.token('invalid');
            }
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 验证刷新令牌
     * @param {string} token - 刷新令牌
     * @returns {Object} 解码后的令牌载荷
     */
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: ['HS256']
            });

            if (decoded.type !== 'refresh') {
                throw ErrorFactory.token('invalid', '令牌类型错误');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw ErrorFactory.token('expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw ErrorFactory.token('invalid');
            }
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 刷新访问令牌
     * @param {string} refreshToken - 刷新令牌
     * @returns {Object} 新的令牌对
     */
    async refreshAccessToken(refreshToken) {
        try {
            // 验证刷新令牌
            const decoded = this.verifyRefreshToken(refreshToken);

            // 检查刷新令牌是否在数据库中存在且有效
            const tokenResult = await query(
                'SELECT id, user_id, expires_at, is_revoked FROM refresh_tokens WHERE token_hash = $1',
                [this.hashToken(refreshToken)]
            );

            if (tokenResult.rows.length === 0) {
                throw ErrorFactory.token('invalid', '刷新令牌不存在');
            }

            const tokenRecord = tokenResult.rows[0];

            if (tokenRecord.is_revoked) {
                throw ErrorFactory.token('invalid', '刷新令牌已被撤销');
            }

            if (new Date(tokenRecord.expires_at) < new Date()) {
                throw ErrorFactory.token('expired', '刷新令牌已过期');
            }

            // 撤销旧的刷新令牌
            await this.revokeRefreshToken(refreshToken);

            // 生成新的令牌对
            return await this.generateTokenPair(decoded.userId);
        } catch (error) {
            throw ErrorFactory.fromError(error);
        }
    }

    /**
     * 存储刷新令牌到数据库
     * @param {number} userId - 用户ID
     * @param {string} refreshToken - 刷新令牌
     */
    async storeRefreshToken(userId, refreshToken) {
        try {
            const decoded = jwt.decode(refreshToken);
            const expiresAt = new Date(decoded.exp * 1000);
            const tokenHash = this.hashToken(refreshToken);

            await query(`
        INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (jti) DO UPDATE SET
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          is_revoked = false,
          updated_at = NOW()
      `, [userId, tokenHash, decoded.jti, expiresAt]);

            // 清理过期的刷新令牌
            await this.cleanupExpiredTokens(userId);
        } catch (error) {
            console.error('存储刷新令牌失败:', error);
            throw ErrorFactory.database('general', '令牌存储失败');
        }
    }

    /**
     * 撤销刷新令牌
     * @param {string} refreshToken - 刷新令牌
     */
    async revokeRefreshToken(refreshToken) {
        try {
            const tokenHash = this.hashToken(refreshToken);

            await query(
                'UPDATE refresh_tokens SET is_revoked = true, updated_at = NOW() WHERE token_hash = $1',
                [tokenHash]
            );
        } catch (error) {
            console.error('撤销刷新令牌失败:', error);
            throw ErrorFactory.database('general', '令牌撤销失败');
        }
    }

    /**
     * 撤销用户的所有刷新令牌
     * @param {number} userId - 用户ID
     */
    async revokeAllUserTokens(userId) {
        try {
            await query(
                'UPDATE refresh_tokens SET is_revoked = true, updated_at = NOW() WHERE user_id = $1 AND is_revoked = false',
                [userId]
            );
        } catch (error) {
            console.error('撤销用户所有令牌失败:', error);
            throw ErrorFactory.database('general', '令牌撤销失败');
        }
    }

    /**
     * 清理过期的刷新令牌
     * @param {number} [userId] - 用户ID（可选，如果不提供则清理所有用户的过期令牌）
     */
    async cleanupExpiredTokens(userId = null) {
        try {
            let query_text = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
            let params = [];

            if (userId) {
                query_text += ' AND user_id = $1';
                params.push(userId);
            }

            await query(query_text, params);
        } catch (error) {
            console.error('清理过期令牌失败:', error);
        }
    }

    /**
     * 获取用户的活跃令牌数量
     * @param {number} userId - 用户ID
     * @returns {number} 活跃令牌数量
     */
    async getUserActiveTokenCount(userId) {
        try {
            const result = await query(
                'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()',
                [userId]
            );

            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('获取用户活跃令牌数量失败:', error);
            return 0;
        }
    }

    /**
     * 生成令牌哈希值
     * @param {string} token - 令牌
     * @returns {string} 哈希值
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * 解析过期时间为秒数
     * @param {string} expiry - 过期时间字符串（如 '15m', '7d'）
     * @returns {number} 秒数
     */
    parseExpiryToSeconds(expiry) {
        const units = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
            w: 604800
        };

        const match = expiry.match(/^(\d+)([smhdw])$/);
        if (!match) {
            
        return 900; // 默认15分钟
      }

        const [, value, unit] = match;
        return parseInt(value) * (units[unit] || 1);
    }

    /**
     * 解码令牌（不验证签名）
     * @param {string} token - 令牌
     * @returns {Object|null} 解码后的载荷
     */
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }

    /**
     * 检查令牌是否即将过期
     * @param {string} token - 访问令牌
     * @param {number} [thresholdMinutes=5] - 阈值分钟数
     * @returns {boolean} 是否即将过期
     */
    isTokenExpiringSoon(token, thresholdMinutes = 5) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                
        return true;
      }

            const expirationTime = decoded.exp * 1000;
            const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);

            return expirationTime <= thresholdTime;
        } catch (error) {
            return true;
        }
    }

    /**
     * 获取令牌剩余有效时间（秒）
     * @param {string} token - 令牌
     * @returns {number} 剩余秒数，如果已过期返回0
     */
    getTokenRemainingTime(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                
        return 0;
      }

            const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
            return Math.max(0, remainingTime);
        } catch (error) {
            return 0;
        }
    }
}

module.exports = JwtService;