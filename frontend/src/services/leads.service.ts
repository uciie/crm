import { api } from '@/lib/api'
import type { Lead, PaginatedResponse } from '@/types'

export interface LeadFilters {
  search?: string; status?: string; contact_id?: string
  company_id?: string; assigned_to?: string; page?: number; limit?: number
}

export interface CreateLeadPayload {
  title: string; status?: string; value?: number; probability?: number
  expected_close_date?: string; source?: string; notes?: string
  contact_id?: string; company_id?: string; assigned_to?: string
}

export interface LeadStats {
  total: number; won: number; lost: number
  revenue_won: number; pipeline_value: number
  new_this_month: number; conversion_rate: number
}

function buildParams(f: LeadFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search)      p.set('search',      f.search)
  if (f.status)      p.set('status',      f.status)
  if (f.contact_id)  p.set('contact_id',  f.contact_id)
  if (f.company_id)  p.set('company_id',  f.company_id)
  if (f.assigned_to) p.set('assigned_to', f.assigned_to)
  if (f.page)        p.set('page',        String(f.page))
  if (f.limit)       p.set('limit',       String(f.limit))
  return p
}

export const leadsService = {
  async list(filters: LeadFilters = {}): Promise<PaginatedResponse<Lead>> {
    return api.get(`/leads?${buildParams(filters)}`)
  },
  async get(id: string): Promise<Lead> {
    return api.get(`/leads/${id}`)
  },
  async create(payload: CreateLeadPayload): Promise<Lead> {
    return api.post('/leads', payload)
  },
  async update(id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> {
    return api.patch(`/leads/${id}`, payload)
  },
  // Changement de statut isolé du composant
  async updateStatus(id: string, status: Lead['status']): Promise<Lead> {
    return api.patch(`/leads/${id}`, { status })
  },
  async remove(id: string): Promise<{ message: string; id: string }> {
    return api.delete(`/leads/${id}`)
  },
  async getStats(): Promise<LeadStats> {
    return api.get('/leads/stats')
  },
  async createPipelineDeal(leadId: string, stageId?: string): Promise<void> {
    await api.post('/pipeline/deals', { lead_id: leadId, stage_id: stageId })
  },
  async moveDeal(dealId: string, stageId: string): Promise<void> {
    await api.patch(`/pipeline/deals/${dealId}/move`, { stage_id: stageId })
  },
}