import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopicAndDirections } from './TopicAndDirections';

function renderSection() {
  return render(
    <MemoryRouter>
      <TopicAndDirections />
    </MemoryRouter>,
  );
}

describe('TopicAndDirections', () => {
  it('渲染区块标题', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: /RISC-V/ })).toBeInTheDocument();
  });

  it('渲染全部六个方向卡片', () => {
    renderSection();

    [
      '指令集与 AI 扩展',
      'AI 编译器与工具链',
      '模型与算子库',
      '芯片设计与 IP 核',
      '开发板与固件',
      '基准测试与性能',
    ].forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('有对应资源分类的方向链到真实的筛选 URL', () => {
    renderSection();

    expect(screen.getByRole('link', { name: /AI 编译器与工具链/ })).toHaveAttribute(
      'href',
      '/resources?category=toolchain',
    );
    expect(screen.getByRole('link', { name: /模型与算子库/ })).toHaveAttribute(
      'href',
      '/resources?category=library',
    );
    expect(screen.getByRole('link', { name: /开发板与固件/ })).toHaveAttribute(
      'href',
      '/resources?category=board',
    );
    expect(screen.getByRole('link', { name: /基准测试与性能/ })).toHaveAttribute(
      'href',
      '/resources?category=benchmark',
    );
  });

  it('无对应分类的方向不可点，不给死链', () => {
    renderSection();

    expect(screen.queryByRole('link', { name: /指令集与 AI 扩展/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /芯片设计与 IP 核/ })).not.toBeInTheDocument();
  });

  it('带链接的方向显示「查看相关资源」提示，无链接的不显示', () => {
    renderSection();

    // 四个有分类的方向各有一处提示
    expect(screen.getAllByText('查看相关资源').length).toBe(4);
  });

  it('静态板块不出现「暂无」这类空态文案', () => {
    renderSection();

    expect(screen.queryByText(/暂无/)).not.toBeInTheDocument();
  });
});
