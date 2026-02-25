'use client'
import { useState, useEffect } from 'react'
import { Modal }               from '@/components/ui/Modal'
import { Button }              from '@/components/ui/Button'
import { api }                 from '@/lib/api'
import type { Contact }        from '@/types'

interface ContactFormProps {
  contact?: Contact | null
  onClose:  () => void
  onSave:   () => void
}

export function ContactForm({ contact, onClose, onSave }: ContactFormProps) {
  const isEdit = !!contact?.id
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState({
    first_name: '', last_name: '', email: '', phone: '',
    job_title: '', city: '', notes: '', is_subscribed: true,
  })

  useEffect(() => {
    if (contact) {
      setForm({
        first_name:    contact.first_name    ?? '',
        last_name:     contact.last_name     ?? '',
        email:         contact.email         ?? '',
        phone:         contact.phone         ?? '',
        job_title:     contact.job_title     ?? '',
        city:          contact.city          ?? '',
        notes:         contact.notes         ?? '',
        is_subscribed: contact.is_subscribed ?? true,
      })
    }
  }, [contact])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) await api.patch(`/contacts/${contact!.id}`, form)
      else        await api.post('/contacts', form)
      onSave()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Modifier le contact' : 'Nouveau contact'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'first_name', label: 'Prénom *', required: true, type: 'text' },
            { key: 'last_name',  label: 'Nom *',    required: true, type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} required={f.required} value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
          ))}
        </div>

        {[
          { key: 'email',     label: 'Email',   type: 'email' },
          { key: 'phone',     label: 'Téléphone', type: 'tel' },
          { key: 'job_title', label: 'Poste',   type: 'text' },
          { key: 'city',      label: 'Ville',   type: 'text' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"/>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"/>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_subscribed} onChange={e => set('is_subscribed', e.target.checked)}
            className="rounded"/>
          <span className="text-sm text-gray-700">Abonné aux emails marketing</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}