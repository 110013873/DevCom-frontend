import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/common/SEOHead';
import { CenteredPanel } from '@/components/common/PageStates';
import { zh } from '@/locales/zh';

/** 404。`*` 路由兜底，必须落在 CommunityLayout 内以保留页头页脚。 */
export default function NotFound() {
  return (
    <>
      <SEOHead title={zh.common.notFoundTitle} description={zh.common.notFoundDesc} />
      <CenteredPanel>
        <div className="text-center">
          <p className="text-5xl font-semibold tracking-tight text-primary">404</p>
          <h1 className="mt-4 text-xl font-semibold text-foreground">{zh.common.notFoundTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{zh.common.notFoundDesc}</p>
          <Button className="mt-7" asChild>
            <Link to="/">{zh.common.backHome}</Link>
          </Button>
        </div>
      </CenteredPanel>
    </>
  );
}
