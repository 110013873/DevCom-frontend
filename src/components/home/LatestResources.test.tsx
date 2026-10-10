import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { LatestResources } from './LatestResources';
import type { ResourceListItem } from '@/types/content';

function makeResource(id: string, name: string): ResourceListItem {
  return {
    id,
    name,
    summary: `摘要 ${name}`,
    coverImage: null,
    category: 'toolchain',
    author: '平台',
    isRecommended: false,
    isFree: true,
    supportedArch: 'RV64',
    downloadCount: 512,
    ratingAvg: 4.5,
    ratingCount: 8,
    likeCount: 2,
    commentCount: 1,
    liked: false,
    favorited: false,
    tags: [],
  };
}

function renderSection(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LatestResources', () => {
  it('加载中渲染卡片骨架', () => {
    renderSection(<LatestResources items={undefined} isLoading isError={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status', { name: '正在加载' })).toBeInTheDocument();
  });

  it('失败时渲染降级块并透出重试回调', () => {
    const onRetry = vi.fn();
    renderSection(<LatestResources items={undefined} isLoading={false} isError onRetry={onRetry} />);

    screen.getByRole('button', { name: /重试/ }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('条目为空时整块不渲染', () => {
    const { container } = renderSection(
      <LatestResources items={[]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('渲染资源名并链接到详情页', () => {
    renderSection(
      <LatestResources
        items={[makeResource('r1', 'GCC 工具链'), makeResource('r2', '算子库')]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /GCC 工具链/ })).toHaveAttribute('href', '/resources/r1');
    expect(screen.getByRole('link', { name: /算子库/ })).toHaveAttribute('href', '/resources/r2');
  });

  it('提供「全部资源」入口', () => {
    renderSection(
      <LatestResources items={[makeResource('r1', 'A')]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: /全部资源/ })).toHaveAttribute('href', '/resources');
  });

  it('超长资源名不撑破网格', () => {
    const { container } = renderSection(
      <LatestResources
        items={[makeResource('r1', '超长资源名'.repeat(30))]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(container.querySelector('.line-clamp-1, .line-clamp-2')).not.toBeNull();
  });
});
