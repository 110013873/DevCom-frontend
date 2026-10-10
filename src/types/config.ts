/**
 * 公开运营配置的类型。
 *
 * 每个字段都可选：后端把配置表当稀疏表用，「键不存在」是正常状态而非错误，
 * 消费方必须给出兜底。`SiteConfigContext` 负责把可选字段收敛成有默认值的
 * 只读视图，页面拿到的就不用再判空。
 */

/** 新闻分类条目。`value` 入库，`label` 展示。 */
export interface NewsCategory {
  value: string;
  label: string;
}

/** 站点品牌 */
export interface SiteBrand {
  name?: string;
  shortName?: string;
  slogan?: string;
  logoUrl?: string;
}

/** 页脚 */
export interface SiteFooterConfig {
  contactEmail?: string;
  icp?: string;
  publicSecurity?: string;
  links?: Array<{ label: string; url: string }>;
}

/** `GET /v1/config` 的原始返回 */
export interface SiteConfig {
  site_brand?: SiteBrand;
  site_footer?: SiteFooterConfig;
  news_categories?: NewsCategory[];
}
