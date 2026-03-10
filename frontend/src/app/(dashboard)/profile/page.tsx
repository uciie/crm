'use client'
// ============================================================
// app/(dashboard)/profile/page.tsx
// Page "Mon Profil" — consultation + édition des données perso
// ============================================================

import { useState, useEffect } from 'react'
import {
  Mail, Phone, Globe, Languages,
  Shield, CheckCircle2, Pencil, X, Save,
  TrendingUp, Users, BarChart2, Loader2,
  Clock, MapPin,
} from 'lucide-react'
import { useAuth }   from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { api }       from '@/lib/api'
import { getInitials } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

interface ProfileStats {
  contacts_count:  number
  campaigns_count: number
  conversion_rate: number
}

interface EditForm {
  full_name: string
  phone:     string
  timezone:  string
  language:  string
}

// ── Helpers ───────────────────────────────────────────────────

const ROLE_CFG = {
  admin:       { label: 'Administrateur', color: 'text-violet-400',  border: 'border-violet-500/30', bg: 'bg-violet-500/10' },
  commercial:  { label: 'Commercial',     color: 'text-amber-400',   border: 'border-amber-500/30',  bg: 'bg-amber-500/10'  },
  utilisateur: { label: 'Utilisateur',    color: 'text-slate-400',   border: 'border-slate-600/30',  bg: 'bg-slate-700/30'  },
} as const

const TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
]
const LANGUAGES = ['Français', 'English', 'Deutsch', 'Español']

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, accent, sub,
}: {
  icon: React.ElementType; label: string; value: string | number; accent: string; sub?: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
      {/* Subtle glow */}
      <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${accent.replace('text-', 'bg-')}`} />
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600">{label}</p>
        <Icon className={`w-4 h-4 ${accent} opacity-60`} />
      </div>
      <div>
        <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Info Row ──────────────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, editing, field, form, onChange,
  type = 'text', options,
}: {
  icon: React.ElementType; label: string; value: string; editing: boolean
  field: keyof EditForm; form: EditForm; onChange: (f: keyof EditForm, v: string) => void
  type?: string; options?: string[]
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-800/60 last:border-0">
      <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600 mb-1">{label}</p>
        {editing ? (
          options ? (
            <select
              value={form[field]}
              onChange={e => onChange(field, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-blue-500/60 transition-colors rounded-none"
            >
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={form[field]}
              onChange={e => onChange(field, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-blue-500/60 transition-colors rounded-none"
            />
          )
        ) : (
          <p className="text-sm text-slate-300 truncate">{value || <span className="text-slate-600 italic">Non renseigné</span>}</p>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function ProfilePage() {
  const { profile } = useAuth()
  const setProfile  = useAuthStore(s => s.setProfile)

  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveOk, setSaveOk]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [stats, setStats]       = useState<ProfileStats | null>(null)

  const [form, setForm] = useState<EditForm>({
    full_name: '',
    phone:     '',
    timezone:  'Europe/Paris',
    language:  'Français',
  })

  // Pré-remplit le formulaire quand le profil arrive
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone:     profile.phone     ?? '',
        timezone:  'Europe/Paris',
        language:  'Français',
      })
    }
  }, [profile])

  // Charge les stats du profil connecté
  useEffect(() => {
    Promise.all([
      api.get('/contacts/stats').catch(() => null),
      api.get('/email/campaigns').catch(() => null),
      api.get('/leads/stats').catch(() => null),
    ]).then(([cStats, campaigns, lStats]) => {
      setStats({
        contacts_count:  (cStats as any)?.total          ?? 0,
        campaigns_count: Array.isArray(campaigns) ? campaigns.length : 0,
        conversion_rate: (lStats  as any)?.conversion_rate ?? 0,
      })
    })
  }, [])

  const handleChange = (field: keyof EditForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSave = async () => {
    const previous = profile            // sauvegarde pour rollback

    // Mise à jour immédiate de l'UI avant même la réponse serveur
    setProfile({ ...profile!, full_name: form.full_name, phone: form.phone || null })
    setEditing(false)

    setSaving(true)
    setError(null)
    try {
        const updated = await api.patch('/auth/me', {
        full_name: form.full_name,
        phone:     form.phone || null,
        })
        setProfile(updated)             // confirme avec les données serveur
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 3000)
    } catch (err: any) {
        setProfile(previous)            // rollback si erreur
        setEditing(true)                // réouvre le formulaire
        setError(err.message ?? 'Erreur lors de la sauvegarde.')
    } finally {
        setSaving(false)
    }
    }

  const handleCancel = () => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone:     profile.phone     ?? '',
        timezone:  'Europe/Paris',
        language:  'Français',
      })
    }
    setEditing(false)
    setError(null)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </div>
    )
  }

  const roleCfg    = ROLE_CFG[profile.role] ?? ROLE_CFG.utilisateur
  const displayName  = profile.full_name
  const displayPhone = profile.phone ?? ''
  const initials     = getInitials(
    displayName.split(' ')[0] ?? '',
    displayName.split(' ')[1] ?? '',
  )

  return (
    <div className="min-h-full bg-slate-950">

      {/* ── Hero / Header profil ────────────────────────────── */}
      <div className="relative border-b border-slate-800 overflow-hidden">

        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Accent glow */}
        <div className="absolute top-0 left-1/4 w-96 h-40 bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500/30 flex items-center justify-center shadow-xl shadow-blue-900/30">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white tracking-tight">{initials}</span>
                )}
              </div>
              {/* Status dot */}
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>

            {/* Nom + rôle */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                  {displayName}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase border ${roleCfg.color} ${roleCfg.border} ${roleCfg.bg}`}>
                  <Shield className="w-2.5 h-2.5" />
                  {roleCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  En ligne
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-3 h-3" />
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3 h-3" />
                  {form.timezone}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {saveOk && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sauvegardé
                </span>
              )}
              {editing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50"
                  >
                    {saving
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Save className="w-3.5 h-3.5" />
                    }
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wider uppercase border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-blue-500/60 hover:bg-blue-600/5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier le profil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Corps ───────────────────────────────────────────── */}
      <div className="px-8 py-7 space-y-7 max-w-5xl">

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 text-red-400 text-sm">
            <X className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 mb-4">
            Activité
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon={Users}
              label="Contacts gérés"
              value={stats?.contacts_count ?? '—'}
              accent="text-blue-400"
              sub="Total dans le CRM"
            />
            <StatCard
              icon={BarChart2}
              label="Campagnes actives"
              value={stats?.campaigns_count ?? '—'}
              accent="text-violet-400"
              sub="Emails marketing"
            />
            <StatCard
              icon={TrendingUp}
              label="Taux de conversion"
              value={stats ? `${stats.conversion_rate}%` : '—'}
              accent="text-emerald-400"
              sub="Leads → Gagnés"
            />
          </div>
        </section>

        {/* ── Informations ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Bloc identité */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600">
                Informations personnelles
              </p>
              {editing && (
                <span className="text-[10px] text-blue-400 font-medium tracking-wide">
                  Mode édition
                </span>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 px-5">
              <InfoRow
                icon={Users}
                label="Nom complet"
                value={displayName}
                editing={editing}
                field="full_name"
                form={form}
                onChange={handleChange}
              />
              <InfoRow
                icon={Phone}
                label="Téléphone"
                value={displayPhone}
                editing={editing}
                field="phone"
                form={form}
                onChange={handleChange}
                type="tel"
              />
              <InfoRow
                icon={Globe}
                label="Fuseau horaire"
                value={form.timezone}
                editing={editing}
                field="timezone"
                form={form}
                onChange={handleChange}
                options={TIMEZONES}
              />
              <InfoRow
                icon={Languages}
                label="Langue préférée"
                value={form.language}
                editing={editing}
                field="language"
                form={form}
                onChange={handleChange}
                options={LANGUAGES}
              />
            </div>
          </section>

          {/* Bloc compte */}
          <section>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 mb-4">
              Compte & Sécurité
            </p>
            <div className="bg-slate-900 border border-slate-800 px-5">
              {/* Email — toujours en lecture seule */}
              <div className="flex items-start gap-4 py-4 border-b border-slate-800/60">
                <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600 mb-1">Email professionnel</p>
                  <p className="text-sm text-slate-300">
                    {/* L'email vient de Supabase Auth, non stocké dans profiles */}
                    <span className="text-slate-500 italic text-xs">Géré via Supabase Auth</span>
                  </p>
                </div>
              </div>

              {/* Rôle — toujours en lecture seule */}
              <div className="flex items-start gap-4 py-4 border-b border-slate-800/60">
                <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600 mb-1">Rôle</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${roleCfg.color}`}>{roleCfg.label}</span>
                    <span className="text-[10px] text-slate-600 border border-slate-800 px-1.5 py-0.5">Non modifiable</span>
                  </div>
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-start gap-4 py-4 border-b border-slate-800/60">
                <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600 mb-1">Statut du compte</p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-400 font-medium">Actif</span>
                  </div>
                </div>
              </div>

              {/* Membre depuis */}
              <div className="flex items-start gap-4 py-4">
                <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600 mb-1">Membre depuis</p>
                  <p className="text-sm text-slate-300">
                    {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Note bas de page */}
        <p className="text-xs text-slate-700 pb-4">
          Pour modifier votre email ou votre mot de passe, rendez-vous dans les{' '}
          <a href="/profile/settings" className="text-blue-500 hover:text-blue-400 transition-colors underline underline-offset-2">
            paramètres de sécurité
          </a>.
        </p>
      </div>
    </div>
  )
}