// User management types

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  [key: string]: any;
}

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  bio?: string;
  [key: string]: any;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  [key: string]: any;
}

export {};
