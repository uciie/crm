'use client'
// ============================================================
// app/(dashboard)/contacts/[id]/page.tsx
// Vue détaillée d'un contact — Infos + Timeline + Leads + Tâches
// ============================================================

import { useState, useEffect }    from 'react'
import { useParams, useRouter }   from 'next/navigation'
import { useForm }                 from 'react-hook-form'
import { zodResolver }             from '@hookform/resolvers/zod'
import { z }                       from 'zod'
import {
  ArrowLeft,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Building2,
  Linkedin,
  MessageSquare,
  PhoneCall,
  CalendarDays,
  FileText,
  MessageCircle,
  Clock,
  TrendingUp,
  CheckSquare,
  Pencil,
  ExternalLink,
  Bell,
  BellOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react'
import { contactsService } from '@/services/contacts.service'
import { useToast }        from '@/hooks/useToast'
import { useAuth }         from '@/hooks/useAuth'
import { DetailSkeleton }  from '@/components/ui/Skeleton'
import { ContactForm }     from '@/components/contacts/ContactForm'
import { cn }              from '@/lib/utils'
import type {
  ContactDetail,
  Interaction,
  Lead,
  CommunicationType,
  CreateInteractionPayload,
} from '@/types/crm.types'

// ── Configuration UI ──────────────────────────────────────────

const INTERACTION_CONFIG: Record<
  CommunicationType,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  email:   { icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-500/10',   label: 'Email' },
  appel:   { icon: PhoneCall,     color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Appel' },
  réunion: { icon: CalendarDays,  color: 'text-amber-400',   bg: 'bg-amber-500/10',  label: 'Réunion' },
  note:    { icon: FileText,      color: 'text-slate-400',   bg: 'bg-slate-500/10',  label: 'Note' },
  sms:     { icon: MessageCircle, color: 'text-violet-400',  bg: 'bg-violet-500/10', label: 'SMS' },
}

const LEAD_STATUS_COLOR: Record<string, string> = {
  nouveau:     'text-slate-400 border-slate-700',
  contacté:    'text-blue-400 border-blue-800',
  qualifié:    'text-amber-400 border-amber-800',
  proposition: 'text-violet-400 border-violet-800',
  négociation: 'text-orange-400 border-orange-800',
  gagné:       'text-emerald-400 border-emerald-800',
  perdu:       'text-red-400 border-red-800',
}

const INTERACTION_TYPES: CommunicationType[] = ['note', 'email', 'appel', 'réunion', 'sms']

// ── Schéma interaction ────────────────────────────────────────

const interactionSchema = z.object({
  type:    z.enum(['email', 'appel', 'réunion', 'note', 'sms']),
  subject: z.string().optional(),
  body:    z.string().min(1, 'Le contenu est obligatoire'),
})

type InteractionFormData = z.infer<typeof interactionSchema>

// ── Composant avatar ──────────────────────────────────────────

function Avatar({ name, url, size = 'lg' }: { name: string; url?: string; size?: 'sm' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-8 h-8 text-xs'
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-slate-800', sizeClass)}
      />
    )
  }
  return (
    <div className={cn(
      'rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center font-bold text-blue-300',
      sizeClass
    )}>
      {initials}
    </div>
  )
}

// ── Composant timeline ────────────────────────────────────────

function TimelineItem({ interaction }: { interaction: Interaction }) {
  const cfg = INTERACTION_CONFIG[interaction.type] ?? INTERACTION_CONFIG.note
  const Icon = cfg.icon

  return (
    <div className="flex gap-4 group">
      {/* Icône + ligne verticale */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', cfg.bg)}>
          <Icon className={cn('w-4 h-4', cfg.color)} />
        </div>
        <div className="w-px flex-1 bg-slate-800/60 mt-1" />
      </div>

      {/* Contenu */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <span className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</span>
            {interaction.subject && (
              <span className="text-sm font-semibold text-slate-200 ml-2">
                — {interaction.subject}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {interaction.direction && (
              <span className="text-[10px] px-2 py-0.5 border border-slate-800 text-slate-600 font-mono">
                {interaction.direction}
              </span>
            )}
            {interaction.duration_min && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="w-3 h-3" />
                {interaction.duration_min} min
              </div>
            )}
            <time className="text-[11px] text-slate-600">
              {new Date(interaction.occurred_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </time>
          </div>
        </div>

        {interaction.body && (
          <div className="mt-1.5 bg-slate-900 border border-slate-800 px-4 py-3">
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
              {interaction.body}
            </p>
          </div>
        )}

        {interaction.author && (
          <p className="mt-1.5 text-[11px] text-slate-700">
            par {interaction.author.full_name}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export default function ContactDetailPage() {
  const { id }           = useParams<{ id: string }>()
  const router           = useRouter()
  const { toast }        = useToast()
  const { isCommercial } = useAuth()

  const [contact, setContact]   = useState<ContactDetail | null>(null)
  const [timeline, setTimeline] = useState<Interaction[]>([])
  const [leads, setLeads]       = useState<Lead[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline' | 'leads'>('timeline')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submittingInteraction, setSubmittingInteraction] = useState(false)

  const {
    register,
    handleSubmit,
    reset: resetInteractionForm,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: { type: 'note', subject: '', body: '' },
  })

  const interactionType = watch('type')

  const loadContact = async () => {
    try {
      const [contactData, timelineData, leadsData] = await Promise.all([
        contactsService.get(id),
        contactsService.getTimeline(id),
        contactsService.getLeads(id),
      ])
      setContact(contactData)
      setTimeline(timelineData.data)
      setLeads(leadsData.data)
    } catch {
      toast('error', 'Erreur', 'Impossible de charger les données du contact.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContact() }, [id])

  const handleAddInteraction = async (data: InteractionFormData) => {
    setSubmittingInteraction(true)
    try {
      const payload: CreateInteractionPayload = {
        type:       data.type,
        subject:    data.subject || undefined,
        body:       data.body,
        direction:  'sortant',
        contact_id: id,
      }
      await contactsService.addInteraction(payload)
      toast('success', 'Interaction enregistrée')
      resetInteractionForm({ type: 'note', subject: '', body: '' })
      setShowAddForm(false)
      // Recharge la timeline
      const updated = await contactsService.getTimeline(id)
      setTimeline(updated.data)
    } catch {
      toast('error', 'Erreur', 'Impossible d\'enregistrer l\'interaction.')
    } finally {
      setSubmittingInteraction(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (!contact) return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Contact introuvable</p>
      </div>
    </div>
  )

  const c = contact.contacts
  const company = contact.companies
  const fullName = `${c.first_name} ${c.last_name}`

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
        <span className="text-xs text-slate-500">Contacts</span>
        <span className="text-slate-800">/</span>
        <span className="text-xs text-slate-300 font-medium">{fullName}</span>
      </div>

      {/* ── Contenu principal ── */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* ── Sidebar gauche ── */}
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto">
          {/* En-tête contact */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex flex-col items-center text-center">
              <Avatar name={fullName} url={c.avatar_url || undefined} size="lg" />
              <h1 className="mt-3 text-base font-bold text-slate-100">{fullName}</h1>
              {c.job_title && <p className="text-sm text-slate-500 mt-0.5">{c.job_title}</p>}
              {company && (
                <p className="text-xs text-blue-400 mt-1 font-medium">{company.name}</p>
              )}
              <div className={cn(
                'inline-flex items-center gap-1.5 mt-3 px-3 py-1 border text-xs font-medium',
                c.is_subscribed
                  ? 'border-emerald-700/40 text-emerald-400 bg-emerald-950/20'
                  : 'border-slate-800 text-slate-600'
              )}>
                {c.is_subscribed
                  ? <><Bell className="w-3 h-3" /> Abonné email</>
                  : <><BellOff className="w-3 h-3" /> Désabonné</>
                }
              </div>
            </div>

            {/* Actions rapides */}
            {isCommercial && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setValue('type', 'email'); setShowAddForm(true) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wide text-blue-400 border border-blue-800/50 hover:bg-blue-950/30 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
                <button
                  onClick={() => { setValue('type', 'appel'); setShowAddForm(true) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wide text-emerald-400 border border-emerald-800/50 hover:bg-emerald-950/30 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Appel
                </button>
                <button
                  onClick={() => { setValue('type', 'note'); setShowAddForm(true) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wide text-slate-400 border border-slate-800 hover:bg-slate-900 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Note
                </button>
              </div>
            )}
          </div>

          {/* Coordonnées */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700">
              Coordonnées
            </p>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-2.5 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
                <span className="truncate">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {c.phone}
              </a>
            )}
            {c.mobile && (
              <a
                href={`tel:${c.mobile}`}
                className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {c.mobile}
              </a>
            )}
            {c.city && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                {c.city}{c.country ? `, ${c.country}` : ''}
              </div>
            )}
            {c.linkedin_url && (
              <a
                href={c.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
              >
                <Linkedin className="w-3.5 h-3.5 shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            )}
          </div>

          {/* Entreprise liée */}
          {company && (
            <div className="p-5 border-b border-slate-800 space-y-2">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700">
                Entreprise
              </p>
              <div className="flex items-start gap-2.5">
                <Building2 className="w-3.5 h-3.5 mt-0.5 text-slate-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">{company.name}</p>
                  {company.industry && (
                    <p className="text-xs text-slate-600 mt-0.5">{company.industry}</p>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {c.notes && (
            <div className="p-5 border-b border-slate-800">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-2">
                Notes internes
              </p>
              <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                {c.notes}
              </p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="p-5 space-y-1.5">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-2">
              Informations
            </p>
            <p className="text-xs text-slate-700">
              Créé le{' '}
              <span className="text-slate-500">
                {new Date(c.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
            <p className="text-xs text-slate-700">
              Modifié le{' '}
              <span className="text-slate-500">
                {new Date(c.updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
          </div>

          {/* Bouton modifier */}
          {isCommercial && (
            <div className="p-5 pt-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-wider uppercase border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier le contact
              </button>
            </div>
          )}
        </aside>

        {/* ── Colonne droite — Onglets ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Onglets */}
          <div className="flex border-b border-slate-800 px-6 shrink-0">
            {([
              { id: 'timeline', label: `Interactions`, count: timeline.length, icon: MessageSquare },
              { id: 'leads',    label: 'Leads',        count: leads.length,    icon: TrendingUp },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3.5 text-xs font-bold tracking-wider uppercase',
                  'border-b-2 transition-all -mb-px',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-600 hover:text-slate-400'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 font-mono',
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'bg-slate-800 text-slate-600'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Onglet Timeline ── */}
          {activeTab === 'timeline' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Formulaire ajout interaction */}
              {isCommercial && (
                showAddForm ? (
                  <div className="bg-slate-900 border border-slate-800 p-5 mb-6">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {INTERACTION_TYPES.map(type => {
                        const cfg = INTERACTION_CONFIG[type]
                        const Icon = cfg.icon
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setValue('type', type)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide border transition-all',
                              interactionType === type
                                ? `${cfg.color} ${cfg.bg} border-current/30`
                                : 'text-slate-600 border-slate-800 hover:border-slate-600 hover:text-slate-400'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>

                    <form onSubmit={handleSubmit(handleAddInteraction)} className="space-y-3">
                      {interactionType !== 'note' && (
                        <input
                          {...register('subject')}
                          placeholder="Sujet"
                          className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 transition-all rounded-none"
                        />
                      )}
                      <div>
                        <textarea
                          {...register('body')}
                          rows={4}
                          placeholder="Détails de l'interaction..."
                          className={cn(
                            'w-full px-3 py-2 text-sm bg-slate-950 border text-slate-200',
                            'placeholder:text-slate-700 outline-none transition-all rounded-none resize-none',
                            errors.body
                              ? 'border-red-500/60'
                              : 'border-slate-800 focus:border-blue-600/60'
                          )}
                        />
                        {errors.body && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.body.message}</p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setShowAddForm(false); resetInteractionForm() }}
                          className="px-4 py-2 text-xs text-slate-600 hover:text-slate-300 border border-slate-800 hover:border-slate-600 transition-all"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={submittingInteraction}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
                        >
                          {submittingInteraction
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</>
                            : <><Send className="w-3.5 h-3.5" /> Enregistrer</>
                          }
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-wider uppercase text-slate-600 border border-dashed border-slate-800 hover:border-slate-600 hover:text-slate-400 transition-all mb-6"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ajouter une interaction
                  </button>
                )
              )}

              {/* Liste des interactions */}
              {timeline.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-800" />
                  <p className="text-sm text-slate-600">Aucune interaction enregistrée</p>
                  <p className="text-xs text-slate-700 mt-1">
                    Commencez par ajouter une note ou enregistrer un appel.
                  </p>
                </div>
              ) : (
                <div>
                  {timeline.map(interaction => (
                    <TimelineItem key={interaction.id} interaction={interaction} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Leads ── */}
          {activeTab === 'leads' && (
            <div className="flex-1 overflow-y-auto p-6">
              {leads.length === 0 ? (
                <div className="text-center py-16">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-800" />
                  <p className="text-sm text-slate-600">Aucun lead associé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map(lead => (
                    <div
                      key={lead.id}
                      className="bg-slate-900 border border-slate-800 px-5 py-4 flex items-center gap-5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">
                          {lead.title}
                        </p>
                        {lead.expected_close_date && (
                          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Clôture prévue le{' '}
                            {new Date(lead.expected_close_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {lead.value && (
                          <p className="text-sm font-bold text-slate-200">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                            }).format(Number(lead.value))}
                          </p>
                        )}
                        <span className={cn(
                          'inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 border mt-1',
                          LEAD_STATUS_COLOR[lead.status] ?? 'text-slate-400 border-slate-700'
                        )}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="w-16 text-center shrink-0">
                        <p
                          className="text-xl font-bold tabular-nums"
                          style={{
                            color: lead.probability >= 70
                              ? '#34d399'
                              : lead.probability >= 40
                              ? '#f59e0b'
                              : '#94a3b8'
                          }}
                        >
                          {lead.probability}
                          <span className="text-sm">%</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal édition contact ── */}
      {showEditModal && (
        <ContactForm
          contact={{
            id:            c.id,
            first_name:    c.first_name,
            last_name:     c.last_name,
            email:         c.email,
            phone:         c.phone,
            mobile:        c.mobile,
            job_title:     c.job_title,
            is_subscribed: c.is_subscribed,
            notes:         c.notes,
            city:          c.city,
            country:       c.country,
            linkedin_url:  c.linkedin_url,
            company_id:    company?.id,
            created_at:    c.created_at,
            updated_at:    c.updated_at,
          }}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            setLoading(true)
            loadContact()
          }}
        />
      )}
    </div>
  )
}