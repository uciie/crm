import { Clock }           from 'lucide-react'
import type { PipelineDeal } from '@/types'
import { formatCurrency }    from '@/lib/utils'

interface DealCardProps {
  deal:        PipelineDeal
  stageColor:  string
  onDragStart?: (e: React.DragEvent, dealId: string) => void
}

export function DealCard({ deal, stageColor, onDragStart }: DealCardProps) {
  const lead   = deal.lead
  const company = deal.company
  const daysIn  = Math.floor(
    (Date.now() - new Date(deal.entered_stage_at).getTime()) / 86_400_000
  )

  return (
    <div
      draggable
      onDragStart={e => onDragStart?.(e, deal.deal_id)}
      className="bg-slate-900 border border-slate-800 p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-200 leading-tight flex-1">
          {lead?.title}
        </p>
        {/* Icone Clock Lucide — remplace le texte "Xj" brut */}
        <div className="flex items-center gap-1 text-slate-700 shrink-0">
          <Clock className="w-2.5 h-2.5" aria-hidden="true" />
          <span className="text-[10px] font-mono">{daysIn}j</span>
        </div>
      </div>

      {company && (
        <p className="text-[10px] text-slate-600 mb-2">{company.name}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">
          {formatCurrency(lead?.value)}
        </span>
        <div className="flex items-center gap-1.5">
          {deal.assignee && (
            <div
              className="w-5 h-5 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: stageColor }}
              title={deal.assignee.full_name}
            >
              {deal.assignee.full_name?.[0]}
            </div>
          )}
          <span className="text-[10px] text-slate-600 font-mono">
            {lead?.probability}%
          </span>
        </div>
      </div>

      {/* Barre de probabilité */}
      <div className="mt-2 h-px bg-slate-800 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${lead?.probability ?? 0}%`, background: stageColor }}
        />
      </div>
    </div>
  )
}