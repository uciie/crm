// ============================================================
// PAGE FICHE CONTACT  /contacts/[id]
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// ── Types ──────────────────────────────────────────────────

interface ContactDetail {
  contacts: {
    id: string; first_name: string; last_name: string; email: string
    phone: string; mobile: string; job_title: string; department: string
    linkedin_url: string; address: string; city: string; country: string
    is_subscribed: boolean; notes: string; avatar_url: string
    created_at: string; updated_at: string
  }
  companies: { id: string; name: string; logo_url: string; industry: string; website: string } | null
}

interface Communication {
  id: string; type: string; subject: string; body: string
  direction: string; duration_min: number; occurred_at: string
  scheduled_at: string
  author: { full_name: string; avatar_url: string }
}

interface Lead {
  id: string; title: string; status: string; value: number
  probability: number; expected_close_date: string
}

interface Task {
  id: string; title: string; status: string; priority: string
  due_date: string; completed_at: string
}

// ── Constantes UI ──────────────────────────────────────────

const COMM_ICONS: Record<string,string> = {
  email:'📧', appel:'📞', réunion:'📅', note:'📝', sms:'💬'
}
const COMM_COLORS: Record<string,string> = {
  email:'#6366f1', appel:'#34d399', réunion:'#f59e0b', note:'#94a3b8', sms:'#a78bfa'
}
const STATUS_COLORS: Record<string,string> = {
  nouveau:'#94a3b8', contacté:'#60a5fa', qualifié:'#f59e0b',
  proposition:'#a78bfa', négociation:'#f97316', gagné:'#34d399', perdu:'#f87171'
}
const PRIORITY_COLORS: Record<string,string> = {
  basse:'#94a3b8', moyenne:'#60a5fa', haute:'#f59e0b', urgente:'#f87171'
}

