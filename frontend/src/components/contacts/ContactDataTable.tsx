'use client'
// ============================================================
// components/contacts/ContactsDataTable.tsx
// Tableau principal des contacts — recherche, filtres, tri, pagination
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserPlus,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from 'lucide-react'
import { contactsService }    from '@/services/contacts.service'
import { companiesService }   from '@/services/companies.service'
import { useToast }           from '@/hooks/useToast'
import { useAuth }            from '@/hooks/useAuth'
import { TableSkeleton }      from '@/components/ui/Skeleton'
import { cn }                 from '@/lib/utils'
import type {
  Contact,
  CompanyOption,
  ContactFilters,
  SortDirection,
  Pagination,
} from '@/types/crm.types'

// ── Types internes ────────────────────────────────────────────

type SortField = 'last_name' | 'created_at' | 'updated_at' | 'email'

interface SortState {
  field: SortField
  dir:   SortDirection
}

interface ContactsDataTableProps {
  onCreateClick: () => void
  onEditClick:   (contact: Contact) => void
  refreshKey?:   number
}

// ── Sous-composants ───────────────────────────────────────────

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-700" />
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-400" />
    : <ChevronDown className="w-3 h-3 text-blue-400" />
}

function ContactAvatar({ contact }: { contact: Contact }) {
  const initials = `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()
  if (contact.avatar_url) {
    return (
      <img
        src={contact.avatar_url}
        alt={`${contact.first_name} ${contact.last_name}`}
        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold text-blue-300">{initials}</span>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export function ContactsDataTable({
  onCreateClick,
  onEditClick,
  refreshKey = 0,
}: ContactsDataTableProps) {
  const router               = useRouter()
  const { toast }            = useToast()
  const { isAdmin, isCommercial } = useAuth()

  // État données
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 1,
  })
  const [loading, setLoading]       = useState(true)
  const [companies, setCompanies]   = useState<CompanyOption[]>([])

  // État UI
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [openMenuId, setOpenMenuId]   = useState<string | null>(null)

  // Filtres
  const [search, setSearch]                   = useState('')
  const [filterCompany, setFilterCompany]     = useState('')
  const [filterSubscribed, setFilterSubscribed] = useState<'' | 'true' | 'false'>('')
  const [sort, setSort]                       = useState<SortState>({ field: 'updated_at', dir: 'desc' })
  const [page, setPage]                       = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Chargement des options d'entreprises une seule fois
  useEffect(() => {
    companiesService.listOptions().then(setCompanies).catch(() => {})
  }, [])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const filters: ContactFilters = {
        search:       search || undefined,
        company_id:   filterCompany || undefined,
        is_subscribed: filterSubscribed !== '' ? filterSubscribed === 'true' : undefined,
        page,
        limit:        20,
      }
      const data = await contactsService.list(filters)
      setContacts(data.data)
      setPagination(data.pagination)
    } catch {
      toast('error', 'Erreur de chargement', 'Impossible de récupérer les contacts.')
    } finally {
      setLoading(false)
    }
  }, [search, filterCompany, filterSubscribed, page, toast, refreshKey])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Debounce recherche
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(fetchContacts, 300)
  }

  // Tri client-side (le backend ne supporte pas encore le sort via query)
  const sortedContacts = [...contacts].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1
    const va  = (a as any)[sort.field] ?? ''
    const vb  = (b as any)[sort.field] ?? ''
    return va < vb ? -mul : va > vb ? mul : 0
  })

  const toggleSort = (field: SortField) => {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Supprimer ${contact.first_name} ${contact.last_name} ?`)) return
    setDeletingId(contact.id)
    try {
      await contactsService.remove(contact.id)
      toast('success', 'Contact supprimé', `${contact.first_name} ${contact.last_name} a été supprimé.`)
      fetchContacts()
    } catch {
      toast('error', 'Erreur de suppression', 'La suppression a échoué.')
    } finally {
      setDeletingId(null)
    }
  }

  const activeFilterCount = [filterCompany, filterSubscribed].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className={cn(
                'w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800',
                'text-slate-200 placeholder:text-slate-700',
                'outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20',
                'transition-all rounded-none'
              )}
            />
          </div>

          {/* Filtres avancés */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-wider uppercase',
              'border transition-all',
              showFilters || activeFilterCount > 0
                ? 'border-blue-600/40 text-blue-400 bg-blue-600/10'
                : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {isCommercial && (
          <button
            onClick={onCreateClick}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase',
              'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
              'transition-all whitespace-nowrap'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nouveau contact
          </button>
        )}
      </div>

      {/* ── Panneau filtres ── */}
      {showFilters && (
        <div className="bg-slate-900 border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-1.5">
              Entreprise
            </label>
            <select
              value={filterCompany}
              onChange={e => { setFilterCompany(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 rounded-none"
            >
              <option value="">Toutes les entreprises</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-1.5">
              Abonnement email
            </label>
            <select
              value={filterSubscribed}
              onChange={e => { setFilterSubscribed(e.target.value as any); setPage(1) }}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 rounded-none"
            >
              <option value="">Tous</option>
              <option value="true">Abonnés</option>
              <option value="false">Désabonnés</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCompany('')
                setFilterSubscribed('')
                setPage(1)
              }}
              className="text-xs text-slate-600 hover:text-slate-300 transition-colors underline underline-offset-2"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}

      {/* ── Compteur résultats ── */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>
          {loading
            ? 'Chargement...'
            : `${pagination.total} contact${pagination.total !== 1 ? 's' : ''} trouvé${pagination.total !== 1 ? 's' : ''}`
          }
        </span>
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="text-blue-500 hover:text-blue-300 transition-colors"
          >
            Effacer la recherche
          </button>
        )}
      </div>

      {/* ── Table (desktop) ── */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr>
                {/* Nom */}
                <th
                  className="px-5 py-3.5 text-left cursor-pointer group select-none"
                  onClick={() => toggleSort('last_name')}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 group-hover:text-slate-400 transition-colors">
                    Contact
                    <SortIcon field="last_name" sort={sort} />
                  </div>
                </th>

                {/* Entreprise */}
                <th className="px-5 py-3.5 text-left">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
                    Entreprise
                  </span>
                </th>

                {/* Email */}
                <th
                  className="px-5 py-3.5 text-left cursor-pointer group select-none"
                  onClick={() => toggleSort('email')}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 group-hover:text-slate-400 transition-colors">
                    Email
                    <SortIcon field="email" sort={sort} />
                  </div>
                </th>

                {/* Téléphone */}
                <th className="px-5 py-3.5 text-left">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
                    Téléphone
                  </span>
                </th>

                {/* Statut email */}
                <th className="px-5 py-3.5 text-left">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
                    Email mktg
                  </span>
                </th>

                {/* Date */}
                <th
                  className="px-5 py-3.5 text-left cursor-pointer group select-none"
                  onClick={() => toggleSort('updated_at')}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 group-hover:text-slate-400 transition-colors">
                    Mis à jour
                    <SortIcon field="updated_at" sort={sort} />
                  </div>
                </th>

                <th className="px-5 py-3.5 w-12" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <TableSkeleton rows={8} cols={7} />
              ) : sortedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                    Aucun contact trouvé
                  </td>
                </tr>
              ) : (
                sortedContacts.map(contact => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    {/* Nom + poste */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <ContactAvatar contact={contact} />
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {contact.job_title ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Entreprise */}
                    <td className="px-5 py-3.5">
                      {contact.company ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-sm text-slate-400 truncate max-w-32">
                            {contact.company.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-sm">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5">
                      {contact.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={e => e.stopPropagation()}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors truncate max-w-44"
                          >
                            {contact.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-sm">—</span>
                      )}
                    </td>

                    {/* Téléphone */}
                    <td className="px-5 py-3.5">
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-sm text-slate-400">{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-sm">—</span>
                      )}
                    </td>

                    {/* Abonnement */}
                    <td className="px-5 py-3.5">
                      {contact.is_subscribed ? (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Abonné</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="text-xs">Désabonné</span>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-600">
                        {new Date(contact.updated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-5 py-3.5 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(v => v === contact.id ? null : contact.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenuId === contact.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-8 z-20 w-40 bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50">
                              {isCommercial && (
                                <button
                                  onClick={() => { setOpenMenuId(null); onEditClick(contact) }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Modifier
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => { setOpenMenuId(null); handleDelete(contact) }}
                                  disabled={deletingId === contact.id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors text-left disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {deletingId === contact.id ? 'Suppression...' : 'Supprimer'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mode cartes (mobile) ── */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-800 rounded w-32" />
                    <div className="h-2.5 bg-slate-800 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedContacts.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            Aucun contact trouvé
          </div>
        ) : (
          sortedContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => router.push(`/contacts/${contact.id}`)}
              className="bg-slate-900 border border-slate-800 p-4 cursor-pointer hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ContactAvatar contact={contact} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{contact.job_title ?? '—'}</p>
                </div>
                {contact.is_subscribed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-slate-700 shrink-0" />
                }
              </div>
              {contact.company && (
                <div className="flex items-center gap-1.5 mt-2 ml-11">
                  <Building2 className="w-3 h-3 text-slate-700 shrink-0" />
                  <span className="text-xs text-slate-500">{contact.company.name}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-1.5 mt-1 ml-11">
                  <Mail className="w-3 h-3 text-slate-700 shrink-0" />
                  <span className="text-xs text-slate-500 truncate">{contact.email}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-600">
            Page {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}