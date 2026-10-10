import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { SafeHtml, PROSE_CLASS } from '@/components/markdown';
import { InteractionBar } from '@/components/comment/InteractionBar';
import { CommentSection } from '@/components/comment/CommentSection';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { newsApi } from '@/api/news';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { formatCount } from '@/lib/contentLabels';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import type { NewsDetail as NewsDetailData } from '@/types/content';
import { cn } from '@/lib/utils';

/**
 * 新闻详情。
 *
 * 正文由后端富文本编辑器产出 HTML，经 `SafeHtml` 过滤后渲染 —— 后端的
 * `contentHtml` 是用户/运营可写字段，不能直接 `dangerouslySetInnerHTML`。
 *
 * 阅读计数：进详情页时打一次 `view`。后端按「新闻 + IP」10 分钟限流，
 * 重复调用不会重复计数，所以这里不需要在前端做去重。
 */
export default function NewsDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { newsCategoryLabel } = useSiteConfig();

  const detailQuery = useQuery({
    queryKey: queryKeys.news.detail(id),
    queryFn: () => newsApi.detail(id),
    enabled: Boolean(id),
  });

  const article = detailQuery.data;

  /**
   * 详情页里的点赞/收藏与评论数就地更新，不整页重新拉取 —— 重新拉取会让
   * 正文闪一下，且当后端读缓存时状态可能回退。
   */
  const [interaction, setInteraction] = useState<{
    liked?: boolean;
    favorited?: boolean;
    likeCount?: number;
  }>({});
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    setInteraction({});
    setCommentCount(null);
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    // 计数失败不影响阅读，静默忽略即可 —— 后端限流时也会返回成功。
    void newsApi.markViewed(id).catch(() => undefined);
  }, [id]);

  const relatedQuery = useQuery({
    queryKey: [...queryKeys.news.detail(id), 'related'],
    queryFn: () => newsApi.related(id),
    enabled: Boolean(article),
    staleTime: 5 * 60 * 1000,
  });

  if (detailQuery.isLoading) {
    return <LoadingBlock label="正在加载文章..." />;
  }

  if (detailQuery.isError || !article) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 py-16 md:px-6">
        <ErrorState
          title="文章不存在或已下线"
          message="该文章可能已被删除，或者尚未发布。"
          onRetry={() => void detailQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/news" className="text-sm font-medium text-primary transition-colors hover:text-primary-light">
            返回资讯列表
          </Link>
        </div>
      </div>
    );
  }

  const view: NewsDetailData = {
    ...article,
    liked: interaction.liked ?? article.liked,
    favorited: interaction.favorited ?? article.favorited,
    likeCount: interaction.likeCount ?? article.likeCount,
  };

  return (
    <>
      <SEOHead
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.summary}
        keywords={article.seoKeywords ?? undefined}
        canonicalUrl={`/news/${article.id}`}
        ogImage={article.coverImage ?? undefined}
        ogType="article"
      />

      <article className="mx-auto w-full max-w-[800px] px-4 py-10 md:px-6 md:py-14">
        <Link
          to="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回资讯列表
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {article.isFeatured && <Badge>置顶</Badge>}
            {article.category && <Badge variant="secondary">{newsCategoryLabel(article.category)}</Badge>}
          </div>

          <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
            {article.title}
          </h1>

          {article.subtitle && <p className="mt-3 text-base text-muted-foreground">{article.subtitle}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <time dateTime={article.publishedAt}>{formatDateTime(article.publishedAt)}</time>
            {article.author && <span>{article.author}</span>}
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {formatCount(article.viewCount)}
            </span>
          </div>
        </header>

        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="mt-8 aspect-video w-full rounded-[1.25rem] border border-border object-cover"
          />
        )}

        <div className="mt-8">
          <SafeHtml html={article.contentHtml} className={cn(PROSE_CLASS, 'max-w-none')} />
        </div>

        {article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {article.tags.map(tag => (
              <Link key={tag.id} to={`/news?tag=${tag.id}`}>
                <Badge variant="outline" className="transition-colors hover:border-primary/40 hover:text-foreground">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <Separator className="my-8" />

        <InteractionBar
          targetType="news"
          targetId={article.id}
          liked={view.liked}
          favorited={view.favorited}
          likeCount={view.likeCount}
          commentCount={commentCount ?? article.commentCount}
          onChange={next => setInteraction(prev => ({ ...prev, ...next }))}
        />

        <CommentSection
          targetType="news"
          targetId={article.id}
          onCountChange={delta => setCommentCount(prev => Math.max(0, (prev ?? article.commentCount) + delta))}
        />

        {(relatedQuery.data?.length ?? 0) > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-base font-semibold text-foreground">相关阅读</h2>
            <ul className="mt-4 space-y-4">
              {relatedQuery.data?.map(item => (
                <li key={item.id}>
                  <Link to={`/news/${item.id}`} className="group flex gap-4">
                    {item.coverImage && (
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-20 w-28 shrink-0 rounded-lg border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <time dateTime={item.publishedAt}>{formatDateTime(item.publishedAt)}</time>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {formatCount(item.viewCount)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
