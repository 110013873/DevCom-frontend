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
 * 退订页 —— 邮件底部退订链接的落点。
 *
 * 与确认页同理，`POST /v1/subscriptions/unsubscribe` 会写状态，不能在渲染期
 * 触发；`useRef` 闸门用于挡住 StrictMode 的二次 effect。退订是**即时抑制**，
 * 后端会写入 `suppressed` 状态，后续投递直接跳过。
 *
 * 这里刻意不做「确认退订？」的二次询问 —— 用户点邮件里的退订链接本身就是
 * 明确的意图，再拦一道只会让人误以为退订没生效，之后去点垃圾邮件举报。
 */
export default function SubscriptionUnsubscribe() {
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
      setMessage('退订链接缺少令牌，请重新从邮件中打开。');
      return;
    }

    subscriptionApi
      .unsubscribe(token)
      .then(result => {
        setPhase('success');
        setMessage(`${result.email} 已退订，不会再收到社区推送邮件。`);
      })
      .catch((err: unknown) => {
        setPhase('failed');
        setMessage(err instanceof ApiError ? err.message : '退订失败，请稍后重试。');
      });
  }, [token]);

  return (
    <>
      <SEOHead title="退订" description="退订 RISC-V AI 开发者社区的动态推送邮件。" />
      <PageHeader title="退订" description="邮件订阅退订" />

      <div className="mx-auto w-full max-w-[640px] px-4 py-14 md:px-6 md:py-20">
        <div className="rounded-[1.25rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          {phase === 'pending' && (
            <>
              <MailWarning className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">正在处理...</p>
            </>
          )}

          {phase === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
              <h1 className="mt-4 text-lg font-semibold text-foreground">已退订</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                如果之后想重新订阅，可以在首页底部重新提交邮箱。
              </p>
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link to="/">返回首页</Link>
                </Button>
              </div>
            </>
          )}

          {phase === 'failed' && (
            <>
              <XCircle className="mx-auto h-9 w-9 text-destructive" />
              <h1 className="mt-4 text-lg font-semibold text-foreground">退订失败</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
              <div className="mt-6">
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
