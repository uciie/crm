'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useParams } from 'next/navigation'
import { api }                              from '@/lib/api'
import type { Contact, PaginatedResponse }  from '@/types'

export interface ContactFilters {
  search?:       string
  company_id?:   string
  is_subscribed?: boolean
  sort_by?:      string
  sort_dir?:     'asc' | 'desc'
  page?:         number
  limit?:        number
  [key: string]: unknown
}

export function useContacts(initialFilters: ContactFilters = {}) {
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filters, setFilters]       = useState<ContactFilters>(initialFilters)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const data: PaginatedResponse<Contact> = await api.get(`/contacts?${params}`)
      setContacts(data.data)
      setPagination(data.pagination)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { refetch() }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/contacts/${id}`)
    setContacts(prev => prev.filter(c => c.id !== id))
  }, [])

  return { contacts, pagination, loading, error, filters, setFilters, refetch, remove }
}

export function useContactDetail() {
  const params                        = useParams()
  const id                            = params?.id as string | undefined

  const [contact, setContact]         = useState<Contact | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error,   setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    api.get(`/contacts/${id}`)
      .then((data: Contact) => setContact(data))
      .catch((err: any) => setError(err?.message ?? 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }, [id])

  return { contact, loading, error }
}