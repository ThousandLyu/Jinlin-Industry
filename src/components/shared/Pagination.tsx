'use client'

export interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, totalItems, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#E8DCC8] bg-[#FDFBF7] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-gray-500">共 {totalItems} 条</span>
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="上一页"
          className="admin-button admin-button-outline min-h-9 px-3"
        >
          上一页
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="admin-button admin-button-outline min-h-9 px-3">1</button>
            {start > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`admin-button min-h-9 px-3 ${p === page ? 'admin-button-primary' : 'admin-button-outline'}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="admin-button admin-button-outline min-h-9 px-3">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="下一页"
          className="admin-button admin-button-outline min-h-9 px-3"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
