// ============================================================
// frontend/src/utils/transformers.ts
// Utilitaires de transformation et calcul pour le dashboard
// ============================================================

/**
 * Calcule le pourcentage de variation entre une valeur courante et une valeur précédente.
 *
 * @param currentValue  - Valeur de la période courante
 * @param previousValue - Valeur de la période précédente
 * @returns             - Pourcentage de variation arrondi à 1 décimale,
 *                        ou null si la comparaison n'est pas possible (previousValue = 0 et currentValue = 0)
 *
 * Cas particuliers :
 *   - previousValue = 0 et currentValue > 0 : retourne +100 (croissance depuis zéro)
 *   - previousValue = 0 et currentValue = 0 : retourne null (pas de données)
 *   - previousValue = 0 et currentValue < 0 : retourne -100 (par convention)
 */
export function calculateTrend(
  currentValue:  number,
  previousValue: number,
): number | null {
  // Pas de données sur les deux périodes — tendance non calculable
  if (previousValue === 0 && currentValue === 0) {
    return null
  }

  // Croissance depuis zéro — division par zéro évitée
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : -100
  }

  const variation = ((currentValue - previousValue) / previousValue) * 100
  return Math.round(variation * 10) / 10
}

/**
 * Formate un pourcentage de tendance en chaîne affichable.
 *
 * @param trend  - Résultat de calculateTrend()
 * @param suffix - Suffixe après le pourcentage (défaut : "vs période préc.")
 * @returns        Chaîne formatée (ex: "+12.5% vs période préc.") ou chaîne vide si null
 */
export function formatTrend(
  trend:  number | null,
  suffix = 'vs période préc.',
): string {
  if (trend === null) return ''
  const sign = trend > 0 ? '+' : ''
  return `${sign}${trend}% ${suffix}`
}