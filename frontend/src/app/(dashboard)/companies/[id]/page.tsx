'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api }        from '@/lib/api'
import { useAuth }    from '@/hooks/useAuth'
import { Button }     from '@/components/ui/Button'
import { Badge }      from '@/components/ui/Badge'
import { Spinner }    from '@/components/ui/Spinner'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CompanyDetail {
  id:             string
  name:           string
  domain?:        string
  industry?:      string
  size?:          string
  website?:       string
  phone?:         string
  address?:       string
  city?:          string
  country?:       string
  logo_url?:      string
  annual_revenue?: number
  notes?:         string
  created_at:     string
  updated_at:     string
  contacts: {
    id:         string
    first_name: string
    last_name:  string
    email?:     string
    job_title?: string
    phone?:     string
    avatar_url?: string
  }[]
}

const SIZE_LABELS: Record<string, string> = {
  '1-10':    'TPE (1-10)',
  '11-50':   'PME (11-50)',
  '51-200':  'ETI (51-200)',
  '201-500': 'Grande (201-500)',
  '500+':    'Très grande (500+)',
}

export default function CompanyDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { isCommercial, isAdmin } = useAuth()

  const [company, setCompany]   = useState<CompanyDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const load = async () => {
    const data = await api.get(`/companies/${id}`)
    setCompany(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    if (!confirm('Supprimer cette entreprise ? Les contacts associés seront désassociés.')) return
    await api.delete(`/companies/${id}`)
    router.push('/companies')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  )

  if (!company) return (
    <div className="p-8 text-red-500">Entreprise introuvable</div>
  )

  return (
    <div className="flex gap-6 p-6 h-full">
      {/* Colonne gauche */}
      <aside className="w-72 shrink-0 space-y-4">
        {/* En-tête */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-3">
            {company.logo_url
              ? <img src={company.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              : company.name[0].toUpperCase()
            }
          </div>
          <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
          {company.industry && <p className="text-sm text-gray-500 mt-1">{company.industry}</p>}
          {company.size && (
            <Badge
              label={SIZE_LABELS[company.size] ?? company.size}
              color="#6366f1"
              bg="#eef2ff"
              className="mt-2"
            />
          )}
        </div>

        {/* Coordonnées */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations</h3>
          {company.website && (
            <div className="flex items-center gap-2 text-sm">
              <span>🌐</span>
              <a href={company.website} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline truncate">
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>📞</span>{company.phone}
            </div>
          )}
          {company.city && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>📍</span>{company.city}, {company.country ?? 'France'}
            </div>
          )}
          {company.domain && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>🔗</span>{company.domain}
            </div>
          )}
          {company.annual_revenue && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>💰</span>{formatCurrency(company.annual_revenue)} / an
            </div>
          )}
          <div className="pt-1 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>Créée le {formatDate(company.created_at)}</p>
            <p>Mise à jour le {formatDate(company.updated_at)}</p>
          </div>
        </div>

        {/* Notes */}
        {company.notes && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{company.notes}</p>
          </div>
        )}

        {/* Actions */}
        {isCommercial && (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => setShowEdit(true)}>
              ✏️ Modifier l'entreprise
            </Button>
            {isAdmin && (
              <Button variant="danger" className="w-full" onClick={handleDelete}>
                🗑️ Supprimer
              </Button>
            )}
          </div>
        )}
      </aside>

      {/* Colonne droite — Contacts associés */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Contacts associés
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({company.contacts.length})
              </span>
            </h2>
            {isCommercial && (
              <button
                onClick={() => router.push(`/contacts?company_id=${id}`)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Voir tous →
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {company.contacts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Aucun contact associé à cette entreprise.
              </div>
            ) : (
              company.contacts.map(contact => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                    {contact.first_name[0]}{contact.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.job_title ?? '—'}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {contact.email && (
                      <p className="text-indigo-600 truncate max-w-48">{contact.email}</p>
                    )}
                    {contact.phone && (
                      <p className="text-gray-400">{contact.phone}</p>
                    )}
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal édition */}
      {showEdit && (
        <CompanyForm
          company={company}
          onClose={() => setShowEdit(false)}
          onSave={async () => { setShowEdit(false); await load() }}
        />
      )}
    </div>
  )
}