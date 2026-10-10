import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
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
import { adminResourceApi, adminResourceTagApi, RESOURCE_STATUS_OPTIONS } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { RESOURCE_CATEGORY_LABELS, type ResourceCategory } from '@/types/content';
import {
  type ResourceStatus,
  type UpsertResourcePayload,
} from '@/types/adminContent';

const { Title, Text } = Typography;

const CATEGORY_OPTIONS = (Object.keys(RESOURCE_CATEGORY_LABELS) as ResourceCategory[]).map(value => ({
  value,
  label: RESOURCE_CATEGORY_LABELS[value],
}));

interface ResourceFormValues {
  name: string;
  summary?: string;
  coverImage?: string;
  category: ResourceCategory;
  author?: string;
  status: ResourceStatus;
  publishedAt?: Dayjs | null;
  isPublic: boolean;
  isRecommended: boolean;
  isFree: boolean;
  supportedArch?: string;
  systemRequirements?: string;
  slug?: string;
  tagIds: string[];
}

const EMPTY_FORM: ResourceFormValues = {
  name: '',
  category: 'model',
  status: 'draft',
  isPublic: true,
  isRecommended: false,
  isFree: true,
  tagIds: [],
};

/**
 * 资源编辑器。路由 `/admin/content/resources/edit/:id`，`new` 表示新建。
 *
 * 这里只管资源**本体**（名称/分类/简介/快速开始等）；版本与可下载文件是另一条
 * 路由 `/admin/content/resources/:id/versions`，因为一个资源可以有很多版本，
 * 塞进同一个表单会让「保存」的语义变得含糊 —— 是存本体还是存版本？
 *
 * 同新闻编辑器：走 PUT 全量提交，详情整份灌入、提交整份写出。
 */
