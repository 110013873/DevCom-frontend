import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileArchive, Github, Loader2, Star } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Markdown } from '@/components/markdown';
import { InteractionBar } from '@/components/comment/InteractionBar';
import { FeedbackSection } from '@/components/resource/FeedbackSection';
import { RatingStars } from '@/components/resource/RatingStars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { resourceApi } from '@/api/resource';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/datetime';
import { formatCount, formatFileSize, formatRating, resourceCategoryLabel } from '@/lib/contentLabels';
import type { DownloadTicket, ResourceVersion } from '@/types/content';

/**
 * 资源详情。
 *
 * 下载是**显式动作**：`resourceApi.download` 会在服务端写下载记录并累加下载量，
 * 所以绝不能放进 `useQuery` 自动触发 —— 那样刷新一次页面就多一条记录。
 * 这里用 `useMutation`，只在用户点「下载」时调用。
 *
 * 未登录点下载先跳登录页并带路径回跳，而不是直接请求拿 401 —— 后者的 toast
 * 一闪而过，用户不知道该怎么办。
 */
export default function ResourceDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { status } = useAuth();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: queryKeys.resources.detail(id),
    queryFn: () => resourceApi.detail(id),
    enabled: Boolean(id),
  });

  const resource = detailQuery.data;

  /** 选中的版本。初始取默认版本，用户切换后以本地选择为准。 */
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<{ liked?: boolean; favorited?: boolean; likeCount?: number }>({});
  const [rating, setRating] = useState<{ myScore: number; ratingAvg: number; ratingCount: number } | null>(null);

  const activeVersion = useMemo<ResourceVersion | null>(() => {
    if (!resource || resource.versions.length === 0) {
      return null;
    }
    const chosen = selectedVersionId ? resource.versions.find(v => v.id === selectedVersionId) : undefined;
    return chosen ?? resource.versions.find(v => v.isDefault) ?? resource.versions[0];
  }, [resource, selectedVersionId]);

  const downloadMutation = useMutation({
    mutationFn: () => resourceApi.download(id, { versionId: activeVersion?.id }),
    onSuccess: (ticket: DownloadTicket) => {
      setDownloadError(null);
      // 后端返回的是 OSS 直链或短时签名地址，交给浏览器即可。
      window.location.assign(ticket.url);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { redirect: `/resources/${id}` } });
        return;
      }
      setDownloadError(err instanceof ApiError ? err.message : '下载失败，请稍后重试');
    },
  });

  const rateMutation = useMutation({
    mutationFn: (score: number) => resourceApi.rate(id, score),
    onSuccess: result => {
      setRating({ myScore: result.score, ratingAvg: result.ratingAvg, ratingCount: result.ratingCount });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { redirect: `/resources/${id}` } });
        return;
      }
      setRateError(err instanceof ApiError ? err.message : '评分失败，请稍后重试');
    },
  });

  const handleDownload = () => {
    setDownloadError(null);
    if (status !== 'authenticated') {
      navigate('/login', { state: { redirect: `/resources/${id}` } });
      return;
    }
    downloadMutation.mutate();
  };

  const handleRate = (score: number) => {
    if (status !== 'authenticated') {
      navigate('/login', { state: { redirect: `/resources/${id}` } });
      return;
    }
    setRateError(null);
    rateMutation.mutate(score);
  };

  if (detailQuery.isLoading) {
    return <LoadingBlock label="正在加载资源..." />;
  }

  if (detailQuery.isError || !resource) {
    return (
      <div className="mx-auto w-full max-w-[1000px] px-4 py-16 md:px-6">
        <ErrorState
          title="资源不存在或已下线"
          message="该资源可能已被删除，或者尚未公开。"
          onRetry={() => void detailQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/resources" className="text-sm font-medium text-primary transition-colors hover:text-primary-light">
            返回资源中心
          </Link>
        </div>
      </div>
    );
  }

  const view = {
    liked: interaction.liked ?? resource.liked,
    favorited: interaction.favorited ?? resource.favorited,
    likeCount: interaction.likeCount ?? resource.likeCount,
  };

  const myScore = rating?.myScore ?? resource.myScore;
  const ratingAvg = rating?.ratingAvg ?? resource.ratingAvg;
  const ratingCount = rating?.ratingCount ?? resource.ratingCount;

  return (
    <>
      <SEOHead
        title={resource.name}
        description={resource.summary}
        canonicalUrl={`/resources/${resource.id}`}
        ogImage={resource.coverImage ?? undefined}
      />

      <div className="mx-auto w-full max-w-[1000px] px-4 py-10 md:px-6 md:py-14">
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回资源中心
        </Link>

        {/* 概览头 */}
        <header className="mt-6 flex flex-col gap-6 md:flex-row">
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-[1.25rem] border border-border bg-surface-elevated md:h-32 md:w-48">
            {resource.coverImage ? (
              <img
                src={resource.coverImage}
                alt={resource.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {resourceCategoryLabel(resource.category)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{resourceCategoryLabel(resource.category)}</Badge>
              {resource.isFree && <Badge variant="outline">免费</Badge>}
              {resource.supportedArch && <Badge variant="outline">{resource.supportedArch}</Badge>}
            </div>

            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {resource.name}
            </h1>

            {resource.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{resource.summary}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                {formatCount(resource.downloadCount)} 次下载
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                {ratingCount > 0 ? `${formatRating(ratingAvg)} 分（${ratingCount} 人）` : '暂无评分'}
              </span>
              {resource.author && <span>发布者：{resource.author}</span>}
            </div>
          </div>
        </header>

        {/* 版本与下载 */}
        <section className="mt-8 rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">下载</h2>
              {activeVersion ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  当前版本：<span className="font-medium text-foreground">{activeVersion.version}</span>
                  {activeVersion.name ? ` · ${activeVersion.name}` : ''}
                  {activeVersion.isDefault ? ' · 默认版本' : ''}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">该资源暂未提供可下载文件。</p>
              )}
            </div>

            <Button onClick={handleDownload} disabled={downloadMutation.isPending || !activeVersion}>
              {downloadMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              下载
            </Button>
          </div>

          {resource.versions.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">切换版本</span>
              {resource.versions.map(version => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => setSelectedVersionId(version.id)}
                  className={
                    activeVersion?.id === version.id
                      ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                      : 'rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
                  }
                >
                  {version.version}
                </button>
              ))}
            </div>
          )}

          {activeVersion && activeVersion.files.length > 0 && (
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {activeVersion.files.map(file => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm text-foreground">{file.fileName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {file.osArch && <span>{file.osArch}</span>}
                    <span>{formatFileSize(file.size)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={downloadMutation.isPending || status !== 'authenticated'}
                      onClick={() => {
                        if (status !== 'authenticated') {
                          navigate('/login', { state: { redirect: `/resources/${id}` } });
                          return;
                        }
                        setDownloadError(null);
                        void resourceApi
                          .download(id, { versionId: activeVersion.id, fileId: file.id })
                          .then(ticket => window.location.assign(ticket.url))
                          .catch((err: unknown) => {
                            setDownloadError(err instanceof ApiError ? err.message : '下载失败，请稍后重试');
                          });
                      }}
                    >
                      下载
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(activeVersion?.githubUrl || activeVersion?.giteeUrl) && (
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              {activeVersion?.githubUrl && (
                <a
                  href={activeVersion.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary-light"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {activeVersion?.giteeUrl && (
                <a
                  href={activeVersion.giteeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary transition-colors hover:text-primary-light"
                >
                  Gitee
                </a>
              )}
            </div>
          )}

          {downloadError && <p className="mt-3 text-sm text-destructive">{downloadError}</p>}
        </section>

        {/* 评分 */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="text-sm font-semibold text-foreground">为这个资源评分</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {myScore ? `你已评 ${myScore} 星，可随时修改。` : '你的评分会帮助其他开发者判断是否适用。'}
            </p>
          </div>
          <RatingStars value={myScore} onRate={handleRate} disabled={rateMutation.isPending} />
          {rateError && <p className="mt-2 w-full text-sm text-destructive">{rateError}</p>}
        </section>

        {/* 详细说明 */}
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">概述</TabsTrigger>
            {resource.keyFeatures && <TabsTrigger value="features">核心特性</TabsTrigger>}
            {resource.quickStart && <TabsTrigger value="quickstart">快速开始</TabsTrigger>}
            {resource.systemRequirements && <TabsTrigger value="requirements">环境要求</TabsTrigger>}
            {activeVersion?.changelog && <TabsTrigger value="changelog">更新日志</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {resource.overview ? (
              <Markdown content={resource.overview} />
            ) : (
              <p className="text-sm text-muted-foreground">暂无概述。</p>
            )}
          </TabsContent>

          {resource.keyFeatures && (
            <TabsContent value="features" className="mt-6">
              <Markdown content={resource.keyFeatures} />
            </TabsContent>
          )}

          {resource.quickStart && (
            <TabsContent value="quickstart" className="mt-6">
              <Markdown content={resource.quickStart} />
            </TabsContent>
          )}

          {resource.systemRequirements && (
            <TabsContent value="requirements" className="mt-6">
              <Markdown content={resource.systemRequirements} />
            </TabsContent>
          )}

          {activeVersion?.changelog && (
            <TabsContent value="changelog" className="mt-6">
              <Markdown content={activeVersion.changelog} />
            </TabsContent>
          )}
        </Tabs>

        {resource.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {resource.tags.map(tag => (
              <Link key={tag.id} to={`/resources?tag=${tag.id}`}>
                <Badge variant="outline" className="transition-colors hover:border-primary/40 hover:text-foreground">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <Separator className="my-8" />

        <InteractionBar
          targetType="resource"
          targetId={resource.id}
          liked={view.liked}
          favorited={view.favorited}
          likeCount={view.likeCount}
          commentCount={resource.commentCount}
          onChange={next => setInteraction(prev => ({ ...prev, ...next }))}
        />

        <FeedbackSection resourceId={resource.id} />

        <p className="mt-10 text-xs text-muted-foreground">
          最近更新：{formatDateTime(resource.updateTime)}
        </p>
      </div>
    </>
  );
}
