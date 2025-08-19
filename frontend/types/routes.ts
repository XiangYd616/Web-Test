export interface RouteConfig {
  path: string;
  component?: React.ComponentType<any>;
  element?: React.ReactElement;
  children?: RouteConfig[];
  meta?: RouteMeta;
  guards?: RouteGuard[];
}

export interface RouteMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  requiresAuth?: boolean;
  roles?: string[];
  permissions?: string[];
  layout?: string;
  icon?: string;
  hidden?: boolean;
  disabled?: boolean;
  order?: number;
}

export interface RouteGuard {
  name: string;
  handler: (context: RouteGuardContext) => RouteGuardResult | Promise<RouteGuardResult>;
}

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  roles?: string[];
  permissions?: string[];
  public?: boolean;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant: "primary" | "secondary" | "success" | "warning" | "error";
  };
  external?: boolean;
  target?: "_blank" | "_self";
}

export interface RouteGuardContext {
  user: any;
  isAuthenticated: boolean;
  userRoles: string[];
  permissions: string[];
}

export interface RouteTransition {
  enter: string;
  exit: string;
  duration: number;
}

export type RouteChangeHandler = (to: string, from: string) => void | Promise<void>;

export interface RouterState {
  currentPath: string;
  previousPath: string;
  params: Record<string, string>;
  query: Record<string, string>;
  meta: RouteMeta;
  isLoading: boolean;
  error: string | null;
}

export interface RouteGuardResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

export interface RouteError {
  code: number;
  message: string;
  path: string;
  timestamp: string;
}

// 类型不需要默认导出
