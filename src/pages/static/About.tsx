import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/common/SEOHead';
import { PageHeader, ProseContainer } from '@/components/common/PageStates';
import { zh } from '@/locales/zh';

/**
 * 关于社区。纯静态内容页 —— 不属于「假数据」范畴，
 * 这里的文字是站点定位说明本身，不随接口变化。
 */
export default function About() {
  return (
    <>
      <SEOHead title={zh.nav.about} description={`${zh.site.name}的定位、宗旨与主要工作。`} canonicalUrl="/about" />
      <PageHeader title={zh.nav.about} description={zh.site.slogan} />

      <ProseContainer>
        <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground">
          <h2>我们是谁</h2>
          <p>
            {zh.site.name}由{zh.site.portalName}发起建设，面向 RISC-V 指令集与人工智能领域的开发者、科研人员与
            产业伙伴，提供资讯、资源、课程与交流协作的一站式入口。
          </p>

          <h2>我们在做什么</h2>
          <ul>
            <li>
              <strong>社区资讯</strong>：实时追踪 TileLang for RISC-V 行业动态、技术趋势等。
            </li>
            <li>
              <strong>资源中心</strong>：提供开发工具、仿真平台、技术文档等，为开发者提供实践平台。
            </li>
            <li>
              <strong>学习中心</strong>：提供从入门到高阶的学习材料、学习路径。
            </li>
            <li>
              <strong>开源协作</strong>：推动社区成员参与开源项目，共享成果与经验。
            </li>
          </ul>

          <h2>参与方式</h2>
          <p>
            注册社区账号后，您可以下载资源、参与讨论、接收社区动态。我们鼓励理性的技术讨论，欢迎
            提交内容线索与资源建议。
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/register">立即加入社区</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guidelines">查看社区公约</Link>
          </Button>
        </div>
      </ProseContainer>
    </>
  );
}
