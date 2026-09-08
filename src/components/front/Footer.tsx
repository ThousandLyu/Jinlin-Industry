import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#4A3728] text-[#F5F0E8] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-[#C49A2B] mb-2">金陵工脉</h3>
            <p className="text-sm opacity-80">南京民族工业记忆数字复原与公益传承项目</p>
            <p className="text-sm opacity-60 mt-1">金线游·民族工业·红旅赛道</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#C49A2B] mb-2">快速链接</h3>
            <div className="space-y-1 text-sm opacity-80">
              <div><Link href="/timeline" className="hover:text-[#C49A2B] transition-colors">工业时间轴</Link> ｜ <Link href="/map" className="hover:text-[#C49A2B] transition-colors">工业地图</Link> ｜ <Link href="/sites" className="hover:text-[#C49A2B] transition-colors">企业遗址</Link></div>
              <div><Link href="/people" className="hover:text-[#C49A2B] transition-colors">人物故事</Link> ｜ <Link href="/facts" className="hover:text-[#C49A2B] transition-colors">史实核验</Link> ｜ <Link href="/scenes" className="hover:text-[#C49A2B] transition-colors">数字复原</Link></div>
              <div><Link href="/courses" className="hover:text-[#C49A2B] transition-colors">公益课程</Link> ｜ <Link href="/activities" className="hover:text-[#C49A2B] transition-colors">活动记录</Link> ｜ <Link href="/about" className="hover:text-[#C49A2B] transition-colors">关于项目</Link></div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#C49A2B] mb-2">联系我们</h3>
            <p className="text-sm opacity-80">南京市 · 民族工业公益传承项目组</p>
            <p className="text-sm opacity-60">© 2026 金陵工脉 · All Rights Reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}