import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning, XCircle } from 'lucide-react';
import SEOHead from '@/components/common/SEOHead';
import { PageHeader } from '@/components/common/PageStates';
import { Button } from '@/components/ui/button';
import { subscriptionApi } from '@/api/subscription';
import { ApiError } from '@/lib/http';

type Phase = 'pending' | 'success' | 'failed';

/**
 * 订阅确认页 —— 邮件里确认链接的落点。
 *
 * 这个接口**不是幂等的 GET**（`POST /v1/subscriptions/confirm` 会写状态），
 * 所以绝不能在渲染期调用。这里用 `useRef` 做一次性闸门：React 18 的
 * StrictMode 会在开发环境把 effect 跑两遍，不拦住就会发出两次确认请求。
 *
 * 令牌失效分三种情况（未找到 / 已使用 / 已过期），后端会给不同的文案，
 * 页面直接透出后端的 `message` —— 前端猜不出是哪一种，硬编文案只会误导。
 */
export default function SubscriptionConfirm() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [phase, setPhase] = useState<Phase>('pending');
  const [message, setMessage] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;

    if (!token) {
      setPhase('failed');
      setMessage('确认链接缺少令牌，请重新从邮件中打开。');
      return;
    }

    subscriptionApi
      .confirm(token)
      .then(result => {
        setPhase('success');
        setMessage(`已确认订阅：${result.email}。社区动态将会发送到该邮箱。`);
      })
      .catch((err: unknown) => {
        setPhase('failed');
        setMessage(err instanceof ApiError ? err.message : '确认失败，请稍后重试。');
      });
  }, [token]);

  return (
    <>
      <SEOHead title="确认订阅" description="确认订阅 RISC-V AI 开发者社区的动态推送。" />
      <PageHeader title="确认订阅" description="邮件订阅确认" />

      <div className="mx-auto w-full max-w-[640px] px-4 py-14 md:px-6 md:py-20">
        <div className="rounded-[1.25rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          {phase === 'pending' && (
            <>
              <MailWarning className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">正在确认...</p>
            </>
          )}

          {phase === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
              <h1 className="mt-4 text-lg font-semibold text-foreground">订阅成功</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link to="/">返回首页</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/news">浏览社区资讯</Link>
                </Button>
              </div>
            </>
          )}

          {phase === 'failed' && (
            <>
              <XCircle className="mx-auto h-9 w-9 text-destructive" />
              <h1 className="mt-4 text-lg font-semibold text-foreground">确认失败</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/contact">联系社区</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
