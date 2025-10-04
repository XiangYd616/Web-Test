// Stub file - Auth types
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  roles?: string[];
}

export interface MFAConfig {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  mfa?: MFAConfig;
}


// MFA Types
export interface MFASetupResponse {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface MFAVerificationResponse {
  success: boolean;
  message?: string;
  token?: string;
}