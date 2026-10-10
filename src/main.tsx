import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { AuthProvider } from '@/contexts/AuthContext';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import { ApiError } from '@/lib/http';
import '@/styles/index.css';

/**
 * 全局查询缓存。
 * - 4xx 不重试：这类错误重试多少次结果都一样，只会拖慢报错。
 * - 关闭窗口聚焦重取：社区类站点以浏览为主，切回标签页就刷新反而干扰阅读。
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到挂载节点 #root，请检查 index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SiteConfigProvider>
              <App />
            </SiteConfigProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
