import AppRoutes from '@/routes/routes';
import { PageTracker, ScrollToTop } from '@/routes/guards';

/** 应用根：全局副作用（滚动复位、访问打点）+ 路由出口 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <PageTracker />
      <AppRoutes />
    </>
  );
}
