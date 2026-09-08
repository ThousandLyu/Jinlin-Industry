'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RegisterForm({ role }: { role: 'user' | 'admin' }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    gender: 'male',
    phone: '',
    email: '',
    adminKey: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setSuccess(false)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
        setMessage(role === 'admin' ? '管理员账户注册成功，可以返回后台登录。' : '注册成功。')
        setForm({ username: '', password: '', name: '', gender: 'male', phone: '', email: '', adminKey: '' })
      } else {
        setMessage(data.message || '注册失败')
      }
    } catch {
      setMessage('注册失败，请确认服务正在运行')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      <TextField label="用户名" value={form.username} onChange={value => setForm({...form, username: value})} />
      <TextField label="密码" type="password" value={form.password} onChange={value => setForm({...form, password: value})} />
      <TextField label="姓名" value={form.name} onChange={value => setForm({...form, name: value})} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
        <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
          className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
          <option value="male">男</option>
          <option value="female">女</option>
          <option value="other">其他</option>
        </select>
      </div>
      <TextField label="联系电话" value={form.phone} onChange={value => setForm({...form, phone: value})} />
      <TextField label="邮箱" type="email" value={form.email} onChange={value => setForm({...form, email: value})} />
      {role === 'admin' && (
        <TextField label="管理员密钥" type="password" value={form.adminKey} onChange={value => setForm({...form, adminKey: value})} />
      )}
      <button type="submit" disabled={loading}
        className="w-full bg-[#C49A2B] hover:bg-[#B08920] text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50">
        {loading ? '提交中...' : role === 'admin' ? '注册后台账户' : '注册用户账户'}
      </button>
      <div className="text-center text-sm">
        {role === 'admin' ? (
          <Link href="/admin/login" className="text-[#8B1A2B] hover:underline">返回后台登录</Link>
        ) : (
          <Link href="/" className="text-[#8B1A2B] hover:underline">返回首页</Link>
        )}
      </div>
    </form>
  )
}

function TextField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]"
        required />
    </div>
  )
}
