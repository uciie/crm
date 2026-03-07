import {
  Mail, PhoneCall, CalendarDays, FileText,
  MessageCircle, TrendingUp, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id:      string
  type:    'communication' | 'lead'
  subtype: string
  title:   string
  date:    string
  actor:   string
  target:  string | null
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

const COMM_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  email:    { icon: Mail,          color: 'text-blue-400'    },
  appel:    { icon: PhoneCall,     color: 'text-emerald-400' },
  reunion:  { icon: CalendarDays,  color: 'text-amber-400'   },
  réunion:  { icon: CalendarDays,  color: 'text-amber-400'   },
  note:     { icon: FileText,      color: 'text-slate-400'   },
  sms:      { icon: MessageCircle, color: 'text-violet-400'  },
}

const LEAD_STATUS_COLOR: Record<string, string> = {
  nouveau:     'text-slate-400',
  contacté:    'text-blue-400',
  qualifié:    'text-amber-400',
  proposition: 'text-violet-400',
  négociation: 'text-orange-400',
  gagné:       'text-emerald-400',
  perdu:       'text-red-400',
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isCom  = item.type === 'communication'
  const cfg    = isCom ? (COMM_ICONS[item.subtype] ?? COMM_ICONS.note) : null
  const Icon   = cfg?.icon ?? TrendingUp
  const color  = cfg?.color ?? (LEAD_STATUS_COLOR[item.subtype] ?? 'text-slate-400')

  const timeAgo = (() => {
    const diff = Date.now() - new Date(item.date).getTime()
    const mins  = Math.floor(diff / 60000)
    if (mins < 60)   return `il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24)  return `il y a ${hours} h`
    return new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  })()

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/50 last:border-0 group">
      {/* Icon */}
      <div className="w-7 h-7 shrink-0 flex items-center justify-center border border-slate-800 group-hover:border-slate-700 transition-colors mt-0.5">
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-300 truncate leading-none">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {item.actor && (
            <span className="text-[10px] text-slate-600 truncate max-w-28">{item.actor}</span>
          )}
          {item.target && (
            <>
              <span className="text-slate-800 text-[10px]">/</span>
              <span className="text-[10px] text-slate-600 truncate max-w-28">{item.target}</span>
            </>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-700">
        <Clock className="w-3 h-3" />
        {timeAgo}
      </div>
    </div>
  )
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="bg-slate-900 border border-slate-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="h-px w-6 bg-blue-500 mb-3" />
        <p className="text-xs font-bold text-slate-200 tracking-wide">
          Activite recente
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Derniers evenements enregistres
        </p>
      </div>

      {/* Items */}
      <div className="px-5 py-1">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-slate-700">Aucune activite recente</p>
          </div>
        ) : (
          items.slice(0, 8).map((item, i) => (
            <ActivityRow key={item.id ?? i} item={item} />
          ))
        )}
      </div>
    </div>
  )
}