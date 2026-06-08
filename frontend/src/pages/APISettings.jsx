import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Select, Button, Table, Space, Tag, App, Popconfirm, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import api from '../api'

const { Title, Text } = Typography

export default function APISettings() {
  const { message } = App.useApp()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const providers = [
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'qwen', label: '千问 (Qwen)' },
    { value: 'openai', label: 'GPT (OpenAI)' },
    { value: 'claude', label: 'Claude (Anthropic)' },
  ]

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/api-keys/')
      setKeys(res.data.results || res.data)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const handleAdd = async (values) => {
    try {
      await api.post('/auth/api-keys/', values)
      message.success('API Key 绑定成功')
      form.resetFields()
      loadKeys()
    } catch (e) {
      message.error('绑定失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/auth/api-keys/${id}/`)
      message.success('已删除')
      loadKeys()
    } catch (e) {
    }
  }

  const columns = [
    {
      title: '平台',
      dataIndex: 'provider',
      width: 180,
      render: (v) => <Tag color="blue">{providers.find(p => p.value === v)?.label || v}</Tag>,
    },
    { title: '模型', dataIndex: 'model_name', width: 220 },
    { title: '自定义地址', dataIndex: 'base_url', render: (v) => v || <Text type="secondary">使用默认接口地址</Text> },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 140,
      render: (v) => v
        ? <Tag icon={<CheckCircleOutlined />} color="success">已启用</Tag>
        : <Tag color="default">已禁用</Tag>,
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Popconfirm title="确定删除此 Key？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-eyebrow">Model Provider</div>
        <Title level={2} className="page-title">API 密钥管理</Title>
        <Text className="page-subtitle">
          绑定你的大模型 API Key，用于本地项目调用 DeepSeek、千问、GPT 或 Claude。密钥仅保存在本地环境中。
        </Text>
      </div>

      <Card
        className="soft-card"
        title={
          <Space size={12}>
            <SafetyCertificateOutlined style={{ color: '#2563eb' }} />
            <span>绑定新 Key</span>
          </Space>
        }
        style={{ marginBottom: 28 }}
      >
        <Form form={form} className="professional-form api-bind-form" layout="vertical" onFinish={handleAdd}>
          <div className="api-bind-grid">
            <Form.Item label="服务平台" name="provider" rules={[{ required: true, message: '请选择平台' }]}> 
              <Select placeholder="选择平台" options={providers} />
            </Form.Item>
            <Form.Item label="API Key" name="api_key" rules={[{ required: true, message: '请输入 API Key' }]}> 
              <Input.Password placeholder="粘贴你的 API Key" />
            </Form.Item>
            <Form.Item label="模型名称" name="model_name" rules={[{ required: true, message: '请输入模型名' }]}> 
              <Input placeholder="例如 deepseek-chat" />
            </Form.Item>
            <Form.Item label="Base URL" name="base_url">
              <Input placeholder="可选，留空使用默认" />
            </Form.Item>
            <Form.Item className="api-bind-action">
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                绑定模型
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card className="soft-card" title="已绑定模型">
        <Table
          columns={columns}
          dataSource={keys}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
