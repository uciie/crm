// ============================================================
// services/contacts.service.ts
// Couche métier pour les contacts — aucun composant React ici
// ============================================================

import { api } from '@/lib/api'
import type {
  Contact,
  ContactDetail,
  PaginatedResponse,
  ContactFilters,
  CreateContactPayload,
  Interaction,
  CreateInteractionPayload,
  Lead,
} from '@/types/crm.types'

function buildContactParams(filters: ContactFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search)      params.set('search',      filters.search)
  if (filters.company_id)  params.set('company_id',  filters.company_id)
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to)
  if (filters.city)        params.set('city',        filters.city)
  if (filters.is_subscribed !== undefined)
    params.set('is_subscribed', String(filters.is_subscribed))
  if (filters.page)  params.set('page',  String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  return params
}

export const contactsService = {
  /**
   * Récupère la liste paginée des contacts avec filtres
   */
  async list(filters: ContactFilters = {}): Promise<PaginatedResponse<Contact>> {
    const params = buildContactParams(filters)
    return api.get<PaginatedResponse<Contact>>(`/contacts?${params}`)
  },

  /**
   * Récupère un contact avec ses relations (entreprise, assigné)
   */
  async get(id: string): Promise<ContactDetail> {
    return api.get<ContactDetail>(`/contacts/${id}`)
  },

  /**
   * Crée un nouveau contact
   */
  async create(payload: CreateContactPayload): Promise<Contact> {
    return api.post<Contact>('/contacts', payload)
  },

  /**
   * Met à jour un contact existant
   */
  async update(id: string, payload: Partial<CreateContactPayload>): Promise<Contact> {
    return api.patch<Contact>(`/contacts/${id}`, payload)
  },

  /**
   * Supprime un contact
   */
  async remove(id: string): Promise<{ message: string; id: string }> {
    return api.delete(`/contacts/${id}`)
  },

  /**
   * Récupère les statistiques des contacts
   */
  async getStats(): Promise<{ total: number; subscribed: number; new_this_month: number }> {
    return api.get('/contacts/stats')
  },

  /**
   * Récupère la timeline des interactions d'un contact
   */
  async getTimeline(contactId: string): Promise<{ data: Interaction[] }> {
    return api.get<{ data: Interaction[] }>(
      `/communications/timeline?contact_id=${contactId}`
    )
  },

  /**
   * Crée une nouvelle interaction pour un contact
   */
  async addInteraction(payload: CreateInteractionPayload): Promise<Interaction> {
    return api.post<Interaction>('/communications', payload)
  },

  /**
   * Récupère les leads associés à un contact
   */
  async getLeads(contactId: string): Promise<{ data: Lead[] }> {
    return api.get<{ data: Lead[] }>(`/leads?contact_id=${contactId}`)
  },
}