import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Space,
  Switch,
  Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminSystemApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { pickConfig } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { isSysAdmin as hasSysAdminRole } from '@/types/user';
import type { NewsCategory } from '@/types/config';
import type {
  FeatureFlagsConfig,
  NewsCategoriesConfig,
  SiteBrandConfig,
  SiteFooterConfig,
  SystemConfigItem,
  SystemConfigKey,
} from '@/types/admin';

const { Title, Text } = Typography;

/** 三个对象型配置键的默认值。库里没有记录时用它们兜底，避免表单初始为空。 */
const DEFAULTS: {
  site_brand: SiteBrandConfig;
  site_footer: SiteFooterConfig;
  feature_flags: FeatureFlagsConfig;
} = {
  site_brand: { name: '', shortName: '', slogan: '', logoUrl: '' },
  site_footer: { contactEmail: '', icp: '', publicSecurity: '', links: [] },
  feature_flags: { allowRegister: true, allowComment: true, allowResourceDownloadWithoutLogin: false },
};

/**
 * 新闻分类词表的兜底。
 *
 * 与后端 `DEFAULT_NEWS_CATEGORIES` 保持一致。后台是**唯一**能改这份词表的地方，
 * 若它在别处被改过而这里落后，运营打开页面会看到一个与实际生效不符的初始值。
 */
const DEFAULT_CATEGORIES: NewsCategoriesConfig = [
  { value: 'industry-news', label: '行业资讯' },
  { value: 'tech-frontier', label: '技术前沿' },
  { value: 'company-news', label: '企业动态' },
  { value: 'academic-research', label: '学术研究' },
  { value: 'product-case', label: '产品案例' },
];

/** 分类入库值的长度上限，与后端 `NEWS_CATEGORY_VALUE_MAX` 一致。 */
const CATEGORY_VALUE_MAX = 40;
/** 分类展示名的长度上限，与后端 `NEWS_CATEGORY_LABEL_MAX` 一致。 */
const CATEGORY_LABEL_MAX = 20;

/**
 * 从库里的 `unknown` 值读出词表。
 *
 * 形状不对时回落到默认词表，而不是抛错或返回空数组 —— 空数组会让运营以为
 * 词表"就是空的"，保存后前台筛选器真的会消失；回落默认至少是可用状态。
 */
function readCategories(value: unknown): NewsCategoriesConfig {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  const valid = value.filter(
    (item): item is NewsCategory =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as NewsCategory).value === 'string' &&
      typeof (item as NewsCategory).label === 'string',
  );
  return valid.length > 0 ? valid : DEFAULT_CATEGORIES;
}

/**
 * 站点配置。品牌、页脚、功能开关各自独立保存：
 * 三个键对应库里三行记录，分开提交才不会把没在本次编辑的键覆盖成空值。
 */
