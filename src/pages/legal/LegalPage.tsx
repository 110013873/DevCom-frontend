import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { legalApi } from '@/api/auth';
import SEOHead from '@/components/common/SEOHead';
import { ErrorState, PageHeader, ProseContainer } from '@/components/common/PageStates';
import { LoadingBlock } from '@/components/common/PageStates';
import { Markdown, SafeHtml } from '@/components/markdown';
import { queryKeys } from '@/lib/queryKeys';
import { detectContentFormat } from '@/lib/text';
import type { LegalDocumentType } from '@/types/auth';

interface LegalPageProps {
  type: LegalDocumentType;
  title: string;
  description: string;
}

/**
 * 协议 / 隐私政策。
 *
 * 正文由后台以「源文」形式维护（后台提示语：支持 HTML 或 Markdown），两条通道
 * 共用 `contentHtml` 一个字段，字段名并没有记录实际格式 —— 因此这里先推断格式，
 * 再分别交给 `Markdown` 或 `SafeHtml` 渲染。
 *
 * 早前只走 `SafeHtml`（HTML）一条路：当运营粘贴的是 Markdown 时，浏览器按 HTML
 * 规则折叠空白，`\n` 全部失效，整篇文字连成一段。判据见 `detectContentFormat`。
 *
 * 两条通道都做了安全处理：
 * - HTML 侧过 DOMPurify 白名单，防止后台账号失陷后变成前台存储型 XSS；
 * - Markdown 侧由 react-markdown 以 AST 方式渲染，不产生 `dangerouslySetInnerHTML`。
 */
export default function LegalPage({ type, title, description }: LegalPageProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.legal(type),
    queryFn: () => legalApi.get(type),
    staleTime: 5 * 60 * 1000,
  });

  const format = useMemo(() => detectContentFormat(data?.contentHtml), [data?.contentHtml]);

  return (
    <>
      <SEOHead title={title} description={description} />
      <PageHeader title={title} description={description} />

      <ProseContainer>
        {isLoading && <LoadingBlock />}

        {error && (
          <ErrorState
            message="文档加载失败，请稍后重试"
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {data && (
          <>
            <p className="mb-6 text-xs text-muted-foreground">
              版本 {data.version} · 生效日期 {new Date(data.effectiveDate).toLocaleDateString('zh-CN')}
            </p>
            {format === 'html' ? (
              <SafeHtml html={data.contentHtml} />
            ) : (
              <Markdown content={data.contentHtml} />
            )}
          </>
        )}
      </ProseContainer>
    </>
  );
}
