import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { useAuth } from '@/contexts/AuthContext';
import { commentApi } from '@/api/comment';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/datetime';
import type { Comment, CreateCommentPayload } from '@/types/content';

const PAGE_SIZE = 10;
const MAX_LENGTH = 1000;

interface CommentSectionProps {
  targetType: 'news' | 'resource';
  targetId: string;
  onCountChange?: (delta: number) => void;
}

/**
 * 评论 / 反馈区。新闻与资源共用，用 `targetType` 区分。
 *
 * 后端把回复拍平成一层放在 `replies` 里，不再递归，所以这里只渲染两层 ——
 * 递归渲染会在数据异常（后端未来放开多层）时无限展开。
 *
 * 回复表单内联展开而不是弹窗：弹窗在移动端会盖住被回复的内容，用户无从对照。
 * 页码留在组件状态而非 URL：详情页的主体是文章，评论翻页进历史记录反而让
 * 后退键离开详情页。
 */
export function CommentSection({ targetType, targetId, onCountChange }: CommentSectionProps) {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: queryKeys.comments.list(targetType, targetId, page),
    queryFn: () => commentApi.list(targetType, targetId, { pageNumber: page, pageSize: PAGE_SIZE }),
  });

  /** 按前缀失效，一次清掉该目标下的全部分页缓存 */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.comments.all(targetType, targetId) });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCommentPayload) => commentApi.create(payload),
    onSuccess: () => {
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => commentApi.remove(id),
    onSuccess: () => {
      invalidate();
    },
  });

  const submit = async (payload: CreateCommentPayload): Promise<boolean> => {
    setError(null);
    try {
      await createMutation.mutateAsync(payload);
      onCountChange?.(1);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '提交失败，请稍后重试');
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text) {
      setError('请输入评论内容');
      return;
    }
    if (await submit({ targetType, targetId, content: text })) {
      setContent('');
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyTo) {
      return;
    }
    const text = replyContent.trim();
    if (!text) {
      setError('请输入回复内容');
      return;
    }
    if (await submit({ targetType, targetId, content: text, parentId: replyTo.id })) {
      setReplyContent('');
      setReplyTo(null);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    try {
      await removeMutation.mutateAsync(id);
      onCountChange?.(-1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败，请稍后重试');
    }
  };

  /** 只有作者本人能删。版主的删除入口在后台，不在前台暴露。 */
  const canRemove = (comment: Comment): boolean => Boolean(user && comment.author && comment.author.id === user.id);

  const renderComment = (comment: Comment, isReply: boolean) => (
    <li key={comment.id} className={isReply ? 'mt-4 border-l-2 border-border pl-4' : ''}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {comment.author?.avatar && <AvatarImage src={comment.author.avatar} alt={comment.author.displayName} />}
          <AvatarFallback className="bg-primary/10 text-xs text-primary">
            {comment.author?.displayName?.slice(0, 1) ?? '匿'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {comment.author ? (
              <Link
                to={`/developers/${comment.author.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {comment.author.displayName}
              </Link>
            ) : (
              <span className="font-medium text-foreground">已注销用户</span>
            )}
            <time dateTime={comment.createTime}>{formatDateTime(comment.createTime)}</time>
            {comment.status === 'pending' && <span className="text-amber-600">审核中</span>}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {comment.content}
          </p>

          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            {!isReply && status === 'authenticated' && (
              <button
                type="button"
                className="transition-colors hover:text-primary"
                onClick={() => {
                  setReplyTo(replyTo?.id === comment.id ? null : comment);
                  setReplyContent('');
                }}
              >
                {replyTo?.id === comment.id ? '取消回复' : '回复'}
              </button>
            )}
            {canRemove(comment) && (
              <button
                type="button"
                className="transition-colors hover:text-destructive"
                disabled={removeMutation.isPending}
                onClick={() => void handleRemove(comment.id)}
              >
                删除
              </button>
            )}
          </div>

          {replyTo?.id === comment.id && (
            <form onSubmit={handleReply} className="mt-3 space-y-2">
              <Textarea
                rows={3}
                maxLength={MAX_LENGTH}
                value={replyContent}
                placeholder={`回复 ${comment.author?.displayName ?? '该用户'}`}
                onChange={event => setReplyContent(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                提交回复
              </Button>
            </form>
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <ul className="mt-2">{comment.replies.map(reply => renderComment(reply, true))}</ul>
      )}
    </li>
  );

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-foreground">
        评论{commentsQuery.data ? `（${commentsQuery.data.total}）` : ''}
      </h2>

      {status === 'authenticated' ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <Textarea
            rows={4}
            maxLength={MAX_LENGTH}
            value={content}
            placeholder="说点什么…"
            onChange={event => setContent(event.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length} / {MAX_LENGTH}
            </span>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              发表评论
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary transition-colors hover:text-primary-light">
            登录
          </Link>
          后即可参与讨论。
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        {commentsQuery.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">正在加载评论...</p>}

        {commentsQuery.isError && <ErrorState message="评论加载失败" onRetry={() => void commentsQuery.refetch()} />}

        {commentsQuery.data && commentsQuery.data.items.length === 0 && (
          <EmptyState title="还没有评论" description="成为第一个发言的人。" />
        )}

        {commentsQuery.data && commentsQuery.data.items.length > 0 && (
          <>
            <ul className="space-y-6">{commentsQuery.data.items.map(item => renderComment(item, false))}</ul>
            <Pager
              className="mt-8"
              page={page}
              pageSize={PAGE_SIZE}
              total={commentsQuery.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}
