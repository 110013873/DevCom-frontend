import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { configApi } from '@/api/config';
import { queryKeys } from '@/lib/queryKeys';
import { FALLBACK_NEWS_CATEGORIES } from '@/lib/contentLabels';
import type { NewsCategory, SiteBrand, SiteFooterConfig, SiteConfig } from '@/types/config';

export interface SiteConfigContextValue {
  /** 新闻分类词表。**永不为空**：接口未返回或失败时回落到本地兜底词表。 */
  newsCategories: NewsCategory[];
  /** 分类展示名。未知分类原样返回 —— 后端允许自由取值，不能显示成空。 */
  newsCategoryLabel: (category: string | null | undefined) => string;
  brand: SiteBrand;
  footer: SiteFooterConfig;
  /** 配置是否仍在加载。用于「加载完再决定渲染什么」的少数场景，多数页面不需要。 */
  isLoading: boolean;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

/** 品牌兜底：与后端 `DEFAULT_SYSTEM_CONFIGS.site_brand` 对齐，保证首屏不空白。 */
const FALLBACK_BRAND: SiteBrand = {
  name: 'TileLang for RISC-V 社区',
  shortName: 'TileLang AI 社区',
  slogan: '开放协作，共建 TileLang for RISC-V 的开源生态',
  logoUrl: '/logo.svg',
};

const FALLBACK_FOOTER: SiteFooterConfig = { contactEmail: '', icp: '', publicSecurity: '', links: [] };

/** 只接受形状正确的词表；其余一律当「没拿到」处理，回落兜底。 */
function pickCategories(value: SiteConfig['news_categories']): NewsCategory[] {
  if (!Array.isArray(value) || value.length === 0) {
    return FALLBACK_NEWS_CATEGORIES;
  }
  const valid = value.filter(
    item => item && typeof item.value === 'string' && item.value.length > 0 && typeof item.label === 'string',
  );
  return valid.length > 0 ? valid : FALLBACK_NEWS_CATEGORIES;
}

/**
 * 公开运营配置（品牌/页脚/新闻分类词表）。
 *
 * **刻意不做加载门禁**：词表未到达时先用本地兜底渲染，接口回来后自动替换。
 * 若改成「加载完再渲染子树」，整个站点的首屏都要等一个几十毫秒的配置请求，
 * 而它通常只影响侧栏里几个分类按钮 —— 代价与收益不成比例。
 *
 * 放在 `QueryClientProvider` 之内：配置走 React Query 缓存，多个组件同时读
 * 只会发一次请求，且能享受全站的 `staleTime`。
 */
export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const configQuery = useQuery({
    queryKey: queryKeys.siteConfig,
    queryFn: () => configApi.public(),
    // 运营配置变动以天计，取一次就够本会话用；短 staleTime 只会平白多打请求
    staleTime: 30 * 60 * 1000,
  });

  const config = configQuery.data;

  const newsCategories = useMemo(() => pickCategories(config?.news_categories), [config]);

  const value = useMemo<SiteConfigContextValue>(() => {
    // 先把词表拍成 Map，避免每张卡片渲染时都对数组做一次线性查找
    const labelMap = new Map(newsCategories.map(item => [item.value, item.label]));

    return {
      newsCategories,
      newsCategoryLabel: category => {
        if (!category) {
          return '';
        }
        return labelMap.get(category) ?? category;
      },
      brand: { ...FALLBACK_BRAND, ...config?.site_brand },
      footer: { ...FALLBACK_FOOTER, ...config?.site_footer },
      isLoading: configQuery.isLoading,
    };
  }, [newsCategories, config, configQuery.isLoading]);

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfigContextValue {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig 必须在 SiteConfigProvider 内部使用');
  }
  return context;
}

/**
 * 不抛异常的版本，给「Provider 可有可无」的调用方用。
 *
 * 面向的是 `SEOHead` 这类可能被单独渲染的组件：线上它总在 Provider 之内
 * （见 `main.tsx`），但组件单测里没人会给一个纯 SEO 组件套 Provider。
 * 让这种场景直接抛异常，等于逼着每个测试文件都补一层与此无关的包装。
 *
 * 返回 `null` 表示「不在 Provider 内」，调用方自行回落本地默认值 ——
 * 区分于「在 Provider 内但配置为空」，后者拿到的是兜底对象。
 */
export function useOptionalSiteConfig(): SiteConfigContextValue | null {
  return useContext(SiteConfigContext);
}
