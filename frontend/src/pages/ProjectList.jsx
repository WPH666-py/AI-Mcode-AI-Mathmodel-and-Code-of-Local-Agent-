import React, { useState, useEffect } from 'react'
import { List, Card, Tag, Button, Space, Typography, Modal, Input } from 'antd'
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../api'

const { Title, Text } = Typography

export default function ProjectList({ onSelect, onNew, projects, onRefresh }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null })

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${deleteModal.id}/`)
      onRefresh()
      setDeleteModal({ open: false, id: null })
    } catch (e) {
    }
  }

  const statusColorMap = {
    draft: 'default',
    processing: 'processing',
    done: 'success',
    failed: 'error',
  }

  const statusLabelMap = {
    draft: '草稿',
    processing: '处理中',
    done: '完成',
    failed: '失败',
  }

  return (
    <div className="page-shell project-list-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>我的项目</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
          新建项目
        </Button>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 3, xxl: 3 }}
        dataSource={projects}
        renderItem={(item) => (
          <List.Item>
            <Card
              hoverable
              actions={[
                <Button type="link" icon={<EyeOutlined />} onClick={() => onSelect(item)}>查看</Button>,
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setDeleteModal({ open: true, id: item.id })}
                >删除</Button>,
              ]}
            >
              <Card.Meta
                title={item.title}
                description={
                  <Space direction="vertical">
                    <Tag color={statusColorMap[item.status]}>{statusLabelMap[item.status]}</Tag>
                    <Text type="secondary">{new Date(item.created_at).toLocaleDateString('zh-CN')}</Text>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="确认删除"
        open={deleteModal.open}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
        okText="删除"
        cancelText="取消"
      >
        确定要删除这个项目吗？此操作不可撤销。
      </Modal>
    </div>
  )
}
