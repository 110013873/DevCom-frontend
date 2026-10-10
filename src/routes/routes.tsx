import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CommunityLayout from '@/components/layout/CommunityLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminThemeProvider from '@/components/layout/AdminThemeProvider';
import LoadingFallback from '@/components/common/LoadingFallback';
import { RequireAdmin, RequireAuth } from '@/routes/guards';

/**
 * 路由表。
 *
 * 约定：
 * - 除首页外全部 `lazy`，首屏只为首页买单。两个懒加载边界：
 *   外层 `Suspense` 覆盖登录/注册等无布局页面；布局内的 `Suspense`（见
 *   `CommunityLayout` / `AdminLayout`）只替换内容区，让页头页脚在切页时不闪。
 * - 前台整棵子树挂在 `CommunityLayout` 下；后台整棵子树挂在
 *   `RequireAdmin` + `AdminThemeProvider` + `AdminLayout` 下。
 * - 未实现的模块**不登记路由**，导航项见 `routes/navigation.ts`，两者保持同源。
 *
 * 路径命名与后端对齐：
 * - 详情页一律用 `:id`（后端主键是 uuid），只有学习页用 `:courseId/:lessonId` 两级，
 *   因为课节 id 脱离课程没有意义。
 * - 邮件里的确认/退订链接落在 `/subscriptions/*`，令牌从查询串读（后端是 POST）。
 */

