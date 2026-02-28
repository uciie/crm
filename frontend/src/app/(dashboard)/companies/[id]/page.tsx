'use client'
// ============================================================
// app/(dashboard)/companies/[id]/page.tsx
// Vue détaillée d'une entreprise — Infos + Contacts associés
// ============================================================

import { useState, useEffect }  from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Globe,
  Phone,
  MapPin,
  Building2,
  Users,
  DollarSign,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Factory,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { companiesService }  from '@/services/companies.service'
import { useToast }          from '@/hooks/useToast'
import { useAuth }           from '@/hooks/useAuth'
import { DetailSkeleton }    from '@/components/ui/Skeleton'
import { CompanyModal }      from '@/components/companies/CompanyModal'
import { cn }                from '@/lib/utils'
import type { Company }      from '@/types/crm.types'

// ── Types ─────────────────────────────────────────────────────

interface AssociatedContact {
  id:          string
  first_name:  string
  last_name:   string
  email?:      string
  job_title?:  string
  phone?:      string
  avatar_url?: string
}

interface CompanyDetail extends Company {
  contacts: AssociatedContact[]
}

// ── Constantes ────────────────────────────────────────────────

const SIZE_LABELS: Record<string, string> = {
  '1-10':    'TPE — 1 à 10',
  '11-50':   'PME — 11 à 50',
  '51-200':  'ETI — 51 à 200',
  '201-500': 'Grande — 201 à 500',
  '500+':    'Très grande — 500+',
}

// ── Avatar entreprise ─────────────────────────────────────────

function CompanyAvatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${name}`}
        className="w-16 h-16 object-contain rounded ring-2 ring-slate-800"
      />
    )
  }
  return (
    <div className="w-16 h-16 rounded bg-blue-600/20 border border-blue-600/30 flex items-center justify-center font-bold text-blue-300 text-lg">
      {name[0]?.toUpperCase() ?? 'C'}
    </div>
  )
}

// ── Avatar contact ────────────────────────────────────────────

function ContactAvatar({ contact }: { contact: AssociatedContact }) {
  const initials = `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()
  if (contact.avatar_url) {
    return (
      <img
        src={contact.avatar_url}
        alt={`${contact.first_name} ${contact.last_name}`}
        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
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

export default function CompanyDetailPage() {
  const { id }                        = useParams<{ id: string }>()
  const router                        = useRouter()
  const { toast }                     = useToast()
  const { isAdmin, isCommercial }     = useAuth()

  const [company, setCompany]         = useState<CompanyDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [deleting, setDeleting]       = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadCompany = async () => {
    try {
      const data = await companiesService.get(id)
      setCompany(data)
    } catch {
      toast('error', 'Erreur', "Impossible de charger les données de l'entreprise.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCompany() }, [id])

  const handleDelete = async () => {
    if (!confirm('Supprimer cette entreprise ? Les contacts associés seront désassociés.')) return
    setDeleting(true)
    try {
      await companiesService.remove(id)
      toast('success', 'Entreprise supprimée', `${company?.name} a été supprimée.`)
      router.push('/companies')
    } catch {
      toast('error', 'Erreur', 'La suppression a échoué.')
      setDeleting(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (!company) return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Entreprise introuvable</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── Fil d'ariane ── */}
      <div className="px-6 py-3 border-b border-slate-800/50 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <span className="text-slate-800">/</span>
        <span className="text-xs text-slate-500">Entreprises</span>
        <span className="text-slate-800">/</span>
        <span className="text-xs text-slate-300 font-medium">{company.name}</span>
      </div>

      {/* ── Contenu principal ── */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* ── Sidebar gauche ── */}
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto">

          {/* En-tête */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex flex-col items-center text-center">
              <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
              <h1 className="mt-3 text-base font-bold text-slate-100">{company.name}</h1>
              {company.industry && (
                <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>
              )}
              {company.size && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 border border-slate-700 text-xs font-medium text-slate-400">
                  <Users className="w-3 h-3" />
                  {SIZE_LABELS[company.size] ?? company.size}
                </div>
              )}
              {company.contacts_count !== undefined && (
                <p className="text-xs text-slate-600 mt-2">
                  {company.contacts_count} contact{company.contacts_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700">
              Informations
            </p>

            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
                <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
              </a>
            )}
            {company.domain && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {company.domain}
              </div>
            )}
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {company.phone}
              </a>
            )}
            {company.city && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {company.city}{company.country ? `, ${company.country}` : ''}
              </div>
            )}
            {company.industry && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <Factory className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {company.industry}
              </div>
            )}
            {company.annual_revenue && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                }).format(Number(company.annual_revenue))} / an
              </div>
            )}
          </div>

          {/* Notes */}
          {company.notes && (
            <div className="p-5 border-b border-slate-800">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-2">
                Notes internes
              </p>
              <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                {company.notes}
              </p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="p-5 space-y-1.5 border-b border-slate-800">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-2">
              Informations système
            </p>
            <p className="text-xs text-slate-700">
              Créée le{' '}
              <span className="text-slate-500">
                {new Date(company.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
            <p className="text-xs text-slate-700">
              Modifiée le{' '}
              <span className="text-slate-500">
                {new Date(company.updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
          </div>

          {/* Actions */}
          {isCommercial && (
            <div className="p-5 space-y-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-wider uppercase border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier l'entreprise
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-wider uppercase border border-red-900/40 text-red-500/70 hover:border-red-700 hover:text-red-400 disabled:opacity-40 transition-all"
                >
                  {deleting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Suppression...</>
                    : <><Trash2 className="w-3.5 h-3.5" /> Supprimer l'entreprise</>
                  }
                </button>
              )}
            </div>
          )}
        </aside>

        {/* ── Colonne droite — Contacts associés ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* En-tête section */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-slate-600">
              <Users className="w-3.5 h-3.5" />
              Contacts associés
              <span className="text-[9px] px-1.5 py-0.5 font-mono bg-slate-800 text-slate-600">
                {company.contacts?.length ?? 0}
              </span>
            </div>
            {isCommercial && (
              <button
                onClick={() => router.push(`/contacts?company_id=${id}`)}
                className="text-xs text-blue-500 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                Voir tous
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {!company.contacts || company.contacts.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-800" />
                <p className="text-sm text-slate-600">Aucun contact associé</p>
                <p className="text-xs text-slate-700 mt-1">
                  Les contacts liés à cette entreprise apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {company.contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <ContactAvatar contact={contact} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">
                        {contact.job_title ?? '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {contact.email && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 justify-end">
                          <Mail className="w-3 h-3 text-slate-700" />
                          <span className="truncate max-w-44">{contact.email}</span>
                        </p>
                      )}
                      {contact.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-600 justify-end">
                          <Phone className="w-3 h-3 text-slate-700" />
                          {contact.phone}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal édition ── */}
      {showEditModal && (
        <CompanyModal
          company={company}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            setLoading(true)
            loadCompany()
          }}
        />
      )}
    </div>
  )
}