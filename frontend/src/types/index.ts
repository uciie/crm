// ============================================================
// frontend/src/types/index.ts — Types TypeScript partagés
// ============================================================

export type UserRole = 'admin' | 'commercial' | 'utilisateur'

export interface Profile {
  id:         string
  full_name:  string
  avatar_url: string | null
  role:       UserRole
  phone:      string | null
  is_active:  boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id:             string
  name:           string
  domain?:        string
  industry?:      string
  size?:          string
  website?:       string
  phone?:         string
  address?:       string
  city?:          string
  country?:       string
  logo_url?:      string
  annual_revenue?: number
  notes?:         string
  created_at:     string
  updated_at:     string
}

export interface Contact {
  id:            string
  first_name:    string
  last_name:     string
  email?:        string
  phone?:        string
  mobile?:       string
  job_title?:    string
  department?:   string
  company_id?:   string
  avatar_url?:   string
  linkedin_url?: string
  address?:      string
  city?:         string
  country?:      string
  tags?:         string[]
  is_subscribed: boolean
  notes?:        string
  assigned_to?:  string
  created_at:    string
  updated_at:    string
  // Relations (jointures)
  company?:      { id: string; name: string; logo_url?: string }
  assignee?:     { id: string; full_name: string; avatar_url?: string }
}

export type LeadStatus =
  | 'nouveau' | 'contacté' | 'qualifié'
  | 'proposition' | 'négociation' | 'gagné' | 'perdu'

export interface Lead {
  id:                   string
  title:                string
  status:               LeadStatus
  value?:               number
  probability:          number
  expected_close_date?: string
  contact_id?:          string
  company_id?:          string
  assigned_to?:         string
  source?:              string
  lost_reason?:         string
  notes?:               string
  created_at:           string
  updated_at:           string
  contact?:             Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url'>
  company?:             Pick<Company, 'id' | 'name' | 'logo_url'>
  assignee?:            Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export type PipelineStage =
  | 'prospect' | 'qualification' | 'proposition'
  | 'négociation' | 'gagné' | 'perdu'

export interface PipelineStageConfig {
  id:          string
  name:        string
  stage:       PipelineStage
  order_index: number
  color:       string
}

export interface PipelineDeal {
  deal_id:          string
  stage_id:         string
  entered_stage_at: string
  lead:             Lead | null
  contact:          Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url'> | null
  company:          Pick<Company, 'id' | 'name' | 'logo_url'> | null
  assignee:         Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface KanbanColumn extends PipelineStageConfig {
  deals:       PipelineDeal[]
  total_value: number
}

export type TaskStatus   = 'à_faire' | 'en_cours' | 'terminée' | 'annulée'
export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'

export interface Task {
  id:           string
  title:        string
  description?: string
  status:       TaskStatus
  priority:     TaskPriority
  due_date?:    string
  completed_at?: string
  contact_id?:  string
  lead_id?:     string
  company_id?:  string
  assigned_to:  string
  created_at:   string
  updated_at:   string
  contact?:     Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email'>
  lead?:        Pick<Lead, 'id' | 'title' | 'value'>
  assignee?:    Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export type CommunicationType = 'email' | 'appel' | 'réunion' | 'note' | 'sms'
export type CommunicationDirection = 'entrant' | 'sortant'

export interface Communication {
  id:                string
  type:              CommunicationType
  subject?:          string
  body?:             string
  direction?:        CommunicationDirection
  duration_min?:     number
  scheduled_at?:     string
  occurred_at:       string
  contact_id?:       string
  lead_id?:          string
  company_id?:       string
  brevo_message_id?: string
  created_at:        string
  author?:           Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface EmailCampaign {
  id:                  string
  name:                string
  subject:             string
  brevo_campaign_id?:  number
  status:              'brouillon' | 'planifiée' | 'envoyée'
  sent_count:          number
  open_rate?:          number
  click_rate?:         number
  scheduled_at?:       string
  sent_at?:            string
  created_at:          string
  updated_at:          string
}

// ── Types utilitaires ──────────────────────────────────────

export interface Pagination {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data:       T[]
  pagination: Pagination
}

export interface DashboardKpis {
  revenue_this_month: number
  conversion_rate:    number
  overdue_tasks:      number
  new_contacts:       number
}