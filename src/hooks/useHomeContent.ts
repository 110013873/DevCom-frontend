import { useQuery } from '@tanstack/react-query';
import { newsApi } from '@/api/news';
import { resourceApi } from '@/api/resource';
import { courseApi } from '@/api/course';
import { queryKeys } from '@/lib/queryKeys';
import type { Page } from '@/types/common';
import type { CourseListItem, NewsListItem, ResourceListItem } from '@/types/content';

/** 首页各区块的条数。集中定义，使钩子与测试不会各写一份而漂移。 */
export const HOME_CONTENT_LIMITS = {
  featuredNews: 3,
  latestNews: 6,
  resources: 4,
  courses: 4,
} as const;

/** 单个区块的查询结果。只暴露区块渲染真正需要的四样。 */
export interface HomeContentQuery<T> {
  data: Page<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export interface HomeContent {
  featuredNews: HomeContentQuery<NewsListItem>;
  latestNews: HomeContentQuery<NewsListItem>;
  resources: HomeContentQuery<ResourceListItem>;
  courses: HomeContentQuery<CourseListItem>;
}

/**
 * 首页内容。
 *
 * 四个列表查询各取所需，**刻意不做 `Promise.all` 式的合并** —— 首页的价值在于
 * 「有几块看几块」，任一侧失败拖垮整块是错的。
 *
 * 数据看板复用这里的响应里的 `total`（`Page<T>` 自带），因此不新增统计接口，
 * 数字也与对应的列表页天然一致：同一个查询的同一个字段，不会出现
 * 「看板说 128 条、列表页说 124 条」这种对不上的情况。
 */
export function useHomeContent(): HomeContent {
  /**
   * 精选头条。`featured: 'true'` 是后端约定的「只看置顶」查询串值 ——
   * 类型是字符串而不是布尔，写成 `true` 会被后端忽略并退化成普通列表。
   */
  const featuredNews = useQuery({
    queryKey: queryKeys.news.list({
      pageNumber: 1,
      pageSize: HOME_CONTENT_LIMITS.featuredNews,
      featured: 'true',
    }),
    queryFn: () =>
      newsApi.list({ pageNumber: 1, pageSize: HOME_CONTENT_LIMITS.featuredNews, featured: 'true' }),
  });

  const latestNews = useQuery({
    queryKey: queryKeys.news.list({ pageNumber: 1, pageSize: HOME_CONTENT_LIMITS.latestNews }),
    queryFn: () => newsApi.list({ pageNumber: 1, pageSize: HOME_CONTENT_LIMITS.latestNews }),
  });

  /** 热门资源：按下载量倒序，即「最受欢迎」。 */
  const resources = useQuery({
    queryKey: queryKeys.resources.list({
      pageNumber: 1,
      pageSize: HOME_CONTENT_LIMITS.resources,
      sort: 'downloadCount',
      order: 'DESC',
    }),
    queryFn: () =>
      resourceApi.list({
        pageNumber: 1,
        pageSize: HOME_CONTENT_LIMITS.resources,
        sort: 'downloadCount',
        order: 'DESC',
      }),
  });

  const courses = useQuery({
    queryKey: queryKeys.courses.list({ pageNumber: 1, pageSize: HOME_CONTENT_LIMITS.courses }),
    queryFn: () => courseApi.list({ pageNumber: 1, pageSize: HOME_CONTENT_LIMITS.courses }),
  });

  return {
    featuredNews: {
      data: featuredNews.data,
      isLoading: featuredNews.isLoading,
      isError: featuredNews.isError,
      refetch: () => void featuredNews.refetch(),
    },
    latestNews: {
      data: latestNews.data,
      isLoading: latestNews.isLoading,
      isError: latestNews.isError,
      refetch: () => void latestNews.refetch(),
    },
    resources: {
      data: resources.data,
      isLoading: resources.isLoading,
      isError: resources.isError,
      refetch: () => void resources.refetch(),
    },
    courses: {
      data: courses.data,
      isLoading: courses.isLoading,
      isError: courses.isError,
      refetch: () => void courses.refetch(),
    },
  };
}

export default useHomeContent;
