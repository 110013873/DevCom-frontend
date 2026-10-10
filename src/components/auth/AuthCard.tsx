import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 玻璃卡的公用外观。三个认证页共用，也供登录页收紧内边距时复用。 */
const GLASS_CARD =
  'auth-glass relative rounded-[1.25rem] border border-white/20 bg-[hsl(229,84%,14%,0.55)] shadow-[var(--shadow-elevated)] backdrop-blur-xl';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** 卡片底部的切换链接（去注册 / 去登录） */
  footer?: ReactNode;
  className?: string;
}

/**
 * 登录/注册/找回三个页面共用的表单卡片。
 *
 * 深色玻璃卡：压在 `AuthSplitLayout` 的整屏背景图之上，所以底色是深蓝半透明
 * （55% 不透明）而不是实心白 —— 实心会挡掉背后的图，而浅色半透明又压不住白色
 * 标题字。深蓝玻璃让白字读得清，背景图也仍然透得出来。
 *
 * 卡内所有文字与字段控件都转白，由 `.auth-glass` 承担（见 `styles/index.css`）：
 * shadcn 的 label / input / 占位符默认都是「白底深字」，直接放到深色玻璃上不可读。
 *
 * 注意底色用的是**任意值** `bg-[hsl(...)]`，不是 `bg-white/82` 这类带斜杠的写法 ——
 * Tailwind 默认透明度刻度里没有 82 这个值，`bg-white/82` 会编译成空规则，
 * 卡片就没有背景了。要非刻度内的透明度，用任意值最稳。
 */
export function AuthCard({ title, subtitle, children, footer, className }: AuthCardProps) {
  return (
    <div className={cn(GLASS_CARD, 'p-6 md:p-8', className)}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="hero-surface-muted mt-1.5 text-sm leading-relaxed">{subtitle}</p>}
      </div>

      {children}

      {footer && (
        <div className="mt-5 border-t border-white/15 pt-4 text-center text-sm text-white/75">{footer}</div>
      )}
    </div>
  );
}

export { GLASS_CARD };

/** 表单里的错误提示条。服务端返回的中文文案直接展示。 */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function AuthFooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-white underline-offset-4 transition-colors hover:text-white hover:underline">
      {children}
    </Link>
  );
}
