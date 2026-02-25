'use client'
// ============================================================
// app/(dashboard)/contacts/page.tsx
// Page principale des contacts
// ============================================================

import { useState }            from 'react'
import { Users }               from 'lucide-react'
import { ContactsDataTable }   from '@/components/contacts/ContactDataTable'
import { ContactForm }         from '@/components/contacts/ContactForm'
import type { Contact }        from '@/types/crm.types'

export default function ContactsPage() {
  const [showForm, setShowForm]     = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = (_: Contact) => {
    setShowForm(false)
    setEditContact(null)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* ── En-tête page ── */}
      <div className="px-6 py-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-slate-800 flex items-center justify-center">
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="h-px w-6 bg-blue-500 mb-1.5" />
            <h1 className="text-base font-bold text-slate-100 tracking-wide">Contacts</h1>
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 overflow-hidden p-6">
        <ContactsDataTable
          onCreateClick={() => { setEditContact(null); setShowForm(true) }}
          onEditClick={c => { setEditContact(c); setShowForm(true) }}
          refreshKey={refreshKey}
        />
      </div>

      {/* ── Modal formulaire ── */}
      {showForm && (
        <ContactForm
          contact={editContact}
          onClose={() => { setShowForm(false); setEditContact(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}