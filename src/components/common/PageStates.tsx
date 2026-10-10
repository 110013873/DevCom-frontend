/**
 * 页面级容器与状态占位。统一在 `pages/` 下复用，
 * 避免每个页面各写一套间距与空态文案。
 */
import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 居中窄栏容器。
 *
 * 注释里曾经写的是「登录、注册、协议等」，但三页认证页面已改为左右布局
 * （`AuthSplitLayout`）不再用它。当前的实际使用者是 404 页（`pages/NotFound.tsx`）
 * 以及将来的其他「单块居中内容」页面。
 *
 * 保留而不删除：删掉会直接破坏 404 页面。
 */
export function CenteredPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12', className)}>
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}

/** 长文阅读容器，正文宽度收敛到约 800px（计划 §三） */
export function ProseContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[800px] px-4 py-12 md:px-6 md:py-16', className)}>{children}</div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/60 bg-surface-elevated">
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-elevated/60 px-6 py-16 text-center">
      <Inbox className="mb-4 h-10 w-10 text-muted-foreground/60" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = '加载失败',
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {message && <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

/** 列表页通用的加载骨架 */
export function LoadingBlock({ label = '正在加载...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">{label}</div>
  );
}
