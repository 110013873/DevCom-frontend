import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LatestNews } from './LatestNews';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import type { NewsListItem } from '@/types/content';

function makeNews(id: string, title: string, coverImage: string | null = null): NewsListItem {
  return {
    id,
    title,
    subtitle: null,
    summary: `摘要 ${title}`,
    coverImage,
    category: 'news',
    author: '编辑部',
    publishedAt: '2026-03-08T09:00:00.000Z',
    viewCount: 120,
    isFeatured: false,
    likeCount: 3,
    commentCount: 1,
    liked: false,
    favorited: false,
    tags: [],
  };
}

/** 同 `FeaturedNews`：`useSiteConfig()` 在 Provider 之外会抛异常，必须包上。 */
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

describe('LatestNews', () => {
  it('加载中渲染行式骨架', () => {
    renderSection(<LatestNews items={undefined} isLoading isError={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status', { name: '正在加载' })).toBeInTheDocument();
  });

  it('失败时渲染降级块并透出重试回调', () => {
    const onRetry = vi.fn();
    renderSection(<LatestNews items={undefined} isLoading={false} isError onRetry={onRetry} />);

    screen.getByRole('button', { name: /重试/ }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('条目为空时整块不渲染', () => {
    const { container } = renderSection(
      <LatestNews items={[]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('渲染条目并链接到详情页', () => {
    renderSection(
      <LatestNews
        items={[makeNews('n1', '动态一'), makeNews('n2', '动态二')]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /动态一/ })).toHaveAttribute('href', '/news/n1');
    expect(screen.getByRole('link', { name: /动态二/ })).toHaveAttribute('href', '/news/n2');
  });

  it('侧栏与列表一同渲染', () => {
    renderSection(
      <LatestNews items={[makeNews('n1', '动态一')]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText('技术主题')).toBeInTheDocument();
    expect(screen.getByText('快速入口')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /资源中心/ })).toHaveAttribute('href', '/resources');
  });

  it('无封面时不渲染图片元素，也不崩溃', () => {
    const { container } = renderSection(
      <LatestNews items={[makeNews('n1', '无封面', null)]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('publishedAt 为空时显示 - 而不是 Invalid Date', () => {
    const item = { ...makeNews('n1', '缺时间'), publishedAt: null as unknown as string };
    renderSection(<LatestNews items={[item]} isLoading={false} isError={false} onRetry={vi.fn()} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });
});
