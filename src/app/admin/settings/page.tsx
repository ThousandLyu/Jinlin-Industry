'use client'

import { useEffect, useState } from 'react'
import MediaPickerField from '@/components/admin/MediaPickerField'

interface SettingsForm {
  siteTitle: string
  siteDescription: string
  projectIntro: string
  contactInfo: string
  footerText: string
  mapBaseImage: string
  heroImageUrl: string
  aiEnabled: boolean
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiTimeoutMs: number
  aiTemperature: number
  cloudAiEnabled: boolean
  cloudAiBaseUrl: string
  cloudAiApiKey: string
  cloudAiModel: string
  cloudAiProtocol: string
  sourceImportDir: string
  adminUsername: string
  adminPassword: string
  adminRegistrationKey: string
  adminName: string
  adminGender: 'male' | 'female' | 'other'
  adminPhone: string
  adminEmail: string
}

const defaultForm: SettingsForm = {
  siteTitle: '金陵工脉',
  siteDescription: '',
  projectIntro: '',
  contactInfo: '',
  footerText: '',
  mapBaseImage: '',
  heroImageUrl: '',
  aiEnabled: false,
  aiBaseUrl: 'http://localhost:11434/v1',
  aiApiKey: '',
  aiModel: 'qwen2.5:7b',
  aiTimeoutMs: 60000,
  aiTemperature: 0.2,
  cloudAiEnabled: false,
  cloudAiBaseUrl: '',
  cloudAiApiKey: '',
  cloudAiModel: '',
  cloudAiProtocol: 'claude',
  sourceImportDir: '',
  adminUsername: 'admin',
  adminPassword: '',
  adminRegistrationKey: 'JLMZGY_TSL',
  adminName: '管理员',
  adminGender: 'male',
  adminPhone: '',
  adminEmail: '',
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'site' | 'ai' | 'import' | 'account'>('site')
  const [testResult, setTestResult] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=settings')
    const data = await res.json()
    if (data.length > 0) {
      const s = data[0]
      setForm({
        siteTitle: s.siteTitle || s.siteName || defaultForm.siteTitle,
        siteDescription: s.siteDescription || s.subtitle || '',
        projectIntro: s.projectIntro || s.aboutText || '',
        contactInfo: s.contactInfo || s.contactEmail || '',
        footerText: s.footerText || '',
        mapBaseImage: s.mapBaseImage || '',
        heroImageUrl: s.heroImageUrl || '',
        aiEnabled: Boolean(s.aiEnabled),
        aiBaseUrl: s.aiBaseUrl || defaultForm.aiBaseUrl,
        aiApiKey: s.aiApiKey || '',
        aiModel: s.aiModel || defaultForm.aiModel,
        aiTimeoutMs: Number(s.aiTimeoutMs || defaultForm.aiTimeoutMs),
        aiTemperature: Number(s.aiTemperature ?? defaultForm.aiTemperature),
        cloudAiEnabled: Boolean(s.cloudAiEnabled),
        cloudAiBaseUrl: s.cloudAiBaseUrl || '',
        cloudAiApiKey: s.cloudAiApiKey || '',
        cloudAiModel: s.cloudAiModel || '',
        cloudAiProtocol: s.cloudAiProtocol || 'claude',
        sourceImportDir: s.sourceImportDir || '',
        adminUsername: s.adminUsername || defaultForm.adminUsername,
        adminPassword: s.adminPassword || '',
        adminRegistrationKey: s.adminRegistrationKey || defaultForm.adminRegistrationKey,
        adminName: s.adminName || s.adminUsername || defaultForm.adminName,
        adminGender: s.adminGender || defaultForm.adminGender,
        adminPhone: s.adminPhone || '',
        adminEmail: s.adminEmail || '',
      })
      setExistingId(s.id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setTestResult('')

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'settings', data: form, id: existingId }),
    })

    if (res.ok) {
      setMessage('保存成功，配置已写入后台设置')
      setTimeout(() => setMessage(''), 3000)
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error || '保存失败')
    }
    setSaving(false)
  }

  const testAI = async () => {
    setTesting(true)
    setTestResult('')
    await handleSave()

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask', text: '测试史料问答配置', limit: 2 }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(data.enabled ? 'AI 已启用，接口调用成功。' : '配置已保存，但 AI 当前未启用；史料检索链路可用。')
      } else {
        setTestResult(data.error || data.message || 'AI 测试失败')
      }
    } catch {
      setTestResult('AI 测试失败，请检查本地模型服务是否启动')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <p className="text-gray-400">加载中...</p>

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-3 mb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-sm text-gray-500 mt-1">站点、AI、本地模型、史料导入和当前账号信息都可以在这里配置。</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-[#C49A2B] hover:bg-[#B08920] text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? '保存中...' : '保存全部设置'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-hidden">
        <div className="flex flex-wrap border-b border-[#E8DCC8] bg-[#FDFBF7]">
          <TabButton active={activeTab === 'site'} onClick={() => setActiveTab('site')}>站点信息</TabButton>
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>AI 与本地模型</TabButton>
          <TabButton active={activeTab === 'import'} onClick={() => setActiveTab('import')}>史料导入</TabButton>
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')}>当前账号信息</TabButton>
        </div>

        <div className="p-6">
          {activeTab === 'site' && (
            <div className="space-y-4">
              <TextField label="网站标题" value={form.siteTitle} onChange={value => setForm({...form, siteTitle: value})} />
              <TextField label="网站描述" value={form.siteDescription} onChange={value => setForm({...form, siteDescription: value})} />
              <TextareaField label="项目简介" rows={5} value={form.projectIntro} onChange={value => setForm({...form, projectIntro: value})} />
              <TextareaField label="联系方式" rows={3} value={form.contactInfo} onChange={value => setForm({...form, contactInfo: value})} />
              <TextField label="页脚文字" value={form.footerText} onChange={value => setForm({...form, footerText: value})} />
              <MediaPickerField label="首页头图（留空使用默认渐变背景）" value={form.heroImageUrl} placeholder="如 /uploads/images/banner.jpg" onChange={value => setForm({...form, heroImageUrl: value})} />
              <MediaPickerField label="工业地图底图（留空使用默认底图）" value={form.mapBaseImage} placeholder="如 /uploads/images/nanjing-map.jpg" onChange={value => setForm({...form, mapBaseImage: value})} />
              <div className="rounded-lg bg-[#F5F0E8] p-4 text-sm text-gray-700 leading-6">
                图片请先通过「媒体文件管理」上传，然后在此填入图片 URL 路径。首页头图建议尺寸 1920×600，地图底图建议尺寸 1200×800。
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.aiEnabled} onChange={e => setForm({...form, aiEnabled: e.target.checked})} />
                启用 AI 史料问答
              </label>
              <TextField label="本地模型服务地址" value={form.aiBaseUrl} placeholder="http://localhost:11434/v1" onChange={value => setForm({...form, aiBaseUrl: value})} />
              <TextField label="本地模型名称" value={form.aiModel} placeholder="qwen2.5:7b / qwen2.5:14b" onChange={value => setForm({...form, aiModel: value})} />
              <PasswordField label="API Key（本地模型可留空）" value={form.aiApiKey} onChange={value => setForm({...form, aiApiKey: value})} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="超时时间（毫秒）" value={form.aiTimeoutMs} onChange={value => setForm({...form, aiTimeoutMs: value})} />
                <NumberField label="生成温度" step="0.1" value={form.aiTemperature} onChange={value => setForm({...form, aiTemperature: value})} />
              </div>
              <div className="rounded-lg bg-[#F5F0E8] p-4 text-sm text-gray-700">
                主模型固定优先使用本地 Ollama/Qwen。Ollama 示例：服务地址 `http://localhost:11434/v1`，模型 `qwen2.5:7b`。云端 fallback 默认关闭，留空时绝不会调用云模型。
              </div>
              <div className="rounded-lg border border-[#E8DCC8] bg-white p-4">
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={form.cloudAiEnabled} onChange={e => setForm({...form, cloudAiEnabled: e.target.checked})} />
                  启用 Claude 格式云端 fallback（可选）
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <TextField label="云端服务地址" value={form.cloudAiBaseUrl} placeholder="留空则不 fallback，如 https://api.anthropic.com/v1" onChange={value => setForm({...form, cloudAiBaseUrl: value})} />
                  <TextField label="云端模型名称" value={form.cloudAiModel} placeholder="如 claude-3-5-sonnet-latest" onChange={value => setForm({...form, cloudAiModel: value})} />
                  <PasswordField label="云端 API Key" value={form.cloudAiApiKey} onChange={value => setForm({...form, cloudAiApiKey: value})} />
                  <ReadOnlyField label="云端协议" value={form.cloudAiProtocol || 'claude'} />
                </div>
              </div>
              <button onClick={testAI} disabled={testing || saving}
                className="px-4 py-2 rounded-lg text-sm border border-[#E8DCC8] text-gray-700 hover:bg-[#F5F0E8] disabled:opacity-50">
                {testing ? '测试中...' : '保存并测试 AI 配置'}
              </button>
              {testResult && <p className="text-sm text-gray-600">{testResult}</p>}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <TextField label="史料库导入目录" value={form.sourceImportDir} placeholder="留空则使用 imports/sources" onChange={value => setForm({...form, sourceImportDir: value})} />
              <div className="rounded-lg bg-[#F5F0E8] p-4 text-sm text-gray-700 leading-6">
                目录下需要包含 `A`、`B`、`C` 三个子文件夹。保存后进入 `史料库管理`，点击 `一键导入文件夹` 即可读取这里配置的目录。
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <ReadOnlyField label="登录用户名" value={form.adminUsername} />
              <TextField label="显示名称" value={form.adminName} onChange={value => setForm({...form, adminName: value})} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <select value={form.adminGender} onChange={e => setForm({...form, adminGender: e.target.value as SettingsForm['adminGender']})}
                  className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <TextField label="联系电话" value={form.adminPhone} onChange={value => setForm({...form, adminPhone: value})} />
              <TextField label="邮箱" value={form.adminEmail} onChange={value => setForm({...form, adminEmail: value})} />
              <PasswordField label="登录密码" value={form.adminPassword} onChange={value => setForm({...form, adminPassword: value})} />
              <PasswordField label="管理员注册密钥" value={form.adminRegistrationKey} onChange={value => setForm({...form, adminRegistrationKey: value})} />
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                登录用户名不可在此修改。密码会保存在本地 `data/settings.json`，不要把该文件公开发布。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-3 text-sm border-r border-[#E8DCC8] ${active ? 'bg-white text-[#4A3728] font-semibold' : 'text-gray-500 hover:bg-white/60'}`}>
      {children}
    </button>
  )
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value} readOnly
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg bg-gray-50 text-gray-500 outline-none" />
    </div>
  )
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="password" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </div>
  )
}

function NumberField({ label, value, step = '1', onChange }: { label: string; value: number; step?: string; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </div>
  )
}

function TextareaField({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} rows={rows} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </div>
  )
}
