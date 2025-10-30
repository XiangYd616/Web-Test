/**
 * MUI Grid 兼容性包装组件
 * 解决 MUI v7 中 Grid 的 item 属性废弃问题
 * 
 * 使用方法:
 * 1. 导入此组件: import { GridContainer, GridItem } from '@/components/ui/GridWrapper';
 * 2. 替换原有的 Grid: <GridContainer> ... <GridItem xs={12}> ... </GridItem> </GridContainer>
 */

import React from 'react';
import { Grid as MuiGrid, GridProps as MuiGridProps } from '@mui/material';

/**
 * Grid Container 包装组件
 * 用于包裹多个 GridItem
 */
export interface GridContainerProps extends Omit<MuiGridProps, 'container' | 'item'> {
  children: React.ReactNode;
}

export const GridContainer: React.FC<GridContainerProps> = ({ children, ...props }) => {
  return (
    <MuiGrid container {...props}>
      {children}
    </MuiGrid>
  );
};

/**
 * Grid Item 包装组件
 * 替代原有的 <Grid item xs={12}>
 */
export interface GridItemProps extends Omit<MuiGridProps, 'container' | 'item' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'> {
  children: React.ReactNode;
  // 响应式尺寸
  xs?: number | 'auto' | boolean;
  sm?: number | 'auto' | boolean;
  md?: number | 'auto' | boolean;
  lg?: number | 'auto' | boolean;
  xl?: number | 'auto' | boolean;
}

export const GridItem: React.FC<GridItemProps> = ({ 
  children, 
  xs,
  sm,
  md,
  lg,
  xl,
  ...props 
}) => {
  return (
    // @ts-ignore - MUI Grid item props compatibility
    <MuiGrid 
      {...props}
      size={{ xs, sm, md, lg, xl }}
    >
      {children}
    </MuiGrid>
  );
};

/**
 * 兼容旧代码的 Grid 组件
 * 自动检测是否为 container 或 item
 */
export interface CompatibleGridProps extends Omit<MuiGridProps, 'xs' | 'sm' | 'md' | 'lg' | 'xl'> {
  children: React.ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | 'auto' | boolean;
  sm?: number | 'auto' | boolean;
  md?: number | 'auto' | boolean;
  lg?: number | 'auto' | boolean;
  xl?: number | 'auto' | boolean;
}

export const Grid: React.FC<CompatibleGridProps> = ({ 
  children,
  container,
  item,
  xs,
  sm,
  md,
  lg,
  xl,
  ...props 
}) => {
  if (container) {
    return (
      <MuiGrid container {...props}>
        {children}
      </MuiGrid>
    );
  }
  
  if (item) {
    return (
      // @ts-ignore - MUI Grid item props compatibility
      <MuiGrid 
        {...props}
        size={{ xs, sm, md, lg, xl }}
      >
        {children}
      </MuiGrid>
    );
  }
  
  // 默认行为
  return (
    <MuiGrid {...props}>
      {children}
    </MuiGrid>
  );
};

// 导出默认组件
export default Grid;

/**
 * 使用示例:
 * 
 * // 方式1: 使用新组件 (推荐)
 * <GridContainer spacing={3}>
 *   <GridItem xs={12} md={6}>
 *     <Card>内容1</Card>
 *   </GridItem>
 *   <GridItem xs={12} md={6}>
 *     <Card>内容2</Card>
 *   </GridItem>
 * </GridContainer>
 * 
 * // 方式2: 使用兼容组件 (快速迁移)
 * <Grid container spacing={3}>
 *   <Grid item xs={12} md={6}>
 *     <Card>内容1</Card>
 *   </Grid>
 *   <Grid item xs={12} md={6}>
 *     <Card>内容2</Card>
 *   </Grid>
 * </Grid>
 */

