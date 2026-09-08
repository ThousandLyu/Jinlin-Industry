export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#C49A2B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#7C6A5A] text-sm">加载中…</p>
      </div>
    </div>
  )
}
