import React, { useState, useEffect } from 'react'
import { Input, Button, Upload, Card, Select, App, Space, Typography } from 'antd'
import { UploadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import api from '../api'

const { TextArea } = Input
const { Title } = Typography

export default function NewProject({ onCreated }) {
  const { message } = App.useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileList, setFileList] = useState([])
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      message.warning('请输入项目标题')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/projects/', { title, description })
      const project = res.data

      if (fileList.length > 0) {
        for (const file of fileList) {
          const formData = new FormData()
          formData.append('file', file.originFileObj)
          await api.post(`/projects/${project.id}/upload_file/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }

      message.success('项目创建成功')
      onCreated(project)
    } catch (e) {
      message.error('创建失败: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="新建建模项目" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5}>项目标题</Title>
          <Input
            placeholder="例如：2024年全国大学生数学建模竞赛A题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Title level={5}>题目描述</Title>
          <TextArea
            rows={8}
            placeholder="粘贴或输入完整的数学建模题目..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Title level={5}>上传附件</Title>
          <Upload
            multiple
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            beforeUpload={() => false}
            accept=".docx,.pdf,.xlsx,.xls,.csv,.txt,.md,.zip,.png,.jpg,.jpeg"
          >
            <Button icon={<UploadOutlined />}>选择文件 (docx/pdf/xlsx/csv/zip/png)</Button>
          </Upload>
        </div>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={handleCreate}
          block
          size="large"
        >
          创建项目
        </Button>
      </Space>
    </Card>
  )
}
