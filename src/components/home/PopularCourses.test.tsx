import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { PopularCourses } from './PopularCourses';
import type { CourseListItem } from '@/types/content';

function makeCourse(id: string, title: string): CourseListItem {
  return {
    id,
    title,
    coverImage: null,
    level: 'beginner',
    direction: 'RISC-V 基础',
    instructor: '张老师',
    duration: '10 天 · 约 20 学时',
    description: `简介 ${title}`,
  };
}

function renderSection(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PopularCourses', () => {
  it('加载中渲染卡片骨架', () => {
    renderSection(<PopularCourses items={undefined} isLoading isError={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status', { name: '正在加载' })).toBeInTheDocument();
  });

  it('失败时渲染降级块并透出重试回调', () => {
    const onRetry = vi.fn();
    renderSection(<PopularCourses items={undefined} isLoading={false} isError onRetry={onRetry} />);

    screen.getByRole('button', { name: /重试/ }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('条目为空时整块不渲染', () => {
    const { container } = renderSection(
      <PopularCourses items={[]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('渲染课程标题并链接到详情页', () => {
    renderSection(
      <PopularCourses
        items={[makeCourse('c1', '指令集入门'), makeCourse('c2', '编译器实战')]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /指令集入门/ })).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('link', { name: /编译器实战/ })).toHaveAttribute('href', '/courses/c2');
  });

  it('提供「全部课程」入口', () => {
    renderSection(
      <PopularCourses items={[makeCourse('c1', 'A')]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: /全部课程/ })).toHaveAttribute('href', '/courses');
  });

  it('渲染难度等级的中文标签', () => {
    renderSection(
      <PopularCourses items={[makeCourse('c1', '入门课')]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText('入门')).toBeInTheDocument();
  });
});
