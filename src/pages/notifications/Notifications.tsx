import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader, EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationApi } from '@/api/notification';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/datetime';
import { NOTIFICATION_CATEGORY_LABELS, type NotificationItem } from '@/types/content';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

/**
 * 消息里 `linkType` → 前台路径前缀。
 *
 * 后端目前只存 `linkType`/`linkId` 两个字段，尚未统一生成 `url`（不像搜索接口
 * 那样由后端拼好），所以映射表放在前端。第一期还没有任何代码写入
 * `linkType`，这张表是为后续「评论回复」「订阅推送」等消息源预留的；
 * 遇到未知类型时整条消息不做成链接，只展示标题与正文。
 */
const LINK_PREFIX: Record<string, string> = {
  news: '/news',
  resource: '/resources',
  course: '/courses',
};

function notificationHref(item: NotificationItem): string | null {
  if (!item.linkType || !item.linkId) {
    return null;
  }
  const prefix = LINK_PREFIX[item.linkType];
  return prefix ? `${prefix}/${item.linkId}` : null;
}

/**
 * 消息中心。
 *
 * 「只看未读」和页码放 URL（可从顶栏角标直接跳到未读列表）；已读状态的变化
 * 除了失效当前列表，还要失效 `unread-count` —— 顶栏角标读的是那个接口，
 * 不一起失效会看到角标数字不变。
 */
export default function Notifications() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const unreadOnly = params.get('unread') === 'true';
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));

  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list({ unreadOnly, pageNumber: page, pageSize: PAGE_SIZE }),
    queryFn: () => notificationApi.list({ unreadOnly, pageNumber: page, pageSize: PAGE_SIZE }),
  });

  /** 列表与顶栏角标共用一个失效入口：少失效一处，数字就对不上。 */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  });

  const runMarkRead = async (id: string) => {
    setError(null);
    try {
      await markReadMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请稍后重试');
    }
  };

  const runMarkAll = async () => {
    setError(null);
    try {
      await markAllMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请稍后重试');
    }
  };

  /** 点击消息：未读先标已读，再跳转。标记失败不阻断跳转。 */
  const openItem = (item: NotificationItem) => {
    if (!item.readAt) {
      void notificationApi.markRead(item.id).then(invalidate).catch(() => undefined);
    }
    const href = notificationHref(item);
    if (href) {
      navigate(href);
    }
  };

  const setFilter = (nextUnreadOnly: boolean) => {
    const search = new URLSearchParams(params);
    if (nextUnreadOnly) {
      search.set('unread', 'true');
    } else {
      search.delete('unread');
    }
    search.delete('page');
    setParams(search);
  };

  const data = listQuery.data;

  return (
    <>
      <SEOHead title="消息中心" description="查看系统通知、评论回复与订阅推送。" />

      <PageHeader title="消息中心" description="系统通知、互动提醒与订阅推送汇总在此" />

      <div className="mx-auto w-full max-w-[800px] px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter(false)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                !unreadOnly
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setFilter(true)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                unreadOnly
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              未读
              {data && data.unread > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-accent px-1.5 text-[10px] text-white">{data.unread}</span>
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={markAllMutation.isPending || !data || data.unread === 0}
            onClick={() => void runMarkAll()}
          >
            {markAllMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 h-4 w-4" />
            )}
            全部标为已读
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6">
          {listQuery.isLoading && <LoadingBlock label="正在加载消息..." />}

          {listQuery.isError && <ErrorState message="消息加载失败" onRetry={() => void listQuery.refetch()} />}

          {data && data.items.length === 0 && (
            <EmptyState
              title={unreadOnly ? '没有未读消息' : '还没有消息'}
              description={unreadOnly ? '所有消息都已读完。' : '有互动或系统通知时会出现在这里。'}
            />
          )}

          {data && data.items.length > 0 && (
            <>
              <ul className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
                {data.items.map(item => {
                  const href = notificationHref(item);
                  const unread = !item.readAt;
                  return (
                    <li key={item.id} className={cn('px-5 py-4 transition-colors', unread && 'bg-primary/[0.03]')}>
                      <div className="flex items-start gap-3">
                        <Bell
                          className={cn('mt-0.5 h-4 w-4 shrink-0', unread ? 'text-primary' : 'text-muted-foreground/50')}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {NOTIFICATION_CATEGORY_LABELS[item.type] ?? item.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(item.createTime)}</span>
                            {unread && <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" aria-label="未读" />}
                          </div>

                          {href ? (
                            <button
                              type="button"
                              onClick={() => openItem(item)}
                              className="mt-2 block text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                            >
                              {item.title}
                            </button>
                          ) : (
                            <p className="mt-2 text-sm font-medium text-foreground">{item.title}</p>
                          )}

                          {item.body && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                              {item.body}
                            </p>
                          )}

                          {unread && (
                            <button
                              type="button"
                              onClick={() => void runMarkRead(item.id)}
                              disabled={markReadMutation.isPending}
                              className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary-light disabled:opacity-50"
                            >
                              标为已读
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Pager
                className="mt-8"
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onPageChange={next => {
                  const search = new URLSearchParams(params);
                  search.set('page', String(next));
                  setParams(search);
                }}
              />
            </>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          想调整推送方式？前往
          <Link to="/me/notifications" className="mx-1 font-medium text-primary transition-colors hover:text-primary-light">
            通知设置
          </Link>
          。
        </p>
      </div>
    </>
  );
}
