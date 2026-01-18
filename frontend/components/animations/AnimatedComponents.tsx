/**
 * 动画组件库
 * 提供各种微交互和过渡动画效果
 */

import React, { ReactNode } from 'react';

// 当前采用简化的占位动画实现，避免额外依赖
// 如需更丰富的动画效果，可替换为 framer-motion
type Variants = Record<string, Record<string, unknown>>;

type MotionBaseProps = {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: Variants;
  whileHover?: unknown;
  whileTap?: unknown;
};

type MotionDivProps = React.HTMLAttributes<HTMLDivElement> & MotionBaseProps;
type MotionSpanProps = React.HTMLAttributes<HTMLSpanElement> & MotionBaseProps;
type MotionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & MotionBaseProps;

const MotionDiv: React.FC<MotionDivProps> = ({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  whileHover: _whileHover,
  whileTap: _whileTap,
  ...rest
}) => <div {...rest}>{children}</div>;

const MotionSpan: React.FC<MotionSpanProps> = ({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  whileHover: _whileHover,
  whileTap: _whileTap,
  ...rest
}) => <span {...rest}>{children}</span>;

const MotionButton: React.FC<MotionButtonProps> = ({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  whileHover: _whileHover,
  whileTap: _whileTap,
  ...rest
}) => <button {...rest}>{children}</button>;

const motion = {
  div: MotionDiv,
  span: MotionSpan,
  button: MotionButton,
};

// Placeholder AnimatePresence component
// const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// ==================== 基础动画配置 ====================

export const springTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 120,
};

export const easeTransition = {
  duration: 0.3,
  ease: [0.4, 0.0, 0.2, 1],
};

// ==================== 动画变体 ====================

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideInVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideFromLeftVariants: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export const slideFromRightVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
};

export const staggerContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ==================== 动画组件 ====================

interface AnimatedProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

/**
 * 淡入动画组件
 */
export const FadeIn: React.FC<AnimatedProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.3,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * 滑入动画组件
 */
export const SlideIn: React.FC<
  AnimatedProps & { direction?: 'up' | 'down' | 'left' | 'right' }
> = ({ children, className, delay = 0, duration = 0.3, direction = 'up' }) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 20 };
      case 'down':
        return { y: -20 };
      case 'left':
        return { x: -20 };
      case 'right':
        return { x: 20 };
      default:
        return { y: 20 };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ...springTransition }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 缩放动画组件
 */
export const ScaleIn: React.FC<AnimatedProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.3,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration, delay, ...springTransition }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * 交错动画容器
 */
export const StaggerContainer: React.FC<AnimatedProps> = ({ children, className, delay = 0 }) => (
  <motion.div
    variants={staggerContainerVariants}
    initial="initial"
    animate="animate"
    className={className}
    transition={{ delay }}
  >
    {children}
  </motion.div>
);

/**
 * 交错动画项
 */
export const StaggerItem: React.FC<AnimatedProps> = ({ children, className }) => (
  <motion.div variants={staggerItemVariants} transition={springTransition} className={className}>
    {children}
  </motion.div>
);

// ==================== 交互式动画组件 ====================

interface HoverAnimatedProps extends AnimatedProps {
  hoverScale?: number;
  hoverY?: number;
  tapScale?: number;
}

/**
 * 悬停动画按钮
 */
export const HoverButton: React.FC<HoverAnimatedProps> = ({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -2,
  tapScale = 0.98,
}) => (
  <motion.button
    whileHover={{
      scale: hoverScale,
      y: hoverY,
      transition: { duration: 0.2 },
    }}
    whileTap={{ scale: tapScale }}
    className={className}
  >
    {children}
  </motion.button>
);

/**
 * 悬停动画卡片
 */
export const HoverCard: React.FC<HoverAnimatedProps> = ({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -4,
}) => (
  <motion.div
    whileHover={{
      scale: hoverScale,
      y: hoverY,
      transition: { duration: 0.2, ...springTransition },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * 脉冲动画组件
 */
export const Pulse: React.FC<AnimatedProps> = ({ children, className }) => (
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * 摇摆动画组件
 */
export const Wiggle: React.FC<AnimatedProps> = ({ children, className }) => (
  <motion.div
    animate={{
      rotate: [0, -3, 3, -3, 0],
    }}
    transition={{
      duration: 0.5,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// ==================== 页面过渡动画 ====================

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * 页面过渡动画
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * 模态框动画
 */
export const ModalAnimation: React.FC<PageTransitionProps> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 20 }}
    transition={{ duration: 0.2, ...springTransition }}
    className={className}
  >
    {children}
  </motion.div>
);

// ==================== 加载动画组件 ====================

/**
 * 加载点动画
 */
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex space-x-1 ${className}`}>
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-current rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

/**
 * 旋转加载动画
 */
export const LoadingSpinner: React.FC<{ className?: string; size?: number }> = ({
  className,
  size = 24,
}) => (
  <motion.div
    className={`border-2 border-gray-300 border-t-blue-500 rounded-full ${className}`}
    style={{ width: size, height: size }}
    animate={{ rotate: 360 }}
    transition={{
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

/**
 * 进度条动画
 */
export const AnimatedProgressBar: React.FC<{
  progress: number;
  className?: string;
  color?: string;
}> = ({ progress, className, color = 'bg-blue-500' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <motion.div
      className={`h-2 rounded-full ${color}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  </div>
);

// ==================== 数字动画组件 ====================

/**
 * 数字递增动画
 */
export const AnimatedNumber: React.FC<{
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
}> = ({ value, className, duration = 1, decimals = 0 }) => {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: Math.min(0.3, duration) }}
    >
      <motion.span
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration, delay: 0.1 }}
      >
        {value.toFixed(decimals)}
      </motion.span>
    </motion.span>
  );
};

// ==================== 列表动画组件 ====================

/**
 * 列表项动画
 */
export const AnimatedList: React.FC<{
  children: ReactNode[];
  className?: string;
  stagger?: number;
}> = ({ children, className, stagger = 0.1 }) => (
  <motion.div
    className={className}
    variants={{
      animate: {
        transition: {
          staggerChildren: stagger,
        },
      },
    }}
    initial="initial"
    animate="animate"
  >
    {children.map((child, index) => (
      <motion.div
        key={index}
        variants={{
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
        }}
        transition={springTransition}
      >
        {child}
      </motion.div>
    ))}
  </motion.div>
);

export default {
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  HoverButton,
  HoverCard,
  Pulse,
  Wiggle,
  PageTransition,
  ModalAnimation,
  LoadingDots,
  LoadingSpinner,
  AnimatedProgressBar,
  AnimatedNumber,
  AnimatedList,
};
