'use client'
// ============================================================
// app/(dashboard)/profile/settings/page.tsx
// Paramètres de sécurité — changement email / mot de passe
//
// Flux Supabase :
//   • Email  → supabase.auth.updateUser({ email })
//             → Supabase envoie un mail de confirmation à la
//               NOUVELLE adresse ; l'ancienne reste active
//               jusqu'à validation du lien.
//   • MDP    → supabase.auth.updateUser({ password })
//             → Supabase envoie un mail de notification à
//               l'adresse courante (sécurité).
//             → Pas de re-login requis côté client.
// ============================================================

import { useState, useEffect }        from 'react'
import Link                from 'next/link'
import {
  ArrowLeft, Mail, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, ShieldCheck,
} from 'lucide-react'
import { createClient }    from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient()

// ── Helpers ────────────────────────────────────────────────

function Section({ title, description, children }: {
  title:       string
  description: string
  children:    React.ReactNode
}) {
  return (
    <section className="bg-slate-900 border border-slate-800">
      <div className="px-6 py-4 border-b border-slate-800">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-0.5">
          {title}
        </p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  )
}

function InputField({
  label, type = 'text', value, onChange, placeholder, disabled, hint,
}: {
  label:        string
  type?:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  disabled?:    boolean
  hint?:        string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={isPassword ? 'new-password' : 'off'}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm
                     px-3 py-2 pr-10 outline-none rounded-none
                     focus:border-blue-500/70 disabled:opacity-40 disabled:cursor-not-allowed
                     placeholder:text-slate-700 transition-colors"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute inset-y-0 right-0 px-3 text-slate-600 hover:text-slate-400 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-700 mt-1">{hint}</p>}
    </div>
  )
}

type Status = { type: 'success' | 'error'; message: string } | null

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null
  const isOk = status.type === 'success'
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 text-xs border ${
      isOk
        ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
        : 'bg-red-950/40 border-red-800/50 text-red-300'
    }`}>
      {isOk
        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        : <AlertCircle  className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      }
      <span>{status.message}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  // On lit l'email via getUser() sans instancier useAuth()
  // pour éviter un double onAuthStateChange avec le layout.
  const { user } = useAuth()
  const currentEmail = user?.email ?? ''

  // ── Email ────────────────────────────────────────────────
  const [newEmail,     setNewEmail]     = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailStatus,  setEmailStatus]  = useState<Status>(null)

  // ── Mot de passe ─────────────────────────────────────────
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdStatus,  setPwdStatus]  = useState<Status>(null)

  // ── Handler email ─────────────────────────────────────────
  const handleEmailChange = async () => {
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailStatus(null)

    // updateUser({ email }) → Supabase envoie automatiquement un mail
    // de confirmation à la NOUVELLE adresse.
    // L'ancienne reste active jusqu'à validation du lien.
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    )

    setEmailLoading(false)

    if (error) {
      setEmailStatus({ type: 'error', message: error.message })
    } else {
      setEmailStatus({
        type: 'success',
        message: `Un email de confirmation a été envoyé à ${newEmail.trim()}. Votre adresse sera mise à jour après validation du lien.`,
      })
      setNewEmail('')
    }
  }

  // ── Handler mot de passe ──────────────────────────────────
  const handlePasswordChange = async () => {
    if (!newPwd || !confirmPwd) return

    if (newPwd !== confirmPwd) {
      setPwdStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (newPwd.length < 8) {
      setPwdStatus({ type: 'error', message: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }

    setPwdLoading(true)
    setPwdStatus(null)

    // updateUser({ password }) :
    // → met à jour le mot de passe immédiatement (session conservée)
    // → Supabase envoie un email de notification sécurité à l'adresse actuelle
    const { error } = await supabase.auth.updateUser({ password: newPwd })

    setPwdLoading(false)

    if (error) {
      setPwdStatus({ type: 'error', message: error.message })
    } else {
      setPwdStatus({
        type: 'success',
        message: 'Mot de passe mis à jour. Un email de confirmation a été envoyé à votre adresse actuelle.',
      })
      setNewPwd('')
      setConfirmPwd('')
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-950">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-8 py-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3" />
          Mon profil
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 border border-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Paramètres de sécurité
            </h1>
            <p className="text-xs text-slate-600">
              Compte connecté :{' '}
              <span className="text-slate-500 font-mono">{currentEmail}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Contenu ───────────────────────────────────────── */}
      <div className="px-8 py-6 max-w-xl space-y-6">

        {/* ── Email ─────────────────────────────────────────── */}
        <Section
          title="Adresse email"
          description="Un email de confirmation sera envoyé à la nouvelle adresse. L'ancienne reste active jusqu'à validation."
        >
          <InputField
            label="Email actuel"
            type="email"
            value={currentEmail}
            onChange={() => {}}
            disabled
          />
          <InputField
            label="Nouvelle adresse email"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="nouvelle@adresse.com"
            hint="Vous recevrez un lien de confirmation sur cette adresse."
          />
          <StatusBanner status={emailStatus} />
          <button
            onClick={handleEmailChange}
            disabled={emailLoading || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-xs font-semibold tracking-wide transition-colors"
          >
            {emailLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Envoi en cours…</>
              : <><Mail    className="w-3.5 h-3.5" />Envoyer le lien de confirmation</>
            }
          </button>
        </Section>

        {/* ── Mot de passe ──────────────────────────────────── */}
        <Section
          title="Mot de passe"
          description="Après modification, un email de notification est envoyé à votre adresse actuelle pour vous alerter."
        >
          <InputField
            label="Nouveau mot de passe"
            type="password"
            value={newPwd}
            onChange={setNewPwd}
            placeholder="Min. 8 caractères"
            hint="Doit contenir au moins 8 caractères."
          />
          <InputField
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPwd}
            onChange={setConfirmPwd}
            placeholder="Répétez le mot de passe"
          />
          <StatusBanner status={pwdStatus} />
          <button
            onClick={handlePasswordChange}
            disabled={pwdLoading || !newPwd || !confirmPwd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-xs font-semibold tracking-wide transition-colors"
          >
            {pwdLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Mise à jour…</>
              : <><Lock    className="w-3.5 h-3.5" />Mettre à jour le mot de passe</>
            }
          </button>
        </Section>

        {/* ── Note de bas de page ───────────────────────────── */}
        <p className="text-[11px] text-slate-700 pb-4 leading-relaxed">
          Ces opérations sont gérées directement par Supabase Auth et ne transitent
          pas par le backend NestJS. En cas de problème, contactez un administrateur.
        </p>

      </div>
    </div>
  )
}