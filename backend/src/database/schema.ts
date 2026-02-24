import {
  pgTable, uuid, varchar, text, boolean, decimal,
  smallint, timestamp, pgEnum, date, integer
} from 'drizzle-orm/pg-core'

// Énumérations
export const userRoleEnum = pgEnum('user_role', ['admin', 'commercial', 'utilisateur'])
export const leadStatusEnum = pgEnum('lead_status', ['nouveau', 'contacté', 'qualifié', 'proposition', 'négociation', 'gagné', 'perdu'])
export const taskStatusEnum = pgEnum('task_status', ['à_faire', 'en_cours', 'terminée', 'annulée'])
export const taskPriorityEnum = pgEnum('task_priority', ['basse', 'moyenne', 'haute', 'urgente'])
export const communicationTypeEnum = pgEnum('communication_type', ['email', 'appel', 'réunion', 'note', 'sms'])
export const pipelineStageEnum = pgEnum('pipeline_stage', ['prospect', 'qualification', 'proposition', 'négociation', 'gagné', 'perdu'])

// Table profiles
export const profiles = pgTable('profiles', {
  id:         uuid('id').primaryKey(),
  full_name:  varchar('full_name', { length: 255 }).notNull(),
  avatar_url: text('avatar_url'),
  role:       userRoleEnum('role').notNull().default('utilisateur'),
  phone:      varchar('phone', { length: 20 }),
  is_active:  boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table companies
export const companies = pgTable('companies', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           varchar('name', { length: 255 }).notNull(),
  domain:         varchar('domain', { length: 255 }).unique(),
  industry:       varchar('industry', { length: 100 }),
  size:           varchar('size', { length: 50 }),
  website:        text('website'),
  phone:          varchar('phone', { length: 20 }),
  address:        text('address'),
  city:           varchar('city', { length: 100 }),
  country:        varchar('country', { length: 100 }).default('France'),
  logo_url:       text('logo_url'),
  annual_revenue: decimal('annual_revenue', { precision: 15, scale: 2 }),
  notes:          text('notes'),
  created_by:     uuid('created_by').references(() => profiles.id),
  created_at:     timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:     timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table contacts
export const contacts = pgTable('contacts', {
  id:            uuid('id').primaryKey().defaultRandom(),
  first_name:    varchar('first_name', { length: 100 }).notNull(),
  last_name:     varchar('last_name', { length: 100 }).notNull(),
  email:         varchar('email', { length: 255 }).unique(),
  phone:         varchar('phone', { length: 20 }),
  mobile:        varchar('mobile', { length: 20 }),
  job_title:     varchar('job_title', { length: 150 }),
  department:    varchar('department', { length: 100 }),
  company_id:    uuid('company_id').references(() => companies.id),
  avatar_url:    text('avatar_url'),
  linkedin_url:  text('linkedin_url'),
  address:       text('address'),
  city:          varchar('city', { length: 100 }),
  country:       varchar('country', { length: 100 }).default('France'),
  is_subscribed: boolean('is_subscribed').default(true),
  notes:         text('notes'),
  assigned_to:   uuid('assigned_to').references(() => profiles.id),
  created_by:    uuid('created_by').references(() => profiles.id),
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:    timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table leads
export const leads = pgTable('leads', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  title:               varchar('title', { length: 255 }).notNull(),
  status:              leadStatusEnum('status').notNull().default('nouveau'),
  value:               decimal('value', { precision: 15, scale: 2 }),
  probability:         smallint('probability').default(0),
  expected_close_date: date('expected_close_date'),
  contact_id:          uuid('contact_id').references(() => contacts.id),
  company_id:          uuid('company_id').references(() => companies.id),
  assigned_to:         uuid('assigned_to').references(() => profiles.id),
  source:              varchar('source', { length: 100 }),
  lost_reason:         text('lost_reason'),
  notes:               text('notes'),
  created_by:          uuid('created_by').references(() => profiles.id),
  created_at:          timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table pipeline_stages
export const pipelineStages = pgTable('pipeline_stages', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 100 }).notNull(),
  stage:       pipelineStageEnum('stage').notNull(),
  order_index: smallint('order_index').notNull(),
  color:       varchar('color', { length: 7 }).default('#6366f1'),
  created_at:  timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Table pipeline_deals
export const pipelineDeals = pgTable('pipeline_deals', {
  id:               uuid('id').primaryKey().defaultRandom(),
  lead_id:          uuid('lead_id').notNull().references(() => leads.id),
  stage_id:         uuid('stage_id').notNull().references(() => pipelineStages.id),
  entered_stage_at: timestamp('entered_stage_at', { withTimezone: true }).defaultNow(),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table tasks
export const tasks = pgTable('tasks', {
  id:           uuid('id').primaryKey().defaultRandom(),
  title:        varchar('title', { length: 255 }).notNull(),
  description:  text('description'),
  status:       taskStatusEnum('status').notNull().default('à_faire'),
  priority:     taskPriorityEnum('priority').notNull().default('moyenne'),
  due_date:     timestamp('due_date', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  contact_id:   uuid('contact_id').references(() => contacts.id),
  lead_id:      uuid('lead_id').references(() => leads.id),
  company_id:   uuid('company_id').references(() => companies.id),
  assigned_to:  uuid('assigned_to').notNull().references(() => profiles.id),
  created_by:   uuid('created_by').references(() => profiles.id),
  created_at:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Table communications
export const communications = pgTable('communications', {
  id:                uuid('id').primaryKey().defaultRandom(),
  type:              communicationTypeEnum('type').notNull(),
  subject:           varchar('subject', { length: 255 }),
  body:              text('body'),
  direction:         varchar('direction', { length: 10 }),
  duration_min:      smallint('duration_min'),
  scheduled_at:      timestamp('scheduled_at', { withTimezone: true }),
  occurred_at:       timestamp('occurred_at', { withTimezone: true }).defaultNow(),
  contact_id:        uuid('contact_id').references(() => contacts.id),
  lead_id:           uuid('lead_id').references(() => leads.id),
  company_id:        uuid('company_id').references(() => companies.id),
  brevo_message_id:  text('brevo_message_id'),
  created_by:        uuid('created_by').notNull().references(() => profiles.id),
  created_at:        timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Table email_campaigns
export const emailCampaigns = pgTable('email_campaigns', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  name:               varchar('name', { length: 255 }).notNull(),
  subject:            varchar('subject', { length: 255 }).notNull(),
  brevo_campaign_id:  integer('brevo_campaign_id'),
  status:             varchar('status', { length: 50 }).default('brouillon'),
  sent_count:         integer('sent_count').default(0),
  open_rate:          decimal('open_rate', { precision: 5, scale: 2 }),
  click_rate:         decimal('click_rate', { precision: 5, scale: 2 }),
  scheduled_at:       timestamp('scheduled_at', { withTimezone: true }),
  sent_at:            timestamp('sent_at', { withTimezone: true }),
  created_by:         uuid('created_by').references(() => profiles.id),
  created_at:         timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Types inférés pour TypeScript
export type Profile       = typeof profiles.$inferSelect
export type Company       = typeof companies.$inferSelect
export type Contact       = typeof contacts.$inferSelect
export type Lead          = typeof leads.$inferSelect
export type Task          = typeof tasks.$inferSelect
export type Communication = typeof communications.$inferSelect
export type PipelineDeal  = typeof pipelineDeals.$inferSelect
