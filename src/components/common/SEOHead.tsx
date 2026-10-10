import { Helmet } from 'react-helmet-async';
import { zh } from '@/locales/zh';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  keywords?: string;
}

/** 站点根地址与默认分享图取自环境变量，便于 dev/预发/生产用同一份代码 */
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
const SITE_NAME = (import.meta.env.VITE_SITE_NAME as string | undefined) || zh.site.name;
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

/**
 * 页面级 SEO 头。标题统一追加站点名后缀，避免各处手写。
 * canonical 与 og:url 都用绝对地址，未配置 VITE_SITE_URL 时省略而非输出相对路径。
 */
export const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  keywords,
}: SEOHeadProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
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
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

/**
 * 命名导出与默认导出**同时存在**：早期页面用默认导入，后来统一成命名导入，
 * 两种写法在代码里并存。留一个默认导出是让两批调用方都编译得过 ——
 * 少一处 `export default` 会一次性打断 15 个页面。
 */
export default SEOHead;
