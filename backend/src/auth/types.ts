export interface AuthUser {
  id:        string
  email:     string
  role:      'admin' | 'commercial' | 'utilisateur'
  full_name: string
  is_active: boolean
}