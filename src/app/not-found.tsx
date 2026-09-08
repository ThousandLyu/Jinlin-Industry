import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-6xl font-bold text-[#C49A2B] mb-4">404</div>
        <h1 className="text-xl font-bold text-[#4A3728] mb-2">页面未找到</h1>
        <p className="text-sm text-[#7C6A5A] mb-6">
          您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#C49A2B] text-white font-medium hover:bg-[#D4A83B] transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
