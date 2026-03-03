import type { KanbanColumn as KanbanColumnType } from '@/types'
import { DealCard } from './DealCard'
import { formatCurrency } from '@/lib/utils'

interface KanbanColumnProps {
  column:     KanbanColumnType
  onDrop:     (e: React.DragEvent, stageId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDragStart:(e: React.DragEvent, dealId: string) => void
}

export function KanbanColumn({ column, onDrop, onDragOver, onDragStart }: KanbanColumnProps) {
  return (
    <div className="shrink-0 w-64 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: column.color }} />
        <span className="text-sm font-semibold text-gray-100 flex-1 truncate">{column.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
          {column.deals.length}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3 font-medium">{formatCurrency(column.total_value)}</p>
      <div
        className="flex-1 space-y-2 min-h-32 rounded-xl p-2 border-2 border-dashed border-gray-200 bg-gray-50/50 transition-colors"
        onDrop={e => onDrop(e, column.id)}
        onDragOver={onDragOver}
      >
        {column.deals.map(deal => (
          <DealCard key={deal.deal_id} deal={deal} stageColor={column.color} onDragStart={onDragStart} />
        ))}
        {column.deals.length === 0 && (
          <div className="h-16 flex items-center justify-center text-xs text-gray-400 text-center">
            Déposez ici
          </div>
        )}
      </div>
    </div>
  )
}