export default function AdminSiteConfig() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSysAdmin = hasSysAdminRole(user);

  const [brandForm] = Form.useForm<SiteBrandConfig>();
  const [footerForm] = Form.useForm<SiteFooterConfig>();
  const [flagsForm] = Form.useForm<FeatureFlagsConfig>();
  /**
   * 词表是数组，用 `Form.List` 编辑时表单的字段名是 `categories`，
   * 而不是直接把数组铺在顶层 —— 表单需要一层具名字段来承载列表本身。
   */
  const [categoriesForm] = Form.useForm<{ categories: NewsCategoriesConfig }>();

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.configs.list(),
    queryFn: () => adminSystemApi.listConfigs(),
  });

  const byKey = useMemo(() => {
    const map = new Map<string, SystemConfigItem>();
    for (const item of data ?? []) {
      map.set(item.key, item);
    }
    return map;
  }, [data]);

  // 数据到位后回填四张表单。只在 data 变化时回填，避免用户正在输入时被覆盖。
  useEffect(() => {
    if (!data) {
      return;
    }
    brandForm.setFieldsValue(pickConfig(byKey.get('site_brand')?.value, DEFAULTS.site_brand));
    footerForm.setFieldsValue(pickConfig(byKey.get('site_footer')?.value, DEFAULTS.site_footer));
    flagsForm.setFieldsValue(pickConfig(byKey.get('feature_flags')?.value, DEFAULTS.feature_flags));

    // 词表是数组，`pickConfig` 那套「按键类型挑字段」的对象逻辑不适用，
    // 因此单独取一次并逐条做形状校验 —— 脏数据直接铺进 Form.List 会让 antd 报错。
    const stored = byKey.get('news_categories')?.value;
    categoriesForm.setFieldsValue({ categories: readCategories(stored) });
  }, [data, byKey, brandForm, footerForm, flagsForm, categoriesForm]);

  const saveMutation = useMutation({
    // `value` 是 `unknown` 而非 `Record<string, unknown>`：新闻分类词表是**数组**，
    // 用对象类型会把唯一一处数组型配置挡在类型检查之外。
    mutationFn: ({ key, value }: { key: SystemConfigKey; value: unknown }) =>
      adminSystemApi.updateConfig(key, value),
    onSuccess: () => {
      message.success('已保存');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.configs.all });
      /**
       * 同时失效**公开**配置缓存。词表/品牌改完要立刻反映到前台，
       * 不然运营会看到"保存成功但页面没变"，进而怀疑保存没生效。
       * 前台那份 `staleTime` 是 30 分钟，不主动失效就得等很久。
       */
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteConfig });
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败'),
  });

  const saveBrand = async () => {
    const values = await brandForm.validateFields();
    // 只提交已知字段，避免表单里混入的额外键写进配置
    await saveMutation.mutateAsync({
      key: 'site_brand',
      value: {
        name: values.name.trim(),
        shortName: values.shortName?.trim() ?? '',
        slogan: values.slogan?.trim() ?? '',
        logoUrl: values.logoUrl?.trim() ?? '',
      },
    });
  };

  const saveFooter = async () => {
    const values = await footerForm.validateFields();
    const links = (values.links ?? [])
      .map(link => ({ label: link?.label?.trim() ?? '', url: link?.url?.trim() ?? '' }))
      .filter(link => link.label && link.url);
    await saveMutation.mutateAsync({
      key: 'site_footer',
      value: {
        contactEmail: values.contactEmail?.trim() ?? '',
        icp: values.icp?.trim() ?? '',
        publicSecurity: values.publicSecurity?.trim() ?? '',
        links,
      },
    });
  };

  const saveFlags = async () => {
    const values = await flagsForm.validateFields();
    await saveMutation.mutateAsync({
      key: 'feature_flags',
      value: {
        allowRegister: Boolean(values.allowRegister),
        allowComment: Boolean(values.allowComment),
        allowResourceDownloadWithoutLogin: Boolean(values.allowResourceDownloadWithoutLogin),
      },
    });
  };

  /**
   * 保存词表。**整份替换**，不是增量修改 —— 后端对数组不做元素级合并。
   *
   * 前端也在这里再查一次重复取值：antd 的 `rules` 无法跨字段比较，
   * 而重复的 `value` 会让前台筛选器出现两个同名按钮且筛选结果相同。
   * 后端 `isNewsCategoryList` 同样会拒（返回 400），这里拦下能给出更明确的提示。
   */
  const saveCategories = async () => {
    const values = await categoriesForm.validateFields();
    const categories = (values.categories ?? []).map(item => ({
      value: item?.value?.trim() ?? '',
      label: item?.label?.trim() ?? '',
    }));

    const seen = new Set<string>();
    for (const item of categories) {
      if (seen.has(item.value)) {
        message.error(`分类取值「${item.value}」重复，请修改后再保存`);
        return;
      }
      seen.add(item.value);
    }

    // 空词表会让前台筛选器整块消失。后端同样拒绝（400），这里先给出可读的提示。
    if (categories.length === 0) {
      message.error('至少保留一个新闻分类');
      return;
    }

    await saveMutation.mutateAsync({ key: 'news_categories', value: categories });
  };

  const lastUpdated = (key: SystemConfigKey) => {
    const item = byKey.get(key);
    return item ? `上次更新：${new Date(item.updateTime).toLocaleString('zh-CN', { hour12: false })}` : '尚未配置';
  };

  const disabled = !isSysAdmin;

  return (
    <>
      <SEOHead title="站点配置" description="社区品牌、页脚与功能开关配置。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              站点配置
            </Title>
            <Text type="secondary">品牌与页脚会直接影响全站展示，保存前请确认文案。</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
        </div>

        {disabled && (
          <Alert
            type="info"
            showIcon
            message="站点配置仅系统管理员可修改。"
            description="你当前可以查看现有配置，但无法保存改动。"
          />
        )}

        <Card title="品牌信息" extra={<Text type="secondary" className="text-xs">{lastUpdated('site_brand')}</Text>}>
          <Form form={brandForm} layout="vertical" disabled={disabled}>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <Form.Item name="name" label="站点全称" rules={[{ required: true, message: '请填写站点全称' }]}>
                <Input maxLength={60} placeholder="TileLang for RISC-V 社区" />
              </Form.Item>
              <Form.Item name="shortName" label="站点简称">
                <Input maxLength={25} placeholder="开发者社区" />
              </Form.Item>
            </div>
            <Form.Item name="slogan" label="标语">
              <Input maxLength={80} placeholder="共建开放指令集与智能计算的开发者家园" />
            </Form.Item>
            <Form.Item
              name="logoUrl"
              label="Logo 地址"
              rules={[{ type: 'url', message: '请填写合法的 URL' }]}
              extra="留空则前台页头不显示 Logo，只显示站点名称。"
            >
              <Input placeholder="https://…/logo.png" />
            </Form.Item>
            <Button type="primary" onClick={() => void saveBrand()} loading={saveMutation.isPending} disabled={disabled}>
              保存品牌信息
            </Button>
          </Form>
        </Card>

        <Card
          title="新闻分类"
          extra={<Text type="secondary" className="text-xs">{lastUpdated('news_categories')}</Text>}
        >
          {/*
            词表同时决定两件事：前台新闻列表能筛什么、后台编辑器能选什么。
            因此这里的顺序就是前台侧栏的展示顺序，拖动即调整。
          */}
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="修改会立即影响前台筛选器与后台新闻编辑器"
            description="删除某个分类不会改动已有新闻 —— 那些新闻仍保留原分类值，只是筛选器里不再有对应按钮，前台会直接显示原始取值。"
          />
          <Form form={categoriesForm} layout="vertical" disabled={disabled}>
            <Form.List name="categories">
              {(fields, { add, remove, move }) => (
                <div className="mb-4">
                  {fields.map((field, index) => (
                    <Space key={field.key} align="baseline" className="mb-2 flex">
                      <Form.Item
                        name={[field.name, 'label']}
                        rules={[
                          { required: true, message: '请填写展示名' },
                          { max: CATEGORY_LABEL_MAX, message: `不超过 ${CATEGORY_LABEL_MAX} 字` },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="展示名，如 社区动态" style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'value']}
                        rules={[
                          { required: true, message: '请填写取值' },
                          { max: CATEGORY_VALUE_MAX, message: `不超过 ${CATEGORY_VALUE_MAX} 字符` },
                          { pattern: /^[A-Za-z0-9_-]+$/, message: '仅限字母、数字、下划线、连字符' },
                        ]}
                        style={{ marginBottom: 0 }}
                        extra={<Text type="secondary" className="text-xs">入库值，前台 URL 会带上它</Text>}
                      >
                        <Input placeholder="取值，如 news" style={{ width: 220 }} />
                      </Form.Item>
                      <Button
                        type="text"
                        icon={<ArrowUpOutlined />}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      />
                      <Button
                        type="text"
                        icon={<ArrowDownOutlined />}
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                      />
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ value: '', label: '' })} block>
                    添加分类
                  </Button>
                </div>
              )}
            </Form.List>
            <Button
              type="primary"
              onClick={() => void saveCategories()}
              loading={saveMutation.isPending}
              disabled={disabled}
            >
              保存新闻分类
            </Button>
          </Form>
        </Card>

        <Card title="页脚信息" extra={<Text type="secondary" className="text-xs">{lastUpdated('site_footer')}</Text>}>
          <Form form={footerForm} layout="vertical" disabled={disabled}>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
              <Form.Item
                name="contactEmail"
                label="联系邮箱"
                rules={[{ type: 'email', message: '请填写合法的邮箱地址' }]}
              >
                <Input placeholder="contact@tlaic.ac.cn" />
              </Form.Item>
              <Form.Item name="icp" label="ICP 备案号">
                <Input maxLength={60} placeholder="京ICP备…号" />
              </Form.Item>
              <Form.Item name="publicSecurity" label="公安备案号">
                <Input maxLength={60} placeholder="京公网安备…号" />
              </Form.Item>
            </div>

            {/* 页脚链接是变长列表，用 Form.List 增删 */}
            <Form.List name="links">
              {(fields, { add, remove }) => (
                <div className="mb-4">
                  <div className="mb-2 text-sm">页脚链接</div>
                  {fields.length === 0 && (
                    <Text type="secondary" className="mb-2 block text-xs">
                      暂无链接。添加后会按顺序展示在页脚。
                    </Text>
                  )}
                  {fields.map(field => (
                    <Space key={field.key} align="baseline" className="mb-2 flex">
                      <Form.Item
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: '请填写名称' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="名称，如 关于我们" style={{ width: 200 }} maxLength={20} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'url']}
                        rules={[{ required: true, message: '请填写链接' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="/about 或 https://…" style={{ width: 320 }} maxLength={200} />
                      </Form.Item>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ label: '', url: '' })} block>
                    添加链接
                  </Button>
                </div>
              )}
            </Form.List>
            <Button type="primary" onClick={() => void saveFooter()} loading={saveMutation.isPending} disabled={disabled}>
              保存页脚信息
            </Button>
          </Form>
        </Card>

        <Card title="功能开关" extra={<Text type="secondary" className="text-xs">{lastUpdated('feature_flags')}</Text>}>
          <Form form={flagsForm} layout="vertical" disabled={disabled}>
            <Form.Item
              name="allowRegister"
              label="开放注册"
              valuePropName="checked"
              extra="关闭后新用户无法注册，已有账号不受影响。"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="allowComment"
              label="开放评论"
              valuePropName="checked"
              extra="关闭后前台隐藏评论入口。"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="allowResourceDownloadWithoutLogin"
              label="允许未登录下载资源"
              valuePropName="checked"
              extra="默认关闭。开启后公开资源无需登录即可下载，但不会产生下载记录。"
            >
              <Switch />
            </Form.Item>
            <Button type="primary" onClick={() => void saveFlags()} loading={saveMutation.isPending} disabled={disabled}>
              保存功能开关
            </Button>
          </Form>
        </Card>
      </div>
    </>
  );
}
