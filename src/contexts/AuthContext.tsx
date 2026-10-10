import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, userApi } from '@/api/auth';
import { AUTH_EXPIRED_EVENT, TOKEN_STORAGE_KEY, isAuthError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { isAdmin as hasAdminRole, type PublicUser } from '@/types/user';
import type { LoginPayload, RegisterPayload } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<PublicUser>;
  register: (payload: RegisterPayload) => Promise<PublicUser>;
  logout: () => void;
  /** 资料更新后同步内存中的用户对象，避免为改昵称再打一次 /me */
  patchUser: (patch: Partial<PublicUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 全站登录态。持有 token 与用户对象，并提供登录/注册/登出动作。
 * 刷新页面时用本地 token 拉一次 `/v1/users/me` 恢复会话，
 * 令牌失效由 http 拦截器广播事件触发登出（覆盖多标签页与后台过期场景）。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY) ? 'loading' : 'anonymous'
  );
  const [user, setUser] = useState<PublicUser | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setStatus('anonymous');
    queryClient.removeQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  // 首次挂载：有 token 就恢复会话
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      return;
    }
    let cancelled = false;

    userApi
      .me()
      .then(profile => {
        if (cancelled) {
          return;
        }
        setUser(profile);
        setStatus('authenticated');
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        if (!isAuthError(error)) {
          console.error('恢复登录态失败', error);
        }
        clearSession();
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // 任意请求返回 401 时同步登出，避免界面停留在「看着已登录」的假状态
  useEffect(() => {
    const handleExpired = () => clearSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [clearSession]);

  const applyAuthResult = useCallback(
    (result: { token: string; user: PublicUser }) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      setUser(result.user);
      setStatus('authenticated');
      return result.user;
    },
    []
  );

  const login = useCallback(
    async (payload: LoginPayload) => applyAuthResult(await authApi.login(payload)),
    [applyAuthResult]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => applyAuthResult(await authApi.register(payload)),
    [applyAuthResult]
  );

  const patchUser = useCallback((patch: Partial<PublicUser>) => {
    setUser(current => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin: hasAdminRole(user),
      login,
      register,
      logout: clearSession,
      patchUser,
    }),
    [status, user, login, register, clearSession, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
