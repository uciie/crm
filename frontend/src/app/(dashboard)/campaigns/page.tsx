'use client'
import { useEffect, useState } from 'react'
import { api }                 from '@/lib/api'
import { Badge }               from '@/components/ui/Badge'
import { Spinner }             from '@/components/ui/Spinner'
import { Button }              from '@/components/ui/Button'
import { formatDate }          from '@/lib/utils'
import { CampaignModal }       from '@/components/campaigns/CampaignModal'
import type { EmailCampaign }  from '@/types'

const STATUS_CFG = {
  brouillon: { color: '#94a3b8', bg: '#f8fafc' },
  planifiée: { color: '#f59e0b', bg: '#fffbeb' },
  envoyée:   { color: '#34d399', bg: '#f0fdf4' },
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)          // ← état modal

  const loadCampaigns = () => {
    setLoading(true)
    api.get('/email/campaigns')
      .then(setCampaigns)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCampaigns() }, [])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Campagnes email</h1>
          <p className="text-sm text-gray-500">Powered by Brevo</p>
        </div>

        {/* ← Bouton désormais fonctionnel */}
        <Button onClick={() => setShowModal(true)}>
          + Nouvelle campagne
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Campagne', 'Statut', 'Envois', 'Taux ouv.', 'Taux clic', 'Planifiée le'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(c => {
                const scfg = STATUS_CFG[c.status] ?? STATUS_CFG.brouillon
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.subject}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={c.status} color={scfg.color} bg={scfg.bg} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {c.sent_count.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {c.open_rate  ? `${c.open_rate}%`  : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {c.click_rate ? `${c.click_rate}%` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {formatDate(c.scheduled_at ?? c.sent_at)}
                    </td>
                  </tr>
                )
              })}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                    Aucune campagne
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSaved={newCampaign => {
            setShowModal(false)
            setCampaigns(prev => [newCampaign, ...prev])  // ajout en tête de liste
          }}
        />
      )}
    </div>
  )
}