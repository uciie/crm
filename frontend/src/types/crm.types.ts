// ============================================================
// CRM Types — Interfaces strictes pour les entités métier
// ============================================================

export type UserRole = 'admin' | 'commercial' | 'utilisateur'

export type LeadStatus =
  | 'nouveau'
  | 'contacté'
  | 'qualifié'
  | 'proposition'
  | 'négociation'
  | 'gagné'
  | 'perdu'

export type CommunicationType = 'email' | 'appel' | 'réunion' | 'note' | 'sms'
export type CommunicationDirection = 'entrant' | 'sortant'

export type TaskStatus   = 'à_faire' | 'en_cours' | 'terminée' | 'annulée'
export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

// ── Entité Profil ─────────────────────────────────────────────

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

// ── Entité Entreprise ─────────────────────────────────────────

export interface Company {
  id:              string
  name:            string
  domain?:         string
  industry?:       string
  size?:           CompanySize
  website?:        string
  phone?:          string
  address?:        string
  city?:           string
  country?:        string
  logo_url?:       string
  annual_revenue?: number | string
  notes?:          string
  created_at:      string
  updated_at:      string
  contacts_count?: number
}

export interface CompanyDetail extends Company {
  contacts: ContactSummary[]
}

export interface CompanyOption {
  id:   string
  name: string
}

// ── Entité Contact ────────────────────────────────────────────

export interface ContactSummary {
  id:         string
  first_name: string
  last_name:  string
  email?:     string
  job_title?: string
  phone?:     string
  avatar_url?: string
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
  // Relations jointures
  company?:      Pick<Company, 'id' | 'name' | 'logo_url' | 'industry' | 'website'>
  assignee?:     Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface ContactDetail {
  contacts: {
    id:            string
    first_name:    string
    last_name:     string
    email:         string
    phone:         string
    mobile:        string
    job_title:     string
    department:    string
    linkedin_url:  string
    address:       string
    city:          string
    country:       string
    is_subscribed: boolean
    notes:         string
    avatar_url:    string
    created_at:    string
    updated_at:    string
  }
  companies: Pick<Company, 'id' | 'name' | 'logo_url' | 'industry' | 'website'> | null
}

// ── Entité Interaction / Communication ───────────────────────

export interface Interaction {
  id:           string
  type:         CommunicationType
  subject?:     string
  body?:        string
  direction?:   CommunicationDirection
  duration_min?: number
  scheduled_at?: string
  occurred_at:  string
  contact_id?:  string
  lead_id?:     string
  company_id?:  string
  created_at:   string
  author?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

// ── Entité Lead ───────────────────────────────────────────────

export interface Lead {
  id:                   string
  title:                string
  status:               LeadStatus
  value?:               number
  probability:          number
  expected_close_date?: string
  contact_id?:          string
  company_id?:          string
  source?:              string
  notes?:               string
  created_at:           string
  updated_at:           string
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url'>
  company?: Pick<Company, 'id' | 'name' | 'logo_url'>
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

// ── Pagination et Filtres ─────────────────────────────────────

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

export type SortDirection = 'asc' | 'desc'

export interface ContactFilters {
  search?:       string
  company_id?:   string
  assigned_to?:  string
  is_subscribed?: boolean
  city?:         string
  page?:         number
  limit?:        number
  sort_by?:      keyof Contact
  sort_dir?:     SortDirection
}

export interface CompanyFilters {
  search?:   string
  industry?: string
  city?:     string
  page?:     number
  limit?:    number
}

// ── DTOs Formulaires (Zod inférés) ────────────────────────────

export interface CreateContactPayload {
  first_name:    string
  last_name:     string
  email?:        string
  phone?:        string
  mobile?:       string
  job_title?:    string
  department?:   string
  company_id?:   string
  linkedin_url?: string
  address?:      string
  city?:         string
  country?:      string
  is_subscribed?: boolean
  notes?:        string
  assigned_to?:  string
}

export interface CreateCompanyPayload {
  name:            string
  domain?:         string
  industry?:       string
  size?:           CompanySize
  website?:        string
  phone?:          string
  address?:        string
  city?:           string
  country?:        string
  annual_revenue?: number
  notes?:          string
}

export interface CreateInteractionPayload {
  type:        CommunicationType
  subject?:    string
  body?:       string
  direction?:  CommunicationDirection
  contact_id?: string
  lead_id?:    string
  company_id?: string
}

// ── Toast System ──────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id:       string
  type:     ToastType
  title:    string
  message?: string
}