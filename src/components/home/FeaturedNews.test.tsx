import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeaturedNews } from './FeaturedNews';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import type { NewsListItem } from '@/types/content';

function makeNews(id: string, title: string): NewsListItem {
  return {
    id,
    title,
    subtitle: null,
    summary: `摘要 ${title}`,
    coverImage: null,
    category: 'news',
    author: '编辑部',
    publishedAt: '2026-03-08T09:00:00.000Z',
    viewCount: 120,
    isFeatured: true,
    likeCount: 3,
    commentCount: 1,
    liked: false,
    favorited: false,
    tags: [],
  };
}

/**
 * 必须包 `SiteConfigProvider`：`useSiteConfig()` 在 Provider 之外会**抛异常**
 * （见其实现），而不只是返回兜底值。组件用它取新闻分类名，少了这层 Provider
 * 所有用例都会挂在渲染阶段。
 */
function renderSection(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SiteConfigProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </SiteConfigProvider>
    </QueryClientProvider>,
  );
}

describe('FeaturedNews', () => {
  it('加载中渲染骨架而非空态', () => {
    renderSection(<FeaturedNews items={undefined} isLoading isError={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status', { name: '正在加载' })).toBeInTheDocument();
  });

  it('失败时渲染降级块并透出重试回调', () => {
    const onRetry = vi.fn();
    renderSection(<FeaturedNews items={undefined} isLoading={false} isError onRetry={onRetry} />);

    screen.getByRole('button', { name: /重试/ }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('条目为空数组时整块不渲染', () => {
    const { container } = renderSection(
      <FeaturedNews items={[]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('未加载完且无数据时不渲染，避免空框闪烁', () => {
    const { container } = renderSection(
      <FeaturedNews items={undefined} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('渲染条目标题并链接到详情页', () => {
    renderSection(
      <FeaturedNews
        items={[makeNews('a1', '第一条'), makeNews('a2', '第二条')]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /第一条/ })).toHaveAttribute('href', '/news/a1');
    expect(screen.getByRole('link', { name: /第二条/ })).toHaveAttribute('href', '/news/a2');
  });

  it('只有一条时也正常渲染，不要求凑满', () => {
    renderSection(
      <FeaturedNews items={[makeNews('a1', '唯一一条')]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: /唯一一条/ })).toBeInTheDocument();
  });

  it('超长标题被截断而不是撑破布局', () => {
    const longTitle = '超长标题'.repeat(40);
    const { container } = renderSection(
      <FeaturedNews items={[makeNews('a1', longTitle)]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container.querySelector('.line-clamp-2, .line-clamp-3')).not.toBeNull();
  });
});
