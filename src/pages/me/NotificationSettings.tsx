import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Button } from '@/components/ui/button';
import { notificationApi } from '@/api/notification';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { NOTIFICATION_CATEGORY_LABELS, type NotificationPreferences } from '@/types/content';
import { cn } from '@/lib/utils';

/**
 * 可单独开关的消息类别。
 *
 * 后端把 `categories` 存成自由的 `jsonb`（`Record<string, unknown>`），**没有**
 * 枚举约束，所以这份清单是前后端约定的产品口径：类别名取自 `Notification.type`
 * 的取值（见 `NotificationEntity` 注释：comment / reply / system / audit）。
 * 新增消息源时两边都要有这一项，否则用户看不到对应的开关。
 *
 * `system`（系统通知）不列入 —— 它承载账号安全与审核结果，属于必须送达的
 * 站内消息，不该给出关闭入口。
 */
const TOGGLEABLE_CATEGORIES = ['news', 'comment', 'resource', 'course', 'subscription'];

/** 缺省视为「开启」：后端没存过该项时，用户期望的是收到消息。 */
function isCategoryOn(preferences: NotificationPreferences, key: string): boolean {
  return preferences.categories[key] !== false;
}

/**
 * 消息设置。
 *
 * 这里只有**邮件**开关是真实生效的：站内消息（`/v1/notifications`）不受偏好
 * 影响，后端 `emailEnabled` 的注释已明确写了这一点，页面文案据此如实说明，
 * 不能让用户以为关掉开关就连站内消息也收不到。
 *
 * 保存是显式的：改开关只更新本地态，点保存才提交 —— 每拨一下开关发一个请求，
 * 在弱网下会出现开关自己弹回去的错觉。
 */
export default function NotificationSettings() {
  const queryClient = useQueryClient();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const preferenceQuery = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => notificationApi.preferences(),
  });

  // 拉回服务端值后回填本地态；后续的用户改动不再被覆盖。
  useEffect(() => {
    const data = preferenceQuery.data;
    if (!data) {
      return;
    }
    setEmailEnabled(data.emailEnabled);
    setCategories(
      Object.fromEntries(TOGGLEABLE_CATEGORIES.map(key => [key, isCategoryOn(data, key)])),
    );
  }, [preferenceQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => notificationApi.updatePreferences({ emailEnabled, categories }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences });
    },
  });

  const save = async () => {
    setError(null);
    setNotice(null);
    try {
      await saveMutation.mutateAsync();
      setNotice('设置已保存');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    }
  };

  if (preferenceQuery.isLoading) {
    return <LoadingBlock label="正在加载消息设置..." />;
  }

  if (preferenceQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6 md:py-12">
        <ErrorState message="设置加载失败，请稍后重试" onRetry={() => void preferenceQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6 md:py-12">
      <section className="rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Mail className="h-4 w-4 text-muted-foreground" />
          邮件通知
        </h2>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[hsl(var(--primary))]"
            checked={emailEnabled}
            onChange={event => setEmailEnabled(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-foreground">接收邮件通知</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              开启后，你勾选的类别会额外发送一份到注册邮箱。
            </span>
          </span>
        </label>

        <p className="mt-4 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          站内消息不受此开关影响 —— 即使关闭邮件，社区内的消息中心仍会照常收到通知。
        </p>
      </section>

      <section className="mt-6 rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
        <h2 className="text-base font-semibold text-foreground">消息类别</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          取消勾选的类别不再发送邮件；单击某个类别即可切换。
        </p>

        <ul className="mt-5 space-y-1">
          {TOGGLEABLE_CATEGORIES.map(key => {
            const on = categories[key] ?? true;
            const label = NOTIFICATION_CATEGORY_LABELS[key] ?? key;

            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={!emailEnabled}
                  onClick={() => setCategories(prev => ({ ...prev, [key]: !on }))}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                    emailEnabled
                      ? 'border-border hover:border-primary/40 hover:bg-surface-elevated'
                      : 'border-border/60 opacity-50',
                  )}
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      on && emailEnabled ? 'bg-primary/10 text-primary' : 'bg-surface-elevated text-muted-foreground',
                    )}
                  >
                    {on && emailEnabled ? '已开启' : '已关闭'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {!emailEnabled && (
          <p className="mt-4 text-xs text-muted-foreground">先开启上方的邮件通知，类别开关才会生效。</p>
        )}
      </section>

      <div className="mt-6">
        <Button onClick={() => void save()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? '保存中...' : '保存设置'}
        </Button>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && !error && (
          <p role="status" className="mt-3 text-sm text-primary">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