// ── Composant principal ────────────────────────────────────

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isCommercial } = useAuth()

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [timeline, setTimeline] = useState<Communication[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline'|'leads'|'tasks'>('timeline')
  const [showAddComm, setShowAddComm] = useState(false)
  const [commForm, setCommForm] = useState({ type: 'note', subject: '', body: '', direction: 'sortant' })

  useEffect(() => {
    const load = async () => {
      const [contactData, timelineData, leadsData, tasksData] = await Promise.all([
        api.get(`/contacts/${id}`),
        api.get(`/communications/timeline?contact_id=${id}`),
        api.get(`/leads?contact_id=${id}`),
        api.get(`/tasks?contact_id=${id}`),
      ])
      setContact(contactData)
      setTimeline(timelineData.data)
      setLeads(leadsData.data)
      setTasks(tasksData.data)
      setLoading(false)
    }
    load()
  }, [id])

  const handleAddCommunication = async () => {
    await api.post('/communications', { ...commForm, contact_id: id })
    const updated = await api.get(`/communications/timeline?contact_id=${id}`)
    setTimeline(updated.data)
    setShowAddComm(false)
    setCommForm({ type: 'note', subject: '', body: '', direction: 'sortant' })
  }

  const handleSendEmail = async () => {
    if (!contact?.contacts.email) return
    await api.post('/email/send', {
      to: [{ email: contact.contacts.email, name: `${contact.contacts.first_name} ${contact.contacts.last_name}` }],
      subject: commForm.subject,
      htmlContent: `<p>${commForm.body}</p>`,
      contact_id: id,
    })
    // Recharge la timeline (l'email est enregistré automatiquement)
    const updated = await api.get(`/communications/timeline?contact_id=${id}`)
    setTimeline(updated.data)
    setShowAddComm(false)
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  if (!contact) return <div className="p-8 text-red-500">Contact introuvable</div>

  const { contacts: c, companies: company } = contact
  const fullName = `${c.first_name} ${c.last_name}`

  return (
    <div className="flex gap-6 p-6 h-full">
      // ── Colonne gauche : Infos contact ──────────────────
      <aside className="w-72 shrink-0 space-y-4">
        // En-tête
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-3">
            {c.first_name[0]}{c.last_name[0]}
          </div>
          <h2 className="text-lg font-bold text-gray-900">{fullName}</h2>
          <p className="text-sm text-gray-500">{c.job_title}</p>
          {company && <p className="text-xs text-indigo-600 mt-1 font-medium">{company.name}</p>}
          <span className={`inline-flex mt-2 px-2.5 py-1 text-xs rounded-full font-medium ${
            c.is_subscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {c.is_subscribed ? '✓ Abonné email' : 'Désabonné'}
          </span>
        </div>

        // Infos de contact
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Coordonnées</h3>
          {c.email && (
            <div className="flex items-center gap-2 text-sm">
              <span>📧</span>
              <a href={`mailto:${c.email}`} className="text-indigo-600 hover:underline truncate">{c.email}</a>
            </div>
          )}
          {c.phone && <div className="flex items-center gap-2 text-sm text-gray-700"><span>📞</span>{c.phone}</div>}
          {c.mobile && <div className="flex items-center gap-2 text-sm text-gray-700"><span>📱</span>{c.mobile}</div>}
          {c.city && <div className="flex items-center gap-2 text-sm text-gray-700"><span>📍</span>{c.city}, {c.country}</div>}
          {c.linkedin_url && (
            <div className="flex items-center gap-2 text-sm">
              <span>🔗</span>
              <a href={c.linkedin_url} target="_blank" className="text-indigo-600 hover:underline">LinkedIn</a>
            </div>
          )}
        </div>

        // Entreprise
        {company && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Entreprise</h3>
            <p className="text-sm font-semibold text-gray-800">{company.name}</p>
            {company.industry && <p className="text-xs text-gray-500">{company.industry}</p>}
            {company.website && (
              <a href={company.website} target="_blank" className="text-xs text-indigo-600 hover:underline">
                {company.website}
              </a>
            )}
          </div>
        )}

        // Notes
        {c.notes && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}

        // Actions rapides
        <div className="space-y-2">
          <button
            onClick={() => { setCommForm(f => ({...f, type:'email'})); setShowAddComm(true) }}
            className="w-full py-2 px-4 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition"
          >
            📧 Envoyer un email
          </button>
          <button
            onClick={() => { setCommForm(f => ({...f, type:'appel'})); setShowAddComm(true) }}
            className="w-full py-2 px-4 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition"
          >
            📞 Enregistrer un appel
          </button>
          <button
            onClick={() => { setCommForm(f => ({...f, type:'note'})); setShowAddComm(true) }}
            className="w-full py-2 px-4 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition"
          >
            📝 Ajouter une note
          </button>
        </div>
      </aside>

      // ── Colonne droite : Timeline + Leads + Tâches ──────
      <div className="flex-1 min-w-0 space-y-4">
        // Onglets
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex border-b border-gray-100">
            {([
              { id:'timeline', label:`Timeline (${timeline.length})` },
              { id:'leads',    label:`Leads (${leads.length})` },
              { id:'tasks',    label:`Tâches (${tasks.length})` },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          // ── Onglet Timeline ────────────────────────────
          {activeTab === 'timeline' && (
            <div className="p-5">
              {showAddComm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex gap-2">
                    {(['note','email','appel','réunion','sms'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setCommForm(f => ({...f, type:t}))}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                          commForm.type === t
                            ? 'text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        style={commForm.type === t ? { background: COMM_COLORS[t] } : {}}
                      >
                        {COMM_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  {commForm.type !== 'note' && (
                    <input
                      type="text" placeholder="Sujet"
                      value={commForm.subject}
                      onChange={e => setCommForm(f => ({...f, subject:e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                  <textarea
                    placeholder="Contenu..."
                    rows={3}
                    value={commForm.body}
                    onChange={e => setCommForm(f => ({...f, body:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddComm(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                      Annuler
                    </button>
                    <button
                      onClick={commForm.type === 'email' ? handleSendEmail : handleAddCommunication}
                      className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      {commForm.type === 'email' ? '📧 Envoyer' : '✅ Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {timeline.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">
                    Aucun échange enregistré. Commencez par ajouter une note ou envoyer un email.
                  </p>
                )}
                {timeline.map(comm => (
                  <div key={comm.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5"
                         style={{ background: COMM_COLORS[comm.type] + '20' }}>
                      {COMM_ICONS[comm.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {comm.subject || comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                        </span>
                        {comm.direction && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {comm.direction}
                          </span>
                        )}
                        {comm.duration_min && (
                          <span className="text-xs text-gray-400">{comm.duration_min} min</span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(comm.occurred_at).toLocaleDateString('fr-FR', {
                            day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
                          })}
                        </span>
                      </div>
                      {comm.body && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                          {comm.body}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">par {comm.author?.full_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          // ── Onglet Leads ──────────────────────────────
          {activeTab === 'leads' && (
            <div className="p-5 space-y-3">
              {leads.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Aucun lead associé à ce contact.</p>
              )}
              {leads.map((lead: Lead) => (
                <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{lead.title}</p>
                    {lead.expected_close_date && (
                      <p className="text-xs text-gray-500">
                        Clôture : {new Date(lead.expected_close_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{Number(lead.value).toLocaleString('fr-FR')} €</p>
                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ background: STATUS_COLORS[lead.status] ?? '#94a3b8' }}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="w-12 text-center">
                    <p className="text-lg font-bold" style={{ color: STATUS_COLORS[lead.status] }}>
                      {lead.probability}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          // ── Onglet Tâches ─────────────────────────────
          {activeTab === 'tasks' && (
            <div className="p-5 space-y-2">
              {tasks.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Aucune tâche associée.</p>
              )}
              {tasks.map((task: Task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="w-4 h-4 rounded-full border-2 shrink-0 cursor-pointer"
                       style={{ borderColor: PRIORITY_COLORS[task.priority] }}
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${task.status === 'terminée' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {task.title}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ color: PRIORITY_COLORS[task.priority], borderColor: PRIORITY_COLORS[task.priority] + '40', background: PRIORITY_COLORS[task.priority] + '10' }}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== 'terminée' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {new Date(task.due_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}