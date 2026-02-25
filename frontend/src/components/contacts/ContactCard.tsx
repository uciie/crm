import Link             from 'next/link'
import type { Contact } from '@/types'
import { getInitials }  from '@/lib/utils'

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link href={`/contacts/${contact.id}`}
      className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
          {getInitials(contact.first_name, contact.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{contact.first_name} {contact.last_name}</p>
          <p className="text-xs text-gray-500 truncate">{contact.job_title ?? '—'}</p>
          {contact.company && <p className="text-xs text-indigo-600 mt-0.5 truncate">{contact.company.name}</p>}
        </div>
      </div>
    </Link>
  )
}