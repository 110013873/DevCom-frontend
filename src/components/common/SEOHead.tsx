import { Helmet } from 'react-helmet-async';
import { zh } from '@/locales/zh';
import { useOptionalSiteConfig } from '@/contexts/SiteConfigContext';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  keywords?: string;
}

/**
 * 站点根地址取自环境变量，便于 dev/预发/生产用同一份代码。
 * 末尾斜杠先削掉：拼出来的 canonical 多一道 `/` 会被搜索引擎当成另一个地址。
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';

/**
 * 构建期兜底站名。**运行时以后台配置的 `site_brand.name` 为准**，这里只是
 * 配置没到（首屏请求未返回）或不在 Provider 内时的退路。
 */
const FALLBACK_SITE_NAME = (import.meta.env.VITE_SITE_NAME as string | undefined) || zh.site.name;

/**
 * 分享图兜底：站点自带的静态图（由 `scripts/make-brand-assets.mjs` 从 logo.svg 生成）。
 *
 * 仅在后台未配置 Logo、或配置的是 SVG 时使用（见下方 `shareImage`）。
 * 之所以还要留这张，是因为 `og:image` 空着时微信/微博会抓页面里第一张大图当封面，
 * 结果往往是一张不相干的插图或广告位，不如给一张确定的自有品牌图。
 */
const FALLBACK_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * 分享图只认位图。
 *
 * 后台默认把 Logo 指向 `/logo.svg`（页头用它，深蓝底上白图案最清晰），但**微信用
 * 等平台不渲染 SVG 的 og:image** —— 直接下发等于没配，平台会退回去乱抓页面图片。
 * SVG 一律走兜底位图。
 */
function isBitmap(url: string): boolean {
  return !/\.svgz?($|[?#])/i.test(url);
}

/** 配置里填的可能是相对路径（`/static/…`），补上站点根地址才是合法的 og:image。 */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * 页面级 SEO 头。标题统一追加站点名后缀，避免各处手写。
 *
 * 站名与分享图都跟随后台「站点配置」里的品牌信息 —— 运营换了 Logo，社交分享的
 * 封面也要跟着换，否则会出现「页头是新 Logo、微信卡片还是旧图」的错位。
 *
 * canonical 与 og:url 都用绝对地址，未配置 VITE_SITE_URL 时省略而非输出相对路径。
 */
export const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  keywords,
}: SEOHeadProps) => {
  // Provider 可有可无：单测里直接渲染本组件时拿不到配置，逐项回落
  const siteConfig = useOptionalSiteConfig();
  const brand = siteConfig?.brand;

  const siteName = brand?.name ?? FALLBACK_SITE_NAME;
  // 空串是「运营清空了 Logo」的正常取值，与「尚未配置」一样都走兜底图；
  // SVG 也走兜底 —— 平台不渲染 SVG，下发出去等于没配
  const logoUrl = brand?.logoUrl?.trim();
  const shareableLogo = logoUrl && isBitmap(logoUrl) ? absoluteUrl(logoUrl) : null;
  const shareImage = ogImage ?? shareableLogo ?? FALLBACK_OG_IMAGE;

  const fullTitle = `${title} | ${siteName}`;
  const canonical = canonicalUrl ? `${SITE_URL}${canonicalUrl}` : SITE_URL || undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={shareImage} />
      <meta property="og:site_name" content={siteName} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={shareImage} />
    </Helmet>
  );
};

/**
 * 命名导出与默认导出**同时存在**：早期页面用默认导入，后来统一成命名导入，
 * 两种写法在代码里并存。留一个默认导出是让两批调用方都编译得过 ——
 * 少一处 `export default` 会一次性打断 15 个页面。
 */
export default SEOHead;
