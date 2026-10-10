import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import SEOHead from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock, PageHeader } from '@/components/common/PageStates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { userApi } from '@/api/auth';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { formatDate } from '@/lib/datetime';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 开发者公开主页（最小版）。
 *
 * 后端 `GET /v1/users/:id` 只暴露 `id / displayName / avatar / bio / createTime`
 * 五个字段 —— 邮箱、手机号、角色都**不在**这个接口里，这是有意的：公开主页
 * 不该泄漏账号标识与权限信息。因此本页不显示任何"资料完整度"之类的占位，
 * 只如实呈现拿得到的字段。
 *
 * 「发布的资讯/资源」这类列表属于后续阶段（内容还没带 `authorId` 关联到用户），
 * 这里用一句说明代替，不放空列表。
 */
export default function DeveloperProfile() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isSelf = !!user && user.id === id;

  const profileQuery = useQuery({
    queryKey: queryKeys.publicProfile(id),
    queryFn: () => userApi.publicProfile(id),
    enabled: !!id,
    // 用户不存在是常态（旧链接、手改 URL），重试只会拖慢失败反馈
    retry: false,
  });

  if (profileQuery.isLoading) {
    return <LoadingBlock label="正在加载开发者资料..." />;
  }

  if (profileQuery.isError) {
    const notFound = profileQuery.error instanceof ApiError && profileQuery.error.status === 404;
    return (
      <>
        <PageHeader title="开发者主页" description="查看社区成员的公开资料" />
        <div className="mx-auto w-full max-w-[800px] px-4 py-16 md:px-6">
          {notFound ? (
            <ErrorState
              title="未找到该用户"
              message="该账号可能已注销，或链接有误。"
            />
          ) : (
            <ErrorState message="资料加载失败，请稍后重试" onRetry={() => void profileQuery.refetch()} />
          )}
        </div>
      </>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return null;
  }

  return (
    <>
      <SEOHead
        title={`${profile.displayName} 的主页`}
        description={profile.bio || `${profile.displayName} 在 RISC-V AI 开发者社区的个人主页。`}
        canonicalUrl={`/developers/${profile.id}`}
      />

      <PageHeader title="开发者主页" description="社区成员公开资料" />

      <div className="mx-auto w-full max-w-[800px] px-4 py-10 md:px-6 md:py-14">
        <section className="rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.displayName} />}
              <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                {profile.displayName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-foreground">{profile.displayName}</h1>

              {/* `createTime` 是可选的：后端返回，但缺失时不该让整页报错 */}
              {profile.createTime && (
                <p className="mt-1 text-xs text-muted-foreground">
                  加入于 {formatDate(profile.createTime)}
                </p>
              )}

              {isSelf && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/me">编辑我的资料</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-sm font-medium text-foreground">个人简介</h2>
            {profile.bio ? (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                这位开发者还没有填写简介。
              </p>
            )}
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          该成员发布的内容列表将在后续版本开放 —— 目前内容尚未与作者建立关联。
        </p>
      </div>
    </>
  );
}
