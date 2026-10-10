import { useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, type MenuProps } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  ReadOutlined,
  TeamOutlined,
  SettingOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  TagsOutlined,
  NotificationOutlined,
  CommentOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { zh } from '@/locales/zh';

const { Sider, Header, Content } = Layout;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: NavItem[];
}

/**
 * 后台导航。第一期（阶段 A+B）只挂已实现的模块；
 * 论坛/培养/任务/活动等入口随对应阶段落地后再追加，避免出现点进去是空页的菜单项。
 *
 * ⚠️ 这份清单与 `routes/routes.tsx` 的后台子路由必须**同源**：每个 key 都要
 * 有对应路由，否则菜单点进去是空白页。新增模块时两边一起改。
 */
const NAV_ITEMS: NavItem[] = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '运营概览' },
  {
    key: 'content',
    icon: <FileTextOutlined />,
    label: '内容管理',
    children: [
      { key: '/admin/content/news', icon: <FileTextOutlined />, label: '新闻管理' },
      { key: '/admin/content/resources', icon: <AppstoreOutlined />, label: '资源管理' },
      { key: '/admin/content/courses', icon: <ReadOutlined />, label: '课程管理' },
      { key: '/admin/content/tags', icon: <TagsOutlined />, label: '标签管理' },
      { key: '/admin/content/banners', icon: <NotificationOutlined />, label: '公告与推荐位' },
    ],
  },
  { key: '/admin/comments', icon: <CommentOutlined />, label: '评论审核' },
  { key: '/admin/subscriptions', icon: <MailOutlined />, label: '订阅管理' },
  { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
  { key: '/admin/logs', icon: <AuditOutlined />, label: '操作日志' },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/admin/system/legal', icon: <FileTextOutlined />, label: '协议维护' },
      { key: '/admin/system/config', icon: <SettingOutlined />, label: '站点配置' },
    ],
  },
];

type AntdMenuItem = NonNullable<MenuProps['items']>[number];

/**
 * NavItem 与 AntD 的 ItemType 结构一致，差别只在 `children`：
 * NavItem 里它是可选的，而 AntD 要求「有 children 就必须是数组，没有就不能出现该键」。
 * 这里显式分支构造，避免把 `children: undefined` 传下去。
 */
function toMenuItems(items: NavItem[]): AntdMenuItem[] {
  return items.map(({ key, icon, label, children }) =>
    children ? { key, icon, label, children: toMenuItems(children) } : { key, icon, label }
  );
}

/** 找到当前路径对应的菜单项与展开的父级 */
function resolveSelection(pathname: string): { selected: string[]; open: string[] } {
  const flat: Array<{ key: string; parent?: string }> = [];
  NAV_ITEMS.forEach(item => {
    if (item.children) {
      item.children.forEach(child => flat.push({ key: child.key, parent: item.key }));
    } else {
      flat.push({ key: item.key });
    }
  });

  // 取最长前缀匹配，`/admin/content/news/edit/xxx` 命中 `/admin/content/news`
  const matched = flat
    .filter(item => pathname === item.key || pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0];

  return {
    selected: matched ? [matched.key] : [],
    open: matched?.parent ? [matched.parent] : [],
  };
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { selected, open } = resolveSelection(location.pathname);
  const menuItems = useMemo(() => toMenuItems(NAV_ITEMS), []);

  const userMenu: MenuProps['items'] = [
    { key: 'portal', icon: <ArrowLeftOutlined />, label: '返回社区前台' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: zh.nav.logout, danger: true },
  ];

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'portal') {
      navigate('/');
      return;
    }
    if (key === 'logout') {
      logout();
      navigate('/admin/login');
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        breakpoint="lg"
        collapsedWidth={64}
        theme="dark"
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div className="flex h-16 items-center px-5 text-base font-semibold text-white/90">
          社区管理后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          defaultOpenKeys={open}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          className="flex items-center justify-between border-b border-border bg-white px-6"
          style={{ paddingInline: 24, height: 56, lineHeight: '56px' }}
        >
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">
            返回社区前台
          </Link>
          <Dropdown menu={{ items: userMenu, onClick: handleUserMenu }} placement="bottomRight">
            <Button type="text" className="flex items-center gap-2">
              <Avatar size="small" src={user?.avatar ?? undefined} icon={<UserOutlined />} />
              <span className="text-sm">{user?.displayName ?? '未登录'}</span>
            </Button>
          </Dropdown>
        </Header>

        <Content className="bg-surface-elevated p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
