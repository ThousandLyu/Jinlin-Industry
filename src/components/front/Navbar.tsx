'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { label: '首页', href: '/' },
  { label: '时间轴', href: '/timeline' },
  { label: '工业地图', href: '/map' },
  { label: '企业遗址', href: '/sites' },
  { label: '人物故事', href: '/people' },
  { label: '史实核验', href: '/facts' },
  { label: '数字复原', href: '/scenes' },
  { label: '公益课程', href: '/courses' },
  { label: '活动记录', href: '/activities' },
  { label: '史料投稿', href: '/submit-source' },
  { label: '工脉文笺', href: '/ai-studio' },
  { label: '关于项目', href: '/about' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <nav className="bg-[#4A3728] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between min-h-16 py-2">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-wider" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                金陵工脉
              </span>
              <span className="hidden sm:inline text-[15px] font-medium text-[#D9B35A]">· 南京民族工业云展</span>
            </span>
          </Link>
          <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="切换导航菜单">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
          <div className="hidden lg:flex flex-1 flex-wrap items-center justify-end gap-1 pl-4">
            {navItems.map(item => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
              <Link key={item.href} href={item.href}
                className={`whitespace-nowrap rounded px-2.5 py-2 text-[13px] font-semibold tracking-wide transition-colors ${
                  isActive ? 'bg-[#C49A2B]/30 text-[#C49A2B]' : 'hover:bg-[#C49A2B]/20'
                }`}>
                {item.label}
              </Link>
              )
            })}
          </div>
        </div>
        {open && (
          <div className="lg:hidden grid grid-cols-2 gap-1 pb-4 sm:grid-cols-3">
            {navItems.map(item => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
              <Link key={item.href} href={item.href}
                className={`block px-3 py-2 text-base font-semibold rounded ${isActive ? 'bg-[#C49A2B]/30 text-[#C49A2B]' : 'hover:bg-[#C49A2B]/20'}`}
                onClick={() => setOpen(false)}>
                {item.label}
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}

function BrandMark() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#D9B35A]/35 bg-[#F5F0E8]/10 shadow-inner">
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-8 w-8 text-[#D9B35A]">
        <path d="M7 28.5H33" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M9 28V18.5L15.5 23V18.5L22 23V16H30V28" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M24 16V11H29V16" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M13 28V25M19 28V25M25 28V25" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M11 32C14 30.8 17 30.8 20 32C23 33.2 26 33.2 29 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    </span>
  )
}
