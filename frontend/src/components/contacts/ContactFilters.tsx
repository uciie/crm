interface ContactFiltersProps {
  search:      string
  onSearch:    (v: string) => void
}

export function ContactFilters({ search, onSearch }: ContactFiltersProps) {
  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex-1 max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text" value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Rechercher par nom, email, entreprise..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      </div>
    </div>
  )
}