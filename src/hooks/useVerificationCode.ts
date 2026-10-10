import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { ApiError } from '@/lib/http';
import type { SendCodePayload } from '@/types/auth';

const COOLDOWN_SECONDS = 60;

interface UseVerificationCodeOptions {
  /** 从当前表单值里取出 identifier（邮箱或手机号） */
  getIdentifier: () => string;
  channel: SendCodePayload['channel'];
  purpose: SendCodePayload['purpose'];
  /** 服务端返回的中文错误直接透出，这里只决定展示方式 */
  onError: (message: string) => void;
  onSent?: (message: string) => void;
}

/**
 * 验证码发送 + 倒计时。注册与找回密码共用同一套交互。
 * 本地倒计时只是体验（防止连点），真正的频率限制在服务端 —— 两个入口都要带。
 */
export function useVerificationCode({
  getIdentifier,
  channel,
  purpose,
  onError,
  onSent,
}: UseVerificationCodeOptions) {
  const [countdown, setCountdown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    timer.current = window.setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [countdown]);

  // 组件卸载时清掉挂起的定时器，避免在已卸载组件上 setState
  useEffect(() => () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (identifier: string) => authApi.sendCode({ identifier, channel, purpose }),
    onSuccess: () => {
      setCountdown(COOLDOWN_SECONDS);
      onSent?.('验证码已发送，请查收');
    },
    onError: (error: unknown) => {
      onError(error instanceof ApiError ? error.message : '验证码发送失败，请稍后重试');
    },
  });

  const send = useCallback(() => {
    if (countdown > 0) {
      return;
    }
    const identifier = getIdentifier().trim();
    if (!identifier) {
      onError(channel === 'email' ? '请先填写邮箱' : '请先填写手机号');
      return;
    }
    mutation.mutate(identifier);
  }, [channel, countdown, getIdentifier, mutation, onError]);

  return {
    send,
    sending: mutation.isPending,
    countdown,
    disabled: countdown > 0 || mutation.isPending,
  };
}
