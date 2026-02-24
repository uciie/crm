'use client'
import { useState, useEffect } from 'react'
import { Modal }  from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api }    from '@/lib/api'

interface CompanyFormProps {
  company?: any | null
  onClose:  () => void
  onSave:   () => void
}

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']
const INDUSTRY_OPTIONS = [
  'Technologie', 'Finance', 'Santé', 'Commerce', 'Industrie',
  'Immobilier', 'Éducation', 'Conseil', 'Médias', 'Autre'
]

export function CompanyForm({ company, onClose, onSave }: CompanyFormProps) {
  const isEdit = !!company?.id
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm] = useState({
    name:           '',
    domain:         '',
    industry:       '',
    size:           '',
    website:        '',
    phone:          '',
    address:        '',
    city:           '',
    country:        'France',
    annual_revenue: '',
    notes:          '',
  })

  useEffect(() => {
    if (company) {
      setForm({
        name:           company.name           ?? '',
        domain:         company.domain         ?? '',
        industry:       company.industry       ?? '',
        size:           company.size           ?? '',
        website:        company.website        ?? '',
        phone:          company.phone          ?? '',
        address:        company.address        ?? '',
        city:           company.city           ?? '',
        country:        company.country        ?? 'France',
        annual_revenue: company.annual_revenue ?? '',
        notes:          company.notes          ?? '',
      })
    }
  }, [company])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setError(null)
    setLoading(true)
    try {
      const payload = {
        ...form,
        annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : undefined,
        domain:   form.domain   || undefined,
        industry: form.industry || undefined,
        size:     form.size     || undefined,
        website:  form.website  || undefined,
        phone:    form.phone    || undefined,
        address:  form.address  || undefined,
        city:     form.city     || undefined,
        notes:    form.notes    || undefined,
      }
      if (isEdit) await api.patch(`/companies/${company.id}`, payload)
      else        await api.post('/companies', payload)
      onSave()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Nom + Domaine */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domaine</label>
            <input value={form.domain} onChange={e => set('domain', e.target.value)}
              placeholder="ex: exemple.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* Secteur + Taille */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <select value={form.industry} onChange={e => set('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Choisir —</option>
              {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
            <select value={form.size} onChange={e => set('size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Choisir —</option>
              {SIZE_OPTIONS.map(o => <option key={o} value={o}>{o} employés</option>)}
            </select>
          </div>
        </div>

        {/* Website + Téléphone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
            <input value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* Ville + Pays */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            <input value={form.city} onChange={e => set('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            <input value={form.country} onChange={e => set('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* CA Annuel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chiffre d'affaires annuel (€)</label>
          <input
            type="number"
            min="0"
            value={form.annual_revenue}
            onChange={e => set('annual_revenue', e.target.value)}
            placeholder="ex: 5000000"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}