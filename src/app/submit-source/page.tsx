'use client'

import { useState } from 'react'

export default function SubmitSourcePage() {
  const [form, setForm] = useState({ name: '', contact: '', title: '', content: '', source: '', fileUrl: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/submissions/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('投稿已提交，管理员审核后会纳入史料库。')
        setForm({ name: '', contact: '', title: '', content: '', source: '', fileUrl: '' })
      } else {
        setMessage(data.message || '提交失败，请检查必填项。')
      }
    } catch {
      setMessage('提交失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">史料投稿</h1>
        <p className="text-gray-600">欢迎提交南京工业遗产相关线索、文献摘录、图片说明或来源信息。</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-[#E8DCC8] rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="姓名" value={form.name} onChange={value => setForm({...form, name: value})} required />
          <Field label="联系方式" value={form.contact} onChange={value => setForm({...form, contact: value})} placeholder="手机号 / 邮箱 / 微信" required />
        </div>
        <Field label="史料标题" value={form.title} onChange={value => setForm({...form, title: value})} required />
        <Textarea label="具体史料" rows={6} value={form.content} onChange={value => setForm({...form, content: value})} required />
        <Textarea label="来源说明" rows={4} value={form.source} onChange={value => setForm({...form, source: value})} placeholder="请说明出处、拍摄时间、收藏来源或相关背景。" required />
        <Field label="附件链接（可选）" value={form.fileUrl} onChange={value => setForm({...form, fileUrl: value})} placeholder="如网盘、公开图片或文档链接" />
        <div className="flex items-center justify-between gap-4 pt-2">
          {message && <p className={`text-sm ${message.includes('已提交') ? 'text-green-700' : 'text-red-700'}`}>{message}</p>}
          <button disabled={loading} className="ml-auto px-5 py-2.5 bg-[#C49A2B] hover:bg-[#B08920] text-white rounded-md text-sm disabled:opacity-50">
            {loading ? '提交中...' : '提交投稿'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-[#8B1A2B]"> *</span>}
      <input value={value} required={required} placeholder={placeholder} onChange={event => onChange(event.target.value)}
        className="mt-1 w-full px-3 py-2 border border-[#E8DCC8] rounded-md outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </label>
  )
}

function Textarea({ label, value, rows, onChange, placeholder = '', required = false }: { label: string; value: string; rows: number; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-[#8B1A2B]"> *</span>}
      <textarea value={value} required={required} rows={rows} placeholder={placeholder} onChange={event => onChange(event.target.value)}
        className="mt-1 w-full px-3 py-2 border border-[#E8DCC8] rounded-md outline-none focus:ring-2 focus:ring-[#C49A2B]" />
    </label>
  )
}
