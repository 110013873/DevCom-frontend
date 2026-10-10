import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, UserMinus } from 'lucide-react';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { interactionApi } from '@/api/interaction';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/datetime';
import type { MyFollowItem } from '@/types/content';
import { cn } from '@/lib/utils';

/**
 * 关注对象的展示名与图标。
 *
 * `topic` 属于后续阶段，后端此刻只能返回 `label: null`（没有实体可联），
 * 因此文案退回「未知对象」而不是显示空白 —— 空白会让人以为页面坏了。
 */
const TYPE_LABELS: Record<string, string> = {
  user: '开发者',
  topic: '话题',
  tag: '标签',
};

/** 关注对象的前台路径。只有 `user` 在当前阶段有公开主页。 */
function followHref(item: MyFollowItem): string | null {
  return item.targetType === 'user' && item.label ? `/developers/${item.targetId}` : null;
}

/**
 * 我的关注。
 *
 * 与其他「我的」接口不同，`/v1/follows/mine` **返回裸数组且不分页**（后端
 * 硬编码 `take: 200`）。这里不假装有分页器，超出时如实提示，而不是渲染一个
 * 永远只有一页的控件。
 *
 * 关注对象是「主体」不是单条内容，所以取关用 `(targetType, targetId)` 定位，
 * 不用这条 Follow 记录自己的 id。
 */
export default function Follows() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.follows,
    queryFn: () => interactionApi.myFollows(),
  });

  const unfollowMutation = useMutation({
    mutationFn: (item: MyFollowItem) => interactionApi.unfollow(item.targetType, item.targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follows });
    },
  });

  const runUnfollow = async (item: MyFollowItem) => {
    setError(null);
    try {
      await unfollowMutation.mutateAsync(item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '取消关注失败，请稍后重试');
    }
  };

  const items = listQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6 md:py-12">
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {listQuery.isLoading && <LoadingBlock label="正在加载关注..." />}

      {listQuery.isError && <ErrorState message="关注列表加载失败，请稍后重试" onRetry={() => void listQuery.refetch()} />}

      {listQuery.isSuccess && items.length === 0 && (
        <EmptyState title="还没有关注任何人" description="在开发者主页点击关注，之后可以在这里找到对方。" />
      )}

      {items.length > 0 && (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
            {items.map(item => {
              const href = followHref(item);
              const initial = item.label?.slice(0, 1) ?? '?';

              return (
                <li key={item.id} className="flex items-center gap-4 px-4 py-4">
                  {item.targetType === 'user' ? (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">{initial}</AvatarFallback>
                    </Avatar>
                  ) : (
                    // 标签/话题没有头像，用中性方块占位，避免与用户行混在一起。
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs text-muted-foreground">
                      {TYPE_LABELS[item.targetType]?.slice(0, 1) ?? '?'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {TYPE_LABELS[item.targetType] ?? '未知对象'}
                      </span>
                    </div>

                    {href ? (
                      <Link
                        to={href}
                        className="mt-0.5 block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <p className={cn('mt-0.5 truncate text-sm', item.label ? 'text-foreground' : 'text-muted-foreground')}>
                        {item.label ?? '该对象暂不可访问'}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">关注于 {formatDateTime(item.createTime)}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={unfollowMutation.isPending}
                    onClick={() => void runUnfollow(item)}
                  >
                    {unfollowMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="mr-1.5 h-4 w-4" />
                    )}
                    取消关注
                  </Button>
                </li>
              );
            })}
          </ul>

          {items.length >= 200 && (
            <p className="mt-4 text-xs text-muted-foreground">
              关注较多时列表最多展示 200 条，更早的记录暂不在本页显示。
            </p>
          )}
        </>
      )}
    </div>
  );
}
