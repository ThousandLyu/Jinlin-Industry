'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-5xl mb-4">!</div>
        <h1 className="text-xl font-bold text-[#4A3728] mb-2">页面加载出错</h1>
        <p className="text-sm text-[#7C6A5A] mb-6">
          {error.message || '发生了未知错误，请稍后重试。'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#C49A2B] text-white font-medium hover:bg-[#D4A83B] transition-colors"
        >
          重新加载
        </button>
      </div>
    </div>
  )
}
