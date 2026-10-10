import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { interactionApi } from '@/api/interaction';
import { ApiError } from '@/lib/http';
import { formatCount } from '@/lib/contentLabels';
import { cn } from '@/lib/utils';

interface InteractionBarProps {
  targetType: 'news' | 'resource';
  targetId: string;
  liked: boolean;
  favorited: boolean;
  likeCount: number;
  commentCount: number;
  /** 点赞/收藏状态变化后通知父级回写缓存 */
  onChange: (next: { liked?: boolean; favorited?: boolean; likeCount?: number }) => void;
  className?: string;
}

/**
 * 详情页的点赞 / 收藏 / 评论数条。
 *
 * 未登录时不弹登录框，直接跳登录页并带上当前路径回跳 —— 与路由守卫同一套
 * 回跳约定（`state.redirect`），用户感知一致。
 *
 * 点赞与收藏都是幂等接口，因此不做「先查后写」，直接按当前状态取反调用，
 * 用返回值作为新状态。
 */
export function InteractionBar({
  targetType,
  targetId,
  liked,
  favorited,
  likeCount,
  commentCount,
  onChange,
  className,
}: InteractionBarProps) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<'like' | 'favorite' | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 未登录时把用户送去登录页，登录后回到当前详情页 */
  const requireLogin = (): boolean => {
    if (status === 'authenticated') {
      return false;
    }
    navigate('/login', { replace: false, state: { redirect: window.location.pathname + window.location.search } });
    return true;
  };

  const handleLike = async () => {
    if (requireLogin()) {
      return;
    }
    setError(null);
    setPending('like');
    try {
      const result = liked
        ? await interactionApi.unlike(targetType, targetId)
        : await interactionApi.like(targetType, targetId);
      onChange({
        liked: result.liked,
        // 后端只回布尔，计数在前端就地加减。并发下的偏差由下次拉取纠正。
        likeCount: Math.max(0, likeCount + (result.liked ? 1 : -1)),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请稍后重试');
    } finally {
      setPending(null);
    }
  };

  const handleFavorite = async () => {
    if (requireLogin()) {
      return;
    }
    setError(null);
    setPending('favorite');
    try {
      const result = favorited
        ? await interactionApi.unfavorite(targetType, targetId)
        : await interactionApi.favorite(targetType, targetId);
      onChange({ favorited: result.favorited });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请稍后重试');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Button
        variant={liked ? 'default' : 'outline'}
        size="sm"
        disabled={pending === 'like'}
        aria-pressed={liked}
        onClick={handleLike}
      >
        <Heart className={cn('mr-1.5 h-4 w-4', liked && 'fill-current')} />
        {formatCount(likeCount)}
      </Button>

      <Button
        variant={favorited ? 'default' : 'outline'}
        size="sm"
        disabled={pending === 'favorite'}
        aria-pressed={favorited}
        onClick={handleFavorite}
      >
        <Bookmark className={cn('mr-1.5 h-4 w-4', favorited && 'fill-current')} />
        {favorited ? '已收藏' : '收藏'}
      </Button>

      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        {formatCount(commentCount)}
      </span>

      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
