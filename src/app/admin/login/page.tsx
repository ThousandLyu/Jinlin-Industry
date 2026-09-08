'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/admin/dashboard')
      } else {
        setError(data.message || data.error || '登录失败，请检查用户名和密码')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('登录验证超时，请检查服务状态后重试')
      } else {
        setError('登录失败，请稍后重试')
      }
    } finally {
      window.clearTimeout(timer)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(196,154,43,0.16),transparent_28%),linear-gradient(135deg,rgba(74,55,40,0.08),transparent_42%)]" />
      <div className="relative bg-[#FDFBF7] rounded-2xl shadow-panel p-8 w-full max-w-md border border-[#E8DCC8]">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#C49A2B] mb-2">ADMIN ARCHIVE</p>
          <h1 className="text-3xl font-bold text-[#4A3728]" style={{ fontFamily: "'Noto Serif SC', serif" }}>金陵工脉</h1>
          <p className="text-[#7C6A5A] mt-2 text-sm">后台管理系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4A3728] mb-1">用户名 / 邮箱 / 手机号</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8DCC8] rounded-lg bg-white focus:ring-2 focus:ring-[#C49A2B]/30 focus:border-[#C49A2B] outline-none transition"
              required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A3728] mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8DCC8] rounded-lg bg-white focus:ring-2 focus:ring-[#C49A2B]/30 focus:border-[#C49A2B] outline-none transition"
              required />
          </div>
          {error && <p className="rounded-lg border border-[#8B1A2B]/20 bg-[#8B1A2B]/10 px-3 py-2 text-[#8B1A2B] text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#4A3728] hover:bg-[#2D1F12] text-white py-3 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {loading ? '登录中...' : '登录'}
          </button>
          <div className="text-center text-sm">
            <Link href="/admin/register" className="text-[#8B1A2B] hover:underline">注册后台账户</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
