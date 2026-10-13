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
      '指令集扩展',
      'AI 编译器与工具链',
      '模型与算子库',
      '仿真平台',
      '开发板与固件',
      '技术文档',
    ].forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('有对应资源分类的方向链到真实的筛选 URL', () => {
    renderSection();

    expect(screen.getByRole('link', { name: /指令集扩展/ })).toHaveAttribute(
      'href',
      '/resources?category=isa-extension',
    );
    expect(screen.getByRole('link', { name: /AI 编译器与工具链/ })).toHaveAttribute(
      'href',
      '/resources?category=compiler-toolchain',
    );
    expect(screen.getByRole('link', { name: /模型与算子库/ })).toHaveAttribute(
      'href',
      '/resources?category=model-operator-library',
    );
    expect(screen.getByRole('link', { name: /仿真平台/ })).toHaveAttribute(
      'href',
      '/resources?category=simulation-platform',
    );
    expect(screen.getByRole('link', { name: /技术文档/ })).toHaveAttribute(
      'href',
      '/resources?category=technical-docs',
    );
  });

  it('无对应分类的方向不可点，不给死链', () => {
    renderSection();

    // 「开发板与固件」在新资源分类词表里没有对应项
    expect(screen.queryByRole('link', { name: /开发板与固件/ })).not.toBeInTheDocument();
  });

  it('带链接的方向显示「查看相关资源」提示，无链接的不显示', () => {
    renderSection();

    // 六个方向里五个有分类，各有一处提示
    expect(screen.getAllByText('查看相关资源').length).toBe(5);
  });

  it('静态板块不出现「暂无」这类空态文案', () => {
    renderSection();

    expect(screen.queryByText(/暂无/)).not.toBeInTheDocument();
  });
});
