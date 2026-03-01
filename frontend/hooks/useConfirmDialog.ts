import { useCallback, useState } from 'react';

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant: 'default' | 'destructive';
  onConfirm: (() => void) | (() => Promise<void>);
}

const INITIAL: ConfirmDialogState = {
  open: false,
  title: '',
  description: '',
  actionLabel: '',
  variant: 'default',
  onConfirm: () => {},
};

/**
 * 统一确认对话框状态管理 Hook。
 *
 * 用法：
 * ```tsx
 * const { state, confirm, close } = useConfirmDialog();
 *
 * // 触发
 * confirm({
 *   title: '删除',
 *   description: '确定要删除吗？',
 *   actionLabel: '删除',
 *   variant: 'destructive',
 *   onConfirm: async () => { await deleteItem(id); },
 * });
 *
 * // 渲染
 * <ConfirmDialog state={state} onClose={close} />
 * ```
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>(INITIAL);

  const confirm = useCallback((opts: Omit<ConfirmDialogState, 'open'>) => {
    setState({ ...opts, open: true });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  return { state, confirm, close } as const;
}

export default useConfirmDialog;
