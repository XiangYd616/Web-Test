import { useEffect, useRef, useState } from 'react';

interface WarningTipProps {
  message: string;
  /** auto-hide delay in ms, default 3000 */
  delay?: number;
}

/**
 * Tooltip-style warning that:
 * - appears when `message` changes to a non-empty string
 * - auto-fades after `delay` ms
 * - reappears on hover or focus-within of the parent (parent must have `group` and `relative` classes)
 */
export const WarningTip = ({ message, delay = 3000 }: WarningTipProps) => {
  const [visible, setVisible] = useState(!!message);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (message) {
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), delay);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [message, delay]);

  if (!message) return null;

  return (
    <div
      className={[
        'absolute left-0 top-full mt-1.5 z-50 pointer-events-none',
        'transition-opacity duration-300',
        visible
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
      ].join(' ')}
    >
      {/* arrow */}
      <div className='absolute -top-1 left-3 w-2 h-2 rotate-45 bg-amber-50 dark:bg-amber-950 border-l border-t border-amber-300 dark:border-amber-800' />
      <div className='text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-800 rounded-md px-2.5 py-1.5 shadow-lg font-medium whitespace-nowrap'>
        ⚠ {message}
      </div>
    </div>
  );
};
