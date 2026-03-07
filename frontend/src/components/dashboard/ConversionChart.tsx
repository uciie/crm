'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface FunnelItem {
  stage: string
  count: number
  value: number
  color: string
}

interface ConversionChartProps {
  data: FunnelItem[]
}

const STAGE_LABELS: Record<string, string> = {
  nouveau:     'Nouveau',
  contacte:    'Contacte',
  contacté:    'Contacte',
  qualifie:    'Qualifie',
  qualifié:    'Qualifie',
  proposition: 'Proposition',
  negociation: 'Negociation',
  négociation: 'Negociation',
  gagne:       'Gagne',
  gagné:       'Gagne',
  perdu:       'Perdu',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as FunnelItem
  return (
    <div className="bg-slate-900 border border-slate-700 px-3 py-2.5 shadow-xl shadow-black/40">
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1">
        {STAGE_LABELS[d.stage] ?? d.stage}
      </p>
      <p className="text-sm font-bold text-slate-100">{d.count} lead{d.count !== 1 ? 's' : ''}</p>
      {d.value > 0 && (
        <p className="text-xs text-slate-400 mt-0.5">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(d.value)}
        </p>
      )}
    </div>
  )
}

export function ConversionChart({ data }: ConversionChartProps) {
  const chartData = data.map(d => ({
    ...d,
    label: STAGE_LABELS[d.stage] ?? d.stage,
  }))

  return (
    <div className="bg-slate-900 border border-slate-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="h-px w-6 bg-blue-500 mb-3" />
        <p className="text-xs font-bold text-slate-200 tracking-wide">
          Repartition des leads
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Volume par etape du pipeline
        </p>
      </div>

      {/* Chart */}
      <div className="p-5">
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-slate-700">Aucune donnee disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={0}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}