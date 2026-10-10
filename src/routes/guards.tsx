import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingFallback from '@/components/common/LoadingFallback';

/** 登录后回跳：保留原路径与查询串，登录页据此跳回 */
function buildRedirect(location: { pathname: string; search: string }): string {
  return `${location.pathname}${location.search}`;
}

/**
 * 需要登录的页面。未登录跳登录页并带上 redirect；
 * 会话恢复中先渲染占位，避免刷新时把已登录用户误判为未登录。
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingFallback />;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ redirect: buildRedirect(location) }} />;
  }

  return <>{children ?? <Outlet />}</>;
}

/**
 * 后台页面。除登录外还要具备管理角色，普通会员访问一律回首页 ——
 * 服务端每个管理接口同样独立校验角色，前端守卫只是体验层，不承担安全职责。
 */
export function RequireAdmin({ children }: { children?: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingFallback />;
  }
  if (status === 'anonymous') {
    return <Navigate to="/admin/login" replace state={{ redirect: buildRedirect(location) }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

/** 路由切换回到顶部。仅在 pathname 变化时触发，避免分页参数变化也强制滚动。 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

/**
 * 前台页面上报访问量。后台路径不计入，避免把运营操作算进内容指标。
 * 目前只打点不发送 —— 上报接口（`/v1/track`）随内容阶段一并开放。
 */
export function PageTracker() {
  const { pathname } = useLocation();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === pathname || pathname.startsWith('/admin')) {
      previous.current = pathname;
      return;
    }
    previous.current = pathname;
  }, [pathname]);

  return null;
}
