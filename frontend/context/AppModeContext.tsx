/**
 * 应用模式管理 — Scratch Pad（离线本地）↔ Workspace（云端同步）
 *
 * Scratch Pad: 打开即用，无账户，数据纯本地存储
 * Workspace:   登录后，数据云端同步，工作空间隔离
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type AppMode = 'scratchpad' | 'workspace';

type CloudUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type AppModeState = {
  /** 当前模式 */
  mode: AppMode;
  /** 云端用户信息（仅 workspace 模式） */
  cloudUser: CloudUser | null;
  /** 是否有待迁移的 scratchpad 数据 */
  hasScratchpadData: boolean;
  /** 切换到 workspace 模式（登录成功后调用） */
  switchToWorkspace: (user: CloudUser) => void;
  /** 切回 scratchpad 模式（登出后调用） */
  switchToScratchpad: () => void;
  /** 标记 scratchpad 数据已迁移 */
  markScratchpadMigrated: () => void;
};

const STORAGE_KEY_MODE = 'app_mode';
const STORAGE_KEY_CLOUD_USER = 'cloud_workspace_user';
const STORAGE_KEY_SCRATCHPAD_HAS_DATA = 'scratchpad_has_data';

const AppModeContext = createContext<AppModeState | null>(null);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE);
    return stored === 'workspace' ? 'workspace' : 'scratchpad';
  });

  const [cloudUser, setCloudUser] = useState<CloudUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CLOUD_USER);
      return stored ? (JSON.parse(stored) as CloudUser) : null;
    } catch {
      return null;
    }
  });

  const [hasScratchpadData, setHasScratchpadData] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SCRATCHPAD_HAS_DATA) === 'true';
  });

  // 持久化 mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }, [mode]);

  // 持久化 cloudUser
  useEffect(() => {
    if (cloudUser) {
      localStorage.setItem(STORAGE_KEY_CLOUD_USER, JSON.stringify(cloudUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CLOUD_USER);
    }
  }, [cloudUser]);

  // 登录成功 → 切换到 workspace
  const switchToWorkspace = useCallback((user: CloudUser) => {
    // 检查是否有 scratchpad 数据（本地历史记录等）
    const hasLocalData = Boolean(
      localStorage.getItem('accessToken') || localStorage.getItem('current_user')
    );
    if (hasLocalData) {
      localStorage.setItem(STORAGE_KEY_SCRATCHPAD_HAS_DATA, 'true');
      setHasScratchpadData(true);
    }

    setCloudUser(user);
    setMode('workspace');
  }, []);

  // 登出 → 切回 scratchpad
  const switchToScratchpad = useCallback(() => {
    setCloudUser(null);
    setMode('scratchpad');
    // 清除云端同步相关数据，但保留本地 scratchpad 数据
    localStorage.removeItem(STORAGE_KEY_CLOUD_USER);
  }, []);

  // 标记迁移完成
  const markScratchpadMigrated = useCallback(() => {
    setHasScratchpadData(false);
    localStorage.removeItem(STORAGE_KEY_SCRATCHPAD_HAS_DATA);
  }, []);

  // 一致性检查：workspace 模式但无用户 → 回退到 scratchpad
  useEffect(() => {
    if (mode === 'workspace' && !cloudUser) {
      setMode('scratchpad');
    }
  }, [mode, cloudUser]);

  const value = useMemo<AppModeState>(
    () => ({
      mode,
      cloudUser,
      hasScratchpadData,
      switchToWorkspace,
      switchToScratchpad,
      markScratchpadMigrated,
    }),
    [mode, cloudUser, hasScratchpadData, switchToWorkspace, switchToScratchpad, markScratchpadMigrated]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return context;
};

export default AppModeContext;
