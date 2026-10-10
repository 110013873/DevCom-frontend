import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { formatDate } from '@/lib/datetime';
import type { Announcement } from '@/types/content';

/**
 * 首页公告条。
 *
 * 多条公告时轮播：社区公告往往是「维护窗口」「活动报名」这类时效信息，
 * 一次铺开三行会把首屏压下去，收成一条可切换的横条更合适。
 *
 * 关闭只作用于当次会话 —— 用组件内 state 而不是 localStorage。公告是运营
 * 消息，用户刷新后重新看到是合理的；持久化关闭会让一条「今晚维护」的公告
 * 在关掉后再也触达不到同一个人。
 */
export function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);

  if (dismissed || items.length === 0) {
    return null;
  }

  // 索引可能因数据刷新越界（items 变短），取模兜底而不是直接取值
  const current = items[index % items.length];
  if (!current) {
    return null;
  }

  const hasMore = items.length > 1;

  return (
    <div className="border-b border-primary/15 bg-primary/[0.04]">
      <div className="mx-auto flex max-w-[1280px] items-start gap-3 px-4 py-3 md:px-6">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{current.title}</p>
          {current.content && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{current.content}</p>
          )}
          {current.endAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">有效期至 {formatDate(current.endAt)}</p>
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setIndex(prev => (prev + 1) % items.length)}
            className="shrink-0 whitespace-nowrap rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            {(index % items.length) + 1} / {items.length} 下一条
          </button>
        )}

        <button
          type="button"
          aria-label="关闭公告"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
