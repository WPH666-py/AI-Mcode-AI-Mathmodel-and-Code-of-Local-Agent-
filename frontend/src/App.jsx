import React, { useState, useEffect } from 'react'
import { Layout, Menu, Typography, Modal, Image } from 'antd'
import {
  ApiOutlined,
  ProjectOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ProjectList from './pages/ProjectList'
import ProjectConsole from './pages/ProjectConsole'
import NewProject from './pages/NewProject'
import APISettings from './pages/APISettings'
import api from './api'

const { Header, Content } = Layout

export default function App() {
  const [currentPage, setCurrentPage] = useState('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [projects, setProjects] = useState([])
  const [authorOpen, setAuthorOpen] = useState(false)

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/')
      setProjects(res.data.results || res.data)
    } catch (e) {
    }
  }

  const openProject = async (project) => {
    try {
      const res = await api.get(`/projects/${project.id}/`)
      setSelectedProject(res.data)
    } catch (e) {
      setSelectedProject(project)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const renderContent = () => {
    if (selectedProject) {
      return (
        <ProjectConsole
          project={selectedProject}
          onBack={() => { setSelectedProject(null); loadProjects() }}
        />
      )
    }
    switch (currentPage) {
      case 'projects':
        return (
          <ProjectList
            projects={projects}
            onSelect={openProject}
            onNew={() => setCurrentPage('new')}
            onRefresh={loadProjects}
          />
        )
      case 'new':
        return (
          <NewProject
            onCreated={(project) => {
              loadProjects()
              setCurrentPage('projects')
              openProject(project)
            }}
          />
        )
      case 'api':
        return <APISettings />
      default:
        return null
    }
  }

  const menuItems = [
    { key: 'projects', icon: <ProjectOutlined />, label: '我的项目' },
    { key: 'new', icon: <PlusOutlined />, label: '新建项目' },
    { key: 'api', icon: <ApiOutlined />, label: 'API 设置' },
    { key: 'author', icon: <UserOutlined />, label: '作者信息' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
            📐 数学建模AI生成器
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedProject ? '' : currentPage]}
          items={menuItems}
          onClick={({ key }) => {
            if (key === 'author') {
              setAuthorOpen(true)
              return
            }
            setCurrentPage(key)
            setSelectedProject(null)
          }}
          style={{
            flex: 1,
            minWidth: 0,
            lineHeight: '64px',
            backgroundColor: 'transparent',
            border: 'none',
          }}
          overflowedIndicator={null}
        />
      </Header>
      <Content style={{ padding: '40px 0 56px', background: '#f6f8fb' }}>
        {renderContent()}
      </Content>
      <Modal
        title="作者信息"
        open={authorOpen}
        onCancel={() => setAuthorOpen(false)}
        footer={null}
        width={760}
      >
        <Typography.Paragraph>
          用户您好，我是 AI-mcode 的开发作者水哥，青岛理工大学 2022 级学生。
          AI-mcode，全称 AI Mathmodel and Code of Local Agent（AI数学建模与本地编程智能体），
          使用数学建模常规工作流程，前端使用 React 框架，后端 Python，并使用 Cython 对核心建模流程进行加速，尽力保障用户体验。
        </Typography.Paragraph>
        <Typography.Paragraph>
          （1）如想致谢作者，那请动下您的小手，给作者在微信上打赏 5 元。作者感激不尽，收款码如下：
        </Typography.Paragraph>
        <div style={{ textAlign: 'center', margin: '18px 0 24px' }}>
          <Image
            src="/wechat-py-qr.jpg.jpg"
            alt="微信收款码"
            width={280}
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='360'><rect width='100%25' height='100%25' fill='%23f6f8fb'/><text x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='18'>请将收款码图片放到</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='14'>frontend/public/wechat-py-qr.jpg.jpg</text></svg>"
          />
        </div>
        <Typography.Paragraph>
          （2）如有问题，请用 QQ 邮件发送至作者邮箱：943050454@qq.com。工作时间请勿给作者打电话，被领导发现得扣钱且很麻烦，作者看到后会第一时间回复。
        </Typography.Paragraph>
        <Typography.Paragraph>
          （3）关于作者：作者是个卑微职校生，也就是以山东省该专业第一的成绩，考上了咱校区。大学期间自学了 Python 以及前后端开发，参与了多场数学建模竞赛并崭露头角，深知要改变社会对职业学校学生的固有看法，得从自身做起，做别人根本不敢想的事情。走一条不被定义的路真的相当艰难，如想了解更多情况，请邮件联系作者。
        </Typography.Paragraph>
      </Modal>
    </Layout>
  )
}
