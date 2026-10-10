import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import SEOHead from '@/components/common/SEOHead';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { adminNewsApi, adminNewsTagApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { NEWS_STATUS_LABELS, type NewsStatus, type UpsertNewsPayload } from '@/types/adminContent';

const { Title, Text } = Typography;

/**
 * 表单内部的字段形状。
 *
 * 与 `UpsertNewsPayload` 有意不同：`publishedAt` 在表单里是 `Dayjs`（DatePicker 的
 * 值类型），提交时要转成 ISO 字符串；`tagIds` 在表单里是数组，后端也收数组，
 * 这一个是同形的。用独立类型而不是给 payload 加可选，是为了让「什么时候必须
 * 转格式」这件事留在提交函数里，而不是散落在各字段上。
 */
interface NewsFormValues {
  title: string;
  subtitle?: string;
  summary?: string;
  coverImage?: string;
  contentHtml: string;
  category?: string;
  author?: string;
  publishedAt?: Dayjs | null;
  status: NewsStatus;
  slug?: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tagIds: string[];
}

/** 新建时的默认值。`status` 给 `draft` —— 新建即发布太危险。 */
const EMPTY_FORM: NewsFormValues = {
  title: '',
  contentHtml: '',
  status: 'draft',
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
  tagIds: [],
};

/**
 * 新闻编辑器。路由 `/admin/content/news/edit/:id`，`:id` 为 `new` 时是新建。
 *
 * ⚠️ 提交走的是 **PUT 全量语义**：后端对「字段没传」的处理不一致（有的重置为空、
 * 有的保留原值），所以这里把表单整体提交，而不是只提交被改动的字段。详情把
 * 所有字段灌进表单、提交时把所有字段都带上，才能保证结果可预期。
 */
export default function AdminNewsEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const { newsCategories } = useSiteConfig();
  const [form] = Form.useForm<NewsFormValues>();
  /** 富文本内容不走 Form 的受控（WangEditor 不是标准 input），单独存一份 */
  const [contentHtml, setContentHtml] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.admin.news.detail(id ?? 'new'),
    queryFn: () => adminNewsApi.detail(id as string),
    enabled: !isCreate,
  });

  // 标签词表：用于多选。后端分页默认 10 条，这里显式放大到 100
  const tagsQuery = useQuery({
    queryKey: queryKeys.admin.tags.list('news', { pageSize: 100 }),
    queryFn: () => adminNewsTagApi.list({ pageNumber: 1, pageSize: 100 }),
  });

  const tagOptions = useMemo(
    () => (tagsQuery.data?.items ?? []).map(tag => ({ value: tag.id, label: tag.name })),
    [tagsQuery.data]
  );

  /**
   * 详情到达后灌表单。
   *
   * `publishedAt` 从 ISO 字符串转 `Dayjs`，空值保持 `null`（DatePicker 认 `null`
   * 不认 `undefined` 作为「空」的展示态）。
   */
  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail) {
      return;
    }
    form.setFieldsValue({
      title: detail.title,
      subtitle: detail.subtitle ?? undefined,
      summary: detail.summary || undefined,
      coverImage: detail.coverImage ?? undefined,
      contentHtml: detail.contentHtml,
      category: detail.category || undefined,
      author: detail.author ?? undefined,
      publishedAt: detail.publishedAt ? dayjs(detail.publishedAt) : null,
      status: detail.status,
      slug: detail.slug ?? undefined,
      isFeatured: detail.isFeatured,
      isActive: detail.isActive,
      sortOrder: detail.sortOrder,
      seoTitle: detail.seoTitle ?? undefined,
      seoDescription: detail.seoDescription ?? undefined,
      seoKeywords: detail.seoKeywords ?? undefined,
      tagIds: detail.tagIds ?? [],
    });
    setContentHtml(detail.contentHtml);
  }, [detailQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertNewsPayload) =>
      isCreate ? adminNewsApi.create(payload) : adminNewsApi.update(id as string, payload),
    onSuccess: () => {
      message.success(isCreate ? '新闻已创建' : '新闻已保存');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.news.all });
      navigate('/admin/content/news');
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const submit = async (values: NewsFormValues) => {
    if (!contentHtml.trim()) {
      message.warning('请填写正文内容');
      return;
    }
    const payload: UpsertNewsPayload = {
      title: values.title.trim(),
      subtitle: values.subtitle?.trim() || undefined,
      summary: values.summary?.trim() || undefined,
      coverImage: values.coverImage || undefined,
      contentHtml,
      category: values.category || undefined,
      author: values.author?.trim() || undefined,
      // DatePicker 的 Dayjs 转回 ISO，后端按 UTC 存
      publishedAt: values.publishedAt ? values.publishedAt.toISOString() : undefined,
      status: values.status,
      slug: values.slug?.trim() || undefined,
      isFeatured: values.isFeatured,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
      seoTitle: values.seoTitle?.trim() || undefined,
      seoDescription: values.seoDescription?.trim() || undefined,
      seoKeywords: values.seoKeywords?.trim() || undefined,
      tagIds: values.tagIds ?? [],
    };
    await saveMutation.mutateAsync(payload);
  };

  if (!isCreate && detailQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!isCreate && detailQuery.isError) {
    return (
      <Card>
        <Text type="danger">加载失败：{detailQuery.error instanceof ApiError ? detailQuery.error.message : '未知错误'}</Text>
        <div className="mt-4">
          <Button onClick={() => navigate('/admin/content/news')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <SEOHead title={isCreate ? '新建新闻' : '编辑新闻'} description="社区新闻内容编辑。" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/content/news')}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isCreate ? '新建新闻' : '编辑新闻'}
            </Title>
          </Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => void form.submit()}
          >
            保存
          </Button>
        </div>

        <Form<NewsFormValues>
          form={form}
          layout="vertical"
          initialValues={EMPTY_FORM}
          onFinish={values => void submit(values)}
        >
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <Card title="内容">
                <Form.Item
                  name="title"
                  label="标题"
                  rules={[
                    { required: true, message: '请输入标题' },
                    { max: 200, message: '标题最多 200 字' },
                  ]}
                >
                  <Input placeholder="新闻标题" maxLength={200} showCount />
                </Form.Item>
                <Form.Item name="subtitle" label="副标题">
                  <Input placeholder="可留空" maxLength={200} />
                </Form.Item>
                <Form.Item name="summary" label="摘要" extra="列表页与搜索结果展示这段文字">
                  <Input.TextArea rows={3} maxLength={500} showCount />
                </Form.Item>
                <Form.Item label="正文" required>
                  <RichTextEditor value={contentHtml} onChange={setContentHtml} minHeight={460} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" size={16} className="w-full">
                <Card title="发布">
                  <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                    <Select
                      options={(Object.keys(NEWS_STATUS_LABELS) as NewsStatus[]).map(value => ({
                        value,
                        label: NEWS_STATUS_LABELS[value],
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="publishedAt"
                    label="发布时间"
                    extra="留空则前台按创建时间排序"
                  >
                    <DatePicker showTime className="w-full" placeholder="选择发布时间" />
                  </Form.Item>
                  <Form.Item name="isFeatured" label="置顶" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="isActive" label="前台可见" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="sortOrder" label="排序权重" extra="数字越小越靠前">
                    <Input type="number" />
                  </Form.Item>
                </Card>

                <Card title="分类与标签">
                  <Form.Item
                    name="category"
                    label="分类"
                    extra="词表由「系统设置 → 站点配置」维护，此处只能选择"
                  >
                    <Select
                      allowClear
                      placeholder="选择分类"
                      options={newsCategories.map(item => ({ value: item.value, label: item.label }))}
                    />
                  </Form.Item>
                  <Form.Item name="tagIds" label="标签">
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="选择标签"
                      loading={tagsQuery.isLoading}
                      options={tagOptions}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item name="author" label="作者">
                    <Input placeholder="可留空" maxLength={60} />
                  </Form.Item>
                  <Form.Item name="slug" label="Slug" extra="用于定制 URL，留空由后端生成">
                    <Input placeholder="例如 riscv-ai-summit" maxLength={160} />
                  </Form.Item>
                </Card>

                <Card title="封面">
                  <Form.Item name="coverImage" label="封面图">
                    <ImageUploadField purpose="cover" size={140} />
                  </Form.Item>
                </Card>

                <Card>
                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'seo',
                        label: 'SEO 设置',
                        children: (
                          <>
                            <Form.Item name="seoTitle" label="SEO 标题">
                              <Input maxLength={120} />
                            </Form.Item>
                            <Form.Item name="seoDescription" label="SEO 描述">
                              <Input.TextArea rows={3} maxLength={300} showCount />
                            </Form.Item>
                            <Form.Item name="seoKeywords" label="SEO 关键词" extra="多个关键词用英文逗号分隔">
                              <Input maxLength={200} />
                            </Form.Item>
                          </>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>
    </>
  );
}
