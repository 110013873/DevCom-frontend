import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEOHead } from './SEOHead';
import { useOptionalSiteConfig } from '@/contexts/SiteConfigContext';
import type { SiteConfigContextValue } from '@/contexts/SiteConfigContext';

/**
 * 只测分享图（`og:image` / `twitter:image`）的取值 —— 那是本次接配置的改动面，
 * 也是运营最可能配错、出问题又最不容易被本地发现的一处（微信卡片要真分享才看到）。
 *
 * 不套 `SiteConfigProvider`：`useOptionalSiteConfig` 的存在就是为了让本组件能
 * 单独渲染，这里顺带把它当契约测掉。
 */
vi.mock('@/contexts/SiteConfigContext', () => ({
  useOptionalSiteConfig: vi.fn(),
}));

const mockedUseOptionalSiteConfig = vi.mocked(useOptionalSiteConfig);

function makeConfig(logoUrl: string): SiteConfigContextValue {
  return {
    newsCategories: [],
    newsCategoryLabel: () => '',
    brand: { name: '测试社区', shortName: '', slogan: '', logoUrl },
    footer: {},
    isLoading: false,
  };
}

/**
 * 渲染后读 `<meta>` 的 content。
 *
 * **必须 `await`**：react-helmet-async 不直接同步写 head，而是排到一次
 * `requestAnimationFrame` 里再落盘，同步读会稳定拿到 `null`。
 * 这里等的是查询本身而非固定延时，head 一写入就会返回。
 */
async function readMeta(property: string): Promise<string> {
  return await waitFor(() => {
    const value = document.head.querySelector(`meta[${property}]`)?.getAttribute('content') ?? null;
    if (value === null) {
      throw new Error(`head 里还没有 meta[${property}]`);
    }
    return value;
  });
}

function renderSeo(siteConfig: SiteConfigContextValue | null, ogImage?: string) {
  mockedUseOptionalSiteConfig.mockReturnValue(siteConfig);
  return render(
    <HelmetProvider>
      <SEOHead title="首页" description="描述" ogImage={ogImage} />
    </HelmetProvider>,
  );
}

describe('SEOHead 分享图', () => {
  it('配置了 Logo 就用配置的那张', async () => {
    renderSeo(makeConfig('https://cdn.example.com/brand.png'));

    expect(await readMeta('property="og:image"')).toBe('https://cdn.example.com/brand.png');
    expect(await readMeta('name="twitter:image"')).toBe('https://cdn.example.com/brand.png');
  });

  it('相对路径补上站点根地址，否则 og:image 不是合法绝对地址', async () => {
    renderSeo(makeConfig('/static/upload/abc.png'));

    const ogImage = await readMeta('property="og:image"');
    expect(ogImage).toMatch(/\/static\/upload\/abc\.png$/);
    // 有 SITE_URL 时必须是绝对地址；未配置时退化为相对路径也接受
    if (ogImage.startsWith('http')) {
      expect(ogImage).toMatch(/^https?:\/\/.+\/static\/upload\/abc\.png$/);
    }
  });

  it('Logo 留空回落到站点自带图，不留出空 og:image 让平台乱抓', async () => {
    renderSeo(makeConfig(''));

    expect(await readMeta('property="og:image"')).toMatch(/\/og-image\.png$/);
  });

  it('只有空白字符也算没配置', async () => {
    renderSeo(makeConfig('   '));

    expect(await readMeta('property="og:image"')).toMatch(/\/og-image\.png$/);
  });

  /**
   * 后台默认 logoUrl 是 `/logo.svg`（页头深蓝底上用白图案），但微信等平台
   * 不渲染 SVG 的 og:image —— 必须换成位图，否则等于没配。
   */
  it('Logo 是 SVG 时换成位图兜底，不能让平台拿到渲染不了的图', async () => {
    renderSeo(makeConfig('/logo.svg'));

    const ogImage = await readMeta('property="og:image"');
    expect(ogImage).toMatch(/\/og-image\.png$/);
    expect(ogImage).not.toMatch(/\.svg$/);
  });

  it('不在 Provider 内也能渲染（组件单测场景），逐项回落', async () => {
    renderSeo(null);

    expect(await readMeta('property="og:image"')).toMatch(/\/og-image\.png$/);
    expect(await readMeta('property="og:site_name"')).toBeTruthy();
  });

  it('显式传入 ogImage 时优先级最高（单篇新闻的封面）', async () => {
    renderSeo(makeConfig('https://cdn.example.com/brand.png'), 'https://cdn.example.com/news-cover.png');

    expect(await readMeta('property="og:image"')).toBe('https://cdn.example.com/news-cover.png');
  });
});
