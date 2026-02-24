'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter }   from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { api }         from '@/lib/api'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { Button }      from '@/components/ui/Button'
import { Badge }       from '@/components/ui/Badge'
import { Spinner }     from '@/components/ui/Spinner'

interface Company {
  id:             string
  name:           string
  domain?:        string
  industry?:      string
  size?:          string
  city?:          string
  country?:       string
  logo_url?:      string
  annual_revenue?: number
  contacts_count: number
  created_at:     string
}

interface Pagination {
  page:       number
  totalPages: number
  total:      number
}

export default function CompaniesPage() {
  const router            = useRouter()
  const { isCommercial }  = useAuth()
  const [companies, setCompanies]   = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [filters, setFilters]       = useState({ search: '', page: 1, limit: 20 })

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      search: filters.search,
      page:   String(filters.page),
      limit:  String(filters.limit),
    })
    const data = await api.get(`/companies?${params}`)
    setCompanies(data.data)
    setPagination(data.pagination)
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entreprise ? Les contacts associés seront désassociés.')) return
    await api.delete(`/companies/${id}`)
    fetchCompanies()
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
          <p className="text-gray-500">{pagination.total} entreprises au total</p>
        </div>
        {isCommercial && (
          <Button onClick={() => { setEditCompany(null); setShowForm(true) }}>
            + Nouvelle entreprise
          </Button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Rechercher par nom, domaine..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Entreprise', 'Secteur', 'Taille', 'Ville', 'Contacts', 'CA Annuel', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map(company => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/companies/${company.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {company.logo_url
                          ? <img src={company.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                          : company.name[0].toUpperCase()
                        }
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{company.name}</p>
                        {company.domain && <p className="text-sm text-gray-400">{company.domain}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{company.industry ?? '—'}</td>
                  <td className="px-6 py-4">
                    {company.size
                      ? <Badge label={company.size} color="#6366f1" bg="#eef2ff" />
                      : <span className="text-sm text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {company.city ? `${company.city}, ${company.country ?? ''}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {company.contacts_count} contact{company.contacts_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {company.annual_revenue
                      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(company.annual_revenue))
                      : '—'
                    }
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    {isCommercial && (
                      <button
                        onClick={() => { setEditCompany(company); setShowForm(true) }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm mr-4"
                      >
                        Modifier
                      </button>
                    )}
                    {useAuth().isAdmin && (
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Aucune entreprise trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Précédent
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <CompanyForm
          company={editCompany}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchCompanies() }}
        />
      )}
    </div>
  )
}