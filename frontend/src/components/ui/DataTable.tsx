'use client'
import { Spinner } from './Spinner'

interface Column<T> {
  key:      string
  label:    string
  render?:  (row: T) => React.ReactNode
  width?:   string
}

interface DataTableProps<T> {
  columns:  Column<T>[]
  data:     T[]
  loading?: boolean
  empty?:   string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id: string }>({
  columns, data, loading, empty = 'Aucune donnée', onRowClick
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width }}
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400 text-sm">{empty}</td>
            </tr>
          ) : data.map(row => (
            <tr key={row.id}
              className={`hover:bg-gray-50 transition ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={col.key} className="px-5 py-3.5 text-sm text-gray-700">
                  {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}