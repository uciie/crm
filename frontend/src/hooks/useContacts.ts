'use client'

import { useState, useEffect, useCallback } from 'react'
import { api }                              from '@/lib/api'
import type { Contact, PaginatedResponse }  from '@/types'

interface UseContactsOptions {
  search?:     string
  company_id?: string
  page?:       number
  limit?:      number
}

export function useContacts(options: UseContactsOptions = {}) {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.search)     params.set('search', options.search)
      if (options.company_id) params.set('company_id', options.company_id)
      if (options.page)       params.set('page', String(options.page))
      if (options.limit)      params.set('limit', String(options.limit))

      const data: PaginatedResponse<Contact> = await api.get(`/contacts?${params}`)
      setContacts(data.data)
      setPagination(data.pagination)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [options.search, options.company_id, options.page, options.limit])

  useEffect(() => { fetch() }, [fetch])

  return { contacts, pagination, loading, error, refetch: fetch }
}
