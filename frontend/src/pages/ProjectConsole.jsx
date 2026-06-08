import React, { useState, useRef, useEffect } from 'react'
import { Card, Tag, Timeline, Typography, Button, Tabs, Spin, Space, Image, App, Select, Empty, Checkbox, Modal, Radio } from 'antd'
import { CodeOutlined, PlayCircleOutlined, ArrowLeftOutlined, RobotOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api from '../api'

const { Text, Title } = Typography

const normalizeMathMarkdown = (value) => {
  if (!value) return ''
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  text = text.replace(/\\\\/g, '\\')
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => `@@BLOCK@@${expr}@@BLOCK@@`)
  text = text.replace(/\$([^$\n]+)\$/g, (_, expr) => `@@INLINE@@${expr}@@INLINE@@`)

  const latexPattern = /(?<![$\\])((?:\\(?:frac|sum|sqrt|bar|hat|left|right|alpha|beta|gamma|lambda|pm|cdot|exp|log|text|operatorname)|[A-Za-z0-9_{}^]\s*=)[^。；;\n]*)/g
  text = text.replace(latexPattern, (match) => {
    const expr = match.trim()
    if (!expr || expr.includes('@@INLINE@@') || expr.includes('@@BLOCK@@')) return match
    if (!/[\\_{}^=]/.test(expr)) return match
    return `$${expr}$`
  })

  return text
    .replace(/@@BLOCK@@([\s\S]*?)@@BLOCK@@/g, (_, expr) => `$$${expr}$$`)
    .replace(/@@INLINE@@([\s\S]*?)@@INLINE@@/g, (_, expr) => `$${expr}$`)
}

