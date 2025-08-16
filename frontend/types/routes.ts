/**
 * 路由相关的类型定义
 */

export interface RouteConfig        {
  path: string;
  component: string;
  exact?: boolean;
  roles?: string[];
  public?: boolean;
  children?: RouteConfig[];
  meta?: RouteMeta;
}

export interface RouteMeta        {
  title?: string;
  description?: string;
  keywords?: string[];
  requiresAuth?: boolean;
  requiredRoles?: string[];
  breadcrumb?: BreadcrumbItem[];
  layout?: string;
  cache?: boolean;
  preload?: boolean;
}

export interface BreadcrumbItem        {
  label: string;
  path?: string;
  icon?: string;
  active?: boolean;
}

export interface NavigationItem        {
  label: string;
  path?: string;
  icon?: string;
  action?: string;
  roles?: string[];
  public?: boolean;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  external?: boolean;
  target?: '_blank' | '_self';
}

export interface RouteGuardContext        {
  user: any;
  isAuthenticated: boolean;
  userRoles: string[];
  permissions: string[];
}

export interface RouteTransition        {
  enter: string;
  exit: string;
  duration: number;
}

export type RouteChangeHandler    = (to: string;from: string) => void | Promise<void>;
export interface RouterState        {
  currentPath: string;
  previousPath: string;
  params: Record<string, string>;
  query: Record<string, string>;
  meta: RouteMeta;
  isLoading: boolean;
  error: string | null;
}

export interface RouteGuardResult        {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

export default RouteConfig;