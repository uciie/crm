'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter }  from 'next/navigation'
import { useAuth }    from '@/hooks/useAuth'
import { api }        from '@/lib/api'
import { ContactForm } from '@/components/contacts/ContactForm'
import { Button }     from '@/components/ui/Button'

interface Contact {
  id:            string
  first_name:    string
  last_name:     string
  email?:        string
  phone?:        string
  job_title?:    string
  city?:         string
  is_subscribed: boolean
  avatar_url?:   string
  notes?:        string
  company?:      { id: string; name: string; logo_url?: string }
  assigned_to?:  { id: string; full_name: string }
}

interface Pagination {
  page:       number
  totalPages: number
  total:      number
}

export default function ContactsPage() {
  const router           = useRouter()
  const { isCommercial, isAdmin } = useAuth()
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [filters, setFilters]     = useState({ search: '', page: 1, limit: 20 })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      search: filters.search,
      page:   String(filters.page),
      limit:  String(filters.limit),
    })
    const data = await api.get(`/contacts?${params}`)
    setContacts(data.data)
    setPagination(data.pagination)
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce contact ?')) return
    await api.delete(`/contacts/${id}`)
    fetchContacts()
  }

  const handleEdit = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation()
    setEditContact(contact)
    setShowForm(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">{pagination.total} contacts au total</p>
        </div>
        {isCommercial && (
          <Button onClick={() => { setEditContact(null); setShowForm(true) }}>
            + Nouveau contact
          </Button>
        )}
      </div>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un contact..."
        value={filters.search}
        onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
      />

      {/* Tableau */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Contact', 'Entreprise', 'Poste', 'Ville', 'Email marketing', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(contact => (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="hover:bg-indigo-50/30 transition cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                        {contact.first_name[0]}{contact.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                        <p className="text-sm text-gray-500">{contact.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{contact.company?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{contact.job_title ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{contact.city ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                      contact.is_subscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {contact.is_subscribed ? 'Abonné' : 'Désabonné'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    {isCommercial && (
                      <button onClick={e => handleEdit(e, contact)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm mr-4">
                        Modifier
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={e => handleDelete(e, contact.id)}
                        className="text-red-500 hover:text-red-700 text-sm">
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Aucun contact trouvé</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                ← Précédent
              </button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Suivant →
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ContactForm
          contact={editContact}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchContacts() }}
        />
      )}
    </div>
  )
}