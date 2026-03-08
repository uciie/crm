import React from 'react'
import { useCompany } from '@/hooks/useCompanies'

export function CompanyDetailView() {
  const { company, loading } = useCompany(null)

  if (loading) return <div className="animate-pulse" aria-busy="true">Loading</div>
  if (!company) return <div>Aucune entreprise</div>

  return (
    <div>
      <h1>{company.name}</h1>
      <div>{company.industry}</div>
      <div>{company.city}</div>
      {company.website && (
        <a href={company.website} target="_blank" rel="noreferrer">{company.website.replace(/^https?:\/\//, '')}</a>
      )}

      <section>
        {(!company.contacts || company.contacts.length === 0) ? (
          <div>Aucun contact</div>
        ) : (
          company.contacts.map(c => (
            <div key={c.id} className="mb-3">
              <div>
                <div>{c.first_name}</div>
                <div>{c.last_name}</div>
              </div>
              {c.job_title && <div className="text-sm text-slate-500">{c.job_title}</div>}
              {c.email && <div className="text-sm text-slate-500">{c.email}</div>}
            </div>
          ))
        )}
      </section>
    </div>
  )
}

export default CompanyDetailView
