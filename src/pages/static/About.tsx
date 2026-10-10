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
              <strong>技术资讯</strong>：跟踪 RISC-V 生态与 AI 软硬件栈的进展，输出面向开发者的实践解读。
            </li>
            <li>
              <strong>资源中心</strong>：沉淀工具链、算子库、固件与示例工程，按版本归档，便于复现与引用。
            </li>
            <li>
              <strong>课程学习</strong>：组织从入门到进阶的学习路径，配套资料与动手实践，降低上手门槛。
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