export default function AdminResourceEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<ResourceFormValues>();

  // 两个富文本字段各存一份：WangEditor 不受 Form 管控，无法塞进 form values
  const [overview, setOverview] = useState('');
  const [quickStart, setQuickStart] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.admin.resources.detail(id ?? 'new'),
    queryFn: () => adminResourceApi.detail(id as string),
    enabled: !isCreate,
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.admin.tags.list('resource', { pageSize: 100 }),
    queryFn: () => adminResourceTagApi.list({ pageNumber: 1, pageSize: 100 }),
  });

  const tagOptions = useMemo(
    () => (tagsQuery.data?.items ?? []).map(tag => ({ value: tag.id, label: tag.name })),
    [tagsQuery.data]
  );

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail) {
      return;
    }
    form.setFieldsValue({
      name: detail.name,
      summary: detail.summary || undefined,
      coverImage: detail.coverImage ?? undefined,
      category: detail.category,
      author: detail.author ?? undefined,
      status: detail.status,
      publishedAt: detail.publishedAt ? dayjs(detail.publishedAt) : null,
      isPublic: detail.isPublic,
      isRecommended: detail.isRecommended,
      isFree: detail.isFree,
      supportedArch: detail.supportedArch ?? undefined,
      systemRequirements: detail.systemRequirements ?? undefined,
      slug: detail.slug ?? undefined,
      tagIds: detail.tagIds ?? [],
    });
    setOverview(detail.overview ?? '');
    setQuickStart(detail.quickStart ?? '');
  }, [detailQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertResourcePayload) =>
      isCreate ? adminResourceApi.create(payload) : adminResourceApi.update(id as string, payload),
    onSuccess: () => {
      message.success(isCreate ? '资源已创建' : '资源已保存');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resources.all });
      navigate('/admin/content/resources');
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const submit = (values: ResourceFormValues) => {
    const payload: UpsertResourcePayload = {
      name: values.name.trim(),
      summary: values.summary?.trim() || undefined,
      coverImage: values.coverImage || undefined,
      category: values.category,
      author: values.author?.trim() || undefined,
      status: values.status,
      publishedAt: values.publishedAt ? values.publishedAt.toISOString() : undefined,
      isPublic: values.isPublic,
      isRecommended: values.isRecommended,
      isFree: values.isFree,
      overview,
      quickStart,
      supportedArch: values.supportedArch?.trim() || undefined,
      systemRequirements: values.systemRequirements?.trim() || undefined,
      slug: values.slug?.trim() || undefined,
      tagIds: values.tagIds ?? [],
    };
    saveMutation.mutate(payload);
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
        <Text type="danger">
          加载失败：{detailQuery.error instanceof ApiError ? detailQuery.error.message : '未知错误'}
        </Text>
        <div className="mt-4">
          <Button onClick={() => navigate('/admin/content/resources')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <SEOHead title={isCreate ? '新建资源' : '编辑资源'} description="社区资源库内容编辑。" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/content/resources')}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isCreate ? '新建资源' : '编辑资源'}
            </Title>
          </Space>
          <Space>
            {!isCreate && (
              <Button onClick={() => navigate(`/admin/content/resources/${id}/versions`)}>版本管理</Button>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              onClick={() => void form.submit()}
            >
              保存
            </Button>
          </Space>
        </div>

        <Form<ResourceFormValues>
          form={form}
          layout="vertical"
          initialValues={EMPTY_FORM}
          onFinish={submit}
        >
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <Card title="基本信息">
                <Form.Item
                  name="name"
                  label="资源名称"
                  rules={[
                    { required: true, message: '请输入资源名称' },
                    { max: 200, message: '最多 200 字' },
                  ]}
                >
                  <Input placeholder="例如 RISC-V 向量扩展编译器" maxLength={200} showCount />
                </Form.Item>
                <Form.Item name="summary" label="一句话简介" extra="列表卡片展示这段文字">
                  <Input.TextArea rows={2} maxLength={300} showCount />
                </Form.Item>
                <Form.Item label="资源概览" extra="详情页顶部的介绍正文">
                  <RichTextEditor value={overview} onChange={setOverview} minHeight={260} />
                </Form.Item>
                <Form.Item label="快速开始" extra="安装/运行步骤，支持代码块">
                  <RichTextEditor value={quickStart} onChange={setQuickStart} minHeight={260} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" size={16} className="w-full">
                <Card title="发布">
                  <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                    <Select options={RESOURCE_STATUS_OPTIONS} />
                  </Form.Item>
                  <Form.Item
                    name="publishedAt"
                    label="发布时间"
                    extra="留空则前台按创建时间排序"
                  >
                    <DatePicker showTime className="w-full" placeholder="选择发布时间" />
                  </Form.Item>
                  <Form.Item
                    name="isPublic"
                    label="对外公开"
                    valuePropName="checked"
                    extra="关闭后仅登录用户可见，未登录访客无法浏览或下载"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item name="isRecommended" label="推荐" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="isFree"
                    label="免费"
                    valuePropName="checked"
                    extra="关闭后前台显示为付费资源；平台首版不代收费用"
                  >
                    <Switch />
                  </Form.Item>
                </Card>

                <Card title="分类与标签">
                  <Form.Item name="category" label="分类" rules={[{ required: true }]}>
                    <Select options={CATEGORY_OPTIONS} />
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
                  <Form.Item name="author" label="作者/团队">
                    <Input placeholder="可留空" maxLength={100} />
                  </Form.Item>
                  <Form.Item name="slug" label="Slug" extra="用于定制 URL，留空由后端生成">
                    <Input placeholder="例如 rvv-compiler" maxLength={160} />
                  </Form.Item>
                </Card>

                <Card title="封面">
                  <Form.Item name="coverImage" label="封面图">
                    <ImageUploadField purpose="cover" size={140} />
                  </Form.Item>
                </Card>

                <Card title="运行环境">
                  <Form.Item name="supportedArch" label="支持架构" extra="例如 RV64GC / RV32IMAC">
                    <Input placeholder="可留空" maxLength={200} />
                  </Form.Item>
                  <Form.Item name="systemRequirements" label="系统要求">
                    <Input.TextArea rows={3} maxLength={500} showCount />
                  </Form.Item>
                </Card>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>
    </>
  );
}
