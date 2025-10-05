/**
 * user.types.ts - 用户类型定义
 */

import { Email, Timestamp } from './common.types';

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

export interface User {
  id: string;
  username: string;
  email: Email;
  role?: string;
  status?: UserStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  profile?: UserProfile;
  preferences?: UserPreferences;
}

