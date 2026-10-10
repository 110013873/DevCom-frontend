import { useQuery } from '@tanstack/react-query';
import SEOHead from '@/components/common/SEOHead';
import { AnnouncementBar } from '@/components/home/AnnouncementBar';
import { HomeHero } from '@/components/home/HomeHero';
import { FeaturedNews } from '@/components/home/FeaturedNews';
import { LatestNews } from '@/components/home/LatestNews';
import { LatestResources } from '@/components/home/LatestResources';
import { PopularCourses } from '@/components/home/PopularCourses';
import { TopicAndDirections } from '@/components/home/TopicAndDirections';
import { JoinCta } from '@/components/home/JoinCta';
import { homeApi } from '@/api/home';
import { useHomeContent } from '@/hooks/useHomeContent';
import { queryKeys } from '@/lib/queryKeys';
import { zh } from '@/locales/zh';

/**
 * 首页。
 *
 * 结构：公告条 → 深色首屏 → 精选头条 → 最新动态 → 热门资源 → 精品课程 →
 * 主题与方向 → 生态合作收尾。相邻区块的底色刻意交替（白 / 微底），用色差分区
 * 而不是分割线 —— 改区块顺序时要同步核对底色，否则会出现两块同色连在一起而
 * 失去分区感。
 *
 * 内容来源分两类，两者不可混淆：
 * 1. **真实内容** —— 新闻、资源、课程全部来自现有公开接口；
 * 2. **静态说明** —— 首屏、技术方向、生态合作是产品说明文案，不含任何统计口径。
 *
 * 曾经的「社区规模」数据看板已按要求移除（2026-10-10），组件
 * `components/home/CommunityStats.tsx` 一并删除。移除后 `latestNews` 等查询的
 * `total` 不再有人消费 —— 那是 `Page<T>` 响应自带的字段，不额外产生请求，
 * 因此无需为它做任何清理。
 *
 * **失败隔离**：四个列表查询各自独立降级，某一块接口挂了只影响自己。全页不铺
 * 整页加载态，也不做「任一请求失败就整页报错」的合并。
 *
 * 首页不再调用 `/v1/home/slots`（运营推荐位）。推荐位改为按最新 / 下载量自动
 * 排序；后台的推荐位配置与后台页面保留不变。
 */
export default function Home() {
  const { featuredNews, latestNews, resources, courses } = useHomeContent();

  const announcementsQuery = useQuery({
    queryKey: queryKeys.home.announcements(),
    queryFn: () => homeApi.announcements(),
  });

  return (
    <>
      <SEOHead
        title="首页"
        description={zh.site.slogan}
        canonicalUrl="/"
        keywords="RISC-V, AI, 开发者社区, 开源, 芯片, 工具链"
      />

      <AnnouncementBar items={announcementsQuery.data?.items ?? []} />

      <HomeHero />

      <FeaturedNews
        items={featuredNews.data?.items}
        isLoading={featuredNews.isLoading}
        isError={featuredNews.isError}
        onRetry={featuredNews.refetch}
      />

      <LatestNews
        items={latestNews.data?.items}
        isLoading={latestNews.isLoading}
        isError={latestNews.isError}
        onRetry={latestNews.refetch}
      />

      <LatestResources
        items={resources.data?.items}
        isLoading={resources.isLoading}
        isError={resources.isError}
        onRetry={resources.refetch}
      />

      <PopularCourses
        items={courses.data?.items}
        isLoading={courses.isLoading}
        isError={courses.isError}
        onRetry={courses.refetch}
      />

      <TopicAndDirections />

      <JoinCta />
    </>
  );
}
