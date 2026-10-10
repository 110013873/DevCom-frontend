import SEOHead from '@/components/common/SEOHead';
import { PageHeader, ProseContainer } from '@/components/common/PageStates';
import { zh } from '@/locales/zh';

/**
 * 联系方式。邮箱与官网地址目前取自站点常量 ——
 * 内容阶段（B）接入 `/v1/config` 后改由 `site_footer` 配置驱动，此处即为回退值。
 */
const CONTACT_EMAIL = 'contact@tlaic.ac.cn';

export default function Contact() {
  return (
    <>
      <SEOHead
        title="联系方式"
        description={`${zh.site.name}的联系邮箱与官方网站。`}
        canonicalUrl="/contact"
      />
      <PageHeader title="联系我们" description="内容投稿、资源合作、问题反馈，欢迎通过以下方式联系。" />

      <ProseContainer>
        <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-primary">
          <h2>一般联系</h2>
          <p>
            邮箱：
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <h2>内容与资源</h2>
          <p>新闻线索、资源投稿、课程合作请联系上述邮箱，并注明主题类别，便于我们分派处理。</p>

          <h2>账号与安全</h2>
          <p>账号异常、内容举报或发现安全漏洞，请通过邮箱说明具体情况，我们会尽快核查与回复。</p>

          <h2>官方网站</h2>
          <p>
            发起单位官网：
            <a href={zh.site.portalUrl} target="_blank" rel="noreferrer">
              {zh.site.portalName}
            </a>
          </p>
        </div>
      </ProseContainer>
    </>
  );
}
