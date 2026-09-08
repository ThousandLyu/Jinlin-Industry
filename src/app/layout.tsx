import type { Metadata } from 'next'
import '@/styles/globals.css'
import Navbar from '@/components/front/Navbar'
import Footer from '@/components/front/Footer'
import DigitalHuman from '@/components/front/DigitalHuman'
import AIWarmup from '@/components/front/AIWarmup'

export const metadata: Metadata = {
  title: '金陵工脉 — 南京民族工业云展览与史料库',
  description: '金陵工脉·薪火传承——南京民族工业记忆数字复原与公益传承项目',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-[#F5F0E8] text-[#4A3728]">
        <Navbar />
        <main className="page-enter flex-1">{children}</main>
        <Footer />
        <DigitalHuman />
        <AIWarmup />
      </body>
    </html>
  )
}