const Home = lazy(() => import('@/pages/Home'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

const UserAgreement = lazy(() => import('@/pages/legal/UserAgreement'));
const PrivacyPolicy = lazy(() => import('@/pages/legal/PrivacyPolicy'));

const About = lazy(() => import('@/pages/static/About'));
const Guidelines = lazy(() => import('@/pages/static/Guidelines'));
const Contact = lazy(() => import('@/pages/static/Contact'));

const NewsList = lazy(() => import('@/pages/news/NewsList'));
const NewsDetail = lazy(() => import('@/pages/news/NewsDetail'));

const ResourceList = lazy(() => import('@/pages/resource/ResourceList'));
const ResourceDetail = lazy(() => import('@/pages/resource/ResourceDetail'));

const CourseList = lazy(() => import('@/pages/course/CourseList'));
const CourseDetail = lazy(() => import('@/pages/course/CourseDetail'));
const LessonPlayer = lazy(() => import('@/pages/course/LessonPlayer'));

const SearchResult = lazy(() => import('@/pages/search/SearchResult'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));
const DeveloperProfile = lazy(() => import('@/pages/developers/DeveloperProfile'));

const SubscriptionConfirm = lazy(() => import('@/pages/subscriptions/Confirm'));
const SubscriptionUnsubscribe = lazy(() => import('@/pages/subscriptions/Unsubscribe'));

const MeLayout = lazy(() => import('@/pages/me/MeLayout'));
const MeProfile = lazy(() => import('@/pages/me/Profile'));
const MeFavorites = lazy(() => import('@/pages/me/Favorites'));
const MeDownloads = lazy(() => import('@/pages/me/Downloads'));
const MeFollows = lazy(() => import('@/pages/me/Follows'));
const MeNotificationSettings = lazy(() => import('@/pages/me/NotificationSettings'));
const MeChangePassword = lazy(() => import('@/pages/me/ChangePassword'));

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminLogs = lazy(() => import('@/pages/admin/Logs'));
const AdminLegal = lazy(() => import('@/pages/admin/Legal'));
const AdminSiteConfig = lazy(() => import('@/pages/admin/SiteConfig'));

const AdminNews = lazy(() => import('@/pages/admin/content/News'));
const AdminNewsEditor = lazy(() => import('@/pages/admin/content/NewsEditor'));
const AdminTags = lazy(() => import('@/pages/admin/content/Tags'));
const AdminResources = lazy(() => import('@/pages/admin/content/Resources'));
const AdminResourceEditor = lazy(() => import('@/pages/admin/content/ResourceEditor'));
const AdminResourceVersions = lazy(() => import('@/pages/admin/content/ResourceVersions'));
const AdminCourses = lazy(() => import('@/pages/admin/content/Courses'));
const AdminCourseEditor = lazy(() => import('@/pages/admin/content/CourseEditor'));
const AdminBanners = lazy(() => import('@/pages/admin/content/Banners'));
const AdminComments = lazy(() => import('@/pages/admin/content/Comments'));
const AdminSubscriptions = lazy(() => import('@/pages/admin/content/Subscriptions'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ---------- 前台 ---------- */}
        <Route element={<CommunityLayout />}>
          <Route index element={<Home />} />

          <Route path="news" element={<NewsList />} />
          <Route path="news/:id" element={<NewsDetail />} />

          <Route path="resources" element={<ResourceList />} />
          <Route path="resources/:id" element={<ResourceDetail />} />

          <Route path="courses" element={<CourseList />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          {/* 学习页独立于课程详情：它有左侧目录与「标记完成」，壳子完全不同 */}
          <Route path="learn/:courseId/:lessonId" element={<LessonPlayer />} />

          <Route path="search" element={<SearchResult />} />
          <Route path="developers/:id" element={<DeveloperProfile />} />

          <Route path="about" element={<About />} />
          <Route path="guidelines" element={<Guidelines />} />
          <Route path="contact" element={<Contact />} />

          <Route path="user-agreement" element={<UserAgreement />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />

          {/* 邮件链接落点。这两页**不要求登录** —— 收件人可能是从未注册的订阅者 */}
          <Route path="subscriptions/confirm" element={<SubscriptionConfirm />} />
          <Route path="subscriptions/unsubscribe" element={<SubscriptionUnsubscribe />} />

          {/* 登录态专属 */}
          <Route element={<RequireAuth />}>
            {/*
              `/me` 是一个外壳 + 五个子页。外壳（MeLayout）负责页头与标签栏，
              子页只渲染内容区；`index` 对应 `/me` 本身。子页同样懒加载。
            */}
            <Route path="me" element={<MeLayout />}>
              <Route index element={<MeProfile />} />
              <Route path="favorites" element={<MeFavorites />} />
              <Route path="downloads" element={<MeDownloads />} />
              <Route path="follows" element={<MeFollows />} />
              <Route path="notifications" element={<MeNotificationSettings />} />
              <Route path="password" element={<MeChangePassword />} />
            </Route>

            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---------- 认证页：居中卡片，不带页头页脚 ---------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ---------- 后台 ---------- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminThemeProvider>
                <AdminLayout />
              </AdminThemeProvider>
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="content/news" element={<AdminNews />} />
          {/* `:id` 为 `new` 表示新建 —— 编辑器自己判断，不另开一条路由 */}
          <Route path="content/news/edit/:id" element={<AdminNewsEditor />} />
          {/* 旧的两个标签页合并为 `/admin/content/tags`（类别用 Tab 切换），旧路径重定向过去 */}
          <Route path="content/news-tags" element={<Navigate to="/admin/content/tags" replace />} />
          <Route path="content/resource-tags" element={<Navigate to="/admin/content/tags" replace />} />
          <Route path="content/tags" element={<AdminTags />} />
          <Route path="content/resources" element={<AdminResources />} />
          <Route path="content/resources/edit/:id" element={<AdminResourceEditor />} />
          {/* 版本管理独立成页：一个资源可以有多个版本，各自的文件列表展开在版本行下 */}
          <Route path="content/resources/:id/versions" element={<AdminResourceVersions />} />
          <Route path="content/courses" element={<AdminCourses />} />
          {/* 课程是三级结构（课程 → Day → Lesson），Day 与课时的编排都在编辑器内 */}
          <Route path="content/courses/edit/:id" element={<AdminCourseEditor />} />
          {/* 公告与推荐位同页两 Tab：它们服务的是同一个入口（首页首屏） */}
          <Route path="content/banners" element={<AdminBanners />} />
          {/* 评论审核不按 targetType 拆页：审核是「按时间顺序过一遍」的工作 */}
          <Route path="comments" element={<AdminComments />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="system/legal" element={<AdminLegal />} />
          <Route path="system/config" element={<AdminSiteConfig />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