export default function ProjectConsole({ project, onBack }) {
  const { message } = App.useApp()
  const [thinking, setThinking] = useState([])
  const [status, setStatus] = useState(project.status)
  const [taskId, setTaskId] = useState(null)
  const [questions, setQuestions] = useState(project.questions || [])
  const [provider, setProvider] = useState('deepseek')
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('md')
  const [loading, setLoading] = useState(false)
  const wsRef = useRef(null)

  const loadLatestTask = () => {
    const latest = project.tasks?.[0]
    if (latest) {
      const finished = latest.status === 'done' || latest.status === 'failed'
      setTaskId(finished ? null : latest.id)
      setStatus(latest.status)
      setThinking(latest.thinking_log || [])
    }
  }

  const buildQuestionDoc = (q, format) => {
    if (format === 'txt') {
      return [
        `第 ${q.order} 问`,
        '',
        '【问题描述】',
        q.content || '',
        '',
        '【建模分析】',
        q.analysis || '',
        '',
        '【说明文档】',
        q.formula || '',
        '',
        '【控制台输出】',
        q.result_text || '',
      ].join('\n')
    }

    if (format === 'latex') {
      return [
        `\\section*{第 ${q.order} 问}`,
        '',
        '\\subsection*{问题描述}',
        q.content || '',
        '',
        '\\subsection*{建模分析}',
        q.analysis || '',
        '',
        '\\subsection*{说明文档}',
        normalizeMathMarkdown(q.formula || ''),
        '',
        '\\subsection*{控制台输出}',
        '\\begin{verbatim}',
        q.result_text || '',
        '\\end{verbatim}',
      ].join('\n')
    }

    return [
      `# 第 ${q.order} 问`,
      '',
      '## 问题描述',
      q.content || '',
      '',
      '## 建模分析',
      q.analysis || '',
      '',
      '## 说明文档',
      normalizeMathMarkdown(q.formula || ''),
      '',
      '## 控制台输出',
      '```text',
      q.result_text || '',
      '```',
    ].join('\n')
  }

  const exportResults = async () => {
    const hasResult = questions.some((q) => q.analysis || q.formula || q.code || q.result_text || q.result_image)
    if (!hasResult) {
      message.warning('暂无可导出的结果')
      return
    }
    setExportModalOpen(true)
  }

  const confirmExportResults = async () => {
    const hasResult = questions.some((q) => q.analysis || q.formula || q.code || q.result_text || q.result_image)
    if (!hasResult) {
      message.warning('暂无可导出的结果')
      return
    }

    if (!window.showDirectoryPicker) {
      message.warning('当前浏览器不支持选择文件夹，请使用最新版 Chrome 或 Edge')
      return
    }

    try {
      const dir = await window.showDirectoryPicker()
      const writeTextFile = async (name, content) => {
        const handle = await dir.getFileHandle(name, { create: true })
        const writable = await handle.createWritable()
        await writable.write(content || '')
        await writable.close()
      }

      const extMap = { txt: 'txt', latex: 'tex', md: 'md' }
      const labelMap = { txt: 'TXT', latex: 'LaTeX', md: 'Markdown' }
      const ext = extMap[exportFormat]
      const summary = questions.map((q) => buildQuestionDoc(q, exportFormat)).join('\n\n---\n\n')

      await writeTextFile(`建模结果汇总_${labelMap[exportFormat]}.${ext}`, summary)

      for (const q of questions) {
        await writeTextFile(`第${q.order}问_说明文档.${ext}`, buildQuestionDoc(q, exportFormat))
        if (q.code) await writeTextFile(`第${q.order}问_代码.py`, q.code)
        if (q.result_image) {
          const imgRes = await fetch(q.result_image)
          const blob = await imgRes.blob()
          const imgHandle = await dir.getFileHandle(`第${q.order}问_图表.png`, { create: true })
          const writable = await imgHandle.createWritable()
          await writable.write(blob)
          await writable.close()
        }
      }
      setExportModalOpen(false)
      message.success(`已按 ${labelMap[exportFormat]} + Python 格式保存到选择的文件夹`)
    } catch (e) {
      if (e.name !== 'AbortError') {
        message.error('保存失败：' + e.message)
      }
    }
  }

  const supportedProviders = [
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'qwen', label: '千问 (Qwen)' },
    { value: 'openai', label: 'GPT (OpenAI)' },
    { value: 'claude', label: 'Claude' },
  ]

  const startTask = async () => {
    setLoading(true)
    try {
      let currentQuestions = questions
      if (currentQuestions.length === 0) {
        const extractRes = await api.post(`/projects/${project.id}/extract_questions/`, { provider })
        currentQuestions = extractRes.data
        setQuestions(currentQuestions)
      }

      const taskRes = await api.post(`/projects/${project.id}/start_task/`, { provider, enable_web_search: enableWebSearch })
      setTaskId(taskRes.data.task_id)

      setTimeout(() => {
        loadQuestions()
      }, 2000)
    } catch (e) {
      const detail = e.response?.data?.error || e.response?.data?.detail || ''
      const status = e.response?.status
      if (status === 400 || status === 500) {
        message.warning(detail || '操作失败，请稍后重试')
      } else {
        message.error(detail || e.message)
      }
      return
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    try {
      const res = await api.get(`/projects/${project.id}/questions/`)
      setQuestions(res.data)
    } catch (e) {}
  }

  useEffect(() => {
    if (!taskId) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = window.__AI_MCODE_WS_HOST__ || '127.0.0.1:3019'
    const wsUrl = `${wsProtocol}://${wsHost}/ws/task/${taskId}/`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setThinking((prev) => [...prev, data])
      if (data.status) {
        setStatus(data.status)
        if (data.status === 'done' || data.status === 'failed') {
          setTaskId(null)
          loadQuestions()
        }
      }
    }

    ws.onclose = () => {
      loadQuestions()
    }

    const interval = setInterval(loadQuestions, 5000)

    return () => {
      ws.close()
      clearInterval(interval)
    }
  }, [taskId])

  useEffect(() => {
    setQuestions(project.questions || [])
    setStatus(project.status)
    loadLatestTask()
    loadQuestions()
  }, [project.id])

  const statusColorMap = {
    pending: 'default',
    parsing: 'processing',
    cleaning: 'processing',
    analyzing: 'processing',
    modeling: 'processing',
    coding: 'processing',
    executing: 'processing',
    done: 'success',
    failed: 'error',
  }

  const statusLabelMap = {
    pending: '等待启动',
    parsing: '正在解析上传文件',
    cleaning: '正在清洗和分析数据',
    analyzing: '正在联网搜索背景知识',
    modeling: '正在数学建模',
    coding: '正在建模并生成代码',
    done: '已完成',
    failed: '失败',
    draft: '草稿',
  }

  const currentStepText = loading
    ? '正在请求 AI 解析题目，请稍候...'
    : taskId
      ? (statusLabelMap[status] || '任务执行中')
      : ''

  const questionTabs = questions.map((q) => ({
    key: String(q.order),
    label: `第 ${q.order} 问`,
    children: (
      <div style={{ paddingTop: 8 }}>
        <Card className="result-section" title="问题描述" size="small">
          <Text style={{ lineHeight: 1.9 }}>{q.content}</Text>
        </Card>

        {q.analysis && (
          <Card className="result-section" title="建模分析" size="small">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {typeof q.analysis === 'string' ? q.analysis : JSON.stringify(q.analysis, null, 2)}
            </ReactMarkdown>
          </Card>
        )}

        {q.formula && (
          <Card
            className="result-section"
            title="说明文档"
            size="small"
            extra={
              <Button size="small" onClick={() => { navigator.clipboard.writeText(q.formula); message.success('说明文档已复制') }}>
                复制
              </Button>
            }
          >
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeMathMarkdown(q.formula)}
            </ReactMarkdown>
          </Card>
        )}

        {q.code && (
          <Card className="result-section" title={<><CodeOutlined /> 代码</>} size="small">
            <SyntaxHighlighter language="python" style={oneDark} showLineNumbers customStyle={{ borderRadius: 12, margin: 0 }}>
              {q.code}
            </SyntaxHighlighter>
          </Card>
        )}

        {q.result_text && (
          <Card className="result-section" title="控制台输出" size="small">
            <pre style={{
              background: '#111827',
              color: '#e5e7eb',
              padding: 18,
              borderRadius: 12,
              maxHeight: 340,
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.7,
            }}>
              {q.result_text}
            </pre>
          </Card>
        )}

        {q.result_image && (
          <Card className="result-section" title="图表结果" size="small">
            <Image
              src={q.result_image}
              alt={`第${q.order}问结果图`}
              style={{ width: '25vw', maxWidth: 520, minWidth: 320, height: 'auto' }}
            />
          </Card>
        )}
      </div>
    ),
  }))

  return (
    <div className="page-shell">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <div className="page-eyebrow">AI Workspace</div>
          <Title level={2} className="page-title">{project.title}</Title>
          <Text className="page-subtitle">选择模型后启动完整工作流，系统会按解析、清洗、建模、编码和执行逐步输出结果。</Text>
        </div>
        <Space size={10} style={{ paddingTop: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            刷新
          </Button>
          <Button icon={<SaveOutlined />} onClick={exportResults}>
            将结果另存为
          </Button>
          <Tag color={statusColorMap[status] || 'default'} style={{ padding: '5px 12px', borderRadius: 999 }}>
            {statusLabelMap[status] || '进行中'}
          </Tag>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回列表</Button>
        </Space>
      </div>

      <div className="console-grid">
        <Card
          className="console-panel"
          title={
            <Space size={10}>
              <RobotOutlined style={{ color: '#2563eb' }} />
              <span>AI 思考过程</span>
            </Space>
          }
          extra={
            !taskId && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={startTask}
              >
                开始分析
              </Button>
            )
          }
        >
          {!taskId && (
            <div style={{ marginBottom: 22 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>当前模型</Text>
              <Select
                value={provider}
                onChange={setProvider}
                options={supportedProviders}
                style={{ width: '100%', marginBottom: 12 }}
                size="large"
              />
              <Checkbox checked={enableWebSearch} onChange={(e) => setEnableWebSearch(e.target.checked)}>
                启用联网搜索（会增加等待时间）
              </Checkbox>
            </div>
          )}

          {currentStepText && (
            <Card size="small" style={{ marginBottom: 16, background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <Space>
                <Spin size="small" />
                <Text strong>{currentStepText}</Text>
              </Space>
            </Card>
          )}

          {thinking.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="选择模型后点击开始分析，执行过程会显示在这里"
            />
          ) : (
            <Timeline
              style={{ marginTop: 10 }}
              items={thinking.map((t, i) => ({
                color: t.status === 'failed' ? 'red' : t.status === 'done' ? 'green' : 'blue',
                children: (
                  <div key={i} style={{ paddingBottom: 10 }}>
                    <Text style={{ lineHeight: 1.7 }}>{t.content}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(t.timestamp * 1000).toLocaleTimeString()}
                    </Text>
                  </div>
                ),
              }))}
            />
          )}
          {loading && <Spin style={{ display: 'block', marginTop: 18 }} />}
        </Card>

        <Card className="result-panel" title="各问结果">
          {questions.length > 0 ? (
            <Tabs items={questionTabs} defaultActiveKey="1" size="large" />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="解析题目后将在此显示每一问的模型、公式、代码和运行结果"
            />
          )}
        </Card>
      </div>
      <Modal
        title="选择导出格式"
        open={exportModalOpen}
        onOk={confirmExportResults}
        onCancel={() => setExportModalOpen(false)}
        okText="选择保存位置"
        cancelText="取消"
      >
        <Radio.Group
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          style={{ display: 'grid', gap: 12 }}
        >
          <Radio value="txt">TXT + PY：适合直接阅读和普通文本复制</Radio>
          <Radio value="latex">LaTeX + PY：适合论文排版和公式编辑</Radio>
          <Radio value="md">Markdown + PY：适合说明文档、笔记和网页展示</Radio>
        </Radio.Group>
      </Modal>
    </div>
  )
}
