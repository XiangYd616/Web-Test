
interface JWTHeader   {
  alg: string;
  typ: string;
}

interface JWTPayload   {
  sub?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export class BrowserJWT {
  private static instance: BrowserJWT;

  public static getInstance(): BrowserJWT {
    if (!BrowserJWT.instance) {
      BrowserJWT.instance = new BrowserJWT();
    }
    return BrowserJWT.instance;
  }

  /**
   * Base64URL编码
   */
  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '");
  }

  /**
   * Base64URL解码
   */
  private base64UrlDecode(str: string): string {
    // 补齐padding
    str += '='.repeat((4 - str.length % 4) % 4);
    // 替换字符
    str = str.replace(/-/g, '+').replace(/_/g, '/");
    return atob(str);
  }

  /**
   * 创建JWT Token（仅用于演示）
   */
  public createToken(payload: JWTPayload, expiresIn: number = 3600): string {
    const header: JWTHeader  = {
      alg: 'HS256',
      typ: 'JWT'
    };
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JWTPayload  = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));

    // 在浏览器环境中，我们使用简单的签名（仅用于演示）
    const signature = this.base64UrlEncode(`${encodedHeader}.${encodedPayload}.mock_signature`);`

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * 解析JWT Token
   */
  public parseToken(token: string): { header: JWTHeader; payload: JWTPayload; signature: string } | null {
    try {
      const parts = token.split(".");`
      if (parts.length !== 3) {
        
        return null;
      }

      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      const signature = parts[2];

      return { header, payload, signature };
    } catch (error) {
      console.error('JWT解析失败:', error);
      return null;
    }
  }

  /**
   * 验证Token是否有效
   */
  public isTokenValid(token: string): boolean {
    const parsed = this.parseToken(token);
    if (!parsed) {
      
        return false;
      }

    const now = Math.floor(Date.now() / 1000);

    // 检查是否过期
    if (parsed.payload.exp && parsed.payload.exp < now) {
      
        return false;
      }

    // 检查是否在有效期内
    if (parsed.payload.iat && parsed.payload.iat > now) {
      
        return false;
      }

    return true;
  }

  /**
   * 获取Token的剩余有效时间（秒）
   */
  public getTokenRemainingTime(token: string): number {
    const parsed = this.parseToken(token);
    if (!parsed || !parsed.payload.exp) {
      
        return 0;
      }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, parsed.payload.exp - now);
  }

  /**
   * 刷新Token
   */
  public refreshToken(token: string, expiresIn: number = 3600): string | null {
    const parsed = this.parseToken(token);
    if (!parsed) {
      
        return null;
      }

    // 创建新的payload，保留原有数据但更新时间
    const newPayload = {
      ...parsed.payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn
    };

    return this.createToken(newPayload, expiresIn);
  }

  /**
   * 从Token中提取用户信息
   */
  public getUserFromToken(token: string): any | null {
    const parsed = this.parseToken(token);
    if (!parsed || !this.isTokenValid(token)) {
      return null;
    }

    return {
      id: parsed.payload.sub,
      username: parsed.payload.username,
      email: parsed.payload.email,
      role: parsed.payload.role,
      ...parsed.payload
    };
  }

  /**
   * 检查Token是否即将过期（默认5分钟内）
   */
  public isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    const remainingTime = this.getTokenRemainingTime(token);
    return remainingTime > 0 && remainingTime <= thresholdSeconds;
  }

  /**
   * 生成随机字符串（用于生成简单的签名）
   */
  private generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 创建访客Token
   */
  public createGuestToken(): string {
    const payload = {
      sub: 'guest',
      username: 'Guest',
      role: 'guest',
      isGuest: true
    };

    return this.createToken(payload, 86400); // 24小时有效期
  }

  /**
   * 验证是否为访客Token
   */
  public isGuestToken(token: string): boolean {
    const user = this.getUserFromToken(token);
    return user && user.isGuest === true;
  }

  /**
   * 获取Token的详细信息（用于调试）
   */
  public getTokenInfo(token: string): any {
    const parsed = this.parseToken(token);
    if (!parsed) {
      
        return null;
      }

    const now = Math.floor(Date.now() / 1000);
    const remainingTime = this.getTokenRemainingTime(token);

    return {
      header: parsed.header,
      payload: parsed.payload,
      isValid: this.isTokenValid(token),
      isExpired: parsed.payload.exp ? parsed.payload.exp < now : false,
      remainingTime,
      isExpiringSoon: this.isTokenExpiringSoon(token),
      createdAt: parsed.payload.iat ? new Date(parsed.payload.iat * 1000) : null,
      expiresAt: parsed.payload.exp ? new Date(parsed.payload.exp * 1000) : null
    };
  }
}

// 创建默认实例并导出
export const browserJwt = BrowserJWT.getInstance();
export default browserJwt;
