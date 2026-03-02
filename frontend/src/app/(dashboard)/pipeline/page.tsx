'use client'
import { useState, useCallback } from 'react'
import { GitBranch, UserPlus }   from 'lucide-react'
import { KanbanBoard }           from '@/components/pipeline/KanbanBoard'
import { LeadForm }              from '@/components/leads/LeadForm'
import { useAuth }               from '@/hooks/useAuth'
import type { Lead }             from '@/types'

export default function PipelinePage() {
  const { isCommercial }          = useAuth()
  const [showForm, setShowForm]   = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = useCallback((_lead: Lead) => {
    setShowForm(false)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="flex flex-col gap-5 h-full p-6">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-200">
              Pipeline de vente
            </h1>
          </div>
          <p className="text-xs text-slate-600">Glissez-déposez les deals pour les déplacer</p>
        </div>
        {isCommercial && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Nouveau lead
          </button>
        )}
      </div>

      <KanbanBoard key={refreshKey} />

      {showForm && (
        <LeadForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
          addToPipeline={true}
        />
      )}
    </div>
  )
}