import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHomeContent, HOME_CONTENT_LIMITS } from './useHomeContent';
import { newsApi } from '@/api/news';
import { resourceApi } from '@/api/resource';
import { courseApi } from '@/api/course';

vi.mock('@/api/news');
vi.mock('@/api/resource');
vi.mock('@/api/course');

const mockedNews = vi.mocked(newsApi);
const mockedResource = vi.mocked(resourceApi);
const mockedCourse = vi.mocked(courseApi);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useHomeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按约定条数与排序请求四个列表', async () => {
    mockedNews.list.mockResolvedValue({ total: 10, items: [] });
    mockedResource.list.mockResolvedValue({ total: 20, items: [] });
    mockedCourse.list.mockResolvedValue({ total: 30, items: [] });

    const { result } = renderHook(() => useHomeContent(), { wrapper });

    await waitFor(() => expect(result.current.courses.isLoading).toBe(false));

    expect(mockedNews.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: HOME_CONTENT_LIMITS.featuredNews, featured: 'true' }),
    );
    expect(mockedNews.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: HOME_CONTENT_LIMITS.latestNews }),
    );
    expect(mockedResource.list).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'downloadCount', order: 'DESC' }),
    );
  });

  it('透出各列表的 total 供数据看板使用', async () => {
    mockedNews.list.mockImplementation(async (query = {}) =>
      (query as { featured?: string }).featured === 'true' ? { total: 3, items: [] } : { total: 42, items: [] },
    );
    mockedResource.list.mockResolvedValue({ total: 64, items: [] });
    mockedCourse.list.mockResolvedValue({ total: 12, items: [] });

    const { result } = renderHook(() => useHomeContent(), { wrapper });

    await waitFor(() => expect(result.current.courses.data).toBeDefined());

    expect(result.current.latestNews.data?.total).toBe(42);
    expect(result.current.resources.data?.total).toBe(64);
    expect(result.current.courses.data?.total).toBe(12);
  });

  it('某个查询失败只影响自己，其余仍是成功态', async () => {
    mockedNews.list.mockResolvedValue({ total: 5, items: [] });
    mockedResource.list.mockRejectedValue(new Error('资源接口挂了'));
    mockedCourse.list.mockResolvedValue({ total: 7, items: [] });

    const { result } = renderHook(() => useHomeContent(), { wrapper });

    await waitFor(() => expect(result.current.resources.isError).toBe(true));

    expect(result.current.courses.isError).toBe(false);
    expect(result.current.courses.data?.total).toBe(7);
    expect(result.current.latestNews.isError).toBe(false);
    expect(result.current.latestNews.data?.total).toBe(5);
  });

  it('total 为 0 时仍透出 0，而不是 undefined', async () => {
    mockedNews.list.mockResolvedValue({ total: 0, items: [] });
    mockedResource.list.mockResolvedValue({ total: 0, items: [] });
    mockedCourse.list.mockResolvedValue({ total: 0, items: [] });

    const { result } = renderHook(() => useHomeContent(), { wrapper });

    await waitFor(() => expect(result.current.courses.data).toBeDefined());

    expect(result.current.courses.data?.total).toBe(0);
    expect(result.current.resources.data?.total).toBe(0);
  });
});
