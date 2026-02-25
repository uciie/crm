'use client'
import { useState, useCallback } from 'react'
import { useLeads }   from '@/hooks/useLeads'
import { useAuth }    from '@/hooks/useAuth'
import { Badge }      from '@/components/ui/Badge'
import { Button }     from '@/components/ui/Button'
import { Spinner }    from '@/components/ui/Spinner'
import { Modal }      from '@/components/ui/Modal'
import { api }        from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  nouveau:     { color: '#94a3b8', bg: '#f8fafc' },
  contacté:    { color: '#60a5fa', bg: '#eff6ff' },
  qualifié:    { color: '#f59e0b', bg: '#fffbeb' },
  proposition: { color: '#a78bfa', bg: '#f5f3ff' },
  négociation: { color: '#f97316', bg: '#fff7ed' },
  gagné:       { color: '#34d399', bg: '#f0fdf4' },
  perdu:       { color: '#f87171', bg: '#fef2f2' },
}

const STATUS_LIST = ['nouveau', 'contacté', 'qualifié', 'proposition', 'négociation', 'gagné', 'perdu']

export default function LeadsPage() {
  const { leads, loading, refetch } = useLeads()
  const { isCommercial } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({
    title: '', status: 'nouveau', value: '', probability: '0',
    expected_close_date: '', source: '', notes: '',
  })

  const set = (k: string, v: string) => setNewLead(p => ({ ...p, [k]: v }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLead.title.trim()) { setFormError('Le titre est obligatoire'); return }
    setFormError(null)
    setSubmitting(true)
    try {
      await api.post('/leads', {
        title:               newLead.title,
        status:              newLead.status,
        value:               newLead.value ? Number(newLead.value) : undefined,
        probability:         Number(newLead.probability),
        expected_close_date: newLead.expected_close_date || undefined,
        source:              newLead.source || undefined,
        notes:               newLead.notes  || undefined,
      })
      setShowForm(false)
      setNewLead({ title: '', status: 'nouveau', value: '', probability: '0', expected_close_date: '', source: '', notes: '' })
      refetch()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} opportunités</p>
        </div>
        {isCommercial && (
          <Button onClick={() => setShowForm(true)}>+ Nouveau lead</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Opportunité', 'Contact', 'Valeur', 'Probabilité', 'Statut', 'Clôture'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map(lead => {
                const scfg = STATUS_CFG[lead.status] ?? STATUS_CFG.nouveau
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-800">{lead.title}</p>
                      {lead.company && <p className="text-xs text-gray-400">{lead.company.name}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {lead.contact ? `${lead.contact.first_name} ${lead.contact.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{formatCurrency(lead.value)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${lead.probability}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{lead.probability}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={lead.status} color={scfg.color} bg={scfg.bg} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(lead.expected_close_date)}</td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Aucun lead trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création lead */}
      {showForm && (
        <Modal title="Nouveau lead" onClose={() => setShowForm(false)} size="md">
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{formError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input autoFocus required value={newLead.title} onChange={e => set('title', e.target.value)}
                placeholder="Ex: Projet ERP — ACME Corp"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={newLead.status} onChange={e => set('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                  {STATUS_LIST.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input value={newLead.source} onChange={e => set('source', e.target.value)}
                  placeholder="LinkedIn, Referral..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valeur (€)</label>
                <input type="number" min="0" value={newLead.value} onChange={e => set('value', e.target.value)}
                  placeholder="ex: 25000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probabilité (%)</label>
                <input type="number" min="0" max="100" value={newLead.probability} onChange={e => set('probability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture prévue</label>
              <input type="date" value={newLead.expected_close_date} onChange={e => set('expected_close_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={3} value={newLead.notes} onChange={e => set('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Création...' : 'Créer le lead'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}