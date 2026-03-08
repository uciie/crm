import { type ClassValue, clsx } from 'clsx'
import { twMerge }               from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value))
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date() && !['terminée', 'annulée'].includes(status)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}


/**
 * Calcule le ROI à partir du coût et du chiffre d'affaires généré.
 * Formule : (revenue - cost) / cost × 100
 * Retourne null si le coût est absent ou nul (non renseigné).
 *
 * Utilisée en frontend pour affichage immédiat ; le backend
 * persiste la même valeur via email.service.calculateAndSaveRoi().
 */
export function calculateRoi(cost?: number | null, revenue?: number | null): number | null {
  const c = Number(cost   ?? 0)
  const r = Number(revenue ?? 0)
  if (c <= 0) return null          // coût non renseigné → ROI incalculable
  return Math.round(((r - c) / c) * 100 * 10) / 10
}