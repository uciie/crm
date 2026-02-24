import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '../database/db.config'
import { companies, contacts, profiles } from '../database/schema'
import { eq, ilike, and, desc, sql, or } from 'drizzle-orm'
import { CreateCompanyDto } from './dto/create-company.dto'

export interface CompanyFilters {
  search?:   string
  industry?: string
  city?:     string
  page?:     number
  limit?:    number
}

@Injectable()
export class CompaniesService {

  async findAll(filters: CompanyFilters = {}) {
    const { search, industry, city, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions: any[] = []

    if (search) {
      conditions.push(
        or(
          ilike(companies.name,   `%${search}%`),
          ilike(companies.domain, `%${search}%`),
        )
      )
    }
    if (industry) conditions.push(ilike(companies.industry, `%${industry}%`))
    if (city)     conditions.push(ilike(companies.city,     `%${city}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:             companies.id,
        name:           companies.name,
        domain:         companies.domain,
        industry:       companies.industry,
        size:           companies.size,
        website:        companies.website,
        phone:          companies.phone,
        city:           companies.city,
        country:        companies.country,
        logo_url:       companies.logo_url,
        annual_revenue: companies.annual_revenue,
        created_at:     companies.created_at,
        updated_at:     companies.updated_at,
      })
      .from(companies)
      .where(whereClause)
      .orderBy(desc(companies.updated_at))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(whereClause)

    // Compte des contacts par entreprise
    const contactCounts = await db
      .select({
        company_id: contacts.company_id,
        count: sql<number>`count(*)`,
      })
      .from(contacts)
      .groupBy(contacts.company_id)

    const countMap = Object.fromEntries(
      contactCounts.map(r => [r.company_id, Number(r.count)])
    )

    return {
      data: rows.map(r => ({ ...r, contacts_count: countMap[r.id] ?? 0 })),
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    }
  }

  async findOne(id: string) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1)

    if (!company) throw new NotFoundException('Entreprise introuvable')

    // Contacts associés
    const associatedContacts = await db
      .select({
        id:        contacts.id,
        first_name: contacts.first_name,
        last_name:  contacts.last_name,
        email:      contacts.email,
        job_title:  contacts.job_title,
        phone:      contacts.phone,
        avatar_url: contacts.avatar_url,
      })
      .from(contacts)
      .where(eq(contacts.company_id, id))
      .limit(50)

    return { ...company, contacts: associatedContacts }
  }

  async create(dto: CreateCompanyDto, userId: string) {
    const [newCompany] = await db
      .insert(companies)
      .values({
        ...dto,
        created_by: userId,
      })
      .returning()

    return newCompany
  }

  async update(id: string, dto: Partial<CreateCompanyDto>) {
    const [updated] = await db
      .update(companies)
      .set({ ...dto, updated_at: new Date() })
      .where(eq(companies.id, id))
      .returning()

    if (!updated) throw new NotFoundException('Entreprise introuvable')
    return updated
  }

  async remove(id: string) {
    const [deleted] = await db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning({ id: companies.id })

    if (!deleted) throw new NotFoundException('Entreprise introuvable')
    return { message: 'Entreprise supprimée avec succès', id: deleted.id }
  }

  async getStats() {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(companies)

    const byIndustry = await db.execute(sql`
      SELECT industry, COUNT(*) AS count
      FROM companies
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 5
    `)

    const [{ new_this_month }] = await db
      .select({ new_this_month: sql<number>`count(*)` })
      .from(companies)
      .where(sql`created_at >= date_trunc('month', current_date)`)

    return {
      total:          Number(total),
      new_this_month: Number(new_this_month),
      by_industry:    byIndustry.rows,
    }
  }
}