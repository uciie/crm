'use client'
import { useEffect, useState }      from 'react'
import { api }                      from '@/lib/api'
import { useAuth }                  from '@/hooks/useAuth'
import { useToast }                 from '@/hooks/useToast'
import { StatsCard }                from '@/components/dashboard/StatsCard'
import { ConversionChart }          from '@/components/dashboard/ConversionChart'
import { ActivityFeed }             from '@/components/dashboard/ActivityFeed'
import { formatCurrency }           from '@/lib/utils'
import type { DashboardKpis }       from '@/types'

const FUNNEL_COLORS: Record<string, string> = {
  nouveau:'#94a3b8', contacté:'#60a5fa', qualifié:'#f59e0b',
  proposition:'#a78bfa', négociation:'#f97316', gagné:'#34d399', perdu:'#f87171',
}

export default function DashboardPage() {
  const { profile }                       = useAuth()
  const [kpis, setKpis]                   = useState<DashboardKpis | null>(null)
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([])
  const [activity, setActivity]           = useState<any[]>([])
  const [loading, setLoading]             = useState(false)

  useEffect(() => {
    if (!profile) return

    const load = async () => {
      try {
        setLoading(true)
        const [k, l, a] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/leads-by-status'),
          api.get('/dashboard/activity'),
        ])
        setKpis(k)
        setLeadsByStatus(l)
        setActivity(a)
      } catch (error) {
        console.error('Erreur chargement dashboard', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [profile])

  const funnelData = leadsByStatus.map((s: any) => ({
    stage: s.status, count: Number(s.count),
    value: Number(s.total_value), color: FUNNEL_COLORS[s.status] ?? '#94a3b8',
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">
          Bonjour, {profile?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-gray-500">Voici votre résumé du jour.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="CA ce mois"         value={kpis ? formatCurrency(kpis.revenue_this_month) : '—'} color="#6366f1" sub="+12% vs mois dernier" loading={loading} />
        <StatsCard label="Taux de conversion" value={kpis ? `${kpis.conversion_rate}%` : '—'}              color="#34d399" sub="Leads gagnés / total"  loading={loading} />
        <StatsCard label="Tâches en retard"   value={kpis?.overdue_tasks ?? '—'}                           color="#f87171" sub="À traiter en priorité" loading={loading} />
        <StatsCard label="Nouveaux contacts"  value={kpis?.new_contacts  ?? '—'}                           color="#f59e0b" sub="Ce mois-ci"             loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ConversionChart data={funnelData} />
        <ActivityFeed    items={activity}  />
      </div>
    </div>
  )
}