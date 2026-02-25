'use client'
import { useState, useEffect, useCallback } from 'react'
import { companiesService } from '@/services/companies.service'
import type { Company, CompanyDetail, CompanyFilters, PaginatedResponse } from '@/types/crm.types'

export function useCompanies(initialFilters: CompanyFilters = {}) {
  const [data, setData]       = useState<PaginatedResponse<Company>>({
    data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filters, setFilters] = useState<CompanyFilters>({ page: 1, limit: 20, ...initialFilters })

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await companiesService.list(filters)
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetch() }, [fetch])

  const updateFilters = useCallback((updates: Partial<CompanyFilters>) => {
    setFilters(prev => ({ ...prev, ...updates, page: updates.page ?? 1 }))
  }, [])

  return {
    companies:  data.data,
    pagination: data.pagination,
    loading,
    error,
    filters,
    updateFilters,
    refetch: fetch,
  }
}

export function useCompany(id: string | null) {
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await companiesService.get(id)
      setCompany(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { company, loading, error, refetch: fetch }
}

export function useCompanyOptions() {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companiesService.listAll()
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [])

  return { options, loading }
}