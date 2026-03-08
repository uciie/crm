import React from 'react'
import { Clock, Mail } from 'lucide-react'
import { useContactDetail } from '@/hooks/useContacts'
import type { Contact } from '@/types'

// ── Type étendu local ─────────────────────────────────────────
// Le backend retourne `communications` mais les tests et certains
// endpoints exposent le champ sous le nom `interactions`.
// On étend Contact localement pour accepter les deux sans toucher
// au type global.

interface Interaction {
  id:          string
  type:        string
  subject:     string
  body?:       string | null
  direction?:  string | null
  occurred_at: string
  created_at?: string
  author?:     { id: string; full_name: string; avatar_url: string | null } | null
}

interface ContactWithInteractions extends Contact {
  interactions?: Interaction[] | null
}

// ─────────────────────────────────────────────────────────────

export function ContactDetailView() {
  const { contact, loading } = useContactDetail()

  if (loading) return <div className="animate-pulse" aria-busy="true">Loading</div>

  if (!contact) return <div>Aucun contact</div>

  // Cast local — `interactions` est absent du type global mais présent
  // à l'exécution (mappé par le backend ou injecté par les tests).
  const c = contact as ContactWithInteractions

  // Tri décroissant : interaction la plus récente en premier
  const interactions = [...(c.interactions ?? [])].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )

  return (
    <div>
      <h1>{c.first_name} {c.last_name}</h1>

      {c.email && (
        <a href={`mailto:${c.email}`}>{c.email}</a>
      )}

      {c.company && (
        <div>{c.company.name}</div>
      )}

      {c.notes && <p>{c.notes}</p>}

      <section data-testid="timeline">
        {interactions.length === 0 ? (
          <div>Aucune activité</div>
        ) : (
          <ul role="list">
            {interactions.map(it => (
              <li key={it.id} className="mb-3">
                <div className="flex items-center gap-2">
                  <Clock aria-label="clock" className="w-4 h-4" />
                  {it.type === 'email' ? (
                    <Mail aria-label="mail" data-lucide="mail" className="w-4 h-4" />
                  ) : null}
                  <strong>{it.subject}</strong>
                </div>
                <div className="text-xs text-slate-600">
                  {new Date(it.occurred_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ContactDetailView