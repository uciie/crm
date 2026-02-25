'use client'

import { useState, useEffect, useCallback } from 'react'
import { api }                              from '@/lib/api'
import type { Lead, KanbanColumn }          from '@/types'

export function useLeads(contactId?: string) {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = contactId ? `?contact_id=${contactId}` : ''
      const data   = await api.get(`/leads${params}`)
      setLeads(data.data ?? data)
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => { fetch() }, [fetch])
  return { leads, loading, refetch: fetch }
}

export function useKanban() {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/pipeline/kanban')
      setColumns(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const moveDeal = async (dealId: string, stageId: string) => {
    await api.patch(`/pipeline/deals/${dealId}/move`, { stage_id: stageId })
    await fetch()
  }

  return { columns, loading, moveDeal, refetch: fetch }
}