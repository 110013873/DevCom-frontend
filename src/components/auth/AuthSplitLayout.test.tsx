import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthSplitLayout, DEFAULT_PANEL_BULLETS } from './AuthSplitLayout';
import { zh } from '@/locales/zh';

/**
 * 用 `ReactNode` 而非 `React.ReactNode`：本文件是模块（有 import），在
 * `jsx: react-jsx` 下引用 UMD 全局 `React` 会被 tsc 判为错误。
 */
function renderLayout(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AuthSplitLayout', () => {
  it('渲染传入的面板标题与子内容', () => {
    renderLayout(
      <AuthSplitLayout panelTitle="测试标题" panelSubtitle="测试副文案">
        <button type="button">登录</button>
      </AuthSplitLayout>,
    );

    // 标题同时出现在左侧面板与移动端品牌条，因此允许多个匹配
    expect(screen.getAllByText('测试标题').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('未传 panelBullets 时使用默认亮点列表', () => {
    renderLayout(
      <AuthSplitLayout panelTitle="标题">
        <span>content</span>
      </AuthSplitLayout>,
    );

    DEFAULT_PANEL_BULLETS.forEach(bullet => {
      expect(screen.getAllByText(bullet).length).toBeGreaterThan(0);
    });
  });

  it('传入空亮点列表时不渲染任何亮点项', () => {
    renderLayout(
      <AuthSplitLayout panelTitle="标题" panelBullets={[]}>
        <span>content</span>
      </AuthSplitLayout>,
    );

    DEFAULT_PANEL_BULLETS.forEach(bullet => {
      expect(screen.queryByText(bullet)).not.toBeInTheDocument();
    });
  });

  it('渲染传入的自定义亮点而非默认项', () => {
    renderLayout(
      <AuthSplitLayout panelTitle="标题" panelBullets={['自定义亮点甲']}>
        <span>content</span>
      </AuthSplitLayout>,
    );

    expect(screen.getAllByText('自定义亮点甲').length).toBeGreaterThan(0);
    expect(screen.queryByText(DEFAULT_PANEL_BULLETS[0])).not.toBeInTheDocument();
  });

  it('背景图铺满整个视口，而不是只铺左半边', () => {
    const { container } = renderLayout(
      <AuthSplitLayout panelTitle="标题">
        <span>content</span>
      </AuthSplitLayout>,
    );

    const layer = Array.from(container.querySelectorAll<HTMLElement>('[style*="background-image"]')).find(el =>
      el.style.backgroundImage.includes('/bg.jpg'),
    );

    expect(layer).toBeDefined();
    // fixed inset-0：以视口为基准铺满整屏。用 absolute 的话，比视口高的注册表单
    // 会把背景框连同 bg-cover 一起拉长，导致图片被额外放大裁切。
    expect(layer!.className).toContain('fixed');
    expect(layer!.className).toContain('inset-0');
    expect(layer!.className).toContain('bg-cover');
    expect(layer!.className).toContain('bg-center');
  });

  it('背景图层与内容层之间有层级隔离（负 z-index 需要 isolate 才可见）', () => {
    const { container } = renderLayout(
      <AuthSplitLayout panelTitle="标题">
        <span>content</span>
      </AuthSplitLayout>,
    );

    // 没有 isolate 的话，负 z-index 图层会掉到根上下文被容器背景盖住
    expect(container.querySelectorAll('.isolate').length).toBeGreaterThan(0);
  });

  it('图片加载失败时有兜底底色，不会退化成白底白字', () => {
    const { container } = renderLayout(
      <AuthSplitLayout panelTitle="标题">
        <span>content</span>
      </AuthSplitLayout>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-[hsl(229,84%,12%)]');
  });

  it('品牌署名取自站点配置的机构名', () => {
    renderLayout(
      <AuthSplitLayout panelTitle="标题">
        <span>content</span>
      </AuthSplitLayout>,
    );

    expect(screen.getAllByText(zh.site.portalName).length).toBeGreaterThan(0);
  });
});
