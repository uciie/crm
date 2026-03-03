'use client'
import { useRef }          from 'react'
import { useKanban }       from '@/hooks/useLeads'
import { KanbanColumn }    from './KanbanColumn'
import { Spinner }         from '@/components/ui/Spinner'

export function KanbanBoard() {
  const { columns, loading, moveDeal } = useKanban()
  const draggedDealId                  = useRef<string | null>(null)

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    draggedDealId.current = dealId
  }

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (draggedDealId.current) {
      await moveDeal(draggedDealId.current, stageId)
      draggedDealId.current = null
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
      {columns.map(col => (
        <KanbanColumn
          key={col.id}
          column={col}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      ))}
    </div>
  )
}