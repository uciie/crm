// ============================================================
// services/companies.service.ts
// Couche métier pour les entreprises
// ============================================================

import { api } from '@/lib/api'
import type {
  Company,
  CompanyDetail,
  CompanyOption,
  PaginatedResponse,
  CompanyFilters,
  CreateCompanyPayload,
} from '@/types/crm.types'

function buildCompanyParams(filters: CompanyFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search)   params.set('search',   filters.search)
  if (filters.industry) params.set('industry', filters.industry)
  if (filters.city)     params.set('city',     filters.city)
  if (filters.page)     params.set('page',     String(filters.page))
  if (filters.limit)    params.set('limit',    String(filters.limit))
  return params
}

export const companiesService = {
  /**
   * Récupère la liste paginée des entreprises
   */
  async list(filters: CompanyFilters = {}): Promise<PaginatedResponse<Company>> {
    const params = buildCompanyParams(filters)
    return api.get<PaginatedResponse<Company>>(`/companies?${params}`)
  },

  /**
   * Récupère toutes les entreprises pour les menus déroulants (sans pagination)
   */
  async listOptions(): Promise<CompanyOption[]> {
    const data = await api.get<PaginatedResponse<Company>>(
      '/companies?limit=500'
    )
    return data.data.map(c => ({ id: c.id, name: c.name }))
  },

  /**
   * Récupère une entreprise avec ses contacts associés
   */
  async get(id: string): Promise<CompanyDetail> {
    return api.get<CompanyDetail>(`/companies/${id}`)
  },

  /**
   * Crée une nouvelle entreprise
   */
  async create(payload: CreateCompanyPayload): Promise<Company> {
    return api.post<Company>('/companies', payload)
  },

  /**
   * Met à jour une entreprise existante
   */
  async update(id: string, payload: Partial<CreateCompanyPayload>): Promise<Company> {
    return api.patch<Company>(`/companies/${id}`, payload)
  },

  /**
   * Supprime une entreprise
   */
  async remove(id: string): Promise<{ message: string; id: string }> {
    return api.delete(`/companies/${id}`)
  },

  /**
   * Récupère les statistiques des entreprises
   */
  async getStats(): Promise<{
    total:          number
    new_this_month: number
    by_industry:    { industry: string; count: number }[]
  }> {
    return api.get('/companies/stats')
  },

  /**
   * Récupère toutes les entreprises sans pagination (pour export ou analyses)
   */
  async listAll(): Promise<Company[]> {
    const allCompanies: Company[] = []
    let page = 1
    let totalPages = 1
    do {
      const response = await this.list({ page, limit: 100 })
      allCompanies.push(...response.data)
      totalPages = response.pagination.totalPages
      page++
    } while (page <= totalPages)
    return allCompanies
  }
}