import SEOHead from '@/components/common/SEOHead';
import { PageHeader, ProseContainer } from '@/components/common/PageStates';
import { PROSE_CLASS } from '@/components/markdown';

/**
 * 社区公约。静态内容页，与协议/隐私政策区分：
 * 前者是运营规范（后台维护于 LegalDocument），这里是长期不变的参与约定。
 */
export default function Guidelines() {
  return (
    <>
      <SEOHead
        title="社区公约"
        description="RISC-V AI 开发者社区的参与规范：鼓励什么、禁止什么、如何举报。"
        canonicalUrl="/guidelines"
      />
      <PageHeader title="社区公约" description="为了让技术讨论保持有效与友好，请遵守以下约定。" />

      <ProseContainer>
        <div className={PROSE_CLASS}>
          <h2>鼓励</h2>
          <ul>
            <li>提出具体的技术问题，附上复现步骤、环境版本与已尝试的方案。</li>
            <li>分享可复现的经验、踩坑记录与性能数据。</li>
            <li>尊重不同技术路线，就事论事地讨论方案取舍。</li>
            <li>纠错时给出依据，并说明结论适用的边界条件。</li>
          </ul>

          <h2>禁止</h2>
          <ul>
            <li>发布违反法律法规的内容，包括但不限于危害国家安全、宣扬暴力与歧视的信息。</li>
            <li>发布商业广告、引流链接、与主题无关的推广内容。</li>
            <li>人身攻击、恶意嘲讽、骚扰其他成员。</li>
            <li>上传含恶意代码、未授权分发或侵犯他人知识产权的文件。</li>
            <li>批量注册账号、刷量、操纵评分点赞等破坏社区秩序的行为。</li>
          </ul>

          <h2>内容管理</h2>
          <p>
            社区管理团队会对违规内容进行处理，视情节采取内容下架、功能限制直至封禁账号的措施。
            对处理结果有异议，可通过
            <a href="mailto:contact@tlaic.ac.cn"> contact@tlaic.ac.cn </a>
            提出申诉。
          </p>
        </div>
      </ProseContainer>
    </>
  );
}
