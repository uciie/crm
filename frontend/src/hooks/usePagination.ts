// ============================================================
// hooks/usePagination.ts
// Hook de pagination côté client — limite configurable (défaut : 5)
// ============================================================

import { useState, useMemo, useCallback } from 'react'

export interface PaginationState<T> {
  /** Éléments de la page courante */
  pageItems:    T[]
  /** Page courante (1-indexed) */
  page:         number
  /** Nombre total de pages */
  totalPages:   number
  /** Nombre total d'éléments */
  total:        number
  /** Éléments par page */
  limit:        number
  /** Aller à une page précise */
  setPage:      (page: number) => void
  /** Page suivante */
  nextPage:     () => void
  /** Page précédente */
  prevPage:     () => void
  /** Est-ce qu'une page précédente existe ? */
  hasPrev:      boolean
  /** Est-ce qu'une page suivante existe ? */
  hasNext:      boolean
  /** Réinitialiser à la page 1 */
  reset:        () => void
}

/**
 * usePagination<T>
 * @param items  — liste complète des éléments à paginer
 * @param limit  — nombre d'éléments par page (défaut : 5)
 */
export function usePagination<T>(items: T[], limit = 5): PaginationState<T> {
  const [page, setPageRaw] = useState(1)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / limit)),
    [items.length, limit],
  )

  // S'assure que la page ne dépasse jamais totalPages
  const page_ = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (page_ - 1) * limit
    return items.slice(start, start + limit)
  }, [items, page_, limit])

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  )

  const nextPage = useCallback(() => setPage(page_ + 1), [page_, setPage])
  const prevPage = useCallback(() => setPage(page_ - 1), [page_, setPage])
  const reset    = useCallback(() => setPageRaw(1), [])

  return {
    pageItems,
    page:       page_,
    totalPages,
    total:      items.length,
    limit,
    setPage,
    nextPage,
    prevPage,
    hasPrev:    page_ > 1,
    hasNext:    page_ < totalPages,
    reset,
  }
}