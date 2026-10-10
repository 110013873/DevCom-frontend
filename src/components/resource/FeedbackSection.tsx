import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { useAuth } from '@/contexts/AuthContext';
import { resourceApi } from '@/api/resource';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/datetime';

const PAGE_SIZE = 10;
const MAX_LENGTH = 1000;

interface FeedbackSectionProps {
  resourceId: string;
}

/**
 * 资源反馈区。
 *
 * 与新闻评论是**两套接口**：资源走 `/v1/resources/:id/feedback`，返回体里
 * 只有正文、点赞数与一个可空的 `userId`，**没有作者昵称** —— 后端这条路径
 * 刻意不联表取用户。因此这里不显示头像，只标「社区成员」。
 *
 * 复用 `CommentSection` 会因缺字段而渲染出空白作者区，所以单独实现。
 */
export function FeedbackSection({ resourceId }: FeedbackSectionProps) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['resource-feedback', resourceId, page],
    queryFn: () => resourceApi.feedback(resourceId, { pageNumber: page, pageSize: PAGE_SIZE }),
  });

  const createMutation = useMutation({
    mutationFn: (text: string) => resourceApi.submitFeedback(resourceId, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resource-feedback', resourceId] });
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text) {
      setError('请输入反馈内容');
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync(text);
      setContent('');
    } catch (err) {
      // 后端对该接口限流 60 秒 10 条，超限返回 429，提示语要说明是频率问题。
      setError(err instanceof ApiError ? err.message : '提交失败，请稍后重试');
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-foreground">
        使用反馈{listQuery.data ? `（${listQuery.data.total}）` : ''}
      </h2>

      {status === 'authenticated' ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <Textarea
            rows={4}
            maxLength={MAX_LENGTH}
            value={content}
            placeholder="分享使用体验、遇到的问题或改进建议…"
            onChange={event => setContent(event.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length} / {MAX_LENGTH}
            </span>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              提交反馈
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary transition-colors hover:text-primary-light">
            登录
          </Link>
          后可提交使用反馈。
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        {listQuery.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">正在加载反馈...</p>}

        {listQuery.isError && <ErrorState message="反馈加载失败" onRetry={() => void listQuery.refetch()} />}

        {listQuery.data && listQuery.data.items.length === 0 && (
          <EmptyState title="还没有反馈" description="用过之后来说说感受吧。" />
        )}

        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <ul className="space-y-4">
              {listQuery.data.items.map(item => (
                <li key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>社区成员</span>
                    <time dateTime={item.createTime}>{formatDateTime(item.createTime)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {item.content}
                  </p>
                </li>
              ))}
            </ul>
            <Pager
              className="mt-6"
              page={page}
              pageSize={PAGE_SIZE}
              total={listQuery.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}
