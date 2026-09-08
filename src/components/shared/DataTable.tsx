'use client'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render: (item: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  emptyMessage?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
  className?: string
}

export default function DataTable<T extends { id: string }>({
  columns, data, emptyMessage = '暂无数据',
  sortField, sortDir, onSort, className = '',
}: DataTableProps<T>) {
  return (
    <div className={`admin-table-wrap ${className}`}>
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`${col.sortable && onSort ? 'cursor-pointer select-none hover:bg-[#E8DCC8]' : ''} ${col.className || ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortField === col.key && (
                    <span className="text-[#C49A2B]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              {columns.map(col => (
                <td key={col.key} className={col.className || ''}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="py-8 text-center text-gray-400">{emptyMessage}</p>
      )}
    </div>
  )
}
