import React from 'react'
import { Clock, Mail } from 'lucide-react'
import { useContactDetail } from '@/hooks/useContacts'

export function ContactDetailView() {
  const { contact, loading } = useContactDetail()

  if (loading) return <div className="animate-pulse" aria-busy="true">Loading</div>

  if (!contact) return <div>Aucun contact</div>

  return (
    <div>
      <h1>{contact.first_name} {contact.last_name}</h1>
      {contact.email && (
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
      )}
      {contact.company && (
        <div>{contact.company.name}</div>
      )}
      {contact.notes && <p>{contact.notes}</p>}

      <section data-testid="timeline">
        {(!contact.interactions || contact.interactions.length === 0) ? (
          <div>Aucune activité</div>
        ) : (
          <ul role="list">
            {contact.interactions.map(it => (
              <li key={it.id} className="mb-3">
                <div className="flex items-center gap-2">
                  <Clock aria-label="clock" className="w-4 h-4" />
                  {it.type === 'email' ? (
                    <Mail aria-label="mail" data-lucide="mail" className="w-4 h-4" />
                  ) : null}
                  <strong>{it.subject}</strong>
                </div>
                <div className="text-xs text-slate-600">{new Date(it.occurred_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ContactDetailView
