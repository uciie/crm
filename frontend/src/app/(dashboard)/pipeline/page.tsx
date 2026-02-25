'use client'
import { useState } from 'react'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Modal }       from '@/components/ui/Modal'
import { Button }      from '@/components/ui/Button'
import { api }         from '@/lib/api'
import { useAuth }     from '@/hooks/useAuth'

const STATUS_LIST = ['nouveau', 'contacté', 'qualifié', 'proposition', 'négociation', 'gagné', 'perdu']

export default function PipelinePage() {
  const { isCommercial }  = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [newLead, setNewLead] = useState({
    title: '', status: 'nouveau', value: '', probability: '0',
    expected_close_date: '', source: '',
  })

  const set = (k: string, v: string) => setNewLead(p => ({ ...p, [k]: v }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLead.title.trim()) { setFormError('Le titre est obligatoire'); return }
    setFormError(null)
    setSubmitting(true)
    try {
      // Crée le lead
      const lead = await api.post('/leads', {
        title:               newLead.title,
        status:              newLead.status,
        value:               newLead.value ? Number(newLead.value) : undefined,
        probability:         Number(newLead.probability),
        expected_close_date: newLead.expected_close_date || undefined,
        source:              newLead.source || undefined,
      })
      // Crée le deal dans le pipeline (première étape)
      await api.post('/pipeline/deals', { lead_id: lead.id })
      setShowForm(false)
      setNewLead({ title: '', status: 'nouveau', value: '', probability: '0', expected_close_date: '', source: '' })
      setRefreshKey(k => k + 1) // Force le rechargement du Kanban
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Pipeline de vente</h1>
          <p className="text-sm text-gray-500">Glissez-déposez les deals pour les déplacer</p>
        </div>
        {isCommercial && (
          <Button onClick={() => { setShowForm(true); setFormError(null) }}>
            + Nouveau lead
          </Button>
        )}
      </div>

      <KanbanBoard key={refreshKey} />

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input value={newLead.source} onChange={e => set('source', e.target.value)}
                  placeholder="LinkedIn, Referral..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture prévue</label>
                <input type="date" value={newLead.expected_close_date} onChange={e => set('expected_close_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Création...' : 'Créer & ajouter au pipeline'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}