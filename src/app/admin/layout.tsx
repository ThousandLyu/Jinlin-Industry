'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { label: '数据看板', href: '/admin/dashboard', icon: 'DB' },
  { label: '史料库管理', href: '/admin/sources', icon: 'SR' },
  { label: '企业遗址', href: '/admin/sites', icon: 'ST' },
  { label: '人物管理', href: '/admin/people', icon: 'PE' },
  { label: '时间轴', href: '/admin/timeline', icon: 'TL' },
  { label: '地图点位', href: '/admin/map', icon: 'MP' },
  { label: '数字场景', href: '/admin/scenes', icon: 'SC' },
  { label: '公益课程', href: '/admin/courses', icon: 'CS' },
  { label: '活动记录', href: '/admin/activities', icon: 'AC' },
  { label: '媒体文件', href: '/admin/media', icon: 'MD' },
  { label: 'AI检索测试', href: '/admin/ai', icon: 'AI' },
  { label: '系统设置', href: '/admin/settings', icon: 'SE' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ name?: string; username?: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAuthed(true)
          setProfile(data)
        }
        else router.push('/admin/login')
      })
      .catch(() => router.push('/admin/login'))
  }, [router])

  if (pathname === '/admin/login' || pathname === '/admin/register') return <>{children}</>

  if (!authed) return <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center"><p className="text-gray-400">验证中...</p></div>

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed left-4 top-4 z-50 rounded-md bg-[#4A3728] p-2 text-white shadow-lg lg:hidden">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-[#3A2A1E] text-white shadow-2xl transition-transform lg:static lg:translate-x-0`}>
        <div className="border-b border-white/10 p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#D9B35A]">ADMIN</p>
          <h2 className="mt-1 text-lg font-bold">金陵工脉后台</h2>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${pathname === item.href ? 'bg-[#C49A2B] text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="admin-nav-symbol">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 mt-4">
          <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white" target="_blank">
            <span className="admin-nav-symbol">FE</span><span>返回前台</span>
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
            <span className="admin-nav-symbol">EX</span><span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/30 z-30" />}

      <main className="flex-1 ml-0 lg:ml-0 min-h-screen overflow-x-auto">
        <div className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-[#E8DCC8] bg-[#F5F0E8]/95 px-4 py-3 backdrop-blur lg:px-8">
          <span className="text-sm text-gray-600 max-w-[200px] truncate inline-block">当前账号：<strong className="text-[#4A3728]">{profile?.name || profile?.username || '管理员'}</strong></span>
          <button onClick={handleLogout} className="rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-sm text-[#4A3728] hover:bg-[#FDFBF7]">
            退出
          </button>
        </div>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
