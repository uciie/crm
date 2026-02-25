import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '../database/db.config'
import { contacts, companies, profiles } from '../database/schema'
import { eq, or, ilike, and, isNull, desc, sql } from 'drizzle-orm'
import { CreateContactDto } from './dto/create-contact.dto'

export interface AuthUser {
  id: string
  role: 'admin' | 'commercial' | 'utilisateur'
}

export interface ContactFilters {
  search?: string
  company_id?: string
  assigned_to?: string
  is_subscribed?: boolean
  city?: string
  page?: number
  limit?: number
}

@Injectable()
export class ContactsService {
  async findAll(user: AuthUser, filters: ContactFilters = {}) {
    const { search, company_id, assigned_to, is_subscribed, city, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    // Construction des conditions de filtrage
    const conditions: any[] = []

    // RLS : Les commerciaux voient leurs contacts + les non assignés
    if (user.role !== 'admin') {
      conditions.push(
        or(
          eq(contacts.assigned_to, user.id),
          isNull(contacts.assigned_to)
        )
      )
    }

    // Filtre de recherche textuelle
    if (search) {
      conditions.push(
        or(
          ilike(contacts.first_name, `%${search}%`),
          ilike(contacts.last_name, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.job_title, `%${search}%`)
        )
      )
    }

    if (company_id)    conditions.push(eq(contacts.company_id, company_id))
    if (assigned_to)   conditions.push(eq(contacts.assigned_to, assigned_to))
    if (city)          conditions.push(ilike(contacts.city, `%${city}%`))
    if (is_subscribed !== undefined) {
      conditions.push(eq(contacts.is_subscribed, is_subscribed))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Requête principale avec jointures
    const rows = await db
      .select({
        id:            contacts.id,
        first_name:    contacts.first_name,
        last_name:     contacts.last_name,
        email:         contacts.email,
        phone:         contacts.phone,
        mobile:        contacts.mobile,
        job_title:     contacts.job_title,
        department:    contacts.department,
        city:          contacts.city,
        country:       contacts.country,
        is_subscribed: contacts.is_subscribed,
        avatar_url:    contacts.avatar_url,
        linkedin_url:  contacts.linkedin_url,
        notes:         contacts.notes,
        created_at:    contacts.created_at,
        updated_at:    contacts.updated_at,
        company: {
          id:   companies.id,
          name: companies.name,
          logo_url: companies.logo_url,
        },
        assigned_to: {
          id:        profiles.id,
          full_name: profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.company_id, companies.id))
      .leftJoin(profiles, eq(contacts.assigned_to, profiles.id))
      .where(whereClause)
      .orderBy(desc(contacts.updated_at))
      .limit(limit)
      .offset(offset)

    // Compte total pour la pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(whereClause)

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    }
  }

  async findOne(id: string, user: AuthUser) {
    const [contact] = await db
      .select()
      .from(contacts)
      .leftJoin(companies, eq(contacts.company_id, companies.id))
      .where(eq(contacts.id, id))
      .limit(1)

    if (!contact) throw new NotFoundException('Contact introuvable')

    // Vérification d'accès
    if (user.role !== 'admin' && contact.contacts.assigned_to !== user.id && contact.contacts.assigned_to !== null) {
      throw new ForbiddenException('Accès refusé')
    }

    return contact
  }

  async create(dto: CreateContactDto, userId: string) {
    const [newContact] = await db
      .insert(contacts)
      .values({
        ...dto,
        created_by:  userId,
        assigned_to: dto.assigned_to ?? userId,
      })
      .returning()

    return newContact
  }

  async update(id: string, dto: Partial<CreateContactDto>, user: AuthUser) {
    const existing = await this.findOne(id, user)

    if (user.role === 'utilisateur') {
      throw new ForbiddenException('Permission insuffisante')
    }

    const [updated] = await db
      .update(contacts)
      .set({ ...dto, updated_at: new Date() })
      .where(eq(contacts.id, id))
      .returning()

    return updated
  }

  async remove(id: string) {
    const [deleted] = await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning({ id: contacts.id })

    if (!deleted) throw new NotFoundException('Contact introuvable')
    return { message: 'Contact supprimé avec succès', id: deleted.id }
  }

  async getStats(userId: string, role: string) {
    const isAdmin = role === 'admin'
    const condition = isAdmin ? undefined : eq(contacts.assigned_to, userId)

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(contacts)
      .where(condition)

    const [{ subscribed }] = await db
      .select({ subscribed: sql<number>`count(*)` })
      .from(contacts)
      .where(and(condition, eq(contacts.is_subscribed, true)))

    const [{ new_this_month }] = await db
      .select({ new_this_month: sql<number>`count(*)` })
      .from(contacts)
      .where(and(
        condition,
        sql`created_at >= date_trunc('month', current_date)`
      ))

    return {
      total: Number(total),
      subscribed: Number(subscribed),
      new_this_month: Number(new_this_month),
    }
  }
}
